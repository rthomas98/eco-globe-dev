import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import sql from "mssql";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
process.env.AZURE_SQL_CONNECTION_STRING = "synthetic-no-network";
const {
  buildStaffPayload,
  parseStaffEvent,
  parseStaffPayload,
  processStaffAlerts,
  enqueueStaffAlert,
  enqueueListingReview,
  auditListingLifecycle,
  handleStaffAlertRoute,
} = await import("./staff-alerts.js");

test("staff status rejects anonymous access with private no-store before touching SQL", async (t) => {
  const req = Readable.from([]) as IncomingMessage;
  req.headers = {};
  req.method = "GET";
  const headers = new Map<string, unknown>();
  const res = {
    setHeader: (key: string, value: unknown) => headers.set(key, value),
  } as unknown as ServerResponse;
  const connect = t.mock.method(sql, "connect", async () => {
    throw new Error("SQL forbidden");
  });
  await assert.rejects(
    handleStaffAlertRoute(
      req,
      res,
      new URL("http://localhost/api/admin/staff-alerts"),
    ),
    /Missing or invalid bearer/,
  );
  assert.equal(headers.get("cache-control"), "private, no-store");
  assert.equal(connect.mock.callCount(), 0);
});

const environments = new WeakMap<
  TestContext,
  Map<string, string | undefined>
>();
function setEnv(t: TestContext, key: string, value: string) {
  let saved = environments.get(t);
  if (!saved) {
    saved = new Map();
    environments.set(t, saved);
    const snapshot = saved;
    t.after(() => {
      for (const [name, original] of snapshot) {
        if (original === undefined) delete process.env[name];
        else process.env[name] = original;
      }
    });
  }
  if (!saved.has(key)) saved.set(key, process.env[key]);
  process.env[key] = value;
}
function config(t: TestContext) {
  for (const [key, value] of Object.entries({
    STAFF_ALERT_EMAIL_ENABLED: "true",
    STAFF_ALERT_EMAIL_RECIPIENTS: "staff@example.invalid",
    STAFF_ALERT_EMAIL_ALLOWED_RECIPIENTS: "staff@example.invalid",
    ECOGLOBE_EMAIL_OVERRIDE_ALL: "false",
    STAFF_ALERT_ADMIN_URL: "https://app.example.invalid",
    RESEND_API_KEY: "synthetic-key",
  }))
    setEnv(t, key, value);
}

test("minimal staff payloads use correct deep links and never claim buyer acknowledgement", (t) => {
  config(t);
  for (const kind of [
    "pilot_created",
    "pilot_email_follow_up",
    "listing_pending_review",
  ] as const) {
    const payload = buildStaffPayload({ kind, recordId: 42 });
    assert.deepEqual(payload.to, ["staff@example.invalid"]);
    assert.match(
      payload.text!,
      new RegExp(
        `/admin/${kind === "listing_pending_review" ? "listings" : "pilots"}/42`,
      ),
    );
    assert.doesNotMatch(
      payload.text!,
      /sent|acknowledge|buyer email|objective|address/i,
    );
    assert.deepEqual(parseStaffPayload(JSON.stringify(payload)), payload);
  }
  for (const raw of [
    "{}",
    '{"kind":"buyer_ack","recordId":1}',
    '{"kind":"pilot_created","recordId":-1}',
  ])
    assert.throws(() => parseStaffEvent(raw));
  assert.throws(() => parseStaffPayload('{"to":[]}'));
});

test("staff configuration rejects unapproved recipients, redirect mismatch and unsafe admin origin", (t) => {
  config(t);
  const event = { kind: "pilot_created", recordId: 1 } as const;
  setEnv(t, "ECOGLOBE_EMAIL_OVERRIDE_ALL", "true");
  setEnv(t, "ECOGLOBE_EMAIL_TEST_RECIPIENT", "default@example.invalid");
  assert.throws(() => buildStaffPayload(event), /redirect/);
  setEnv(t, "ECOGLOBE_EMAIL_TEST_RECIPIENT", "staff@example.invalid");
  assert.deepEqual(buildStaffPayload(event).to, ["staff@example.invalid"]);
  setEnv(t, "STAFF_ALERT_EMAIL_ALLOWED_RECIPIENTS", "");
  assert.throws(() => buildStaffPayload(event), /approved/);
  setEnv(t, "STAFF_ALERT_EMAIL_ALLOWED_RECIPIENTS", "staff@example.invalid");
  for (const origin of [
    "javascript:alert(1)",
    "https://user:pass@example.invalid",
    "https://app.example.invalid/path",
    "https://app.example.invalid?secret=1",
  ]) {
    setEnv(t, "STAFF_ALERT_ADMIN_URL", origin);
    assert.throws(() => buildStaffPayload(event));
  }
});

test("disabled staff delivery touches neither SQL nor network", async (t) => {
  setEnv(t, "STAFF_ALERT_EMAIL_ENABLED", "false");
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Network forbidden");
  });
  const connect = t.mock.method(sql, "connect", async () => {
    throw new Error("SQL forbidden");
  });
  assert.equal(await processStaffAlerts(), 0);
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(connect.mock.callCount(), 0);
});

