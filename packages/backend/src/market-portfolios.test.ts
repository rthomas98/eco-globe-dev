import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import sql from "mssql";
// Synthetic driver tests only. No network or real SQL execution is implied.
process.env.SQL_CONNECTION_STRING = "synthetic-test-no-network";
process.env.AZURE_SQL_CONNECTION_STRING = "synthetic-test-no-network";
const { portfolioInput, portfolioId, portfolioTransition } =
  await import("./market-portfolio-domain.js");
const store = await import("./market-portfolio-store.js");
const { createMarketPortfolioHandler } =
  await import("./market-portfolio-routes.js");
const { handleListingRoute } = await import("./listing-routes.js");
const { ApiError } = await import("./http.js");
const data = () => ({
  name: "Synthetic group",
  description: null,
  recordIds: [3, 1],
  listingIds: [7],
  companyIds: [2],
  reason: "Synthetic review",
});
function request(body: unknown = {}, method = "GET", token = false) {
  const req = Readable.from([JSON.stringify(body)]) as IncomingMessage;
  req.method = method;
  req.headers = {
    "content-type": "application/json",
    ...(token ? { authorization: "Bearer synthetic" } : {}),
  };
  return req;
}
function response() {
  let status = 0,
    body = "";
  const headers = new Map<string, unknown>();
  return {
    headers,
    get status() {
      return status;
    },
    json: () => JSON.parse(body),
    res: {
      setHeader: (key: string, value: unknown) => headers.set(key, value),
      writeHead(code: number) {
        status = code;
      },
      end(value: string) {
        body = value;
      },
    } as unknown as ServerResponse,
  };
}
test("portfolio writes reject unknown fields, incomplete membership, duplicate/invalid IDs and malformed versions", () => {
  assert.deepEqual(portfolioInput(data()).recordIds, [1, 3]);
  assert.deepEqual(
    portfolioInput({ ...data(), recordIds: [], listingIds: [], companyIds: [] })
      .listingIds,
    [],
  );
  for (const change of [
    { name: " " },
    { name: "x".repeat(121) },
    { description: "x".repeat(2001) },
    { reason: "" },
    { reason: "x".repeat(1001) },
    { status: "active" },
    { recordIds: [1, 1] },
    { recordIds: ["1"] },
    { recordIds: [0] },
    { recordIds: [2147483648] },
    { listingIds: Array.from({ length: 501 }, (_, i) => i + 1) },
    { companyIds: undefined },
  ])
    assert.throws(() => portfolioInput({ ...data(), ...change }));
  for (const id of ["01", "0", "-1", "1.5", "1e1", "2147483648", "", null])
    assert.throws(() => portfolioId(id));
  assert.equal(portfolioId("2147483647"), 2147483647);
  for (const value of ["abcd", 123, null, "\0".repeat(8)])
    assert.throws(() =>
      portfolioTransition({ expectedVersion: value, reason: "Test" }),
    );
  assert.equal(
    portfolioTransition({
      expectedVersion: "000000000000ABCD",
      reason: " Test ",
    }).expectedVersion,
    "000000000000abcd",
  );
  assert.throws(() => portfolioInput(data(), true));
});
test("admin guard precedes IDs/body/store work on all portfolio routes; no hard delete", async () => {
  let calls = 0;
  const repo = {
    ...store,
    listPortfolios: async () => {
      calls++;
      return [];
    },
  };
  for (const auth of [
    async () => {
      throw new ApiError(401, "Login required");
    },
    async () => ({ userId: 9, isAdmin: false, companyId: 2 }),
  ]) {
    const handler = createMarketPortfolioHandler(auth, repo);
    for (const [path, method] of [
      ["", "GET"],
      ["", "POST"],
      ["/bad", "PATCH"],
      ["/bad", "GET"],
      ["/bad/archive", "POST"],
      ["/bad/restore", "POST"],
      ["/bad/audit", "GET"],
      ["/7", "DELETE"],
    ]) {
      const out = response();
      await handler(
        request({}, method),
        out.res,
        new URL("http://local/api/admin/market-portfolios" + path),
      );
      assert.ok(out.status === 401 || out.status === 403);
      assert.equal(out.headers.get("cache-control"), "private, no-store");
    }
  }
  assert.equal(calls, 0);
  const out = response();
  await createMarketPortfolioHandler(
    async () => ({ userId: 9, isAdmin: true }),
    repo,
  )(
    request({}, "DELETE"),
    out.res,
    new URL("http://local/api/admin/market-portfolios/7"),
  );
  assert.equal(out.status, 405);
});
test("actual transaction code locks parent, checks rowversion, replaces only groups and rolls back audit/validation failures", async (t) => {
  const events: string[] = [];
  let mode = "success",
    revision = 1,
    status = "active";
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
      if (statement.startsWith("SELECT Id FROM dbo.MarketPortfolios WITH")) {
        events.push("lock");
        assert.match(statement, /UPDLOCK,HOLDLOCK/);
        return { recordset: [{ Id: 8 }] };
      }
      if (statement.startsWith("SELECT p.*")) {
        assert.match(statement, /CAST\(p.Version AS BINARY\(8\)\)/);
        return {
          recordset: [
            {
              Id: 8,
              VersionHex: revision.toString(16).padStart(16, "0"),
              Name: data().name,
              Description: null,
              Status: status,
              RecordsJson: null,
              ListingsJson: "[]",
              CompaniesJson: "",
              CreatedAt: new Date(),
              UpdatedAt: new Date(),
            },
          ],
        };
      }
      if (/^SELECT [rlc]\.Id/.test(statement)) {
        events.push("validate");
        assert.match(statement, /UPDLOCK,HOLDLOCK/);
        if (statement.includes("dbo.Listings")) {
          assert.match(statement, /s.Code='published'/);
          assert.match(statement, /cs.Code<>'inactive'/);
        }
        const values: number[] = JSON.parse(String(this.parameters.ids?.value));
        return {
          recordset: mode === "invalid" ? [] : values.map((Id) => ({ Id })),
        };
      }
      if (statement.startsWith("INSERT dbo.MarketPortfolios")) {
        events.push("insert");
        assert.equal(this.parameters.name?.value, data().name);
        return { recordset: [{ Id: 8 }] };
      }
      if (statement.startsWith("DELETE FROM dbo.MarketPortfolio")) {
        events.push("replace");
        return { recordset: [] };
      }
      if (statement.startsWith("UPDATE dbo.MarketPortfolios")) {
        events.push("update");
        revision++;
        if (this.parameters.status)
          status = String(this.parameters.status.value);
        return { recordset: [] };
      }
      if (statement.startsWith("INSERT dbo.AuditLogs")) {
        events.push("audit");
        assert.equal(this.parameters.reason?.value, data().reason);
        assert.match(statement, /market_portfolio/);
        if (mode === "audit-fail") throw new Error("audit unavailable");
        return { recordset: [] };
      }
      throw new Error("Unexpected SQL: " + statement);
    },
  );
  const created = await store.createPortfolio(data(), 9);
  assert.deepEqual(created.recordIds, []);
  assert.deepEqual(created.listingIds, []);
  assert.deepEqual(created.companyIds, []);
  assert.deepEqual(events, [
    "begin",
    "validate",
    "validate",
    "validate",
    "insert",
    "replace",
    "replace",
    "replace",
    "audit",
    "commit",
  ]);
  events.length = 0;
  const updated = await store.changePortfolio(8, created.version, 9, {
    action: "update",
    data: data(),
  });
  assert.notEqual(updated.version, created.version);
  assert.equal(events[1], "lock");
  assert.equal(events.at(-1), "commit");
  events.length = 0;
  await assert.rejects(
    store.changePortfolio(8, created.version, 9, {
      action: "update",
      data: data(),
    }),
    (e: unknown) => e instanceof ApiError && e.status === 409,
  );
  assert.deepEqual(events, ["begin", "lock", "rollback"]);
  const archived = await store.changePortfolio(8, updated.version, 9, {
    action: "archive",
    reason: data().reason,
  });
  assert.equal(archived.status, "archived");
  const restored = await store.changePortfolio(8, archived.version, 9, {
    action: "restore",
    reason: data().reason,
  });
  assert.equal(restored.status, "active");
  for (mode of ["invalid", "audit-fail"]) {
    events.length = 0;
    await assert.rejects(store.createPortfolio(data(), 9));
    assert.equal(events.at(-1), "rollback");
    assert.ok(!events.includes("commit"));
    if (mode === "invalid") assert.ok(!events.includes("insert"));
  }
});
test("assigned projection returns names only and denies missing company, unrelated/archived portfolio before catalogue/documents", async (t) => {
  let allowed = true,
    admin = false;
  const statements: string[] = [];
  t.mock.method(
    sql,
    "connect",
    async () => new sql.ConnectionPool("synthetic"),
  );
  t.mock.method(
    sql.Request.prototype,
    "query",
    async function (this: sql.Request, statement: string) {
      statements.push(statement);
      if (statement.includes("FROM dbo.UserSessions s"))
        return {
          recordset: [
            {
              userId: 9,
              activeCompanyId: 2,
              activeRoleCode: admin ? "admin" : "buyer",
              accountStatusCode: "active",
            },
          ],
        };
      if (statement.includes("UPDATE dbo.UserSessions"))
        return { recordset: [] };
      if (
        statement.includes("FROM dbo.CompanyMembers cm") &&
        !statement.includes("MarketPortfolios")
      )
        return {
          recordset: [
            {
              id: 2,
              companyTypeCode: "both",
              memberRoleCode: "admin",
              permissionTierCode: "admin_override",
            },
          ],
        };
      if (statement.startsWith("SELECT TOP (200) p.Id")) {
        assert.match(statement, /ms.Code='active'/);
        assert.match(statement, /p.Status='active'/);
        assert.match(statement, /MarketPortfolioCompanies/);
        return {
          recordset: [
            {
              id: 8,
              name: "Assigned",
              description: "Never disclose",
              recordIds: [1],
              listingIds: [7],
            },
          ],
        };
      }
      if (statement.startsWith("SELECT p.Id"))
        return { recordset: allowed ? [{ Id: 8 }] : [] };
      if (statement.includes("SELECT l.Id AS id")) {
        assert.match(
          statement,
          /ls.Code='published' AND vs.Code <> 'inactive'/,
        );
        assert.match(statement, /pl.ListingId=l.Id/);
        assert.match(statement, /p.Status='active'/);
        assert.equal(this.parameters.portfolioId?.value, 8);
        assert.equal(this.parameters.portfolioCompany?.value, 2);
        return {
          recordset: [
            {
              id: 7,
              title: "Published",
              specificationsJson: "{}",
              sellerVerificationStatusCode: "verified",
            },
          ],
        };
      }
      if (statement.includes("SELECT d.Id AS id")) {
        assert.equal(this.parameters.listingIds?.value, "[7]");
        return { recordset: [] };
      }
      throw new Error("Unexpected SQL: " + statement);
    },
  );
  assert.deepEqual(
    await store.assignedPortfolios({ userId: 9, companyId: 2, isAdmin: false }),
    [{ id: 8, name: "Assigned" }],
  );
  await assert.rejects(
    store.requirePortfolioAccess(8, undefined),
    (e: unknown) => e instanceof ApiError && e.status === 401,
  );
  await assert.rejects(
    store.requirePortfolioAccess(8, { userId: 9, isAdmin: false }),
    (e: unknown) => e instanceof ApiError && e.status === 403,
  );
  for (admin of [false, true]) {
    const out = response();
    await handleListingRoute(
      request({}, "GET", true),
      out.res,
      new URL("http://local/api/listings?scope=public&portfolioId=8"),
    );
    assert.equal(out.status, 200);
    assert.deepEqual(
      out.json().listings.map((row: { id: number }) => row.id),
      [7],
    );
    assert.equal(out.headers.get("cache-control"), "private, no-store");
  }
  allowed = false;
  statements.length = 0;
  await assert.rejects(
    handleListingRoute(
      request({}, "GET", true),
      response().res,
      new URL("http://local/api/listings?scope=public&portfolioId=8"),
    ),
    (e: unknown) => e instanceof ApiError && e.status === 403,
  );
  assert.ok(
    !statements.some(
      (s) => s.includes("SELECT l.Id AS id") || s.includes("SELECT d.Id AS id"),
    ),
  );
  statements.length = 0;
  await assert.rejects(
    handleListingRoute(
      request(),
      response().res,
      new URL("http://local/api/listings?scope=public&portfolioId=8"),
    ),
    (e: unknown) => e instanceof ApiError && e.status === 401,
  );
  assert.equal(statements.length, 0);
  await assert.rejects(
    handleListingRoute(
      request(),
      response().res,
      new URL("http://local/api/listings?portfolioId=invalid"),
    ),
    (e: unknown) => e instanceof ApiError && e.status === 400,
  );
});
