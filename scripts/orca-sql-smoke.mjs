/** Real local SQL/API smoke. Invoke only through orca-sql.py smoke. */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
const require = createRequire(new URL('../packages/backend/package.json', import.meta.url));
const sql = require('mssql');
const dbName = process.env.ORCA_SQL_DATABASE;
const marker = process.env.ORCA_SQL_MARKER;
const connection = process.env.AZURE_SQL_CONNECTION_STRING;
let pool;
let fixture;
let child;
let phase = 'database connection and private fixture';
try {
  assert.match(dbName ?? '', /^eco_[a-f0-9]{24}$/);
  assert.match(marker ?? '', /^[a-f0-9]{64}$/);
  assert.ok(connection?.startsWith('Server=127.0.0.1,'));
  fixture = await open(process.env.ORCA_SQL_SMOKE_RECEIPT, constants.O_RDWR | constants.O_NOFOLLOW);
  const info = await fixture.stat();
  assert.ok(info.isFile() && info.uid === process.getuid() && !(info.mode & 0o077) && info.nlink === 1);
  pool = await new sql.ConnectionPool(connection).connect();
  const identity = await pool.request().query('SELECT DB_NAME() AS db, Token FROM dbo.OrcaOwner');
  assert.equal(identity.recordset[0].db, dbName);
  assert.equal(identity.recordset[0].Token, marker);
  const privileges = await pool.request().query("SELECT IS_SRVROLEMEMBER('sysadmin') AS sa, IS_MEMBER('db_owner') AS owner, HAS_DBACCESS('model') AS modelAccess");
  assert.equal(privileges.recordset[0].sa, 0);
  assert.equal(privileges.recordset[0].owner, 0);
  assert.equal(privileges.recordset[0].modelAccess, 0);
  const name = 'Orca persistence ' + dbName + ' ' + randomBytes(8).toString('hex');
  if (process.argv.includes('--persistence')) {
    phase = 'restart persistence';
    const saved = JSON.parse(await fixture.readFile('utf8'));
    assert.equal(saved.database, dbName);
    assert.ok(Number.isSafeInteger(saved.id) && saved.id > 0);
    assert.equal(typeof saved.name, 'string');
    const result = await pool.request().input('name', sql.NVarChar, saved.name).input('id', sql.Int, saved.id).query('SELECT Id FROM dbo.Companies WHERE LegalName=@name AND Id=@id');
    assert.equal(result.recordset.length, 1);
    console.log(JSON.stringify({ persistence: true, database: dbName, companyId: result.recordset[0].Id }));
  } else {
    phase = 'existing development auth fixture';
    process.env.ECOGLOBE_DEMO_PASSWORD = 'Eg9!' + randomBytes(32).toString('hex');
    const { seedDemoAuthAccounts } = await import('../packages/backend/src/auth.ts');
    await seedDemoAuthAccounts();
    child = spawn(process.execPath, ['--import', require.resolve('tsx'), 'src/index.ts'], {
      cwd: new URL('../packages/backend', import.meta.url), env: process.env, stdio: 'ignore',
    });
    const origin = process.env.ECOGLOBE_API_BASE_URL;
    assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
    phase = 'API readiness';
    let ready = false;
    for (let i=0; i<100; i++) {
      try { ready = (await fetch(origin+'/health')).ok; } catch { /* startup */ }
      if (ready) break;
      if (child.exitCode !== null) throw new Error('API exited');
      await new Promise(resolve => setTimeout(resolve,100));
    }
    assert.ok(ready);
    async function call(path, method='GET', body, token, status=200) {
      const response = await fetch(origin+path, { method, headers: {
        'content-type':'application/json', ...(token ? {authorization:'Bearer '+token} : {}),
      }, ...(body ? {body:JSON.stringify(body)} : {}) });
      assert.equal(response.status,status, phase+' HTTP status');
      return response.json();
    }
    phase = 'auth and unauthenticated rejection';
    const admin = await call('/auth/login','POST',{email:'demo.admin@ecoglobe.com',password:process.env.ECOGLOBE_DEMO_PASSWORD,role:'admin'});
    const buyer = await call('/auth/login','POST',{email:'demo.buyer@ecoglobe.com',password:process.env.ECOGLOBE_DEMO_PASSWORD,role:'buyer'});
    assert.equal((await call('/auth/session','GET',undefined,admin.token)).user.activeRoleCode,'admin');
    await call('/api/companies','POST',{legalName:'Rejected',companyTypeCode:'seller'},undefined,401);
    phase = 'payment exception admin isolation';
    assert.ok(Array.isArray((await call('/api/admin/payment-exceptions','GET',undefined,admin.token)).exceptions));
    await call('/api/admin/payment-exceptions','GET',undefined,buyer.token,403);
    await call('/api/admin/payment-exceptions','GET',undefined,undefined,401);
    await call('/api/admin/payment-exceptions?status=invalid','GET',undefined,admin.token,400);
    phase = 'company create and direct SQL read';
    const company = (await call('/api/companies','POST',{legalName:name,companyTypeCode:'seller'},admin.token,201)).company;
    assert.equal((await pool.request().input('id',sql.Int,company.id).query('SELECT LegalName FROM dbo.Companies WHERE Id=@id')).recordset[0].LegalName,name);
    phase = 'tenant isolation';
    assert.ok(!(await call('/api/companies','GET',undefined,buyer.token)).companies.some(row=>row.id===company.id));
    await call('/api/companies/'+company.id,'PATCH',{legalName:'Forbidden'},buyer.token,403);
    phase = 'update and delete semantics';
    await call('/api/companies/'+company.id,'PATCH',{legalName:name+' updated'},admin.token);
    assert.equal((await pool.request().input('id',sql.Int,company.id).query('SELECT LegalName FROM dbo.Companies WHERE Id=@id')).recordset[0].LegalName,name+' updated');
    await call('/api/companies/'+company.id,'PATCH',{legalName:name},admin.token);
    await call('/api/companies/'+company.id,'DELETE',undefined,admin.token);
    const deleted=await pool.request().input('id',sql.Int,company.id).query('SELECT s.Code FROM dbo.Companies c JOIN dbo.AccountStatuses s ON c.VerificationStatusId=s.Id WHERE c.Id=@id');
    assert.equal(deleted.recordset[0].Code,'inactive');
    phase = 'MVP documents persist and isolate tenants';
    const buyerCompany=buyer.user.activeCompanyId;
    assert.ok(buyerCompany);
    const { PDFDocument } = require('pdf-lib');
    const pdf=await PDFDocument.create();pdf.addPage();
    const documentBody={fileName:'mvp-verification.pdf',contentType:'application/pdf',contentBase64:Buffer.from(await pdf.save()).toString('base64'),category:'general'};
    const uploaded=(await call('/api/documents','POST',documentBody,buyer.token,201)).document;
    assert.ok((await call('/api/documents','GET',undefined,buyer.token)).documents.some(d=>d.id===uploaded.id));
    await call('/api/documents?companyId='+company.id,'GET',undefined,buyer.token,403);
    const download=await fetch(origin+'/api/documents/'+uploaded.id+'/download',{headers:{authorization:'Bearer '+buyer.token}});
    assert.equal(download.status,200);assert.equal(Buffer.from(await download.arrayBuffer()).toString('base64'),documentBody.contentBase64);
    await call('/api/documents/'+uploaded.id,'PATCH',{status:'approved',note:'Cannot approve own evidence'},buyer.token,403);
    await call('/api/documents/'+uploaded.id,'PATCH',{status:'approved',note:'Local QA evidence review'},admin.token);
    assert.equal((await call('/api/documents','GET',undefined,buyer.token)).documents.find(d=>d.id===uploaded.id).status,'approved');
    phase='MVP verification evidence and review persist';
    await call('/api/companies/'+buyerCompany+'/verification','POST',{...documentBody,type:'business'},buyer.token,201);
    await call('/api/admin/verifications/'+buyerCompany,'PATCH',{decision:'approved',note:'Local QA verification'},admin.token);
    assert.equal((await call('/api/companies/'+buyerCompany+'/verification','GET',undefined,buyer.token)).status,'verified');
    phase='MVP contact persists and finance rejects fabricated success';
    const contact=await call('/api/contact','POST',{name:'Local QA',email:'qa@example.invalid',topic:'MVP test',message:'Local persistence verification only'},undefined,202);
    assert.equal(contact.deliveryStatus,'recorded');
    assert.ok((await call('/api/admin/contact-requests','GET',undefined,admin.token)).requests.some(r=>r.id===contact.id));
    await call('/api/admin/contact-requests','GET',undefined,buyer.token,403);
    await call('/api/payments','POST',{orderId:1,payerCompanyId:buyerCompany,paymentStatusCode:'captured'},buyer.token,409);
    await call('/api/escrows','POST',{orderId:1,escrowStatusCode:'funded'},buyer.token,409);
    await call('/api/checkout','POST',{listingId:1,quantity:1,idempotencyKey:'local-qa-checkout-001'},buyer.token,503);
    await call('/api/users/'+buyer.user.id,'PATCH',{accountStatusCode:'active'},buyer.token,403);
    console.log(JSON.stringify({mvpDocuments:true,downloadBytes:true,tenantRejection:true,verificationPersistence:true,contactPersistence:true,falsePaymentRejected:true,providerUnavailableSafe:true}));
    phase = 'RFQ responses and buyer-only acceptance';
    const seller=await call('/auth/login','POST',{email:'demo.seller@ecoglobe.com',password:process.env.ECOGLOBE_DEMO_PASSWORD,role:'seller'});
    const lookups=(await call('/api/lookups')).lookups;
    const material=lookups.MaterialTypes[0];
    const location=(await pool.request().input('company',sql.Int,seller.user.activeCompanyId).query(`
      INSERT dbo.Locations(CompanyId,LocationTypeId,Name,AddressLine1,City,CountryCode)
      OUTPUT INSERTED.Id AS id VALUES(@company,(SELECT TOP(1) Id FROM dbo.LocationTypes ORDER BY Id),'Local QA location','Test fixture only','Local QA','US')`)).recordset[0];
    const listing=(await pool.request().input('company',sql.Int,seller.user.activeCompanyId).input('location',sql.Int,location.id).input('slug',sql.VarChar,'local-qa-'+randomBytes(8).toString('hex')).input('material',sql.Int,material.id).query(`
      INSERT dbo.Listings(SellerCompanyId,LocationId,Title,Slug,MaterialTypeId,Quantity,QuantityUnit,MinimumOrderQuantity,PricePerUnit,CurrencyCode,ListingStatusId)
      OUTPUT INSERTED.Id AS id VALUES(@company,@location,'Local QA RFQ feedstock',@slug,@material,10,'ton',1,25,'USD',(SELECT Id FROM dbo.ListingStatuses WHERE Code='published'))`)).recordset[0];
    const wanted=(await call('/api/wanted-listings','POST',{title:'Local QA demand',materialTypeCode:material.code,quantity:2,quantityUnit:'ton',countryCode:'US'},buyer.token,201)).wantedListing;
    const reply=(await call('/api/wanted-listings/'+wanted.id+'/responses','POST',{listingId:listing.id,quantity:2,unitPrice:24},seller.token,201)).quote;
    assert.equal((await call('/api/wanted-listings/'+wanted.id+'/responses','GET',undefined,buyer.token)).responses[0].id,reply.id);
    await call('/api/quotes/'+reply.id,'PATCH',{quoteStatusCode:'accepted'},seller.token,403);
    await call('/api/quotes/'+reply.id,'PATCH',{quoteStatusCode:'accepted',unitPrice:1},buyer.token,403);
    await call('/api/quotes/'+reply.id,'PATCH',{quoteStatusCode:'accepted'},buyer.token);
    const wantedSaved=(await call('/api/wanted-listings?mine=true','GET',undefined,buyer.token)).wantedListings.find(w=>w.id===wanted.id);
    assert.equal(wantedSaved.responseCount,1);assert.equal(wantedSaved.acceptedCount,1);
    phase='checkout idempotency, stock reservation and concurrent oversell';
    const {reserveCheckout}=await import('../packages/backend/src/checkout-routes.ts');
    const actor={userId:buyer.user.id,companyId:buyerCompany,isAdmin:false};
    const config={platform:'acct_local_qa',live:false};
    const retryKey='qa-retry-'+randomBytes(8).toString('hex');
    const checkoutBody={listingId:listing.id,quantity:2,idempotencyKey:retryKey,deliveryMethod:'pickup',quoteId:reply.id};
    await assert.rejects(reserveCheckout(actor,checkoutBody,config),/upload the SDS/);
    await pool.request().input('listing',sql.Int,listing.id).input('content',sql.VarBinary(sql.MAX),Buffer.from(documentBody.contentBase64,'base64')).query(`
      INSERT dbo.ListingDocuments(ListingId,DocumentTypeId,FileName,FileUrl,VerificationStatusId,Content,ContentType)
      VALUES(@listing,(SELECT Id FROM dbo.DocumentTypes WHERE Code='sds'),'SYNTHETIC-QA-NOT-A-REAL-SDS.pdf','',(SELECT Id FROM dbo.AccountStatuses WHERE Code='pending_verification'),@content,'application/pdf')`);
    const [first,retry]=await Promise.all([reserveCheckout(actor,checkoutBody,config),reserveCheckout(actor,checkoutBody,config)]);
    assert.equal(first.orderId,retry.orderId);assert.equal(Number(first.amountCents),4800);
    await assert.rejects(reserveCheckout(actor,{...checkoutBody,quantity:3},config),/different details/);
    const attempts=await Promise.allSettled([reserveCheckout(actor,{listingId:listing.id,quantity:6,idempotencyKey:'qa-stock-a-'+randomBytes(8).toString('hex')},config),reserveCheckout(actor,{listingId:listing.id,quantity:6,idempotencyKey:'qa-stock-b-'+randomBytes(8).toString('hex')},config)]);
    assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
    const available=(await pool.request().input('id',sql.Int,listing.id).query('SELECT Quantity FROM dbo.Listings WHERE Id=@id')).recordset[0].Quantity;
    assert.equal(Number(available),2);
    console.log(JSON.stringify({checkoutIdempotent:true,quotePriceSaved:true,concurrentOversellRejected:true,remainingStock:Number(available)}));
    await call('/auth/logout','POST',undefined,seller.token);
    console.log(JSON.stringify({rfqPersisted:true,responseCounts:true,sellerCannotAccept:true,buyerCannotReprice:true}));
    phase = 'admin suspension revokes existing sessions permanently';
    await call('/api/users/'+buyer.user.id,'PATCH',{accountStatusCode:'suspended'},admin.token);
    await call('/auth/session','GET',undefined,buyer.token,401);
    await call('/api/users/'+buyer.user.id,'PATCH',{accountStatusCode:'active'},admin.token);
    await call('/auth/session','GET',undefined,buyer.token,401);
    phase = 'logout revocation';
    for (const session of [admin]) {
      await call('/auth/logout','POST',undefined,session.token);
      await call('/auth/session','GET',undefined,session.token,401);
    }
    const saved = JSON.stringify({database:dbName, id:company.id, name});
    await fixture.write(saved, 0, 'utf8');
    await fixture.truncate(Buffer.byteLength(saved));
    await fixture.sync();
    console.log(JSON.stringify({apiCrud:true,auth:true,tenantIsolation:true,scopedDatabaseUser:true,database:dbName,companyId:company.id,persistenceFixtureRetained:true}));
  }
} catch {
  console.error('Local SQL smoke failed at: '+phase+'; details withheld to protect credentials');
  process.exitCode=1;
} finally {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    const timer=setTimeout(()=>child.kill('SIGKILL'),5000);
    await once(child,'exit');
    clearTimeout(timer);
  }
  try {
    await pool?.close();
    await sql.close();
    await fixture?.close();
  } catch {
    console.error('Local SQL smoke cleanup failed; diagnostics withheld');
    process.exitCode=1;
  }
}
