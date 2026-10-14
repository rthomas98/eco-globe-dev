/** Real SQL + HTTP acceptance. Run only via the verified, provider-disabled Orca
 * environment with ORCA_SQL_DATABASE and ORCA_SQL_MARKER from its owned receipt.
 * Retains synthetic fixtures; never resets or connects to a shared database.
 */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import {
  queryRowsWithParams as query,
  sql,
  type QueryParameter,
} from "./database.js";
import { issueSession } from "./auth.js";
import { handleMarketPortfolioRoute } from "./market-portfolio-routes.js";
import { handleMarketRecordRoute } from "./market-record-routes.js";
import { handleListingRoute } from "./listing-routes.js";
import { recordInput } from "./market-record-domain.js";
import { createRecord } from "./market-record-store.js";
import {
  createPortfolio,
  changePortfolio,
  getPortfolio,
  portfolioAudit,
} from "./market-portfolio-store.js";
import { ApiError, sendJson } from "./http.js";
import type {
  MarketPortfolio,
  MarketPortfolioWrite,
  MarketPortfolioResult,
  MarketPortfolioList,
  AssignedMarketPortfolioList,
  MarketPortfolioAuditList,
} from "../../shared/src/market-portfolios-api.js";

const connection = process.env.AZURE_SQL_CONNECTION_STRING ?? "";
const database = process.env.ORCA_SQL_DATABASE;
const marker = process.env.ORCA_SQL_MARKER;
assert.match(database ?? "", /^eco_[a-f0-9]{24}$/);
assert.match(marker ?? "", /^[a-f0-9]{64}$/);
assert.match(connection, /^Server=127\.0\.0\.1,\d+;Database=eco_[a-f0-9]{24};/);
const identity = await query<{ name: string; token: string }>(
  "SELECT DB_NAME() name,Token token FROM dbo.OrcaOwner",
);
assert.equal(identity[0]?.name, database);
assert.equal(identity[0]?.token, marker);
const int = (name: string, value: number): QueryParameter => ({
  name,
  value,
  type: sql.Int,
});
const str = (name: string, value: string): QueryParameter => ({
  name,
  value,
  type: sql.NVarChar(sql.MAX),
});
const unique = randomUUID();
const user = (
  await query<{ Id: number }>(
    `INSERT dbo.Users(Name,Email,AccountStatusId,EmailVerifiedAt) OUTPUT INSERTED.Id
 VALUES('Synthetic portfolio reviewer',@email,(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),SYSUTCDATETIME())`,
    [str("email", `portfolio-${unique}@example.invalid`)],
  )
)[0]!.Id;
async function company(role: "admin" | "buyer") {
  const id = (
    await query<{ Id: number }>(
      `INSERT dbo.Companies(LegalName,CompanyTypeId,VerificationStatusId,CreatedByUserId,UpdatedByUserId)
 OUTPUT INSERTED.Id VALUES(@name,(SELECT Id FROM dbo.CompanyTypes WHERE Code='both'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='verified'),@user,@user)`,
      [
        str("name", `Synthetic portfolio ${role} ${randomUUID()}`),
        int("user", user),
      ],
    )
  )[0]!.Id;
  await query(
    `INSERT dbo.CompanyMembers(UserId,CompanyId,MemberRoleId,PermissionTierId,MemberStatusId) VALUES(@user,@company,
 (SELECT Id FROM dbo.MemberRoles WHERE Code=@role),(SELECT Id FROM dbo.PermissionTiers WHERE Code=@tier),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'))`,
    [
      int("user", user),
      int("company", id),
      str("role", role === "admin" ? "admin" : "owner"),
      str("tier", role === "admin" ? "admin_override" : "executor"),
    ],
  );
  return id;
}
const adminCompany = await company("admin"),
  assignedCompany = await company("buyer"),
  unrelatedCompany = await company("buyer");