test("processor bounds claims, freezes payload and idempotency key, and reconciles ambiguous outcomes", async (t) => {
  config(t);
  t.mock.method(
    sql,
    "connect",
    async () => new sql.ConnectionPool("synthetic"),
  );
  let jobs = 1,
    mode = "success",
    claims = 0;
  let savedPayload: string | null = null;
  const changes: Array<{ state: unknown; error: unknown }> = [];
  const job = {
    id: 7,
    eventKey: "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA",
    eventJson: '{"kind":"pilot_created","recordId":8}',
    attempts: 1,
  };
  t.mock.method(
    sql.Request.prototype,
    "query",
    async function (this: sql.Request, statement: string) {
      const rows = (recordset: unknown[]) => ({ recordset });
      if (statement.includes("WITH candidate")) {
        assert.match(statement, /UPDLOCK,READPAST,READCOMMITTEDLOCK/);
        assert.match(statement, /State IN \('queued','retry'\)/);
        claims++;
        return rows(jobs-- > 0 ? [{ ...job, payloadJson: savedPayload }] : []);
      }
      if (statement.includes("SET PayloadJson")) {
        assert.match(statement, /PayloadJson IS NULL/);
        savedPayload = String(this.parameters.payload!.value);
        return rows([{ id: 7 }]);
      }
      if (statement.includes("SET State=@state")) {
        changes.push({
          state: this.parameters.state!.value,
          error: this.parameters.error!.value,
        });
        return rows([]);
      }
      if (statement.includes("SET State='sent'")) {
        assert.equal(this.parameters.provider!.value, "provider-123");
        assert.match(statement, /LeaseToken=@token/);
        if (mode === "save-error")
          throw new Error("Synthetic persistence failure");
        return rows([]);
      }
      if (statement.includes("Delivery unknown")) {
        assert.match(
          statement,
          /State='sending' AND LeaseUntil<=SYSUTCDATETIME\(\)/,
        );
        assert.match(statement, /Attempts>=3/);
        assert.match(statement, /hour,-23/);
        return rows([]);
      }
      if (statement.includes("configuration or payload invalid")) {
        changes.push({ state: "needs_review", error: "config" });
        return rows([]);
      }
      throw new Error(`Unexpected query ${statement}`);
    },
  );
  const sentBodies: string[] = [];
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    async (
      _url: Parameters<typeof globalThis.fetch>[0],
      options?: Parameters<typeof globalThis.fetch>[1],
    ) => {
      assert.equal(
        options?.headers && "Idempotency-Key" in options.headers
          ? options.headers["Idempotency-Key"]
          : null,
        "staff-alert-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      );
      sentBodies.push(String(options?.body));
      if (mode === "timeout")
        throw new Error("Ambiguous transport error with secret raw body");
      return new Response(
        JSON.stringify(
          mode === "success" || mode === "save-error"
            ? { id: "provider-123" }
            : { message: "Provider rejected with private info" },
        ),
        { status: mode === "429" ? 429 : mode === "503" ? 503 : 200 },
      );
    },
  );
  const first = processStaffAlerts();
  assert.equal(processStaffAlerts(), first, "coalesces overlapping ticks");
  assert.equal(await first, 1);
  assert.ok(savedPayload);
  const original = savedPayload;
  for (mode of ["429", "timeout", "503"]) {
    jobs = 1;
    assert.equal(await processStaffAlerts(), 0);
    assert.equal(
      changes.at(-1)?.state,
      mode === "429" ? "retry" : "needs_review",
    );
    assert.doesNotMatch(String(changes.at(-1)?.error), /secret|private/);
    assert.equal(savedPayload, original);
    assert.equal(sentBodies.at(-1), original);
  }
  mode = "save-error";
  jobs = 1;
  const before = changes.length;
  await assert.rejects(processStaffAlerts(), /persistence failure/);
  assert.equal(
    changes.length,
    before,
    "post-send persistence failure retains claim",
  );
  mode = "success";
  jobs = 30;
  claims = 0;
  assert.equal(await processStaffAlerts(), 10);
  assert.equal(claims, 10);
  setEnv(t, "STAFF_ALERT_EMAIL_RECIPIENTS", "changed@example.invalid");
  jobs = 1;
  const sendsBefore = fetch.mock.callCount();
  assert.equal(await processStaffAlerts(), 0);
  assert.equal(
    fetch.mock.callCount(),
    sendsBefore,
    "saved payload cannot move to a changed recipient",
  );
  assert.equal(changes.at(-1)?.state, "needs_review");
});

test("transactional event helpers enqueue only transitions and audit close/restore without deleting history", async (t) => {
  let inserts = 0,
    audits = 0;
  t.mock.method(
    sql.Request.prototype,
    "query",
    async function (this: sql.Request, statement: string) {
      if (statement.includes("INSERT dbo.StaffNotificationOutbox")) {
        inserts++;
        assert.match(String(this.parameters.key!.value), /^[0-9a-f-]{36}$/);
        assert.equal(
          parseStaffEvent(String(this.parameters.event!.value)).recordId,
          9,
        );
      } else {
        assert.match(statement, /INSERT dbo.AuditLogs/);
        assert.doesNotMatch(
          statement,
          /DELETE|UPDATE dbo.Orders|ListingDocuments/,
        );
        audits++;
      }
      return { recordset: [] };
    },
  );
  const tx = new sql.Transaction(new sql.ConnectionPool("synthetic"));
  await enqueueStaffAlert(tx, { kind: "pilot_created", recordId: 9 });
  await enqueueListingReview(tx, 9, "draft", "pending_review");
  await enqueueListingReview(tx, 9, "published", "pending_review");
  await enqueueListingReview(tx, 9, "pending_review", "pending_review");
  await enqueueListingReview(tx, 9, "draft", "draft");
  assert.equal(inserts, 3);
  const auth = { userId: 1, companyId: 2, isAdmin: false };
  await auditListingLifecycle(tx, auth, 9, "published", "closed");
  await auditListingLifecycle(tx, auth, 9, "closed", "draft");
  await auditListingLifecycle(tx, auth, 9, "closed", "closed");
  assert.equal(audits, 2);
});
