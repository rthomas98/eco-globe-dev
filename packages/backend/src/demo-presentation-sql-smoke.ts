/** Retained synthetic fixtures in verified owned local SQL only. No shared data. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { requireLocalPresentationDatabase } from "./demo-presentation-local.js";
import { queryRowsWithParams as query, sql, type QueryParameter } from "./database.js";
import { enrollDemoPresentations, listDemoPresentations } from "./demo-presentation-store.js";
import type { DemoPresentation } from "../../shared/src/demo-presentations-api.js";

await requireLocalPresentationDatabase();
const connection = process.env.AZURE_SQL_CONNECTION_STRING!;
const param = (name: string, value: unknown): QueryParameter => ({ name, value, type: typeof value === "number" ? sql.Int : sql.NVarChar(240) });
const fixture = randomUUID();
try {
  const pool = await sql.connect(connection);
  const migration = await readFile(new URL("../db/migrations/20261020_demo_presentations.sql", import.meta.url), "utf8");
  for (let repeat = 0; repeat < 2; repeat++) {
    for (const batch of migration.split(/^\s*GO\s*$/gim).filter(value => value.trim())) await pool.request().batch(batch);
  }
  const user = Number((await query(`INSERT dbo.Users(Name,Email,AccountStatusId) OUTPUT INSERTED.Id VALUES('Synthetic snapshot reviewer',@email,(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'))`, [param("email", `snapshot-${fixture}@example.invalid`)]))[0]!.Id);
  const company = Number((await query(`INSERT dbo.Companies(LegalName,CompanyTypeId,VerificationStatusId,CreatedByUserId,UpdatedByUserId)
    OUTPUT INSERTED.Id VALUES('Synthetic presentation source',(SELECT Id FROM dbo.CompanyTypes WHERE Code='both'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='pending_verification'),@user,@user)`, [param("user", user)]))[0]!.Id);
  const listing = Number((await query(`INSERT dbo.Listings(SellerCompanyId,Title,Slug,MaterialTypeId,ListingStatusId,Quantity,QuantityUnit,PricePerUnit,CurrencyCode,Description,CreatedByUserId,UpdatedByUserId)
    OUTPUT INSERTED.Id VALUES(@company,'Private seller source',@slug,(SELECT Id FROM dbo.MaterialTypes WHERE Code='other'),(SELECT Id FROM dbo.ListingStatuses WHERE Code='draft'),20,'tonne',100,'USD','Original private text',@user,@user)`, [param("company", company), param("slug", `snapshot-${fixture}`), param("user", user)]))[0]!.Id);
  const wanted = Number((await query(`INSERT dbo.WantedListings(BuyerCompanyId,Title,MaterialTypeId,Quantity,QuantityUnit,TargetPricePerUnit,CurrencyCode,CountryCode,Notes,IsOpen,IsDraft,CreatedByUserId,UpdatedByUserId)
    OUTPUT INSERTED.Id VALUES(@company,'Private buyer source',(SELECT Id FROM dbo.MaterialTypes WHERE Code='other'),30,'tonne',90,'USD','US','Original private buyer notes',0,1,@user,@user)`, [param("company", company), param("user", user)]))[0]!.Id);
  const before = JSON.stringify(await query(`SELECT Title,Description,Quantity,PricePerUnit,ListingStatusId FROM dbo.Listings WHERE Id=@id`, [param("id", listing)]));
  const buyerBefore = JSON.stringify(await query(`SELECT Title,Notes,Quantity,TargetPricePerUnit,IsOpen,IsDraft FROM dbo.WantedListings WHERE Id=@id`, [param("id", wanted)]));
  const seller: DemoPresentation = { id: randomUUID(), kind: "seller", companyName: "Approved public example", title: "Reviewed seller snapshot", materialTypeCode: "other", quantity: 20, quantityUnitCode: "tonne", price: 100, currencyCode: "USD", priceUnitCode: "tonne", priceEstimated: true, quantityEstimated: false };
  const buyer: DemoPresentation = { ...seller, id: randomUUID(), kind: "buyer", title: "Reviewed buyer snapshot" };
  const plan = { approvedByUserId: user, entries: [{ sourceListingId: listing, presentation: seller }, { sourceWantedListingId: wanted, presentation: buyer }] };
  assert.deepEqual(await enrollDemoPresentations(plan), { created: 2, unchanged: 0 });
  assert.deepEqual(await enrollDemoPresentations(plan), { created: 0, unchanged: 2 });
  assert.equal(JSON.stringify(await query(`SELECT Title,Description,Quantity,PricePerUnit,ListingStatusId FROM dbo.Listings WHERE Id=@id`, [param("id", listing)])), before);
  assert.equal(JSON.stringify(await query(`SELECT Title,Notes,Quantity,TargetPricePerUnit,IsOpen,IsDraft FROM dbo.WantedListings WHERE Id=@id`, [param("id", wanted)])), buyerBefore);
  let visible = (await listDemoPresentations()).filter(row => [seller.id, buyer.id].includes(row.id));
  assert.deepEqual(visible.sort((a,b) => a.id.localeCompare(b.id)), [seller,buyer].sort((a,b) => a.id.localeCompare(b.id)));
  await assert.rejects(enrollDemoPresentations({ ...plan, entries: [{ sourceListingId: listing, presentation: { ...seller, title: "Unreviewed replacement" } }] }));
  await query(`UPDATE dbo.Listings SET Title='Private later edit',Description='private@example.invalid https://private.invalid/sds' WHERE Id=@id`, [param("id", listing)]);
  await query(`UPDATE dbo.WantedListings SET Notes='Private buyer later edit' WHERE Id=@id`, [param("id", wanted)]);
  assert.deepEqual((await listDemoPresentations()).find(row => row.id === seller.id), seller);
  assert.deepEqual((await listDemoPresentations()).find(row => row.id === buyer.id), buyer);
  await query(`UPDATE dbo.DemoPresentations SET IsEnabled=0 WHERE Id=@id`, [param("id", seller.id)]);
  await assert.rejects(enrollDemoPresentations(plan));
  assert.equal((await listDemoPresentations()).some(row => row.id === seller.id), false);
  await query(`UPDATE dbo.DemoPresentations SET IsEnabled=1 WHERE Id=@id`, [param("id", seller.id)]);
  for (const status of ["published", "closed"]) {
    await query(`UPDATE dbo.Listings SET ListingStatusId=(SELECT Id FROM dbo.ListingStatuses WHERE Code=@status) WHERE Id=@id`, [param("status", status), param("id", listing)]);
    assert.equal((await listDemoPresentations()).some(row => row.id === seller.id), false);
  }
  await assert.rejects(enrollDemoPresentations({ approvedByUserId: user, entries: [{ sourceListingId: 2147483647, presentation: { ...seller, id: randomUUID() } }] }));
  await query(`UPDATE dbo.WantedListings SET IsDraft=0,IsOpen=0 WHERE Id=@id`, [param("id", wanted)]);
  assert.equal((await listDemoPresentations()).some(row => row.id === buyer.id), false);
  await query(`UPDATE dbo.WantedListings SET IsDraft=1,IsOpen=0 WHERE Id=@id`, [param("id", wanted)]);
  await query(`UPDATE dbo.Companies SET VerificationStatusId=(SELECT Id FROM dbo.AccountStatuses WHERE Code='inactive') WHERE Id=@id`, [param("id", company)]);
  assert.equal((await listDemoPresentations()).some(row => row.id === buyer.id), false);
  await assert.rejects(enrollDemoPresentations(plan));
  visible = (await listDemoPresentations()).filter(row => [seller.id, buyer.id].includes(row.id));
  assert.equal(visible.length, 0);
  // Closing and reopening the pool proves persisted snapshots survive reconnect.
  await pool.close();
  const reopened = await sql.connect(connection);
  const persisted = await reopened.request().input("user", sql.Int, user).query("SELECT COUNT(*) count FROM dbo.DemoPresentations WHERE ApprovedByUserId=@user");
  assert.equal(persisted.recordset[0]?.count, 2);
  console.log(JSON.stringify({ ok: true, fixture, migrationRuns: 2, snapshotsRetained: 2, sourceWritesByEnrollment: 0, idempotence: true, immutableSnapshots: true, disabledHidden: true, closedHidden: true, publishedSourceHidden: true, unknownSourceRefused: true, inactiveCompanyHidden: true, persistedAfterReconnect: true }));
} finally {
  await (await sql.connect(connection)).close();
}
