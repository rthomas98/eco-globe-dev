/** Retained synthetic fixtures; requires the owned Orca SQL runtime, never shared SQL. */
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";
import { PDFDocument } from "pdf-lib";
import {
  queryRowsWithParams as query,
  runInTransaction,
  sql,
  type QueryParameter,
} from "./database.js";
import { createPasswordUser, issueSession } from "./auth.js";
import { handleApiRoute } from "./api.js";
import { ApiError, sendJson } from "./http.js";
import { enqueueStaffAlert, processStaffAlerts } from "./staff-alerts.js";

assert.equal(
  process.env.ORCA_STAFF_ALERT_SMOKE,
  "1",
  "Explicit owned-local authorization required.",
);
const database = process.env.ORCA_SQL_DATABASE,
  marker = process.env.ORCA_SQL_MARKER;
assert.match(database ?? "", /^eco_[a-f0-9]{24}$/);
assert.match(marker ?? "", /^[a-f0-9]{64}$/);
assert.match(
  process.env.AZURE_SQL_CONNECTION_STRING ?? "",
  /^Server=127\.0\.0\.1,\d+;Database=eco_[a-f0-9]{24};/,
);
for (const key of [
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "DOCUSIGN_INTEGRATION_KEY",
  "DOCUSIGN_PRIVATE_KEY",
  "FEDEX_CLIENT_ID",
  "FEDEX_CLIENT_SECRET",
])
  assert.ok(!process.env[key], `${key} must be empty`);
assert.notEqual(process.env.STAFF_ALERT_EMAIL_ENABLED, "true");
const owner = (
  await query<{ name: string; token: string }>(
    "SELECT DB_NAME() name,Token token FROM dbo.OrcaOwner",
  )
)[0];
assert.equal(owner?.name, database);
assert.equal(owner?.token, marker);
const int = (name: string, value: unknown): QueryParameter => ({
  name,
  value,
  type: sql.Int,
});
const str = (name: string, value: unknown): QueryParameter => ({
  name,
  value,
  type: sql.NVarChar(sql.MAX),
});
const pool = await sql.connect(process.env.AZURE_SQL_CONNECTION_STRING!);
const migration = await readFile(
  new URL("../db/migrations/20261019_staff_alerts.sql", import.meta.url),
  "utf8",
);
for (let pass = 0; pass < 2; pass++)
  for (const batch of migration.split(/^\s*GO\s*$/gim).filter((s) => s.trim()))
    await pool.request().batch(batch);
const preserved: Array<{ table: string; max: number; digest: string }> = [];
async function digest(table: string, max: number) {
  const row = (
    await query<{ value: string | null; rowCount: number }>(
      `SELECT (SELECT COUNT(*) FROM dbo.${table} WHERE Id<=@max) [rowCount],
        (SELECT * FROM dbo.${table} WHERE Id<=@max ORDER BY Id FOR JSON PATH,INCLUDE_NULL_VALUES) value`,
      [int("max", max)],
    )
  )[0]!;
  // SQL Server may return NULL for an empty JSON subquery. Accept that only
  // when the independently counted preservation range is actually empty.
  if (row.value === null) assert.equal(row.rowCount, 0, `${table}: missing JSON for existing records`);
  const value = row.value ?? "[]";
  assert.equal(JSON.parse(value).length, row.rowCount, `${table}: incomplete preservation snapshot`);
  return createHash("sha256").update(value).digest("hex");
}
for (const table of [
  "Listings",
  "ListingDocuments",
  "Orders",
  "Contracts",
  "PilotRequests",
  "MarketRecords",
  "MarketPortfolios",
]) {
  const max = (
    await query<{ max: number }>(
      `SELECT ISNULL(MAX(Id),0) max FROM dbo.${table}`,
    )
  )[0]!.max;
  preserved.push({ table, max, digest: await digest(table, max) });
}
const stamp = randomUUID(),
  password = `Synthetic-${randomUUID()}!`;
