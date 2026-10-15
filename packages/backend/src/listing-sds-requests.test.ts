import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import sql from "mssql";
// Driver-level tests are synthetic and never connect to SQL.
process.env.AZURE_SQL_CONNECTION_STRING = "synthetic-test-no-network";
process.env.SQL_CONNECTION_STRING = "synthetic-test-no-network";
const {
  createListingSdsRequestHandler,
  createListingSdsRequest,
  readListingSdsRequest,
  sdsListingId,
} = await import("./listing-sds-requests.js");
const { ApiError } = await import("./http.js");
const { usableListingDocumentSql } = await import("./listing-safety.js");
const auth = { userId: 7, companyId: 2, isAdmin: false };
const requested = {
  status: "requested" as const,
  listingId: 11,
  id: 5,
  requestedAt: "2026-10-15T00:00:00.000Z",
};
function request(method: string, body = "{}") {
  const req = Readable.from(body ? [body] : []) as IncomingMessage;
  req.method = method;
  req.headers = {};
  return req;
}
function output() {
  let status = 0,
    body = "";
  const headers = new Map<string, unknown>();
  return {
    headers,
    status: () => status,
    body: () => JSON.parse(body),
    response: {
      setHeader: (key: string, value: unknown) => headers.set(key, value),
      writeHead: (value: number) => {
        status = value;
      },
      end: (value: string) => {
        body = value;
      },
    } as unknown as ServerResponse,
  };
}
test("SDS route authenticates first, rejects caller identity/recipient fields and caches no scoped responses", async () => {
  let calls = 0;
  const repository = {
    readListingSdsRequest: async () => {
      calls++;
      return requested;
    },
    createListingSdsRequest: async () => {
      calls++;
      return { created: true, sdsRequest: requested };
    },
  };
  const handler = createListingSdsRequestHandler(async () => auth, repository);
  for (const body of [
    '{"sellerCompanyId":9}',
    '{"buyerCompanyId":3}',
    '{"userId":1}',
    '{"subject":"x"}',
    "[]",
    "null",
    "broken",
  ]) {
    const out = output();
    await assert.rejects(
      handler(
        request("POST", body),
        out.response,
        new URL("http://local/api/listings/11/sds-request"),
      ),
      (e: unknown) => e instanceof ApiError && e.status === 400,
    );
    assert.equal(out.headers.get("cache-control"), "private, no-store");
  }
  const out = output();
  await assert.rejects(
    createListingSdsRequestHandler(async () => {
      throw new ApiError(401, "Denied");
    }, repository)(
      request("POST"),
      out.response,
      new URL("http://local/api/listings/bad/sds-request"),
    ),
    (e: unknown) => e instanceof ApiError && e.status === 401,
  );
  assert.equal(out.headers.get("cache-control"), "private, no-store");
  assert.equal(calls, 0);
  assert.equal(
    await handler(
      request("POST"),
      out.response,
      new URL("http://local/api/listings/11/favorite"),
    ),
    false,
  );
  for (const id of ["0", "01", "-1", "1e2", "1.5", "2147483648", "x", ""])
    assert.throws(() => sdsListingId(id));
  assert.equal(sdsListingId("2147483647"), 2147483647);
  await handler(
    request("POST", ""),
    out.response,
    new URL("http://local/api/listings/11/sds-request"),
  );
  assert.equal(out.status(), 201);
  assert.deepEqual(out.body(), {
    ok: true,
    created: true,
    sdsRequest: requested,
  });
  await createListingSdsRequestHandler(async () => auth, {
    ...repository,
    createListingSdsRequest: async () => ({
      created: false,
      sdsRequest: requested,
    }),
  })(
    request("POST"),
    out.response,
    new URL("http://local/api/listings/11/sds-request"),
  );
  assert.equal(out.status(), 200);
  await handler(
    request("GET"),
    out.response,
    new URL("http://local/api/listings/11/sds-request"),
  );
  assert.deepEqual(out.body(), { ok: true, sdsRequest: requested });
  await assert.rejects(
    handler(
      request("DELETE"),
      out.response,
      new URL("http://local/api/listings/11/sds-request"),
    ),
    (e: unknown) => e instanceof ApiError && e.status === 405,
  );
});

