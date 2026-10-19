/** Retained synthetic fixtures. Run only in the explicitly owned local Orca DB. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { once } from "node:events";
import { createPasswordUser, issueSession } from "./auth.js";
import { handlePilotRoute } from "./pilot-routes.js";
import { handlePilotAcknowledgementRoute, enqueuePilotAcknowledgement, processPilotAcknowledgements } from "./pilot-acknowledgements.js";
import { queryRowsWithParams as query, queryRowsWithParamsInTransaction, runInTransaction, sql, type QueryParameter } from "./database.js";
import { ApiError, sendJson } from "./http.js";

assert.equal(process.env.ORCA_PILOT_ACK_SMOKE, "1", "Explicit owned-local authorization required.");
const database = process.env.ORCA_SQL_DATABASE, marker = process.env.ORCA_SQL_MARKER;
assert.match(database ?? "", /^eco_[a-f0-9]{24}$/);
assert.match(marker ?? "", /^[a-f0-9]{64}$/);
assert.match(process.env.AZURE_SQL_CONNECTION_STRING ?? "", /^Server=127\.0\.0\.1,\d+;Database=eco_[a-f0-9]{24};/);
for (const key of ["RESEND_API_KEY", "STRIPE_SECRET_KEY", "DOCUSIGN_INTEGRATION_KEY", "DOCUSIGN_PRIVATE_KEY", "FEDEX_CLIENT_ID", "FEDEX_CLIENT_SECRET"])
  assert.ok(!process.env[key], `${key} must be empty`);
assert.notEqual(process.env.STAFF_ALERT_EMAIL_ENABLED, "true");
assert.notEqual(process.env.PILOT_ACK_EMAIL_ENABLED, "true");
const owner = (await query<{ name: string; token: string }>("SELECT DB_NAME() name,Token token FROM dbo.OrcaOwner"))[0];
assert.equal(owner?.name, database); assert.equal(owner?.token, marker);
const param = (name: string, value: unknown, type: QueryParameter["type"] = sql.NVarChar(sql.MAX)): QueryParameter => ({ name, value, type });
const pool = await sql.connect(process.env.AZURE_SQL_CONNECTION_STRING!);
const migration = await readFile(new URL("../db/migrations/20261019_pilot_acknowledgements.sql", import.meta.url), "utf8");
for (let pass = 0; pass < 2; pass++)
  for (const batch of migration.split(/^\s*GO\s*$/gim).filter((s) => s.trim())) await pool.request().batch(batch);
assert.equal((await query<{ rcsi: boolean }>("SELECT is_read_committed_snapshot_on rcsi FROM sys.databases WHERE name=DB_NAME()"))[0]?.rcsi, true, "RCSI must be enabled by the owning coordinator before this smoke.");

async function digest(table: string, max: number) {
  const rows = await query(`SELECT * FROM dbo.${table} WHERE Id<=@max ORDER BY Id`, [param("max", max, sql.Int)]);
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}
const preserved: Array<{ table: string; max: number; digest: string }> = [];
for (const table of ["PilotRequests", "StaffNotificationOutbox", "RefundEmailOutbox", "PilotAcknowledgementOutbox"]) {
  const max = (await query<{ max: number }>(`SELECT ISNULL(MAX(Id),0) max FROM dbo.${table}`))[0]!.max;
  preserved.push({ table, max, digest: await digest(table, max) });
}
const originalAckMax = preserved.find((v) => v.table === "PilotAcknowledgementOutbox")!.max;
// Never process pre-existing pending work, even in an owned development database.
assert.equal((await query<{ count: number }>("SELECT COUNT(*) count FROM dbo.PilotAcknowledgementOutbox WHERE State IN ('queued','retry','sending')"))[0]!.count, 0);

const stamp = randomUUID();
async function account(role: "buyer" | "seller" | "admin") {
  const user = await createPasswordUser({ name: `Synthetic pilot ack ${role}`, email: `pilot-ack-${role}-${stamp}@example.invalid`, password: `Synthetic-${randomUUID()}!`, accountStatusCode: "active" });
  await query("UPDATE dbo.Users SET EmailVerifiedAt=SYSUTCDATETIME() WHERE Id=@id", [param("id", user.id, sql.Int)]);
  const company = (await query<{ id: number }>(`INSERT dbo.Companies(LegalName,CompanyTypeId,VerificationStatusId) OUTPUT INSERTED.Id id VALUES(@name,(SELECT Id FROM dbo.CompanyTypes WHERE Code='both'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='verified'))`, [param("name", `Synthetic acknowledgement ${role} ${stamp}`)]))[0]!.id;
  await query(`INSERT dbo.CompanyMembers(UserId,CompanyId,MemberRoleId,PermissionTierId,MemberStatusId,CanExecuteTransactions) VALUES(@user,@company,(SELECT Id FROM dbo.MemberRoles WHERE Code=@role),(SELECT Id FROM dbo.PermissionTiers WHERE Code=@tier),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),1)`, [param("user", user.id, sql.Int), param("company", company, sql.Int), param("role", role === "admin" ? "admin" : "owner"), param("tier", role === "admin" ? "admin_override" : "executor")]);
  await query(`INSERT dbo.BuyerProfiles(CompanyId,OnboardingStatusId,SubscriptionStatusId,BillingStatusId,ApprovalStatusId) VALUES(@company,(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'))`, [param("company", company, sql.Int)]);
  await query(`INSERT dbo.SellerProfiles(CompanyId,OnboardingStatusId,SubscriptionStatusId,PayoutStatusId,ApprovalStatusId) VALUES(@company,(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),(SELECT TOP(1) Id FROM dbo.PayoutStatuses ORDER BY Id),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'))`, [param("company", company, sql.Int)]);
  const token = (await issueSession({ userId: user.id, activeCompanyId: company, activeRoleCode: role })).token;
  const location = (await query<{ id: number }>(`INSERT dbo.Locations(CompanyId,LocationTypeId,Name,AddressLine1,City,StateProvince,PostalCode,CountryCode) OUTPUT INSERTED.Id id VALUES(@company,(SELECT Id FROM dbo.LocationTypes WHERE Code='headquarters'),'Synthetic ack facility','1 Synthetic Way','Baton Rouge','LA','70801','US')`, [param("company", company, sql.Int)]))[0]!.id;
  return { userId: user.id, email: user.email, company, token, location };
}
const buyer = await account("buyer"), seller = await account("seller"), admin = await account("admin");
const listingId = (await query<{ id: number }>(`INSERT dbo.Listings(SellerCompanyId,LocationId,Title,Slug,MaterialTypeId,Quantity,QuantityUnit,MinimumOrderQuantity,PricePerUnit,CurrencyCode,ListingStatusId,CreatedByUserId)
 OUTPUT INSERTED.Id id VALUES(@seller,@location,'Synthetic acknowledgement trial',@slug,(SELECT TOP(1) Id FROM dbo.MaterialTypes WHERE IsActive=1 ORDER BY Id),200,'tonne',1,6,'USD',(SELECT Id FROM dbo.ListingStatuses WHERE Code='published'),@user)`, [param("seller", seller.company, sql.Int), param("location", seller.location, sql.Int), param("slug", `pilot-ack-${stamp}`), param("user", seller.userId, sql.Int)]))[0]!.id;
const nativeFetch = globalThis.fetch;
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (!(await handlePilotAcknowledgementRoute(req, res, url)) && !(await handlePilotRoute(req, res, url))) sendJson(res, 404, { ok: false });
  } catch (error) { sendJson(res, error instanceof ApiError ? error.status : 500, { ok: false, error: error instanceof Error ? error.message : "Error" }); }
});
server.listen(0, "127.0.0.1"); await once(server, "listening");
const address = server.address(); assert.ok(address && typeof address !== "string");
const api = `http://127.0.0.1:${address.port}`;
type Pilot = { id: number; acknowledgementStatus: string; acknowledgementIsTest: boolean };
async function call(path: string, token = buyer.token, body?: unknown, expected = 200) {
  const response = await nativeFetch(`${api}${path}`, { method: body === undefined ? "GET" : "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const value = await response.json() as { request: Pilot; requests: Pilot[]; jobs: unknown[] };
  assert.equal(response.status, expected, JSON.stringify(value)); return value;
}
const body = { listingId, deliveryLocationId: buyer.location, clientRequestId: randomUUID(), loadChoice: "one", loadCount: 1, approximateTonnage: 10, neededBy: "Synthetic trial", constraints: [], objective: "Synthetic acknowledgement SQL smoke" };
Object.assign(process.env, { PILOT_ACK_EMAIL_MODE: "test", PILOT_ACK_EMAIL_TEST_RECIPIENT: "qa@example.invalid", PILOT_ACK_EMAIL_ALLOWED_RECIPIENTS: "qa@example.invalid", PILOT_ACK_WEB_URL: "http://127.0.0.1:20133", ECOGLOBE_EMAIL_OVERRIDE_ALL: "false" });
try {
  const concurrent = await Promise.all(Array.from({ length: 4 }, () => call("/api/pilots/requests", buyer.token, body, 201)));
  const pilot = concurrent[0]!.request;
  assert.ok(concurrent.every((v) => v.request.id === pilot.id));
  assert.equal(pilot.acknowledgementStatus, "queued"); assert.equal(pilot.acknowledgementIsTest, true);
  const jobs = await query<{ id: number; intendedRecipient: string; payloadJson: string; eventKey: string }>("SELECT Id id,IntendedRecipient intendedRecipient,PayloadJson payloadJson,EventKey eventKey FROM dbo.PilotAcknowledgementOutbox WHERE RequestId=@id", [param("id", pilot.id, sql.Int)]);
  assert.equal(jobs.length, 1); assert.equal(jobs[0]!.intendedRecipient, buyer.email);
  assert.deepEqual(JSON.parse(jobs[0]!.payloadJson).to, ["qa@example.invalid"]);
  await assert.rejects(runInTransaction(async (tx) => { await enqueuePilotAcknowledgement(tx, { requestId: pilot.id, userId: buyer.userId }); }), /duplicate|unique/i);
  const rollbackKey = randomUUID();
  await assert.rejects(runInTransaction(async (tx) => {
    const id = (await queryRowsWithParamsInTransaction<{ id: number }>(tx, `INSERT dbo.PilotRequests(ListingId,BuyerCompanyId,SellerCompanyId,OriginLocationId,DeliveryLocationId,ListingTitle,OriginLabel,DestinationLabel,DestinationRegion,LoadChoice,LoadCount,ApproximateTonnage,NeededBy,ConstraintsJson,Objective,ClientRequestId,RequestHash,CreatedByUserId)
      OUTPUT INSERTED.Id id SELECT ListingId,BuyerCompanyId,SellerCompanyId,OriginLocationId,DeliveryLocationId,ListingTitle,OriginLabel,DestinationLabel,DestinationRegion,LoadChoice,LoadCount,ApproximateTonnage,NeededBy,ConstraintsJson,Objective,@key,RequestHash,CreatedByUserId FROM dbo.PilotRequests WHERE Id=@id`, [param("id", pilot.id, sql.Int), param("key", rollbackKey)]))[0]!.id;
    await enqueuePilotAcknowledgement(tx, { requestId: id, userId: buyer.userId });
    throw new Error("Synthetic rollback");
  }), /Synthetic rollback/);
  assert.equal((await query<{ count: number }>("SELECT COUNT(*) count FROM dbo.PilotRequests WHERE ClientRequestId=@key", [param("key", rollbackKey)]))[0]!.count, 0);
  assert.equal((await query<{ count: number }>("SELECT COUNT(*) count FROM dbo.PilotAcknowledgementOutbox WHERE Id>@max", [param("max", originalAckMax, sql.Int)]))[0]!.count, 1);
  await call(`/api/pilots/requests/${pilot.id}`, seller.token, undefined, 404);
  await call("/api/admin/pilot-acknowledgements", buyer.token, undefined, 403);
  const operator = await call("/api/admin/pilot-acknowledgements", admin.token);
  assert.doesNotMatch(JSON.stringify(operator), /IntendedRecipient|payloadJson|@example.invalid/i);
  await call(`/api/pilots/requests/${pilot.id}/email-preference`, buyer.token, {});
  const projection = await call("/api/pilots/requests");
  assert.equal(projection.requests.find((v) => v.id === pilot.id)?.acknowledgementStatus, "queued");
  assert.doesNotMatch(JSON.stringify(projection), /intendedRecipient|payloadJson|@example.invalid/i);
  assert.equal(await processPilotAcknowledgements(), 0);
  let sends = 0;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://api.resend.com/emails"); sends++;
    assert.equal(String(options?.body), jobs[0]!.payloadJson);
    assert.equal(new Headers(options?.headers).get("Idempotency-Key"), `pilot-ack-${jobs[0]!.eventKey.toLowerCase()}`);
    return new Response(JSON.stringify({ id: `synthetic-provider-${sends}` }), { status: 200 });
  };
  Object.assign(process.env, { PILOT_ACK_EMAIL_ENABLED: "true", RESEND_API_KEY: "synthetic-no-provider" });
  assert.equal(await processPilotAcknowledgements(), 1); assert.equal(await processPilotAcknowledgements(), 0); assert.equal(sends, 1);
  const sent = (await call(`/api/pilots/requests/${pilot.id}`)).request;
  assert.equal(sent.acknowledgementStatus, "sent"); assert.equal(sent.acknowledgementIsTest, true);
  await call("/api/pilots/requests", buyer.token, body, 201);
  assert.equal(await processPilotAcknowledgements(), 0); assert.equal(sends, 1);
  for (const item of preserved) assert.equal(await digest(item.table, item.max), item.digest, `${item.table} prior rows preserved`);
  console.log(JSON.stringify({ ok: true, syntheticOnly: true, pilotId: pilot.id, concurrentReplays: concurrent.length, jobs: jobs.length, stubDeliveries: sends, rcsi: true, preservedTables: preserved.map((v) => v.table) }));
} finally { globalThis.fetch = nativeFetch; server.close(); await once(server, "close"); await pool.close(); }