const location = (
  await query<{ Id: number }>(
    `INSERT dbo.Locations(CompanyId,LocationTypeId,Name,AddressLine1,City,CountryCode,Latitude,Longitude)
 OUTPUT INSERTED.Id VALUES(@company,(SELECT TOP(1) Id FROM dbo.LocationTypes ORDER BY Id),'Synthetic facility','1 Synthetic Road','Example','US',30,-91)`,
    [int("company", adminCompany)],
  )
)[0]!.Id;
async function listing(status: "published" | "draft") {
  return (
    await query<{ Id: number }>(
      `INSERT dbo.Listings(SellerCompanyId,LocationId,Title,Slug,MaterialTypeId,Quantity,QuantityUnit,MinimumOrderQuantity,PricePerUnit,CurrencyCode,ListingStatusId)
 OUTPUT INSERTED.Id VALUES(@company,@location,'Synthetic portfolio feedstock',@slug,(SELECT TOP(1) Id FROM dbo.MaterialTypes ORDER BY Id),10,'t',1,1,'USD',(SELECT Id FROM dbo.ListingStatuses WHERE Code=@status))`,
      [
        int("company", adminCompany),
        int("location", location),
        str("slug", `synthetic-portfolio-${randomUUID()}`),
        str("status", status),
      ],
    )
  )[0]!.Id;
}
const listingA = await listing("published"),
  listingB = await listing("published"),
  draft = await listing("draft");
