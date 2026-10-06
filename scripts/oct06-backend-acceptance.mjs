/** Synthetic SQL/API acceptance, never provider evidence. Use the sibling Python launcher. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../packages/backend/package.json', import.meta.url));
const sql = require('mssql');
let pool, server;
let phase = 'owned local database guard';
try {
  assert.match(process.env.ORCA_SQL_DATABASE ?? '', /^eco_[a-f0-9]{24}$/);
  assert.match(process.env.ORCA_SQL_MARKER ?? '', /^[a-f0-9]{64}$/);
  assert.ok(process.env.AZURE_SQL_CONNECTION_STRING?.startsWith('Server=127.0.0.1,'));
  for (const key of ['STRIPE_SECRET_KEY', 'RESEND_API_KEY', 'DOCUSIGN_PRIVATE_KEY', 'FEDEX_CLIENT_SECRET']) assert.ok(!process.env[key]);
  pool = await sql.connect(process.env.AZURE_SQL_CONNECTION_STRING);
  const identity = (await pool.request().query('SELECT DB_NAME() AS db,Token FROM dbo.OrcaOwner')).recordset[0];
  assert.equal(identity.db, process.env.ORCA_SQL_DATABASE);
  assert.equal(identity.Token, process.env.ORCA_SQL_MARKER);
  const { initializeCompanyProfilesSql } = await import('../packages/backend/src/company-profiles.ts');
  const { reserveCheckout } = await import('../packages/backend/src/checkout-routes.ts');
  const { issueSession, revokeSession } = await import('../packages/backend/src/auth.ts');
  const { handleApiRoute } = await import('../packages/backend/src/api.ts');
  const { handleLogisticsRoute } = await import('../packages/backend/src/logistics-routes.ts');
  const { ApiError } = await import('../packages/backend/src/http.ts');
  const nonce = randomUUID();
  const user = (await pool.request().input('email', sql.NVarChar(320), `oct06-${nonce}@example.test`).query("INSERT dbo.Users(Name,Email,AccountStatusId,EmailVerifiedAt) OUTPUT INSERTED.Id AS id VALUES('Synthetic Oct6',@email,(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),SYSUTCDATETIME())")).recordset[0].id;
  async function company(type) {
    return (await pool.request().input('name', sql.NVarChar(240), `Synthetic Oct6 ${type} ${nonce}`).input('type', sql.VarChar(80), type).query("INSERT dbo.Companies(LegalName,CompanyTypeId,VerificationStatusId) OUTPUT INSERTED.Id AS id VALUES(@name,(SELECT Id FROM dbo.CompanyTypes WHERE Code=@type),(SELECT Id FROM dbo.AccountStatuses WHERE Code='pending_verification'))")).recordset[0].id;
  }
  const buyer = await company('buyer'), seller = await company('seller');
  for (const id of [buyer, seller]) {
    await pool.request().input('company', sql.Int, id).input('user', sql.Int, user).query("INSERT dbo.CompanyMembers(UserId,CompanyId,MemberRoleId,PermissionTierId,MemberStatusId,CanExecuteTransactions) VALUES(@user,@company,(SELECT Id FROM dbo.MemberRoles WHERE Code='owner'),(SELECT Id FROM dbo.PermissionTiers WHERE Code='executor'),(SELECT Id FROM dbo.AccountStatuses WHERE Code='active'),1)");
  }
  phase = 'missing profile initialization and idempotent preservation';
  for (const id of [buyer, seller, buyer, seller]) {
    const tx = new sql.Transaction(pool); await tx.begin();
    try { await new sql.Request(tx).input('companyId', sql.Int, id).query(initializeCompanyProfilesSql); await tx.commit(); }
    catch (error) { await tx.rollback(); throw error; }
  }
  const profiles = (await pool.request().input('buyer', sql.Int, buyer).input('seller', sql.Int, seller).query("SELECT (SELECT COUNT(*) FROM dbo.BuyerProfiles WHERE CompanyId=@buyer) AS bp,(SELECT COUNT(*) FROM dbo.SellerProfiles WHERE CompanyId=@buyer) AS wrongSeller,(SELECT COUNT(*) FROM dbo.SellerProfiles WHERE CompanyId=@seller) AS sp,(SELECT COUNT(*) FROM dbo.BuyerProfiles WHERE CompanyId=@seller) AS wrongBuyer")).recordset[0];
  assert.deepEqual(profiles, { bp: 1, wrongSeller: 0, sp: 1, wrongBuyer: 0 });
  const before = (await pool.request().input('seller', sql.Int, seller).query('SELECT LicenceTierId,ApprovalStatusId FROM dbo.SellerProfiles WHERE CompanyId=@seller')).recordset[0];
  await pool.request().input('companyId', sql.Int, seller).query(initializeCompanyProfilesSql);
  assert.deepEqual((await pool.request().input('seller', sql.Int, seller).query('SELECT LicenceTierId,ApprovalStatusId FROM dbo.SellerProfiles WHERE CompanyId=@seller')).recordset[0], before);
  const buyerSession = await issueSession({ userId: user, activeCompanyId: buyer, activeRoleCode: 'buyer' });
  const sellerSession = await issueSession({ userId: user, activeCompanyId: seller, activeRoleCode: 'seller' });
  const tokens = [buyerSession.token, sellerSession.token];
  server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, process.env.ECOGLOBE_API_BASE_URL);
      if (!await handleLogisticsRoute(req, res, url) && !await handleApiRoute(req, res, url)) { res.writeHead(404); res.end('{}'); }
    } catch (error) { res.writeHead(error instanceof ApiError ? error.status : 500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: false })); }
  });
  server.listen(Number(process.env.PORT), '127.0.0.1'); await once(server, 'listening');
  async function call(path, token, status = 200, method = 'GET', body) {
    const res = await fetch(process.env.ECOGLOBE_API_BASE_URL + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    assert.equal(res.status, status, phase + ' HTTP status'); return res.json();
  }
  phase = 'portal role and tenant guards';
  await call('/api/tracker?role=buyer', buyerSession.token);
  await call('/api/tracker?role=seller', buyerSession.token, 403);
  await call('/api/tracker?role=seller', sellerSession.token);
  await call('/api/tracker?role=buyer', sellerSession.token, 403);
  phase = 'full facility roundtrip and coordinate invalidation';
  const loc = (await call('/api/locations', sellerSession.token, 201, 'POST', { companyId: seller, locationTypeCode: 'pickup', name: 'Synthetic facility', addressLine1: 'Synthetic street', city: 'Synthetic city', stateProvince: 'LA', postalCode: '70801', countryCode: 'US', latitude: 30.4524, longitude: -91.2103 })).location;
  assert.equal(loc.latitude, 30.4524);
  const corrected = (await call(`/api/locations/${loc.id}`, sellerSession.token, 200, 'PATCH', { postalCode: '70808', stateProvince: null })).location;
  assert.equal(corrected.postalCode, '70808'); assert.equal(corrected.stateProvince, null); assert.equal(corrected.latitude, null); assert.equal(corrected.longitude, null);
  await call(`/api/locations/${loc.id}`, buyerSession.token, 403, 'PATCH', { postalCode: '70801' });
  await call(`/api/locations/${loc.id}`, sellerSession.token, 400, 'PATCH', { latitude: 91, longitude: 0 });
  await call(`/api/locations/${loc.id}`, sellerSession.token, 400, 'PATCH', { countryCode: '70' });
  await call(`/api/locations/${loc.id}`, sellerSession.token, 200, 'PATCH', { latitude: 30.4524, longitude: -91.2103 });
  const listing = (await pool.request().input('seller', sql.Int, seller).input('loc', sql.Int, loc.id).input('slug', sql.VarChar(180), nonce).query("INSERT dbo.Listings(SellerCompanyId,LocationId,Title,Slug,MaterialTypeId,Quantity,QuantityUnit,MinimumOrderQuantity,PricePerUnit,CurrencyCode,ListingStatusId) OUTPUT INSERTED.Id AS id VALUES(@seller,@loc,'Synthetic Oct6 listing',@slug,(SELECT TOP(1) Id FROM dbo.MaterialTypes),10,'units',1,3,'USD',(SELECT Id FROM dbo.ListingStatuses WHERE Code='published'))")).recordset[0].id;
  for (const type of ['sds', 'photo']) await pool.request().input('listing', sql.Int, listing).input('type', sql.VarChar(80), type).input('bytes', sql.VarBinary(sql.MAX), Buffer.from(type === 'sds' ? '%PDF synthetic isolated fixture' : 'synthetic isolated photo')).query("INSERT dbo.ListingDocuments(ListingId,DocumentTypeId,FileName,FileUrl,VerificationStatusId,Content,ContentType) VALUES(@listing,(SELECT Id FROM dbo.DocumentTypes WHERE Code=@type),@type,'',(SELECT Id FROM dbo.AccountStatuses WHERE Code='pending_verification'),@bytes,'application/octet-stream')");
  phase = 'anonymous saved photo without private listing disclosure and real radius';
  const teaser = (await call(`/api/listings/${listing}`)).listing;
  assert.match(teaser.listingImageUrl, /^\/api\/listing-documents\/\d+\/download$/);
  assert.deepEqual(teaser.documents, []); assert.equal(teaser.sellerCompanyName, null); assert.equal(teaser.location.latitude, null);
  assert.ok((await call('/api/listings?latitude=30.4524&longitude=-91.2103&radiusMiles=2', buyerSession.token)).listings.some(row => row.id === listing));
  assert.ok(!(await call('/api/listings?latitude=0&longitude=0&radiusMiles=2', buyerSession.token)).listings.some(row => row.id === listing));
  await call('/api/listings?radiusMiles=2', undefined, 400);
  await call('/api/listings?latitude=30.4524&longitude=-91.2103&radiusMiles=2', undefined, 403);
  phase = 'concurrent idempotent reservation and pickup SQL roundtrip';
  const body = { listingId: listing, quantity: 2, idempotencyKey: `oct06-${nonce}`, pickupRequestedAt: '2026-10-07T14:00:00Z', pickupContactName: 'Synthetic driver', pickupContactPhone: '+1 555 0100', pickupVehicleDetails: 'Synthetic truck' };
  const auth = { userId: user, companyId: buyer, isAdmin: false };
  const config = { platform: 'synthetic-local-only', live: false };
  const [first, retry] = await Promise.all([reserveCheckout(auth, body, config), reserveCheckout(auth, body, config)]);
  assert.equal(first.orderId, retry.orderId);
  await assert.rejects(reserveCheckout(auth, { ...body, pickupVehicleDetails: 'Changed' }, config), error => error instanceof ApiError && error.status === 409);
  assert.equal((await pool.request().input('id', sql.Int, listing).query('SELECT Quantity FROM dbo.Listings WHERE Id=@id')).recordset[0].Quantity, 8);
  const saved = (await call(`/api/orders/${first.orderId}`, buyerSession.token)).order;
  assert.equal(saved.pickupContactName, body.pickupContactName); assert.equal(saved.pickupContactPhone, body.pickupContactPhone); assert.equal(saved.pickupVehicleDetails, body.pickupVehicleDetails); assert.equal(saved.orderStatusCode, 'awaiting_payment'); assert.equal(new Date(saved.pickupRequestedAt).toISOString(), '2026-10-07T14:00:00.000Z');
  phase = 'historic unpaid fulfilment gate and synthetic funded positive path';
  await call(`/api/orders/${first.orderId}`, buyerSession.token, 409, 'PATCH', { orderStatusCode: 'in_progress' });
  await pool.request().input('order', sql.Int, first.orderId).query("UPDATE dbo.Orders SET OrderStatusId=(SELECT Id FROM dbo.OrderStatuses WHERE Code='in_progress') WHERE Id=@order");
  await call(`/api/logistics/orders/${first.orderId}/confirm`, buyerSession.token, 409, 'POST', { receiverName: 'Synthetic receiver', inspectionComplete: true });
  await pool.request().input('order', sql.Int, first.orderId).input('buyer', sql.Int, buyer).query("INSERT dbo.Payments(OrderId,PayerCompanyId,ProviderPaymentId,Amount,CurrencyCode,PaymentStatusId,PaymentTypeId) VALUES(@order,@buyer,'synthetic-isolated-not-provider-evidence',6,'EUR',(SELECT Id FROM dbo.PaymentStatuses WHERE Code='captured'),(SELECT Id FROM dbo.PaymentTypes WHERE Code='buyer_funding'))");
  await call(`/api/logistics/orders/${first.orderId}/confirm`, buyerSession.token, 409, 'POST', { receiverName: 'Synthetic receiver', inspectionComplete: true });
  await pool.request().input('order', sql.Int, first.orderId).query("UPDATE dbo.Payments SET CurrencyCode='USD' WHERE OrderId=@order");
  await call(`/api/logistics/orders/${first.orderId}/confirm`, sellerSession.token, 403, 'POST', { receiverName: 'Synthetic receiver', inspectionComplete: true });
  await call(`/api/logistics/orders/${first.orderId}/confirm`, buyerSession.token, 200, 'POST', { receiverName: 'Synthetic receiver', inspectionComplete: true });
  assert.equal((await call(`/api/orders/${first.orderId}`, buyerSession.token)).order.orderStatusCode, 'completed');
  for (const token of tokens) await revokeSession(token);
  console.log(JSON.stringify({ passed: true, syntheticOnly: true, providerEvidence: false, listingId: listing, orderId: first.orderId }));
} catch (error) {
  console.error(`Oct 6 acceptance failed at ${phase}; sensitive details withheld.`); process.exitCode = 1;
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await sql.close();
}
