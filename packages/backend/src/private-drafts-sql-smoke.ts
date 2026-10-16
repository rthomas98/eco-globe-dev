/** Explicitly authorized owned-local SQL/HTTP smoke. Retains synthetic fixtures. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";
import { PDFDocument } from "pdf-lib";
import {
  queryRowsWithParams as query,
  sql,
  type QueryParameter,
} from "./database.js";
import { issueSession } from "./auth.js";
import { handleApiRoute } from "./api.js";
import { ApiError, sendJson } from "./http.js";

assert.equal(
  process.env.ORCA_DRAFT_SMOKE,
  "1",
  "Explicit coordinator local-write authorization required.",
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
  "DOCUSIGN_USER_ID",
  "DOCUSIGN_ACCOUNT_ID",
  "DOCUSIGN_PRIVATE_KEY",
  "DOCUSIGN_WEBHOOK_HMAC_SECRET",
  "FEDEX_CLIENT_ID",
  "FEDEX_CLIENT_SECRET",
  "FEDEX_ACCOUNT_NUMBER",
])
  assert.ok(!process.env[key], `${key} must be empty`);
const identity = (
  await query<{ name: string; token: string }>(
    "SELECT DB_NAME() name,Token token FROM dbo.OrcaOwner",
  )
)[0];
assert.equal(identity?.name, database);
assert.equal(identity?.token, marker);
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
const snapshots: Array<{ table: string; max: number; hash: string }> = [];
async function snapshot(table: string, max: number) {
  const rows = await query<{ payload: string }>(
    `SELECT (SELECT * FROM dbo.${table} WHERE Id<=@max ORDER BY Id FOR JSON PATH,INCLUDE_NULL_VALUES) payload`,
    [int("max", max)],
  );
  return createHash("sha256")
    .update(rows[0]?.payload ?? "[]")
    .digest("hex");
}
// Snapshot after migration: new columns legitimately change JSON shape, never old facts.
const migration = await readFile(
  new URL("../db/migrations/20261016_private_drafts.sql", import.meta.url),
  "utf8",
);
const pool = await sql.connect(process.env.AZURE_SQL_CONNECTION_STRING!);
for (let run = 0; run < 2; run++)
  for (const batch of migration.split(/^\s*GO\s*$/gim).filter((x) => x.trim()))
    await pool.request().batch(batch);
for (const table of [
  "Listings",
  "WantedListings",
  "Quotes",
  "Orders",
  "ListingDocuments",
]) {
  const max = (
    await query<{ max: number }>(
      `SELECT ISNULL(MAX(Id),0) max FROM dbo.${table}`,
    )
  )[0]!.max;
  snapshots.push({ table, max, hash: await snapshot(table, max) });
}
const stamp = randomUUID();
const user = (
  await query<{ id: number }>(
    `INSERT dbo.Users(Name,Email,AccountStatusId,EmailVerifiedAt) OUTPUT INSERTED.Id id VALUES('Synthetic private draft smoke',@email,(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),SYSUTCDATETIME())`,
    [str("email", `draft-${stamp}@example.invalid`)],
  )
)[0]!.id;
async function company() {
  const id = (
    await query<{ id: number }>(
      `INSERT dbo.Companies(LegalName,CompanyTypeId,VerificationStatusId) OUTPUT INSERTED.Id id VALUES(@name,(SELECT Id FROM dbo.CompanyTypes WHERE Code='both'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='verified'))`,
      [str("name", `Synthetic private draft ${stamp} ${randomUUID()}`)],
    )
  )[0]!.id;
  await query(
    `INSERT dbo.CompanyMembers(UserId,CompanyId,MemberRoleId,PermissionTierId,MemberStatusId,CanExecuteTransactions) VALUES(@user,@company,(SELECT Id FROM dbo.MemberRoles WHERE Code='owner'),(SELECT Id FROM dbo.PermissionTiers WHERE Code='executor'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),1)`,
    [int("user", user), int("company", id)],
  );
  await query(
    `INSERT dbo.SellerProfiles(CompanyId,OnboardingStatusId,SubscriptionStatusId,PayoutStatusId,ApprovalStatusId) VALUES(@company,(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),(SELECT TOP(1) Id FROM dbo.PayoutStatuses ORDER BY Id),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'))`,
    [int("company", id)],
  );
  return id;
}
const buyer = await company(),
  other = await company();
// The role override must work even with view_only and execution disabled.
await query(
  "UPDATE dbo.CompanyMembers SET PermissionTierId=(SELECT Id FROM dbo.PermissionTiers WHERE Code='view_only'),CanExecuteTransactions=0 WHERE UserId=@user AND CompanyId=@company",
  [int("user", user), int("company", buyer)],
);
const token = (
  await issueSession({
    userId: user,
    activeCompanyId: buyer,
    activeRoleCode: "buyer",
  })
).token;
const sellerToken = (
  await issueSession({
    userId: user,
    activeCompanyId: buyer,
    activeRoleCode: "seller",
  })
).token;
const otherToken = (
  await issueSession({
    userId: user,
    activeCompanyId: other,
    activeRoleCode: "seller",
  })
).token;
const viewer = (
  await query<{ id: number }>(
    `INSERT dbo.Users(Name,Email,AccountStatusId,EmailVerifiedAt) OUTPUT INSERTED.Id id VALUES('Synthetic private draft viewer',@email,(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),SYSUTCDATETIME())`,
    [str("email", `draft-viewer-${stamp}@example.invalid`)],
  )
)[0]!.id;
await query(
  `INSERT dbo.CompanyMembers(UserId,CompanyId,MemberRoleId,PermissionTierId,MemberStatusId,CanExecuteTransactions) VALUES(@user,@company,(SELECT Id FROM dbo.MemberRoles WHERE Code='viewer'),(SELECT Id FROM dbo.PermissionTiers WHERE Code='view_only'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),1)`,
  [int("user", viewer), int("company", buyer)],
);
const viewerToken = (
  await issueSession({
    userId: viewer,
    activeCompanyId: buyer,
    activeRoleCode: "buyer",
  })
).token;
const requester = (
  await query<{ id: number }>(
    `INSERT dbo.Users(Name,Email,AccountStatusId,EmailVerifiedAt) OUTPUT INSERTED.Id id VALUES('Synthetic private draft requester',@email,(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),SYSUTCDATETIME())`,
    [str("email", `draft-requester-${stamp}@example.invalid`)],
  )
)[0]!.id;
await query(
  `INSERT dbo.CompanyMembers(UserId,CompanyId,MemberRoleId,PermissionTierId,MemberStatusId,CanExecuteTransactions) VALUES(@user,@company,(SELECT Id FROM dbo.MemberRoles WHERE Code='buyer_operator'),(SELECT Id FROM dbo.PermissionTiers WHERE Code='requester'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),0)`,
  [int("user", requester), int("company", buyer)],
);
const requesterToken = (
  await issueSession({
    userId: requester,
    activeCompanyId: buyer,
    activeRoleCode: "buyer",
  })
).token;
const material = (
  await query<{ code: string }>(
    "SELECT TOP(1) Code code FROM dbo.MaterialTypes WHERE IsActive=1 ORDER BY Id",
  )
)[0]!.code;
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
function jsonObject(value: unknown): Record<string, unknown> {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  return Object.fromEntries(Object.entries(value));
}
function entity(value: unknown): Record<string, unknown> & { id: number } {
  const record = jsonObject(value);
  assert.equal(typeof record.id, "number");
  assert.ok(
    typeof record.id === "number" &&
      Number.isSafeInteger(record.id) &&
      record.id > 0,
  );
  return { ...record, id: record.id };
}
async function call(
  path: string,
  auth: string | null = token,
  method = "GET",
  body?: unknown,
  expected = 200,
) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(auth ? { authorization: `Bearer ${auth}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = jsonObject(await response.json());
  assert.equal(response.status, expected, JSON.stringify(value));
  httpChecks++;
  return {
    get listing() {
      return entity(value.listing);
    },
    get wantedListing() {
      return entity(value.wantedListing);
    },
    get wantedListings() {
      assert.ok(Array.isArray(value.wantedListings));
      return value.wantedListings.map(entity);
    },
    get quote() {
      return entity(value.quote);
    },
  };
}
try {
  const created = await call(
    "/api/listings",
    sellerToken,
    "POST",
    {
      sellerCompanyId: buyer,
      title: `Synthetic private product ${stamp}`,
      materialTypeCode: material,
      listingStatusCode: "draft",
    },
    201,
  );
  const listingId = created.listing.id;
  for (const key of [
    "locationId",
    "quantity",
    "minimumOrderQuantity",
    "pricePerUnit",
    "quantityUnit",
    "currencyCode",
  ])
    assert.equal(created.listing[key], null);
  assert.deepEqual(created.listing.documents, []);
  assert.equal(
    (await call(`/api/listings/${listingId}?scope=owned`, sellerToken)).listing
      .id,
    listingId,
  );
  await call(`/api/listings/${listingId}`, null, "GET", undefined, 404);
  await call(
    `/api/listings/${listingId}?scope=owned`,
    otherToken,
    "GET",
    undefined,
    404,
  );
  await call(
    `/api/listings/${listingId}`,
    sellerToken,
    "PATCH",
    { listingStatusCode: "pending_review" },
    400,
  );
  await call(
    `/api/listings/${listingId}/favorite`,
    otherToken,
    "POST",
    {},
    404,
  );
  await call(
    `/api/listings/${listingId}/interest`,
    otherToken,
    "POST",
    { eventType: "detail_view" },
    404,
  );
  await call(
    "/api/quotes",
    otherToken,
    "POST",
    { listingId, buyerCompanyId: other, quantity: 1 },
    404,
  );
  const location = (
    await query<{ id: number }>(
      `INSERT dbo.Locations(CompanyId,LocationTypeId,Name,AddressLine1,City,CountryCode) OUTPUT INSERTED.Id id VALUES(@company,(SELECT TOP(1) Id FROM dbo.LocationTypes ORDER BY Id),'Synthetic origin','Synthetic only','Synthetic','US')`,
      [int("company", buyer)],
    )
  )[0]!.id;
  await call(`/api/listings/${listingId}`, sellerToken, "PATCH", {
    locationId: location,
    quantity: 20,
    minimumOrderQuantity: 1,
    pricePerUnit: 1,
    quantityUnit: "tonne",
    currencyCode: "USD",
  });
  await call(
    `/api/listings/${listingId}`,
    sellerToken,
    "PATCH",
    { listingStatusCode: "pending_review" },
    400,
  ); // no SDS
  await call(`/api/listings/${listingId}`, sellerToken, "PATCH", {
    locationId: null,
    quantity: null,
    pricePerUnit: null,
    quantityUnit: null,
    currencyCode: null,
  });
  const wanted = await call(
    "/api/wanted-listings",
    token,
    "POST",
    {
      title: `Synthetic private demand ${stamp}`,
      materialTypeCode: material,
      statusCode: "draft",
    },
    201,
  );
  const wantedId = wanted.wantedListing.id;
  const privatePath = `/api/wanted-listings/${wantedId}`;
  await query(
    "UPDATE dbo.CompanyMembers SET MemberRoleId=(SELECT Id FROM dbo.MemberRoles WHERE Code='admin') WHERE UserId=@user AND CompanyId=@company",
    [int("user", user), int("company", buyer)],
  );
  await call(privatePath, token, "PATCH", {
    notes: "Synthetic admin at view_only may edit",
  });
  await query(
    "UPDATE dbo.CompanyMembers SET MemberRoleId=(SELECT Id FROM dbo.MemberRoles WHERE Code='owner') WHERE UserId=@user AND CompanyId=@company",
    [int("user", user), int("company", buyer)],
  );
  const requesterId = (
    await call(
      "/api/wanted-listings",
      requesterToken,
      "POST",
      {
        title: "Synthetic requester draft",
        materialTypeCode: material,
        statusCode: "draft",
      },
      201,
    )
  ).wantedListing.id;
  const sourceNotes = "  Synthetic source notes preserved.  ";
  const requesterEdit = await call(
    `/api/wanted-listings/${requesterId}`,
    requesterToken,
    "PATCH",
    { notes: sourceNotes },
  );
  assert.equal(requesterEdit.wantedListing.notes, sourceNotes);
  const requesterPublish = await call(
    `/api/wanted-listings/${requesterId}`,
    requesterToken,
    "PATCH",
    {
      statusCode: "open",
      quantity: 20,
      quantityUnit: "tonne",
      countryCode: "US",
      currencyCode: "USD",
      targetPricePerUnit: 0,
    },
  );
  assert.equal(requesterPublish.wantedListing.statusCode, "open");
  assert.equal(requesterPublish.wantedListing.targetPricePerUnit, 0);

  await query(
    "UPDATE dbo.CompanyMembers SET PermissionTierId=(SELECT Id FROM dbo.PermissionTiers WHERE Code='view_only'),CanExecuteTransactions=1 WHERE UserId=@user AND CompanyId=@company",
    [int("user", requester), int("company", buyer)],
  );
  await call(
    `/api/wanted-listings/${requesterId}`,
    requesterToken,
    "PATCH",
    { notes: "Denied nonowner view_only with execute" },
    403,
  );
  await call(
    "/api/wanted-listings",
    viewerToken,
    "POST",
    {
      title: "Viewer cannot create",
      materialTypeCode: material,
      statusCode: "draft",
    },
    403,
  );
  await call(
    privatePath,
    viewerToken,
    "PATCH",
    { notes: "Viewer cannot edit" },
    403,
  );
  await call(
    privatePath,
    viewerToken,
    "PATCH",
    {
      statusCode: "open",
      quantity: 20,
      quantityUnit: "tonne",
      countryCode: "US",
      currencyCode: "USD",
    },
    403,
  );
  assert.equal(
    (await call(privatePath, viewerToken)).wantedListing.id,
    wantedId,
  );

  for (const key of [
    "quantity",
    "quantityUnit",
    "currencyCode",
    "targetPricePerUnit",
    "countryCode",
    "needByDate",
  ])
    assert.equal(wanted.wantedListing[key], null);
  assert.equal(wanted.wantedListing.statusCode, "draft");
  assert.equal(wanted.wantedListing.isOpen, false);
  assert.ok(
    (await call("/api/wanted-listings?mine=true")).wantedListings.some(
      (r: { id: number }) => r.id === wantedId,
    ),
  );
  for (const auth of [null, otherToken])
    assert.ok(
      !(await call("/api/wanted-listings", auth)).wantedListings.some(
        (r: { id: number }) => r.id === wantedId,
      ),
    );
  await call(privatePath, otherToken, "GET", undefined, 404);
  await call(privatePath, otherToken, "PATCH", { notes: "forged" }, 404);
  await call(privatePath, null, "GET", undefined, 401);
  await call(
    `${privatePath}/responses`,
    otherToken,
    "POST",
    { listingId, quantity: 1, unitPrice: 1 },
    404,
  );
  await call(privatePath, token, "PATCH", {
    quantity: 20,
    quantityUnit: "tonne",
    notes: "Synthetic saved note",
  });
  const cleared = await call(privatePath, token, "PATCH", {
    quantity: null,
    quantityUnit: null,
  });
  assert.equal(cleared.wantedListing.quantity, null);
  assert.equal(cleared.wantedListing.notes, "Synthetic saved note");
  await call(privatePath, token, "PATCH", { statusCode: "open" }, 400);
  assert.equal((await call(privatePath)).wantedListing.statusCode, "draft");
  await assert.rejects(
    query("UPDATE dbo.WantedListings SET IsOpen=1 WHERE Id=@id", [
      int("id", wantedId),
    ]),
    /CK_WantedListings_PrivateDraft/,
  );
  await assert.rejects(
    query("UPDATE dbo.WantedListings SET IsDraft=0,IsOpen=1 WHERE Id=@id", [
      int("id", wantedId),
    ]),
    /CK_WantedListings_PublishedFields/,
  );
  const publish = {
    statusCode: "open",
    quantity: 20,
    quantityUnit: "tonne",
    currencyCode: "USD",
    countryCode: "US",
  };
  const published = await Promise.all([
    call(privatePath, token, "PATCH", publish),
    call(privatePath, token, "PATCH", publish),
  ]);
  for (const result of published) {
    assert.equal(result.wantedListing.id, wantedId);
    assert.equal(result.wantedListing.statusCode, "open");
    assert.equal(result.wantedListing.needByDate, null);
  }
  const own = (await call(privatePath)).wantedListing;
  assert.equal(own.quantity, 20);
  await call(privatePath, token, "PATCH", { statusCode: "draft" }, 409);
  const closed = await call(privatePath, token, "PATCH", { isOpen: false });
  assert.equal(closed.wantedListing.statusCode, "closed");
  await call(privatePath, token, "PATCH", { isOpen: true });
  const legacy = await call(
    "/api/wanted-listings",
    token,
    "POST",
    {
      title: `Synthetic legacy demand ${stamp}`,
      materialTypeCode: material,
      quantity: 5,
      countryCode: "US",
    },
    201,
  );
  assert.equal(legacy.wantedListing.quantityUnit, "tons");
  assert.equal(legacy.wantedListing.currencyCode, "USD");
  // Synthetic commercial values exist only in this explicitly owned local fixture.
  const otherLocation = (
    await query<{ id: number }>(
      `INSERT dbo.Locations(CompanyId,LocationTypeId,Name,AddressLine1,City,CountryCode) OUTPUT INSERTED.Id id VALUES(@company,(SELECT TOP(1) Id FROM dbo.LocationTypes ORDER BY Id),'Synthetic seller origin','Synthetic only','Synthetic','US')`,
      [int("company", other)],
    )
  )[0]!.id;
  const supply = (
    await call(
      "/api/listings",
      otherToken,
      "POST",
      {
        sellerCompanyId: other,
        title: `Synthetic quote supply ${stamp}`,
        materialTypeCode: material,
        listingStatusCode: "draft",
        locationId: otherLocation,
        quantity: 100,
        minimumOrderQuantity: 1,
        pricePerUnit: 1,
        quantityUnit: "tonne",
        currencyCode: "USD",
      },
      201,
    )
  ).listing.id;
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText("Synthetic local SQL smoke SDS only");
  await call(
    "/api/listing-documents",
    otherToken,
    "POST",
    {
      listingId: supply,
      documentTypeCode: "sds",
      fileName: "synthetic-smoke.pdf",
      contentType: "application/pdf",
      contentBase64: Buffer.from(await pdf.save()).toString("base64"),
    },
    201,
  );
  await call(`/api/listings/${supply}`, otherToken, "PATCH", {
    listingStatusCode: "pending_review",
  });
  // SQL fixture publication substitutes only for the internal moderation actor.
  await query(
    "UPDATE dbo.Listings SET ListingStatusId=(SELECT Id FROM dbo.ListingStatuses WHERE Code='published') WHERE Id=@id",
    [int("id", supply)],
  );
  const quoteId = (
    await call(
      `${privatePath}/responses`,
      otherToken,
      "POST",
      { listingId: supply, quantity: 1, unitPrice: 1 },
      201,
    )
  ).quote.id;
  const accept = async () => {
    const response = await fetch(`${origin}/api/quotes/${quoteId}`, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ quoteStatusCode: "accepted" }),
    });
    await response.json();
    return response.status;
  };
  const acceptance = await Promise.all([accept(), accept()]);
  assert.deepEqual(acceptance.sort(), [200, 409]);
  httpChecks += 2;
  assert.equal((await call(privatePath)).wantedListing.statusCode, "closed");
  await call(privatePath, token, "PATCH", { isOpen: true }, 409);
  await call(`/api/listings/${listingId}`, sellerToken, "DELETE"); // locationless draft remains removable
  for (const saved of snapshots)
    assert.equal(
      await snapshot(saved.table, saved.max),
      saved.hash,
      `Existing ${saved.table} rows changed`,
    );
  console.log(
    JSON.stringify({
      ok: true,
      database,
      migrationRuns: 2,
      httpChecks,
      listingId,
      wantedId,
      preexistingRowsPreserved: true,
      providerCalls: 0,
      fixture: `Synthetic private draft ${stamp}`,
    }),
  );
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await pool.close();
}
