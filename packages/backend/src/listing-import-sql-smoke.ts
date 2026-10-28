/** Retained synthetic fixtures; explicitly guarded to this worktree's owned local SQL. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { issueSession } from "./auth.js";
import { handleListingImportRoute } from "./listing-import-routes.js";
import { handleListingRoute } from "./listing-routes.js";
import {
  queryRowsWithParams as query,
  sql,
  type QueryParameter,
} from "./database.js";
import { ApiError, sendJson } from "./http.js";
import { XLSX_MIME } from "./market-record-import.js";
import type {
  ListingImportPreview,
  ListingImportResult,
} from "../../shared/src/listing-import-api.js";

assert.equal(
  process.env.ORCA_LISTING_IMPORT_SMOKE,
  "1",
  "Explicit owned-local authorization required.",
);
const database = process.env.ORCA_SQL_DATABASE,
  marker = process.env.ORCA_SQL_MARKER;
assert.match(database ?? "", /^eco_[a-f0-9]{24}$/u);
assert.match(marker ?? "", /^[a-f0-9]{64}$/u);
assert.match(
  process.env.AZURE_SQL_CONNECTION_STRING ?? "",
  /^Server=127\.0\.0\.1,\d+;Database=eco_[a-f0-9]{24};/u,
);
for (const key of [
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "DOCUSIGN_INTEGRATION_KEY",
  "DOCUSIGN_PRIVATE_KEY",
  "FEDEX_CLIENT_ID",
  "FEDEX_CLIENT_SECRET",
])
  assert.ok(!process.env[key]);
assert.notEqual(process.env.STAFF_ALERT_EMAIL_ENABLED, "true");
const owner = (
  await query<{ name: string; token: string }>(
    "SELECT DB_NAME() name,Token token FROM dbo.OrcaOwner",
  )
)[0];
assert.equal(owner?.name, database);
assert.equal(owner?.token, marker);
const param = (
  name: string,
  value: unknown,
  type: QueryParameter["type"] = sql.NVarChar(sql.MAX),
): QueryParameter => ({ name, value, type });
const int = (name: string, value: unknown) => param(name, value, sql.Int);
const pool = await sql.connect(process.env.AZURE_SQL_CONNECTION_STRING!);
// Prove this additive migration is re-runnable against the owned database.
const migration = await readFile(
  new URL("../db/migrations/20261028_listing_imports.sql", import.meta.url),
  "utf8",
);
for (let pass = 0; pass < 2; pass++)
  for (const batch of migration.split(/^\s*GO\s*$/gim).filter((s) => s.trim()))
    await pool.request().batch(batch);
const stamp = randomUUID();
const user = (
  await query<{ id: number }>(
    "INSERT dbo.Users(Name,Email,AccountStatusId,EmailVerifiedAt) OUTPUT INSERTED.Id id VALUES('Synthetic import smoke',@email,(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),SYSUTCDATETIME())",
    [param("email", `listing-import-${stamp}@example.invalid`)],
  )
)[0]!.id;
async function company(role: "owner" | "admin", profile = true) {
  const id = (
    await query<{ id: number }>(
      "INSERT dbo.Companies(LegalName,CompanyTypeId,VerificationStatusId) OUTPUT INSERTED.Id id VALUES(@name,(SELECT Id FROM dbo.CompanyTypes WHERE Code='both'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='verified'))",
      [param("name", `Synthetic listing import ${stamp} ${randomUUID()}`)],
    )
  )[0]!.id;
  await query(
    "INSERT dbo.CompanyMembers(UserId,CompanyId,MemberRoleId,PermissionTierId,MemberStatusId,CanExecuteTransactions) VALUES(@user,@company,(SELECT Id FROM dbo.MemberRoles WHERE Code=@role),(SELECT Id FROM dbo.PermissionTiers WHERE Code=@tier),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),1)",
    [
      int("user", user),
      int("company", id),
      param("role", role),
      param("tier", role === "admin" ? "admin_override" : "executor"),
    ],
  );
  if (profile)
    await query(
      "INSERT dbo.SellerProfiles(CompanyId,OnboardingStatusId,SubscriptionStatusId,PayoutStatusId,ApprovalStatusId) VALUES(@company,(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),(SELECT TOP(1) Id FROM dbo.PayoutStatuses ORDER BY Id),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'))",
      [int("company", id)],
    );
  return id;
}
const seller = await company("owner"),
  other = await company("owner"),
  adminCompany = await company("admin", false);
const location = (
  await query<{ id: number }>(
    "INSERT dbo.Locations(CompanyId,LocationTypeId,Name,AddressLine1,City,CountryCode) OUTPUT INSERTED.Id id VALUES(@company,(SELECT TOP(1) Id FROM dbo.LocationTypes ORDER BY Id),'Synthetic mill','1 Synthetic Way','Synthetic','US')",
    [int("company", seller)],
  )
)[0]!.id;
const token = (
  await issueSession({
    userId: user,
    activeCompanyId: seller,
    activeRoleCode: "seller",
  })
).token;
const adminToken = (
  await issueSession({
    userId: user,
    activeCompanyId: adminCompany,
    activeRoleCode: "admin",
  })
).token;
const stranger = (
  await query<{ id: number }>(
    "INSERT dbo.Users(Name,Email,AccountStatusId,EmailVerifiedAt) OUTPUT INSERTED.Id id VALUES('Synthetic other import user',@email,(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),SYSUTCDATETIME())",
    [param("email", `listing-import-other-${stamp}@example.invalid`)],
  )
)[0]!.id;
await query(
  "INSERT dbo.CompanyMembers(UserId,CompanyId,MemberRoleId,PermissionTierId,MemberStatusId,CanExecuteTransactions) VALUES(@user,@company,(SELECT Id FROM dbo.MemberRoles WHERE Code='seller_operator'),(SELECT Id FROM dbo.PermissionTiers WHERE Code='executor'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),1)",
  [int("user", stranger), int("company", seller)],
);
const strangerToken = (
  await issueSession({
    userId: stranger,
    activeCompanyId: seller,
    activeRoleCode: "seller",
  })
).token;
const server = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? "/", "http://local");
    if (
      !(await handleListingImportRoute(req, res, url)) &&
      !(await handleListingRoute(req, res, url))
    )
      sendJson(res, 404, { ok: false });
  })().catch((error) =>
    sendJson(res, error instanceof ApiError ? error.status : 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Error",
    }),
  );
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert.ok(address && typeof address !== "string");
const base = `http://127.0.0.1:${address.port}`;
let assertions = 0;
async function call(
  path: string,
  method = "GET",
  body?: unknown,
  expected = 200,
  bearer = token,
  companyId = seller,
) {
  const raw = Buffer.isBuffer(body);
  const response = await fetch(
    `${base}/api/listing-imports${path}?sellerCompanyId=${companyId}`,
    {
      method,
      headers: {
        authorization: `Bearer ${bearer}`,
        ...(body === undefined
          ? {}
          : { "content-type": raw ? XLSX_MIME : "application/json" }),
      },
      body:
        body === undefined
          ? undefined
          : raw
            ? new Uint8Array(body)
            : JSON.stringify(body),
    },
  );
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: ${await response
      .clone()
      .text()
      .then((t) => t.slice(0, 300))}`,
  );
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assertions++;
  return response;
}
try {
  await call("/template", "GET", undefined, 403, token, other);
  await call("/template", "GET", undefined, 200, adminToken, seller);
  await call("/template", "GET", undefined, 404, adminToken, adminCompany);
  await call("/template", "GET", undefined, 401, "invalid");
  const template = await call("/template");
  assert.equal(template.headers.get("content-type"), XLSX_MIME);
  assert.equal(
    template.headers.get("content-disposition"),
    'attachment; filename="ecoglobe-listing-import-template.xlsx"',
  );
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await template.arrayBuffer());
  const material = (
    await query<{ code: string; label: string }>(
      "SELECT TOP(1) Code code,Name label FROM dbo.MaterialTypes ORDER BY Id",
    )
  )[0]!;
  const sheet = book.getWorksheet("Listings")!;
  const title = `Synthetic import ${stamp}`;
  sheet.getRow(2).values = [
    title,
    material.label,
    "1,234.125",
    "T",
    2.125,
    "$12.50",
    "USD",
    " synthetic MILL ",
    "Synthetic only",
    3.125,
    new Date("2026-10-01"),
    "2026-12-31",
  ];
  sheet.getRow(4).values = [`${title} missing fields`, material.code];
  const bytes = Buffer.from(await book.xlsx.writeBuffer());
  const upload = async (body = bytes): Promise<ListingImportPreview> =>
    (await (
      await call("/preview", "POST", body, 201)
    ).json()) as ListingImportPreview;
  const preview = await upload();
  assert.deepEqual(preview.counts, {
    total: 2,
    ready: 1,
    warning: 1,
    error: 0,
  });
  assert.equal(preview.rows[0]!.rowNumber, 2);
  assert.equal(preview.rows[1]!.rowNumber, 4);
  assert.deepEqual(await (await call(`/${preview.previewId}`)).json(), preview);
  await call(`/${preview.previewId}`, "GET", undefined, 404, strangerToken);
  await call(
    `/${preview.previewId}/commit`,
    "POST",
    { idempotencyKey: randomUUID(), unexpected: true },
    400,
  );
  const key = randomUUID();
  const results = await Promise.all([
    call(`/${preview.previewId}/commit`, "POST", { idempotencyKey: key }),
    call(`/${preview.previewId}/commit`, "POST", { idempotencyKey: key }),
  ]);
  const result = (await results[0]!.json()) as ListingImportResult;
  assert.deepEqual(await results[1]!.json(), result);
  assert.equal(result.created.length, 2);
  await call(
    `/${preview.previewId}/commit`,
    "POST",
    { idempotencyKey: randomUUID() },
    409,
  );
  const committed = (await (
    await call(`/${preview.previewId}`)
  ).json()) as ListingImportPreview;
  assert.equal(committed.committed, true);
  assert.deepEqual(committed.result, result);
  const listings = await query(
    "SELECT l.*,ls.Code status FROM dbo.Listings l JOIN dbo.ListingStatuses ls ON ls.Id=l.ListingStatusId WHERE l.Id IN (SELECT value FROM OPENJSON(@ids)) ORDER BY l.Id",
    [param("ids", JSON.stringify(result.created.map((r) => r.listingId)))],
  );
  assert.equal(listings.length, 2);
  assert.ok(listings.every((l) => l.status === "draft"));
  const first = listings[0]!;
  assert.equal(first.Quantity, 1234.125);
  assert.equal(first.MinimumOrderQuantity, 2.125);
  assert.equal(first.PricePerUnit, 12.5);
  assert.equal(first.QuantityUnit, "tonnes");
  assert.equal(first.CurrencyCode, "USD");
  assert.equal(first.LocationId, location);
  assert.equal(first.CarbonIntensityKgCo2e, 3.125);
  assert.equal(first.CreatedByUserId, user);
  assert.equal(first.UpdatedByUserId, user);
  assert.equal(
    JSON.parse(String(first.SpecificationsJson)).availabilityFrom,
    "2026-10-01",
  );
  assert.equal(
    JSON.parse(String(first.SpecificationsJson)).availabilityTo,
    "2026-12-31",
  );
  assert.equal(listings[1]!.Quantity, null);
  const audited = await query(
    "SELECT a.Id FROM dbo.AuditLogs a JOIN dbo.RecordTypes r ON r.Id=a.RecordTypeId WHERE r.Code='listing_import' AND JSON_VALUE(a.NewValue,'$.importId')=@id",
    [param("id", preview.previewId)],
  );
  assert.equal(audited.length, 1);
  // Existing save() still requires SDS before submission; single-listing draft creation also works.
  let response = await fetch(`${base}/api/listings/${first.Id}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ listingStatusCode: "pending_review" }),
  });
  assert.equal(response.status, 400);
  assert.match(
    String(((await response.json()) as { error: string }).error),
    /SDS/,
  );
  response = await fetch(`${base}/api/listings`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sellerCompanyId: seller,
      title: `${title} single save`,
      materialTypeCode: material.code,
    }),
  });
  assert.equal(response.status, 201);
  assert.equal(
    ((await response.json()) as { listing: { listingStatusCode: string } })
      .listing.listingStatusCode,
    "draft",
  );
  assertions += 2;
  const count = async () =>
    (
      await query<{ n: number }>(
        "SELECT COUNT(*) n FROM dbo.Listings WHERE SellerCompanyId=@company",
        [int("company", seller)],
      )
    )[0]!.n;
  const baseline = await count();
  const invalidBook = new ExcelJS.Workbook();
  await invalidBook.xlsx.load(new Uint8Array(bytes).buffer);
  invalidBook.getWorksheet("Listings")!.getCell("C2").value = 0;
  const invalid = await upload(
    Buffer.from(await invalidBook.xlsx.writeBuffer()),
  );
  await call(
    `/${invalid.previewId}/commit`,
    "POST",
    { idempotencyKey: randomUUID() },
    409,
  );
  // A later invalid row must prevent earlier rows from being inserted.
  sheet.getRow(3).values = [
    `${title} later facility`,
    material.code,
    1,
    "kg",
    1,
    1,
    "USD",
    "Synthetic mill",
  ];
  sheet.getCell("H2").value = null;
  const stale = await upload(Buffer.from(await book.xlsx.writeBuffer()));
  await query("UPDATE dbo.Locations SET CompanyId=@other WHERE Id=@id", [
    int("other", other),
    int("id", location),
  ]);
  await call(
    `/${stale.previewId}/commit`,
    "POST",
    { idempotencyKey: randomUUID() },
    409,
  );
  assert.equal(await count(), baseline);
  await query("UPDATE dbo.Locations SET CompanyId=@company WHERE Id=@id", [
    int("company", seller),
    int("id", location),
  ]);
  const expired = await upload();
  await query(
    "UPDATE dbo.ListingImportPreviews SET ExpiresAt=DATEADD(day,-1,SYSUTCDATETIME()) WHERE Id=@id",
    [param("id", expired.previewId)],
  );
  await call(`/${expired.previewId}`, "GET", undefined, 404);
  await call(
    `/${expired.previewId}/commit`,
    "POST",
    { idempotencyKey: randomUUID() },
    410,
  );
  const revoked = await upload();
  await query(
    "UPDATE dbo.CompanyMembers SET MemberRoleId=(SELECT Id FROM dbo.MemberRoles WHERE Code='viewer') WHERE UserId=@user AND CompanyId=@company",
    [int("user", user), int("company", seller)],
  );
  await call(
    `/${revoked.previewId}/commit`,
    "POST",
    { idempotencyKey: randomUUID() },
    403,
  );
  assert.equal(await count(), baseline);
  console.log(
    JSON.stringify({
      ok: true,
      database,
      assertions,
      previewId: preview.previewId,
      drafts: result.created.length,
      concurrentReplay: true,
      atomicRevalidation: true,
      sdsGate: true,
      singleSave: true,
      fixtureRetained: true,
    }),
  );
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.close();
}
