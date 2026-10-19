import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import sql from "mssql";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
process.env.AZURE_SQL_CONNECTION_STRING = "synthetic-no-network";
const { buildPilotAcknowledgementPayload, enqueuePilotAcknowledgement, processPilotAcknowledgements, handlePilotAcknowledgementRoute } = await import("./pilot-acknowledgements.js");

function config(t: TestContext, overrides: Record<string, string> = {}) {
  const values = {
    PILOT_ACK_EMAIL_ENABLED: "true", PILOT_ACK_EMAIL_MODE: "test",
    PILOT_ACK_EMAIL_TEST_RECIPIENT: "info@ecoglobeworld.com",
    PILOT_ACK_EMAIL_ALLOWED_RECIPIENTS: "info@ecoglobeworld.com",
    PILOT_ACK_WEB_URL: "https://app.example.invalid", ECOGLOBE_EMAIL_OVERRIDE_ALL: "false",
    RESEND_API_KEY: "synthetic", RESEND_FROM_EMAIL: "noreply@example.invalid",
    ECOGLOBE_EMAIL_TEST_RECIPIENT: "other@example.invalid", ...overrides,
  };
  const saved = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  t.after(() => { for (const [key, value] of saved) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  Object.assign(process.env, values);
}
const snapshot = { requestId: 12, intendedRecipient: "creator@example.invalid", recipientVerified: true, isTest: true };

test("QA acknowledgement contains only a reference, receipt and authenticated link", (t) => {
  config(t);
  const payload = buildPilotAcknowledgementPayload(snapshot);
  assert.deepEqual(payload.to, ["info@ecoglobeworld.com"]);
  assert.match(payload.subject, /QA TEST ONLY.*PR-12/);
  assert.match(payload.text!, /pending EcoGlobe review/);
  assert.match(payload.text!, /does not confirm a booking or purchase/);
  assert.match(payload.html, /https:\/\/app.example.invalid\/buyer\/pilots\/12/);
  assert.doesNotMatch(JSON.stringify(payload), /creator@example|address|tonnage|tomorrow/);
  process.env.PILOT_ACK_WEB_URL = "https://app.example.invalid/?<script>";
  assert.throws(() => buildPilotAcknowledgementPayload(snapshot));
});

test("recipient verification and configuration fail closed, independently from global/staff/refund opt-ins", (t) => {
  config(t);
  for (const intendedRecipient of [null, "", "unverified@example.invalid", "a\r\nb@example.invalid", "a@example.invalid,other@example.invalid", "<a>@example.invalid"]) {
    assert.throws(() => buildPilotAcknowledgementPayload({ ...snapshot, intendedRecipient, recipientVerified: false }));
    if (intendedRecipient !== "unverified@example.invalid")
      assert.throws(() => buildPilotAcknowledgementPayload({ ...snapshot, intendedRecipient }));
  }
  for (const [key, value] of [
    ["PILOT_ACK_EMAIL_MODE", ""], ["PILOT_ACK_EMAIL_MODE", "buyer"],
    ["PILOT_ACK_EMAIL_TEST_RECIPIENT", "other@example.invalid"],
    ["PILOT_ACK_EMAIL_ALLOWED_RECIPIENTS", "info@ecoglobeworld.com,other@example.invalid"],
    ["PILOT_ACK_EMAIL_ALLOWED_RECIPIENTS", ""],
    ["PILOT_ACK_WEB_URL", "javascript:alert(1)"], ["PILOT_ACK_WEB_URL", "https://user:pass@example.invalid"],
    ["PILOT_ACK_WEB_URL", "https://app.example.invalid/path"], ["PILOT_ACK_WEB_URL", "https://app.example.invalid/#hash"],
  ]) {
    const original = process.env[key!]; process.env[key!] = value;
    assert.throws(() => buildPilotAcknowledgementPayload(snapshot), `${key}=${value}`);
    process.env[key!] = original;
  }
  process.env.ECOGLOBE_EMAIL_OVERRIDE_ALL = "true";
  process.env.ECOGLOBE_EMAIL_TEST_RECIPIENT = "other@example.invalid";
  assert.throws(() => buildPilotAcknowledgementPayload(snapshot));
  process.env.ECOGLOBE_EMAIL_TEST_RECIPIENT = "info@ecoglobeworld.com";
  assert.deepEqual(buildPilotAcknowledgementPayload(snapshot).to, ["info@ecoglobeworld.com"]);
});

test("buyer mode targets only the saved verified creator with explicit allowlist and matching redirect", (t) => {
  config(t, { PILOT_ACK_EMAIL_MODE: "buyer", PILOT_ACK_EMAIL_ALLOWED_RECIPIENTS: "creator@example.invalid" });
  const buyer = { ...snapshot, isTest: false };
  const payload = buildPilotAcknowledgementPayload(buyer);
  assert.deepEqual(payload.to, ["creator@example.invalid"]);
  assert.doesNotMatch(payload.subject, /QA|TEST/);
  assert.throws(() => buildPilotAcknowledgementPayload({ ...buyer, intendedRecipient: "new@example.invalid" }));
  assert.throws(() => buildPilotAcknowledgementPayload({ ...buyer, recipientVerified: false }));
  process.env.PILOT_ACK_EMAIL_ALLOWED_RECIPIENTS = "";
  assert.deepEqual(buildPilotAcknowledgementPayload(buyer).to, ["creator@example.invalid"]);
  process.env.PILOT_ACK_EMAIL_ENABLED = "false";
  assert.throws(() => buildPilotAcknowledgementPayload(buyer));
  process.env.PILOT_ACK_EMAIL_ENABLED = "true";
  process.env.ECOGLOBE_EMAIL_OVERRIDE_ALL = "true";
  assert.throws(() => buildPilotAcknowledgementPayload(buyer));
});

test("disabled processor touches neither SQL nor transport even with other email settings enabled", async (t) => {
  config(t, { PILOT_ACK_EMAIL_ENABLED: "false" });
  const connect = t.mock.method(sql, "connect", async () => { throw new Error("SQL forbidden"); });
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("network forbidden"); });
  assert.equal(await processPilotAcknowledgements(), 0);
  assert.equal(connect.mock.callCount(), 0);
  assert.equal(fetch.mock.callCount(), 0);
});