const record = await createRecord(
  recordInput({
    role: "seller",
    companyName: `Synthetic research ${unique}`,
    feedstock: "Synthetic research feedstock",
    sourceRecordType: "estimate",
  }),
  user,
);
const tokens = await Promise.all(
  [
    [adminCompany, "admin"],
    [assignedCompany, "buyer"],
    [unrelatedCompany, "buyer"],
  ].map(
    async ([companyId, role]) =>
      (
        await issueSession({
          userId: user,
          activeCompanyId: Number(companyId),
          activeRoleCode: String(role),
        })
      ).token,
  ),
);
const [admin, assigned, unrelated] = tokens;
const preservedTables = [
  "MarketRecords",
  "Listings",
  "Companies",
  "ListingDocuments",
  "Orders",
  "MarketReferences",
  "MarketReferenceRecords",
] as const;
async function snapshots() {
  const result: Record<string, { count: number; sha256: string }> = {};
  for (const table of preservedTables) {
    const rows = await query<{ payload: string | null; count: number }>(
      `SELECT (SELECT * FROM dbo.${table} ORDER BY ${table === "MarketReferenceRecords" ? "ReferenceId,MarketRecordId" : "Id"} FOR JSON PATH,INCLUDE_NULL_VALUES) payload,(SELECT COUNT(*) FROM dbo.${table}) count`,
    );
    result[table] = {
      count: rows[0]!.count,
      sha256: createHash("sha256")
        .update(rows[0]!.payload ?? "[]")
        .digest("hex"),
    };
  }
  return result;
}
const before = await snapshots();
const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://local");
  void (async () => {
    if (await handleMarketPortfolioRoute(req, res, url)) return;
    if (await handleMarketRecordRoute(req, res, url)) return;
    if (await handleListingRoute(req, res, url)) return;
    sendJson(res, 404, { ok: false });
  })().catch((error) =>
    sendJson(res, error instanceof ApiError ? error.status : 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Smoke error",
    }),
  );
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert.ok(address && typeof address !== "string");
const origin = `http://127.0.0.1:${address.port}`;
let assertions = 0;
async function call<T = unknown>(
  path: string,
  token: string | undefined,
  method = "GET",
  body?: unknown,
  expected = 200,
) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: ${JSON.stringify(result)}`,
  );
  assertions++;
  return result as T;
}
try {
  const data: MarketPortfolioWrite = {
    name: `Synthetic portfolio ${unique}`,
    description: "Internal synthetic research",
    recordIds: [record.id],
    listingIds: [listingA],
    companyIds: [assignedCompany],
    reason: "Synthetic acceptance create",
  };
  const prefix = "/api/admin/market-portfolios";
  await call(prefix, undefined, "GET", undefined, 401);
  await call(prefix, assigned, "GET", undefined, 403);
  let portfolio: MarketPortfolio = (
    await call<MarketPortfolioResult>(prefix, admin, "POST", data, 201)
  ).portfolio;
  assert.match(portfolio.version, /^[a-f0-9]{16}$/);
  assert.deepEqual(portfolio.recordIds, [record.id]);
  assert.deepEqual(portfolio.listingIds, [listingA]);
  assert.deepEqual(portfolio.companyIds, [assignedCompany]);
  const assignedGroups = await call<AssignedMarketPortfolioList>(
    "/api/market-portfolios/assigned",
    assigned,
  );
  assert.deepEqual(assignedGroups.portfolios, [
    { id: portfolio.id, name: data.name },
  ]);
  assert.deepEqual(
    (
      await call<AssignedMarketPortfolioList>(
        "/api/market-portfolios/assigned",
        unrelated,
      )
    ).portfolios,
    [],
  );
  const selected = `/api/listings?scope=public&portfolioId=${portfolio.id}`;
  await call(selected, undefined, "GET", undefined, 401);
  await call(selected, unrelated, "GET", undefined, 403);
  await call(
    "/api/listings?scope=public&portfolioId=invalid",
    assigned,
    "GET",
    undefined,
    400,
  );
  for (const token of [assigned, admin])
    assert.deepEqual(
      (
        await call<{ listings: { id: number }[] }>(selected, token)
      ).listings.map((l: { id: number }) => l.id),
      [listingA],
    );
  const defaultIds = (
    await call<{ listings: { id: number }[] }>(
      "/api/listings?scope=public",
      assigned,
    )
  ).listings.map((l: { id: number }) => l.id);
  assert.ok(
    defaultIds.includes(listingA) &&
      defaultIds.includes(listingB) &&
      !defaultIds.includes(draft),
  );
  const internal = await call<{ records: { id: number }[] }>(
    `/api/admin/market-records?portfolioId=${portfolio.id}`,
    admin,
  );
  assert.deepEqual(
    internal.records.map((r: { id: number }) => r.id),
    [record.id],
  );
  await call(
    `/api/admin/market-records?portfolioId=0`,
    admin,
    "GET",
    undefined,
    400,
  );
  assert.deepEqual(
    (
      await call<MarketPortfolioList>(
        prefix + `?search=${encodeURIComponent(data.name)}`,
        admin,
      )
    ).portfolios.map((p: { id: number }) => p.id),
    [portfolio.id],
  );
  const versionBefore = portfolio.version;
  const changes = {
    ...data,
    listingIds: [listingB],
    reason: "Synthetic membership replacement",
    expectedVersion: portfolio.version,
  };
  portfolio = (
    await call<MarketPortfolioResult>(
      `${prefix}/${portfolio.id}`,
      admin,
      "PATCH",
      changes,
    )
  ).portfolio;
  assert.notEqual(portfolio.version, versionBefore);
  assert.deepEqual(portfolio.listingIds, [listingB]);
  await call(`${prefix}/${portfolio.id}`, admin, "PATCH", changes, 409);
  const auditBeforeInvalid = await portfolioAudit(portfolio.id);
  for (const invalid of [
    { ...data, listingIds: [draft] },
    { ...data, companyIds: [2147483647] },
    { ...data, recordIds: [2147483647] },
  ]) {
    await call(
      `${prefix}/${portfolio.id}`,
      admin,
      "PATCH",
      { ...invalid, expectedVersion: portfolio.version },
      400,
    );
    assert.deepEqual(await getPortfolio(portfolio.id), portfolio);
    assert.deepEqual(await portfolioAudit(portfolio.id), auditBeforeInvalid);
  }
  const results = await Promise.allSettled(
    ["A", "B"].map((name) =>
      changePortfolio(portfolio.id, portfolio.version, user, {
        action: "update",
        data: { ...data, name: data.name + name },
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const rejected = results.find((r) => r.status === "rejected");
  assert.ok(
    rejected?.status === "rejected" &&
      rejected.reason instanceof ApiError &&
      rejected.reason.status === 409,
  );
  portfolio = await getPortfolio(portfolio.id);
  portfolio = (
    await call<MarketPortfolioResult>(
      `${prefix}/${portfolio.id}/archive`,
      admin,
      "POST",
      {
        expectedVersion: portfolio.version,
        reason: "Synthetic archive",
      },
    )
  ).portfolio;
  await call(selected, assigned, "GET", undefined, 403);
  await call(selected, admin, "GET", undefined, 403);
  assert.deepEqual(
    (
      await call<AssignedMarketPortfolioList>(
        "/api/market-portfolios/assigned",
        assigned,
      )
    ).portfolios,
    [],
  );
  portfolio = (
    await call<MarketPortfolioResult>(
      `${prefix}/${portfolio.id}/restore`,
      admin,
      "POST",
      {
        expectedVersion: portfolio.version,
        reason: "Synthetic restore",
      },
    )
  ).portfolio;
  assert.equal(portfolio.status, "active");
  await query(
    "UPDATE dbo.Listings SET ListingStatusId=(SELECT Id FROM dbo.ListingStatuses WHERE Code='draft') WHERE Id=@id",
    [int("id", listingA)],
  );
  assert.deepEqual(
    (await call<{ listings: { id: number }[] }>(selected, assigned)).listings,
    [],
  );
  await query(
    "UPDATE dbo.Listings SET ListingStatusId=(SELECT Id FROM dbo.ListingStatuses WHERE Code='published') WHERE Id=@id",
    [int("id", listingA)],
  );
  await query(
    "UPDATE dbo.CompanyMembers SET MemberStatusId=(SELECT Id FROM dbo.AccountStatuses WHERE Code='inactive') WHERE UserId=@user AND CompanyId=@company",
    [int("user", user), int("company", assignedCompany)],
  );
  await call(selected, assigned, "GET", undefined, 401);
  await query(
    "UPDATE dbo.CompanyMembers SET MemberStatusId=(SELECT Id FROM dbo.AccountStatuses WHERE Code='active') WHERE UserId=@user AND CompanyId=@company",
    [int("user", user), int("company", assignedCompany)],
  );
  const events = (
    await call<MarketPortfolioAuditList>(
      `${prefix}/${portfolio.id}/audit`,
      admin,
    )
  ).events;
  assert.deepEqual(
    events.map((event: { action: string }) => event.action).sort(),
    ["created", "updated", "updated", "archive", "restore"].sort(),
  );
  assert.ok(
    events.every(
      (event: { actorUserId: number; reason: string }) =>
        event.actorUserId === user && event.reason,
    ),
  );
  const empty = await createPortfolio(
    {
      ...data,
      name: data.name + " empty",
      recordIds: [],
      listingIds: [],
      companyIds: [],
    },
    user,
  );
  assert.deepEqual(
    [empty.recordIds, empty.listingIds, empty.companyIds],
    [[], [], []],
  );
  const after = await snapshots();
  assert.deepEqual(after, before);
  console.log(
    JSON.stringify(
      {
        passed: true,
        evidence: "real local SQL and HTTP; no browser/provider claim",
        database,
        assertions,
        fixture: {
          user,
          adminCompany,
          assignedCompany,
          unrelatedCompany,
          listingA,
          listingB,
          draft,
          recordId: record.id,
          portfolioId: portfolio.id,
          emptyPortfolioId: empty.id,
        },
        preserved: after,
      },
      null,
      2,
    ),
  );
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await (await sql.connect(connection)).close();
}