async function account(
  role: "seller" | "buyer" | "admin" | "viewer",
  companyId?: number,
) {
  const email = `staff-alert-${role}-${stamp}@example.invalid`;
  const user = await createPasswordUser({
    name: `Synthetic alert ${role}`,
    email,
    password,
    accountStatusCode: "active",
  });
  await query(
    "UPDATE dbo.Users SET EmailVerifiedAt=SYSUTCDATETIME() WHERE Id=@id",
    [int("id", user.id)],
  );
  const company =
    companyId ??
    (
      await query<{ id: number }>(
        `INSERT dbo.Companies(LegalName,CompanyTypeId,VerificationStatusId) OUTPUT INSERTED.Id id VALUES(@name,(SELECT Id FROM dbo.CompanyTypes WHERE Code='both'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='verified'))`,
        [str("name", `Synthetic alerts ${role} ${stamp}`)],
      )
    )[0]!.id;
  await query(
    `INSERT dbo.CompanyMembers(UserId,CompanyId,MemberRoleId,PermissionTierId,MemberStatusId,CanExecuteTransactions) VALUES(@user,@company,(SELECT Id FROM dbo.MemberRoles WHERE Code=@role),(SELECT Id FROM dbo.PermissionTiers WHERE Code=@tier),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),@execute)`,
    [
      int("user", user.id),
      int("company", company),
      str(
        "role",
        role === "admin" ? "admin" : role === "viewer" ? "viewer" : "owner",
      ),
      str(
        "tier",
        role === "admin"
          ? "admin_override"
          : role === "viewer"
            ? "view_only"
            : "executor",
      ),
      int("execute", role === "viewer" ? 0 : 1),
    ],
  );
  if (!companyId) {
    await query(
      `INSERT dbo.SellerProfiles(CompanyId,OnboardingStatusId,SubscriptionStatusId,PayoutStatusId,ApprovalStatusId) VALUES(@company,(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),(SELECT TOP(1) Id FROM dbo.PayoutStatuses ORDER BY Id),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'))`,
      [int("company", company)],
    );
    await query(
      `INSERT dbo.BuyerProfiles(CompanyId,OnboardingStatusId,SubscriptionStatusId,BillingStatusId,ApprovalStatusId) VALUES(@company,(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'))`,
      [int("company", company)],
    );
  }
  const token = (
    await issueSession({
      userId: user.id,
      activeCompanyId: company,
      activeRoleCode: role === "viewer" ? "seller" : role,
    })
  ).token;
  return { email, password, token, companyId: company, userId: user.id };
}
const seller = await account("seller"),
  buyer = await account("buyer"),
  admin = await account("admin"),
  viewer = await account("viewer", seller.companyId);
async function location(companyId: number) {
  return (
    await query<{ id: number }>(
      `INSERT dbo.Locations(CompanyId,LocationTypeId,Name,AddressLine1,City,StateProvince,PostalCode,CountryCode) OUTPUT INSERTED.Id id VALUES(@company,(SELECT Id FROM dbo.LocationTypes WHERE Code='headquarters'),'Synthetic alert facility','1 Synthetic Way','Baton Rouge','LA','70801','US')`,
      [int("company", companyId)],
    )
  )[0]!.id;
}
const origin = await location(seller.companyId),
  destination = await location(buyer.companyId);
