/** Retained synthetic fixtures, guarded dedicated loopback SQL only; no provider/shared writes. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";
import { requireLocalPresentationDatabase } from "./demo-presentation-local.js";
import { queryRowsWithParams as query, sql, type QueryParameter } from "./database.js";
import { previewDemoPlaylist, commitDemoPlaylist, readDemoPlaylist, readDemoPlaylistSourceVersion, listDemoPlaylists } from "./demo-playlist-store.js";
import { listDemoPresentations } from "./demo-presentation-store.js";
import { createDemoPlaylistHandler } from "./demo-playlist-routes.js";
import { playlistFixture } from "./demo-playlist-fixture.js";
import { digest } from "./demo-playlist-domain.js";
import type { DemoPlaylistPlan, DemoPlaylistCommitInput } from "./demo-playlist-publishing.js";
import type { DemoPlaylistMaterial } from "../../shared/src/demo-playlists-api.js";
import { ApiError } from "./http.js";

await requireLocalPresentationDatabase();
const connection = process.env.AZURE_SQL_CONNECTION_STRING!;
const param = (name: string, value: unknown): QueryParameter => ({ name, value, type: typeof value === "number" ? sql.Int : sql.NVarChar(sql.MAX) });
const fixture = randomUUID();
async function rejects409(work: Promise<unknown>) { await assert.rejects(work, error => error instanceof ApiError && error.status === 409); }
const timings: Record<string, number> = {};
async function timed<T>(name: string, work: () => Promise<T>): Promise<T> { const start = performance.now(); const result = await work(); timings[name] = Math.round(performance.now() - start); return result; }
try {
  const legacyBefore = digest(await listDemoPresentations());
  // Prior retained fixture playlists are independently withdrawn; do not delete sources or history.
  // This smoke owns only these two public test slugs in this dedicated synthetic database.
  await query("UPDATE dbo.DemoPlaylists SET IsEnabled=1,IsPublic=1 WHERE Slug IN ('fuel-lsu','all')");
  const user = Number((await query("INSERT dbo.Users(Name,Email,AccountStatusId) OUTPUT INSERTED.Id VALUES('Synthetic playlist reviewer',@email,(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'))", [param("email", `playlist-${fixture}@example.invalid`)]))[0]!.Id);
  const company = Number((await query(`INSERT dbo.Companies(LegalName,CompanyTypeId,VerificationStatusId,CreatedByUserId,UpdatedByUserId) OUTPUT INSERTED.Id
    VALUES('Synthetic playlist source',(SELECT Id FROM dbo.CompanyTypes WHERE Code='both'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='pending_verification'),@user,@user)`, [param("user",user)]))[0]!.Id);
  const listing = Number((await query(`INSERT dbo.Listings(SellerCompanyId,Title,Slug,MaterialTypeId,ListingStatusId,Quantity,QuantityUnit,PricePerUnit,CurrencyCode,Description,CreatedByUserId,UpdatedByUserId) OUTPUT INSERTED.Id
    VALUES(@company,'Private synthetic offer',@slug,(SELECT Id FROM dbo.MaterialTypes WHERE Code='other'),(SELECT Id FROM dbo.ListingStatuses WHERE Code='draft'),20,'tonne',0,'USD','Private description person@example.invalid',@user,@user)`, [param("company",company),param("slug",`playlist-${fixture}`),param("user",user)]))[0]!.Id);
  const wanted = Number((await query(`INSERT dbo.WantedListings(BuyerCompanyId,Title,MaterialTypeId,Quantity,QuantityUnit,TargetPricePerUnit,CurrencyCode,CountryCode,Notes,IsOpen,IsDraft,CreatedByUserId,UpdatedByUserId) OUTPUT INSERTED.Id
    VALUES(@company,'Private synthetic need',(SELECT Id FROM dbo.MaterialTypes WHERE Code='other'),30,'tonne',100,'USD','US','Private research https://private.invalid',0,1,@user,@user)`, [param("company",company),param("user",user)]))[0]!.Id);
  const marketRows = await query(`INSERT dbo.MarketRecords(Role,CompanyName,Feedstock,SourceRecordType,AddressPurpose,VolumePeriod,PriceStatus,VolumeStatus,AddressStatus,CreatedByUserId,UpdatedByUserId)
    OUTPUT INSERTED.Id id,LOWER(CONVERT(VARCHAR(16),CAST(INSERTED.Version AS BINARY(8)),2)) version
    SELECT TOP (430) 'seller',@name,'Synthetic feedstock','identified_stream','unknown','unspecified','unknown','unknown','unknown',@user,@user FROM sys.all_objects a CROSS JOIN sys.all_objects b`, [param("name",`Synthetic research ${fixture}`),param("user",user)]);
  assert.equal(marketRows.length,430);
  const privateBefore = digest(await query(`SELECT (SELECT l.* FROM dbo.Listings l WHERE Id=@listing FOR JSON PATH) listing,(SELECT w.* FROM dbo.WantedListings w WHERE Id=@wanted FOR JSON PATH) wanted,(SELECT m.* FROM dbo.MarketRecords m WHERE CompanyName=@name ORDER BY Id FOR JSON PATH) market,(SELECT COUNT(*) FROM dbo.Companies) companies,(SELECT COUNT(*) FROM dbo.Users) users,(SELECT COUNT(*) FROM dbo.Listings) listings,(SELECT COUNT(*) FROM dbo.WantedListings) wantedCount,(SELECT COUNT(*) FROM dbo.Orders) orders`, [param("listing",listing),param("wanted",wanted),param("name",`Synthetic research ${fixture}`)]));
  const detail = playlistFixture();
  const first = detail.materials[0]!;
  const buyer: DemoPlaylistMaterial = { ...first, id:randomUUID(),kind:"buyer",title:"Synthetic buyer",sourceStatus:"buyer_need" };
  const market: DemoPlaylistMaterial = { ...first,id:randomUUID(),title:"Synthetic gate fee",price:{kind:"value",amount:{kind:"scalar",value:-50},currencyCode:"USD",perUnit:"tonne",direction:"seller_pays_gate_fee",basis:"source"},geography:{kind:"point",latitude:30.4,longitude:-91.1,precision:"postal_area",purpose:"unknown",label:"Approximate postal area",countryCode:"US",postalCode:"00501"} };
  detail.materials.push(buyer,market); detail.counts={companies:11,materials:3,mapped:1,pending:2};
  const plan: DemoPlaylistPlan = {approvedByUserId:user,intakeId:fixture,sourceHashes:["a".repeat(64)],detail,sources:[{entryId:first.id,kind:"listing",id:listing,provenance:{sheet:"Synthetic offers",row:1}},{entryId:buyer.id,kind:"wanted",id:wanted,provenance:{sheet:"Synthetic needs",row:1}},{entryId:market.id,kind:"market_record",id:Number(marketRows[0]!.id),expectedVersion:String(marketRows[0]!.version),provenance:{sheet:"Synthetic registry",row:1}}],profileProvenance:{review:"synthetic"},relationshipProvenance:{review:"synthetic"},reason:"Synthetic reviewed publication"};
  const draftVersion = await readDemoPlaylistSourceVersion({kind:"listing",id:listing}); assert.match(draftVersion,/^[a-f0-9]{64}$/u);
  assert.equal(await readDemoPlaylistSourceVersion({kind:"market_record",id:Number(marketRows[0]!.id)}),marketRows[0]!.version);
  const preview = await timed("fuelPreview",()=>previewDemoPlaylist(plan));
  const input: DemoPlaylistCommitInput = {previewId:preview.id,expectedDigest:preview.digest,idempotencyKey:randomUUID(),approvedByUserId:user,reason:plan.reason};
  const receipts = await timed("concurrentIdenticalRetry",()=>Promise.all([commitDemoPlaylist(input),commitDemoPlaylist(input)]));
  assert.deepEqual(receipts[0],receipts[1]);
  assert.deepEqual(await readDemoPlaylist("fuel-lsu"),detail);
  await rejects409(commitDemoPlaylist({...input,reason:"Different retry"}));
  await rejects409(commitDemoPlaylist({...input,idempotencyKey:randomUUID()}));
  const a = await previewDemoPlaylist(plan), b = await previewDemoPlaylist(plan);
  const staleInputs = [a,b].map(p=>({...input,previewId:p.id,expectedDigest:p.digest,idempotencyKey:randomUUID()}));
  const raced = await Promise.allSettled(staleInputs.map(commitDemoPlaylist));
  assert.equal(raced.filter(r=>r.status==="fulfilled").length,1); assert.equal(raced.filter(r=>r.status==="rejected").length,1);
  for (const result of raced) if (result.status === "rejected") assert(result.reason instanceof ApiError && result.reason.status === 409, "Deadlock/engine failure must not masquerade as staleness");
  assert.deepEqual(await readDemoPlaylist("fuel-lsu"),detail);
  await rejects409(commitDemoPlaylist({...input,previewId:a.id,expectedDigest:"b".repeat(64),idempotencyKey:randomUUID()}));
  const allDetail = structuredClone(detail); allDetail.playlist={slug:"all",name:"Synthetic ALL"};
  allDetail.materials=[first,buyer,...marketRows.map((_row,i):DemoPlaylistMaterial=>({...market,id:randomUUID(),title:`Synthetic research ${i}`, geography: i%2 ? {kind:"pending",reason:"unresolved"} : market.geography}))];
  while (allDetail.companies.length<292) allDetail.companies.push({id:randomUUID(),name:`Synthetic related ${allDetail.companies.length}`,description:null,membership:"related",materialState:"no_material_data",geography:{kind:"pending",reason:"missing_location"}});
  const mapped=allDetail.materials.filter(m=>m.geography.kind==="point").length;
  allDetail.counts={companies:292,materials:432,mapped,pending:432-mapped};
  const allPlan:DemoPlaylistPlan={...plan,detail:allDetail,sources:[plan.sources[0]!,plan.sources[1]!,...marketRows.map((row,i)=>({entryId:allDetail.materials[i+2]!.id,kind:"market_record" as const,id:Number(row.id),expectedVersion:String(row.version),provenance:{sheet:"Synthetic registry",row:i+1}}))]};
  const allPreview=await timed("all432Preview",()=>previewDemoPlaylist(allPlan));
  const allInput={...input,previewId:allPreview.id,expectedDigest:allPreview.digest,idempotencyKey:randomUUID()};
  await timed("all432Commit",()=>commitDemoPlaylist(allInput));
  assert.deepEqual(await timed("all432Read",()=>readDemoPlaylist("all")),allDetail);
  const cross = await timed("crossPlaylistSharedSources",()=>Promise.all([previewDemoPlaylist({...allPlan,sources:[...allPlan.sources].reverse()}),previewDemoPlaylist(plan)]));
  assert.equal(cross.length,2);
  await rejects409(commitDemoPlaylist({...input,previewId:cross[0]!.id,expectedDigest:cross[0]!.digest})); // actor/key bound to another preview
  assert.equal((await listDemoPlaylists())[0]?.slug,"fuel-lsu");
  const privateAfter = digest(await query(`SELECT (SELECT l.* FROM dbo.Listings l WHERE Id=@listing FOR JSON PATH) listing,(SELECT w.* FROM dbo.WantedListings w WHERE Id=@wanted FOR JSON PATH) wanted,(SELECT m.* FROM dbo.MarketRecords m WHERE CompanyName=@name ORDER BY Id FOR JSON PATH) market,(SELECT COUNT(*) FROM dbo.Companies) companies,(SELECT COUNT(*) FROM dbo.Users) users,(SELECT COUNT(*) FROM dbo.Listings) listings,(SELECT COUNT(*) FROM dbo.WantedListings) wantedCount,(SELECT COUNT(*) FROM dbo.Orders) orders`, [param("listing",listing),param("wanted",wanted),param("name",`Synthetic research ${fixture}`)]));
  assert.equal(privateAfter,privateBefore,"Publication changed unrelated/source records");
  assert.equal(digest(await listDemoPresentations()),legacyBefore,"Legacy projection changed");
  const targetPreview=await previewDemoPlaylist(plan);
  await query("UPDATE dbo.DemoPlaylistMemberships SET IsEnabled=0 WHERE PlaylistSlug='fuel-lsu' AND EntryId=@entry",[param("entry",first.id)]);
  assert.equal((await readDemoPlaylist("fuel-lsu"))?.materials.length,2);
  await rejects409(commitDemoPlaylist({...input,previewId:targetPreview.id,expectedDigest:targetPreview.digest,idempotencyKey:randomUUID()}));
  const newPreview=await previewDemoPlaylist(plan);
  await commitDemoPlaylist({...input,previewId:newPreview.id,expectedDigest:newPreview.digest,idempotencyKey:randomUUID()});
  assert.equal((await readDemoPlaylist("fuel-lsu"))?.materials.length,2,"Reimport reenabled withdrawn membership");
  const beforeEdit=await previewDemoPlaylist(plan);
  await query("UPDATE dbo.Listings SET Title='Private edit remains unpublished' WHERE Id=@id",[param("id",listing)]);
  await rejects409(commitDemoPlaylist({...input,previewId:beforeEdit.id,expectedDigest:beforeEdit.digest,idempotencyKey:randomUUID()}));
  assert.equal((await readDemoPlaylist("all"))?.materials.find(m=>m.id===first.id)?.title,first.title);
  await rejects409(previewDemoPlaylist({...plan,sources:[{...plan.sources[0]!,expectedVersion:draftVersion},...plan.sources.slice(1)]}));
  const marketStale=await previewDemoPlaylist(plan);
  await query("UPDATE dbo.MarketRecords SET Feedstock='Private later edit' WHERE Id=@id",[param("id",Number(marketRows[0]!.id))]);
  await rejects409(commitDemoPlaylist({...input,previewId:marketStale.id,expectedDigest:marketStale.digest,idempotencyKey:randomUUID()}));
  await query("UPDATE dbo.MarketRecords SET Status='archived',ArchivedAt=SYSUTCDATETIME(),ArchivedByUserId=@user,ArchiveReason='Synthetic withdrawal' WHERE Id=@id",[param("id",Number(marketRows[0]!.id)),param("user",user)]);
  assert.equal((await readDemoPlaylist("fuel-lsu"))?.materials.some(m=>m.id===market.id),false);
  await rejects409(previewDemoPlaylist(plan));
  await query("UPDATE dbo.WantedListings SET IsDraft=0 WHERE Id=@id",[param("id",wanted)]);
  assert.equal((await readDemoPlaylist("fuel-lsu"))?.materials.length,0);
  await query("UPDATE dbo.Listings SET ListingStatusId=(SELECT Id FROM dbo.ListingStatuses WHERE Code='published') WHERE Id=@id",[param("id",listing)]);
  assert.equal((await readDemoPlaylist("all"))?.materials.some(m=>m.id===first.id),false);
  await query("UPDATE dbo.DemoPlaylistProfiles SET IsEnabled=0 WHERE PlaylistSlug='all' AND CompanyId=@id",[param("id",first.companyId)]);
  assert.equal((await readDemoPlaylist("all"))?.materials.length,0);
  const handler=createDemoPlaylistHandler();
  const server=createServer((req,res)=>{void handler(req,res,new URL(req.url??"/","http://localhost"));}); server.listen(0,"127.0.0.1"); await once(server,"listening");
  const address=server.address(); assert(address&&typeof address!=="string");
  try { const base=`http://127.0.0.1:${address.port}/api/demo-playlists/all`; const anon=await fetch(base),other=await fetch(base,{headers:{authorization:"Bearer unrelated-company"}}); assert.equal(anon.status,200); assert.deepEqual(await anon.json(),await other.json()); }
  finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
  await query("UPDATE dbo.DemoPlaylists SET IsEnabled=0 WHERE Slug='all'");
  assert.equal(await readDemoPlaylist("all"),null); assert.equal((await listDemoPlaylists()).some(p=>p.slug==="all"),false);
  const fuelSaved=await query("SELECT CurrentRevision revision FROM dbo.DemoPlaylists WHERE Slug='fuel-lsu'");
  const reopened=await new sql.ConnectionPool(connection).connect();
  assert.deepEqual((await reopened.request().query("SELECT CurrentRevision revision FROM dbo.DemoPlaylists WHERE Slug='fuel-lsu'")).recordset,fuelSaved);
  await reopened.close();
  console.log(JSON.stringify({ok:true,fixture,syntheticOnly:true,materialsAtScale:432,profilesAtScale:292,identicalConcurrentRetry:true,staleConcurrentPreview:true,crossPlaylistLocks:true,sourceVersionBinding:true,membershipVersionBinding:true,sourceWithdrawal:true,playlistWithdrawal:true,profileWithdrawal:true,unrelatedSourcePreservation:true,legacyProjectionUnchanged:true,publicIdentityIndependent:true,persistedAfterReconnect:true,timingsMs:timings}));
} finally { await (await sql.connect(connection)).close(); }