test("enqueue uses the transaction and creator record, snapshots once, and records unverified or invalid addresses as unsendable", async (t) => {
  config(t);
  let creator: { email: string; emailVerifiedAt: Date | null } | undefined = { email: "Creator@Example.invalid", emailVerifiedAt: new Date() };
  const inserts: Array<Record<string, unknown>> = [];
  const tx = new sql.Transaction(new sql.ConnectionPool("synthetic"));
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("network forbidden"); });
  t.mock.method(sql.Request.prototype, "query", async function (this: sql.Request, statement: string) {
    if (statement.startsWith("SELECT")) {
      assert.match(statement, /u.Id=p.CreatedByUserId.*p.Id=@id AND u.Id=@user/);
      assert.equal(this.parameters.user!.value, 7);
      return { recordset: creator ? [creator] : [] };
    }
    assert.match(statement, /INSERT dbo.PilotAcknowledgementOutbox/);
    inserts.push(Object.fromEntries(Object.entries(this.parameters).map(([k, v]) => [k, v.value])));
    return { recordset: [] };
  });
  await enqueuePilotAcknowledgement(tx, { requestId: 12, userId: 7 });
  assert.equal(inserts[0]!.recipient, "creator@example.invalid");
  assert.equal(inserts[0]!.state, "queued");
  assert.deepEqual(JSON.parse(String(inserts[0]!.payload)).to, ["info@ecoglobeworld.com"]);
  assert.match(String(inserts[0]!.key), /^[0-9a-f-]{36}$/);
  for (creator of [{ email: "user@example.invalid", emailVerifiedAt: null }, { email: "bad", emailVerifiedAt: new Date() }, undefined]) {
    await enqueuePilotAcknowledgement(tx, { requestId: 12, userId: 7 });
    assert.equal(inserts.at(-1)!.state, "needs_review");
    assert.equal(inserts.at(-1)!.payload, null);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("processor freezes payload/key, bounds claims, retries only 429, and retains ambiguous claims", async (t) => {
  config(t);
  t.mock.method(sql, "connect", async () => new sql.ConnectionPool("synthetic"));
  const payloadJson = JSON.stringify(buildPilotAcknowledgementPayload(snapshot));
  const job = { ...snapshot, id: 4, eventKey: "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA", attempts: 1, payloadJson };
  let jobs = 1, mode = "success", live = true;
  const changes: Array<Record<string, unknown>> = [];
  t.mock.method(sql.Request.prototype, "query", async function (this: sql.Request, statement: string) {
    const params = Object.fromEntries(Object.entries(this.parameters).map(([k, v]) => [k, v.value]));
    if (statement.includes("WITH candidate")) {
      assert.match(statement, /UPDLOCK,READPAST,READCOMMITTEDLOCK/);
      assert.match(statement, /Attempts<3/);
      return { recordset: jobs-- > 0 ? [{ ...job }] : [] };
    }
    if (statement.startsWith("UPDATE TOP")) {
      assert.match(statement, /State='sending' AND LeaseUntil<=SYSUTCDATETIME\(\)/);
      return { recordset: [] };
    }
    assert.doesNotMatch(statement, /SET PayloadJson|SET IntendedRecipient|SET EventKey/);
    if (statement.includes("SET LeaseUntil=LeaseUntil")) {
      assert.match(statement, /LeaseUntil>SYSUTCDATETIME\(\).*PayloadJson=@payload/);
      assert.equal(params.payload, payloadJson);
      return { recordset: live ? [{ id: 4 }] : [] };
    }
    if (statement.includes("SET State='sent'")) {
      if (mode === "save-error") throw new Error("persistence failure");
      assert.equal(params.provider, "provider-123");
      assert.match(statement, /LeaseUntil>SYSUTCDATETIME\(\)/);
      changes.push({ state: "sent" });
      return { recordset: [{ id: 4 }] };
    }
    changes.push(params);
    return { recordset: [] };
  });
  const bodies: string[] = [];
  const fetch = t.mock.method(globalThis, "fetch", async (_url: Parameters<typeof globalThis.fetch>[0], options?: Parameters<typeof globalThis.fetch>[1]) => {
    assert.equal(new Headers(options?.headers).get("Idempotency-Key"), "pilot-ack-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    bodies.push(String(options?.body));
    if (mode === "timeout") throw new Error("secret private transport details");
    const status = ["429", "503", "400"].includes(mode) ? Number(mode) : 200;
    return new Response(JSON.stringify(mode === "missing-id" ? {} : { id: "provider-123", message: "private provider details" }), { status });
  });
  const first = processPilotAcknowledgements();
  assert.equal(processPilotAcknowledgements(), first);
  assert.equal(await first, 1);
  for (mode of ["429", "503", "400", "timeout", "missing-id"]) {
    jobs = 1;
    assert.equal(await processPilotAcknowledgements(), 0);
    assert.equal(changes.at(-1)!.state, mode === "429" ? "retry" : "needs_review");
    assert.doesNotMatch(String(changes.at(-1)!.error), /private|secret/);
    assert.equal(bodies.at(-1), payloadJson);
  }
  mode = "429"; jobs = 1; job.attempts = 3;
  await processPilotAcknowledgements();
  assert.equal(changes.at(-1)!.state, "needs_review");
  job.attempts = 1; mode = "save-error"; jobs = 1;
  const before = changes.length;
  await assert.rejects(processPilotAcknowledgements(), /persistence failure/);
  assert.equal(changes.length, before, "persistence failure never becomes a transport retry");
  mode = "success"; jobs = 30;
  assert.equal(await processPilotAcknowledgements(), 10);
  live = false; jobs = 1;
  const sends = fetch.mock.callCount();
  assert.equal(await processPilotAcknowledgements(), 0);
  assert.equal(fetch.mock.callCount(), sends, "expired claim never sends");
  live = true;
  for (const [key, value] of [["PILOT_ACK_WEB_URL", "https://changed.example.invalid"], ["PILOT_ACK_EMAIL_MODE", "buyer"], ["PILOT_ACK_EMAIL_TEST_RECIPIENT", "changed@example.invalid"], ["RESEND_FROM_EMAIL", "changed@example.invalid"], ["RESEND_API_KEY", ""]]) {
    const original = process.env[key!]; process.env[key!] = value;
    jobs = 1;
    assert.equal(await processPilotAcknowledgements(), 0);
    assert.equal(fetch.mock.callCount(), sends, "configuration drift never sends or rewrites the job");
    assert.match(String(changes.at(-1)!.error), /configuration/);
    process.env[key!] = original;
  }
});

test("operator status rejects anonymous access before SQL", async (t) => {
  const req = Readable.from([]) as IncomingMessage;
  req.headers = {}; req.method = "GET";
  const headers = new Map<string, unknown>();
  const res = { setHeader: (key: string, value: unknown) => headers.set(key, value) } as unknown as ServerResponse;
  const connect = t.mock.method(sql, "connect", async () => { throw new Error("SQL forbidden"); });
  await assert.rejects(handlePilotAcknowledgementRoute(req, res, new URL("https://localhost/api/admin/pilot-acknowledgements")), /Missing or invalid bearer/);
  assert.equal(headers.get("cache-control"), "private, no-store");
  assert.equal(connect.mock.callCount(), 0);
});