const material = (
  await query<{ code: string }>(
    "SELECT TOP(1) Code code FROM dbo.MaterialTypes WHERE IsActive=1 ORDER BY Id",
  )
)[0]!.code;
const server = createServer(async (req, res) => {
  try {
    if (
      !(await handleApiRoute(
        req,
        res,
        new URL(req.url ?? "/", "http://localhost"),
      ))
    )
      sendJson(res, 404, { ok: false });
  } catch (error) {
    sendJson(res, error instanceof ApiError ? error.status : 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Error",
    });
  }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert.ok(address && typeof address !== "string");
const api = `http://127.0.0.1:${address.port}`;
type Body = Record<string, unknown> & {
  listing?: { id: number; listingStatusCode: string };
  document?: { id: number };
  request?: { id: number };
  jobs?: unknown[];
};
const nativeFetch = globalThis.fetch;
async function call(
  path: string,
  token: string,
  method = "GET",
  body?: unknown,
  status = 200,
): Promise<Body> {
  const response = await nativeFetch(`${api}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = (await response.json()) as Body;
  assert.equal(response.status, status, JSON.stringify(data));
  return data;
}
async function count(kind: string, recordId: number) {
  return (
    await query<{ count: number }>(
      "SELECT COUNT(*) count FROM dbo.StaffNotificationOutbox WHERE Kind=@kind AND RecordId=@id",
      [str("kind", kind), int("id", recordId)],
    )
  )[0]!.count;
}
try {
  const listing = (
    await call(
      "/api/listings",
      seller.token,
      "POST",
      {
        sellerCompanyId: seller.companyId,
        title: `Synthetic alerts ${stamp}`,
        locationId: origin,
        materialTypeCode: material,
        quantity: 200,
        minimumOrderQuantity: 1,
        quantityUnit: "tonne",
        pricePerUnit: 6,
        currencyCode: "USD",
        listingStatusCode: "draft",
      },
      201,
    )
  ).listing!;
  const listingId = listing.id;
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText("Synthetic local staff alert smoke SDS only");
  const upload = {
    listingId,
    fileName: "synthetic-sds.pdf",
    documentTypeCode: "sds",
    contentType: "application/pdf",
    contentBase64: Buffer.from(await pdf.save()).toString("base64"),
  };
  const doc = (
    await call("/api/listing-documents", seller.token, "POST", upload, 201)
  ).document!;
  await call(`/api/listings/${listingId}`, seller.token, "PATCH", {
    listingStatusCode: "pending_review",
  });
  assert.equal(await count("listing_pending_review", listingId), 1);
  await call(`/api/listings/${listingId}`, seller.token, "PATCH", {
    description: "Synthetic unrelated edit",
  });
  await call(`/api/listings/${listingId}`, seller.token, "PATCH", {
    listingStatusCode: "pending_review",
  });
  assert.equal(await count("listing_pending_review", listingId), 1);
  await call(`/api/listings/${listingId}`, admin.token, "PATCH", {
    listingStatusCode: "published",
  });
  await call(`/api/listings/${listingId}`, seller.token, "PATCH", {
    description: "Published edit returns to review",
  });
  assert.equal(await count("listing_pending_review", listingId), 2);
  await call(`/api/listings/${listingId}`, admin.token, "PATCH", {
    listingStatusCode: "published",
  });
  const secondDoc = (
    await call(
      "/api/listing-documents",
      seller.token,
      "POST",
      { ...upload, fileName: "second-synthetic-sds.pdf" },
      201,
    )
  ).document!;
  assert.equal(await count("listing_pending_review", listingId), 3);
  await call(`/api/listings/${listingId}`, admin.token, "PATCH", {
    listingStatusCode: "published",
  });
  await call(`/api/listing-documents/${secondDoc.id}`, seller.token, "DELETE");
  assert.equal(await count("listing_pending_review", listingId), 4);
  await call(`/api/listings/${listingId}`, admin.token, "PATCH", {
    listingStatusCode: "published",
  });
  const pilotBody = {
    listingId,
    deliveryLocationId: destination,
    clientRequestId: randomUUID(),
    loadChoice: "one",
    loadCount: 1,
    approximateTonnage: 10,
    neededBy: "Synthetic trial",
    constraints: [],
    objective: "Synthetic local staff alert smoke",
  };
  const pilot = (
    await call("/api/pilots/requests", buyer.token, "POST", pilotBody, 201)
  ).request!;
  await call("/api/pilots/requests", buyer.token, "POST", pilotBody, 201);
  assert.equal(await count("pilot_created", pilot.id), 1);
  await call(
    `/api/pilots/requests/${pilot.id}/email-preference`,
    buyer.token,
    "POST",
    {},
  );
  await call(
    `/api/pilots/requests/${pilot.id}/email-preference`,
    buyer.token,
    "POST",
    {},
  );
  assert.equal(await count("pilot_email_follow_up", pilot.id), 1);
  const orderId = (
    await query<{ id: number }>(
      `INSERT dbo.Orders(ListingId,BuyerCompanyId,SellerCompanyId,CreationSourceId,OrderStatusId,TotalAmount,CurrencyCode,EscrowRequired,CreatedByUserId)
    OUTPUT INSERTED.Id id VALUES(@listing,@buyer,@seller,(SELECT Id FROM dbo.OrderCreationSources WHERE Code='listing_checkout'),(SELECT TOP(1) Id FROM dbo.OrderStatuses WHERE IsActive=1 ORDER BY Id),6,'USD',0,@user)`,
      [
        int("listing", listingId),
        int("buyer", buyer.companyId),
        int("seller", seller.companyId),
        int("user", buyer.userId),
      ],
    )
  )[0]!.id;
  const orderBefore = (
    await query<{ value: string }>(
      "SELECT (SELECT * FROM dbo.Orders WHERE Id=@id FOR JSON PATH,INCLUDE_NULL_VALUES) value",
      [int("id", orderId)],
    )
  )[0]!.value;
  const deniedCrossCompany = await nativeFetch(
    `${api}/api/listings/${listingId}`,
    { method: "DELETE", headers: { authorization: `Bearer ${buyer.token}` } },
  );
  assert.ok([403, 404].includes(deniedCrossCompany.status));
  await call(
    `/api/listings/${listingId}`,
    viewer.token,
    "DELETE",
    undefined,
    403,
  );
  await call(`/api/listings/${listingId}`, seller.token, "DELETE");
  await call(`/api/listings/${listingId}`, seller.token, "DELETE");
  const retained = (
    await query<{ count: number }>(
      "SELECT COUNT(*) count FROM dbo.ListingDocuments WHERE Id=@id AND DeletedAt IS NULL",
      [int("id", doc.id)],
    )
  )[0]!.count;
  assert.equal(retained, 1);
  assert.equal(
    (
      await query<{ value: string }>(
        "SELECT (SELECT * FROM dbo.Orders WHERE Id=@id FOR JSON PATH,INCLUDE_NULL_VALUES) value",
        [int("id", orderId)],
      )
    )[0]!.value,
    orderBefore,
    "active order and listing reference retained on close",
  );
  assert.equal(
    (
      await query<{ count: number }>(
        "SELECT COUNT(*) count FROM dbo.PilotRequests WHERE Id=@id AND ListingId=@listing",
        [int("id", pilot.id), int("listing", listingId)],
      )
    )[0]!.count,
    1,
  );
  await call(`/api/listings/${listingId}`, seller.token, "PATCH", {
    listingStatusCode: "draft",
  });
  const audit = await query<{ previous: string; next: string }>(
    "SELECT PreviousValue previous,NewValue next FROM dbo.AuditLogs WHERE RecordTypeId=(SELECT Id FROM dbo.RecordTypes WHERE Code='listing') AND RecordId=@id ORDER BY Id",
    [int("id", listingId)],
  );
  assert.equal(audit.length, 2);
  assert.match(audit[0]!.next, /closed/);
  assert.match(audit[1]!.next, /draft/);
  await call("/api/admin/staff-alerts", buyer.token, "GET", undefined, 403);
  await call("/api/admin/staff-alerts", admin.token);
  // Explicit failed transaction proves event atomicity without schema/trigger mutation.
  const queuedBefore = (
    await query<{ count: number }>(
      "SELECT COUNT(*) count FROM dbo.StaffNotificationOutbox",
    )
  )[0]!.count;
  await assert.rejects(
    runInTransaction(async (tx) => {
      await enqueueStaffAlert(tx, {
        kind: "pilot_created",
        recordId: pilot.id,
      });
      throw new Error("Synthetic rollback");
    }),
    /Synthetic rollback/,
  );
  assert.equal(
    (
      await query<{ count: number }>(
        "SELECT COUNT(*) count FROM dbo.StaffNotificationOutbox",
      )
    )[0]!.count,
    queuedBefore,
  );
  assert.equal(await processStaffAlerts(), 0);
  // Provider stub only: local SQL is real; no external provider call is allowed.
  let sends = 0;
  globalThis.fetch = async (url) => {
    assert.equal(String(url), "https://api.resend.com/emails");
    sends++;
    return new Response(JSON.stringify({ id: `synthetic-provider-${sends}` }), {
      status: 200,
    });
  };
  Object.assign(process.env, {
    STAFF_ALERT_EMAIL_ENABLED: "true",
    STAFF_ALERT_EMAIL_RECIPIENTS: "staff@example.invalid",
    STAFF_ALERT_EMAIL_ALLOWED_RECIPIENTS: "staff@example.invalid",
    STAFF_ALERT_ADMIN_URL: "http://127.0.0.1:20133",
    ECOGLOBE_EMAIL_OVERRIDE_ALL: "false",
    RESEND_API_KEY: "synthetic-no-provider",
  });
  const processed = await processStaffAlerts();
  assert.ok(processed > 0 && processed <= 10);
  assert.equal(sends, processed);
  for (const item of preserved)
    assert.equal(
      await digest(item.table, item.max),
      item.digest,
      `${item.table} existing records preserved`,
    );
  if (process.env.ORCA_STAFF_ALERT_FIXTURE_PATH)
    await writeFile(
      process.env.ORCA_STAFF_ALERT_FIXTURE_PATH,
      JSON.stringify(
        {
          syntheticOnly: true,
          database,
          seller,
          buyer,
          admin,
          viewer,
          listingId,
          pilotId: pilot.id,
          documentId: doc.id,
        },
        null,
        2,
      ),
      { mode: 0o600, flag: "wx" },
    );
  console.log(
    JSON.stringify({
      ok: true,
      syntheticOnly: true,
      listingId,
      pilotId: pilot.id,
      staffEvents: queuedBefore,
      stubDeliveries: sends,
      preservedTables: preserved.map((v) => v.table),
      fixtureWritten: Boolean(process.env.ORCA_STAFF_ALERT_FIXTURE_PATH),
    }),
  );
} finally {
  globalThis.fetch = nativeFetch;
  server.close();
  await once(server, "close");
  await pool.close();
}
