/** Coordinator-run real local SQL/HTTP acceptance. Retains labeled synthetic
 * rows, creates no SDS files, prices or coordinates, and never resets data.
 * Requires the original owner's verified sanitized runtime and receipt markers.
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
import { handleApiRoute } from "./api.js";
import { ApiError, sendJson } from "./http.js";
import {
  usableListingDocumentSql,
  requireListingSds,
} from "./listing-safety.js";
import type { ListingSdsRequestState } from "../../shared/src/listing-sds-api.js";

const connection = process.env.AZURE_SQL_CONNECTION_STRING ?? "";
const database = process.env.ORCA_SQL_DATABASE;
const marker = process.env.ORCA_SQL_MARKER;
assert.match(database ?? "", /^eco_[a-f0-9]{24}$/);
assert.match(marker ?? "", /^[a-f0-9]{64}$/);
assert.match(connection, /^Server=127\.0\.0\.1,\d+;Database=eco_[a-f0-9]{24};/);
for (const key of [
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "DOCUSIGN_INTEGRATION_KEY",
  "DOCUSIGN_USER_ID",
  "DOCUSIGN_ACCOUNT_ID",
  "DOCUSIGN_PRIVATE_KEY",
  "DOCUSIGN_WEBHOOK_HMAC_SECRET",
  "FEDEX_CLIENT_ID",
  "FEDEX_CLIENT_SECRET",
  "FEDEX_ACCOUNT_NUMBER",
])
  assert.ok(!process.env[key], `${key} must be empty`);
const rollbackLabel = process.env.ORCA_SDS_ROLLBACK_LABEL ?? "";
assert.match(
  rollbackLabel,
  /^Synthetic SDS atomic rollback [a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
);
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
const stamp = randomUUID();
const preserveTables = [
  "Listings",
  "ListingDocuments",
  "Companies",
  "Orders",
  "Quotes",
  "Notifications",
  "ListingSdsRequests",
] as const;
const snapshots: Array<{
  table: (typeof preserveTables)[number];
  max: number;
  hash: string;
}> = [];
async function snapshot(table: (typeof preserveTables)[number], max: number) {
  const rows = await query<{ payload: string }>(
    `SELECT (SELECT * FROM dbo.${table} WHERE Id<=@max ORDER BY Id FOR JSON PATH,INCLUDE_NULL_VALUES) payload`,
    [int("max", max)],
  );
  return createHash("sha256")
    .update(rows[0]?.payload ?? "[]")
    .digest("hex");
}
for (const table of preserveTables) {
  const max = (
    await query<{ max: number }>(
      `SELECT ISNULL(MAX(Id),0) max FROM dbo.${table}`,
    )
  )[0]!.max;
  snapshots.push({ table, max, hash: await snapshot(table, max) });
}
const user = (
  await query<{ id: number }>(
    `INSERT dbo.Users(Name,Email,AccountStatusId,EmailVerifiedAt)
 OUTPUT INSERTED.Id id VALUES('Synthetic SDS smoke',@email,(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),SYSUTCDATETIME())`,
    [str("email", `sds-${stamp}@example.invalid`)],
  )
)[0]!.id;
async function company(type: "buyer" | "seller" | "both") {
  const id = (
    await query<{ id: number }>(
      `INSERT dbo.Companies(LegalName,CompanyTypeId,VerificationStatusId)
   OUTPUT INSERTED.Id id VALUES(@name,(SELECT Id FROM dbo.CompanyTypes WHERE Code=@type),(SELECT Id FROM dbo.AccountStatuses WHERE Code='verified'))`,
      [
        str("name", `Synthetic SDS ${type} ${stamp} ${randomUUID()}`),
        str("type", type),
      ],
    )
  )[0]!.id;
  await query(
    `INSERT dbo.CompanyMembers(UserId,CompanyId,MemberRoleId,PermissionTierId,MemberStatusId)
   VALUES(@user,@company,(SELECT Id FROM dbo.MemberRoles WHERE Code='owner'),(SELECT Id FROM dbo.PermissionTiers WHERE Code='executor'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'))`,
    [int("user", user), int("company", id)],
  );
  return id;
}
const buyer = await company("buyer"),
  otherBuyer = await company("buyer"),
  seller = await company("seller"),
  both = await company("both");
const location = (
  await query<{ id: number }>(
    `INSERT dbo.Locations(CompanyId,LocationTypeId,Name,AddressLine1,City,CountryCode)
 OUTPUT INSERTED.Id id VALUES(@seller,(SELECT TOP(1) Id FROM dbo.LocationTypes ORDER BY Id),'Synthetic SDS fixture','Synthetic fixture only','Synthetic','US')`,
    [int("seller", seller)],
  )
)[0]!.id;
async function listing(
  status = "published",
  sellerId = seller,
  title = `Synthetic SDS acceptance ${stamp}`,
) {
  return (
    await query<{ id: number }>(
      `INSERT dbo.Listings(SellerCompanyId,LocationId,Title,Slug,MaterialTypeId,QuantityUnit,ListingStatusId)
   OUTPUT INSERTED.Id id VALUES(@seller,@location,@title,@slug,(SELECT TOP(1) Id FROM dbo.MaterialTypes ORDER BY Id),'kg',(SELECT Id FROM dbo.ListingStatuses WHERE Code=@status))`,
      [
        int("seller", sellerId),
        int("location", location),
        str("title", title),
        str("slug", `synthetic-sds-${randomUUID()}`),
        str("status", status),
      ],
    )
  )[0]!.id;
}
const primary = await listing(),
  hidden = await listing("draft"),
  failure = await listing("published", seller, rollbackLabel),
  race = await listing(),
  self = await listing("published", both);
const tokens = await Promise.all(
  [buyer, otherBuyer, seller, both].map(
    async (companyId) =>
      (
        await issueSession({
          userId: user,
          activeCompanyId: companyId,
          activeRoleCode: companyId === seller ? "seller" : "buyer",
        })
      ).token,
  ),
);
const [buyerToken, otherToken, sellerToken, bothToken] = tokens;
const noCompany = (
  await issueSession({ userId: user, activeRoleCode: "buyer" })
).token;
const server = createServer((req, res) => {
  void handleApiRoute(req, res, new URL(req.url ?? "/", "http://local"))
    .then((handled) => {
      if (!handled) sendJson(res, 404, { ok: false });
    })
    .catch((error: unknown) =>
      sendJson(res, error instanceof ApiError ? error.status : 500, {
        ok: false,
        error: error instanceof Error ? error.message : "Smoke failure",
      }),
    );
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert.ok(address && typeof address !== "string");
const origin = `http://127.0.0.1:${address.port}`;
let httpChecks = 0;
async function call(
  listingId: number,
  token: string | undefined,
  method = "GET",
  expected = 200,
  body?: unknown,
) {
  const response = await fetch(
    `${origin}/api/listings/${listingId}/sds-request`,
    {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        "content-type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
  const value = await response.json();
  assert.equal(response.status, expected, JSON.stringify(value));
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  httpChecks++;
  return value;
}
async function counts(listingId: number) {
  return (
    await query<{ requests: number; notifications: number }>(
      `SELECT
   (SELECT COUNT(*) FROM dbo.ListingSdsRequests WHERE ListingId=@listing) requests,
   (SELECT COUNT(*) FROM dbo.Notifications WHERE RelatedRecordId=@listing AND CreatedByUserId=@user AND Subject='SDS requested') notifications`,
      [int("listing", listingId), int("user", user)],
    )
  )[0]!;
}
function state(value: unknown): ListingSdsRequestState {
  assert.ok(value && typeof value === "object" && "sdsRequest" in value);
  const s = value.sdsRequest;
  assert.ok(
    s &&
      typeof s === "object" &&
      "status" in s &&
      "listingId" in s &&
      typeof s.listingId === "number",
  );
  if (s.status === "available" || s.status === "not_requested")
    return { status: s.status, listingId: s.listingId };
  assert.ok(
    s.status === "requested" &&
      "id" in s &&
      typeof s.id === "number" &&
      "requestedAt" in s &&
      typeof s.requestedAt === "string",
  );
  return {
    status: s.status,
    listingId: s.listingId,
    id: s.id,
    requestedAt: s.requestedAt,
  };
}
function notifications(value: unknown): Array<Record<string, unknown>> {
  assert.ok(
    value &&
      typeof value === "object" &&
      "notifications" in value &&
      Array.isArray(value.notifications),
  );
  return value.notifications.map((item: unknown) => {
    assert.ok(item && typeof item === "object");
    return Object.fromEntries(Object.entries(item));
  });
}
try {
  await call(primary, undefined, "POST", 401);
  await call(primary, noCompany, "POST", 403);
  await call(primary, sellerToken, "POST", 403);
  await call(self, bothToken, "POST", 403);
  await call(hidden, buyerToken, "POST", 404);
  await call(2147483647, buyerToken, "POST", 404);
  await call(primary, buyerToken, "POST", 400, { sellerCompanyId: buyer });
  assert.equal(state(await call(primary, buyerToken)).status, "not_requested");

  // Different real SQL connections race on the same listing/buyer key.
  const responses = await Promise.all(
    Array.from({ length: 6 }, async () => {
      const res = await fetch(`${origin}/api/listings/${primary}/sds-request`, {
        method: "POST",
        headers: { authorization: `Bearer ${buyerToken}` },
      });
      assert.ok(res.status === 200 || res.status === 201);
      assert.equal(res.headers.get("cache-control"), "private, no-store");
      httpChecks++;
      return { status: res.status, state: state(await res.json()) };
    }),
  );
  assert.equal(responses.filter((r) => r.status === 201).length, 1);
  assert.equal(
    new Set(
      responses.map((r) =>
        r.state.status === "requested"
          ? r.state.id
          : assert.fail("Expected request"),
      ),
    ).size,
    1,
  );
  assert.equal(
    new Set(
      responses.map((r) =>
        r.state.status === "requested"
          ? r.state.requestedAt
          : assert.fail("Expected request"),
      ),
    ).size,
    1,
  );
  assert.deepEqual(await counts(primary), { requests: 1, notifications: 1 });
  const original = state(await call(primary, buyerToken));
  assert.equal(state(await call(primary, otherToken)).status, "not_requested");
  await call(primary, otherToken, "POST", 201);
  assert.deepEqual(await counts(primary), { requests: 2, notifications: 2 });
  const alerts = await fetch(`${origin}/api/notifications`, {
    headers: { authorization: `Bearer ${sellerToken}` },
  }).then((r) => r.json());
  const matching = notifications(alerts).filter(
    (n) => n.relatedRecordId === primary && n.subject === "SDS requested",
  );
  assert.equal(matching.length, 2);
  for (const n of matching) {
    assert.equal(n.companyId, seller);
    assert.equal(n.userId, null);
    assert.equal(n.notificationChannelCode, "in_app");
    assert.equal(n.notificationCategoryCode, "compliance");
    assert.equal(n.relatedRecordTypeCode, "listing");
    assert.ok(
      typeof n.body === "string" &&
        n.body.includes(`Synthetic SDS acceptance ${stamp}`),
    );
  }
  const buyerAlerts = await fetch(`${origin}/api/notifications`, {
    headers: { authorization: `Bearer ${buyerToken}` },
  }).then((r) => r.json());
  assert.ok(
    !notifications(buyerAlerts).some((n) => n.relatedRecordId === primary),
  );

  // Throw after the notification insert, proving both writes roll back together.
  // Coordinator installs a scoped trigger through the original owner's DDL channel.
  // The restricted app never receives DDL permission or administrator credentials.
  await call(failure, buyerToken, "POST", 500);
  assert.deepEqual(await counts(failure), { requests: 0, notifications: 0 });
  await query("UPDATE dbo.Listings SET Title=@title WHERE Id=@id", [
    str("title", `Synthetic SDS acceptance ${stamp}`),
    int("id", failure),
  ]);
  await call(failure, buyerToken, "POST", 201);

  // Lock ordering with the real document-writer parent lock. No fake SDS file.
  const pool = await sql.connect(connection);
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    await tx
      .request()
      .input("id", sql.Int, race)
      .query("SELECT Id FROM dbo.Listings WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id");
    const pending = call(race, buyerToken, "POST", 404);
    await tx
      .request()
      .input("id", sql.Int, race)
      .query(
        "UPDATE dbo.Listings SET ListingStatusId=(SELECT Id FROM dbo.ListingStatuses WHERE Code='pending_review') WHERE Id=@id",
      );
    await tx.commit();
    await pending;
  } catch (error) {
    try {
      await tx.rollback();
    } catch {}
    throw error;
  }
  assert.deepEqual(await counts(race), { requests: 0, notifications: 0 });

  // Evaluate canonical SQL against derived test values without storing any file.
  const eligibility = await query<{
    eligible: number;
    label: string;
  }>(`SELECT d.label,CASE WHEN ${usableListingDocumentSql} THEN 1 ELSE 0 END eligible
   FROM (VALUES ('empty',CAST(0x AS VARBINARY(MAX)),''),('blank',NULL,'   '),('inline',0x01,''),('legacy',NULL,'synthetic predicate value')) d(label,Content,FileUrl)`);
  assert.deepEqual(
    eligibility.map((r) => [r.label, r.eligible]),
    [
      ["empty", 0],
      ["blank", 0],
      ["inline", 1],
      ["legacy", 1],
    ],
  );
  const guardTx = new sql.Transaction(pool);
  await guardTx.begin();
  try {
    await assert.rejects(
      requireListingSds(guardTx, primary),
      (e: unknown) => e instanceof ApiError && e.status === 409,
    );
  } finally {
    await guardTx.rollback();
  }
  // Read status never changes the saved request identity/time.
  assert.deepEqual(state(await call(primary, buyerToken, "POST")), original);
  for (const saved of snapshots)
    assert.equal(
      await snapshot(saved.table, saved.max),
      saved.hash,
      `Existing ${saved.table} changed`,
    );
  console.log(
    JSON.stringify(
      {
        passed: true,
        evidence:
          "real owned local SQL + HTTP; no browser/provider/upload-file claim",
        database,
        httpChecks,
        fixtures: {
          stamp,
          user,
          buyer,
          otherBuyer,
          seller,
          both,
          primary,
          hidden,
          failure,
          race,
          self,
        },
        concurrency: "six requests, one new row and one notification",
        atomicRollback: true,
        priorRowsPreserved: snapshots,
        limits:
          "available/409 route uses synthetic driver coverage; canonical predicate evaluated by real SQL without creating SDS files",
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