test("actual SDS transaction rejects inaccessible tenants/SDS, dedupes by company and rolls back notification/request failures", async (t) => {
  let mode = "new";
  const events: string[] = [];
  t.mock.method(
    sql,
    "connect",
    async () => new sql.ConnectionPool("synthetic"),
  );
  t.mock.method(sql.Transaction.prototype, "begin", async () => {
    events.push("begin");
  });
  t.mock.method(sql.Transaction.prototype, "commit", async () => {
    events.push("commit");
  });
  t.mock.method(sql.Transaction.prototype, "rollback", async () => {
    events.push("rollback");
  });
  t.mock.method(
    sql.Request.prototype,
    "query",
    async function (this: sql.Request, statement: string) {
      const params = this.parameters;
      const rows = (recordset: unknown[]) => ({ recordset });
      if (statement.includes("FROM dbo.Listings l")) {
        events.push("listing-lock");
        assert.match(statement, /UPDLOCK,HOLDLOCK/);
        assert.match(statement, /ls.Code='published'/);
        assert.match(statement, /vs.Code<>'inactive'/);
        return rows(
          mode === "hidden"
            ? []
            : [
                {
                  sellerCompanyId: mode === "self" ? 2 : 9,
                  title: "Synthetic test listing",
                },
              ],
        );
      }
      if (statement.includes("FROM dbo.CompanyMembers m")) {
        events.push("buyer");
        assert.equal(params.user?.value, 7);
        assert.equal(params.buyer?.value, 2);
        assert.match(statement, /ms.Code='active'/);
        assert.match(statement, /ct.Code IN \('buyer','both'\)/);
        assert.match(statement, /cs.Code NOT IN \('inactive','suspended'\)/);
        assert.doesNotMatch(statement, /isAdmin|CanExecuteTransactions/);
        return rows(mode === "ineligible" ? [] : [{ Id: 2 }]);
      }
      if (statement.includes("FROM dbo.ListingDocuments d")) {
        events.push("sds");
        assert.ok(statement.includes(usableListingDocumentSql));
        assert.match(statement, /d.DeletedAt IS NULL/);
        return rows(mode === "available" ? [{ Id: 1 }] : []);
      }
      if (statement.includes("FROM dbo.ListingSdsRequests")) {
        events.push("existing");
        assert.equal(params.buyer?.value, 2);
        assert.match(statement, /ListingId=@listing AND BuyerCompanyId=@buyer/);
        return rows(
          mode === "repeat"
            ? [{ id: 5, requestedAt: new Date(requested.requestedAt) }]
            : [],
        );
      }
      if (statement.includes("INSERT dbo.Notifications")) {
        events.push("notification");
        assert.equal(params.seller?.value, 9);
        assert.equal(params.subject?.value, "SDS requested");
        assert.match(
          statement,
          /ch.Code='in_app'.*cat.Code='compliance'.*st.Code='sent'.*rt.Code='listing'/s,
        );
        assert.doesNotMatch(statement, /Notifications\(UserId|email/);
        if (mode === "notification-error")
          throw new Error("Synthetic notification failure");
        return rows(mode === "lookup-missing" ? [] : [{ id: 20 }]);
      }
      if (statement.includes("INSERT dbo.ListingSdsRequests")) {
        events.push("request");
        assert.equal(params.notification?.value, 20);
        if (mode === "request-error")
          throw new Error("Synthetic request failure");
        return rows([{ id: 5, requestedAt: new Date(requested.requestedAt) }]);
      }
      throw new Error("Unexpected SQL: " + statement);
    },
  );
  assert.deepEqual(await createListingSdsRequest(auth, 11), {
    created: true,
    sdsRequest: requested,
  });
  assert.deepEqual(events, [
    "begin",
    "listing-lock",
    "buyer",
    "sds",
    "existing",
    "notification",
    "request",
    "commit",
  ]);
  for (const [next, status] of [
    ["hidden", 404],
    ["self", 403],
    ["ineligible", 403],
    ["available", 409],
  ] as const) {
    mode = next;
    events.length = 0;
    await assert.rejects(
      createListingSdsRequest({ ...auth, isAdmin: true }, 11),
      (e: unknown) => e instanceof ApiError && e.status === status,
    );
    assert.equal(events.at(-1), "rollback");
    assert.ok(!events.includes("notification"));
  }
  mode = "repeat";
  events.length = 0;
  assert.deepEqual(await createListingSdsRequest(auth, 11), {
    created: false,
    sdsRequest: requested,
  });
  assert.ok(!events.includes("notification"));
  assert.deepEqual(await readListingSdsRequest(auth, 11), requested);
  mode = "new";
  assert.deepEqual(await readListingSdsRequest(auth, 11), {
    status: "not_requested",
    listingId: 11,
  });
  mode = "available";
  assert.deepEqual(await readListingSdsRequest(auth, 11), {
    status: "available",
    listingId: 11,
  });
  for (const next of [
    "notification-error",
    "lookup-missing",
    "request-error",
  ]) {
    mode = next;
    events.length = 0;
    await assert.rejects(createListingSdsRequest(auth, 11));
    assert.equal(events.at(-1), "rollback");
    assert.ok(!events.includes("commit"));
    if (next !== "request-error") assert.ok(!events.includes("request"));
  }
  await assert.rejects(
    createListingSdsRequest({ userId: 7, isAdmin: true }, 11),
    (e: unknown) => e instanceof ApiError && e.status === 403,
  );
});
