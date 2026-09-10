import type { IncomingMessage, ServerResponse } from "node:http";
import { requireSessionAuth } from "./auth.js";
import { queryRowsWithParams as query, runInTransaction, queryRowsWithParamsInTransaction as txQuery } from "./database.js";
import { ApiError, readJsonBody, sendJson } from "./http.js";
import { int, text } from "./lab-routes.js";

import { canAdvanceDemo } from "./demo-order-domain.js";
let schema: Promise<unknown> | undefined;
function ensureSchema() {
  return schema ??= runInTransaction(async (tx) => {
    await txQuery(tx, `DECLARE @r int; EXEC @r=sp_getapplock @Resource='EcoGlobeDemoOrdersSchema',@LockMode='Exclusive',@LockOwner='Transaction'; IF @r<0 THROW 50000,'Demo schema lock unavailable',1;
    IF OBJECT_ID('dbo.DemoOrders') IS NULL CREATE TABLE dbo.DemoOrders(
      Id int IDENTITY PRIMARY KEY, ListingId int NOT NULL REFERENCES dbo.Listings(Id),
      BuyerCompanyId int NOT NULL REFERENCES dbo.Companies(Id), SellerCompanyId int NOT NULL REFERENCES dbo.Companies(Id),
      CreatedBy int NOT NULL REFERENCES dbo.Users(Id), Quantity decimal(18,3) NOT NULL,
      TotalAmount decimal(18,2) NOT NULL, CurrencyCode nvarchar(8) NOT NULL,
      DeliveryAddress nvarchar(1000) NOT NULL, Status nvarchar(30) NOT NULL,
      CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(), UpdatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
    IF OBJECT_ID('dbo.DemoOrderEvents') IS NULL CREATE TABLE dbo.DemoOrderEvents(
      Id int IDENTITY PRIMARY KEY, DemoOrderId int NOT NULL REFERENCES dbo.DemoOrders(Id),
      ActorUserId int NOT NULL REFERENCES dbo.Users(Id), Status nvarchar(30) NOT NULL,
      CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME());`);
  }).catch((error: unknown) => { schema = undefined; throw error; });
}
export async function handleDemoOrderRoute(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (!url.pathname.startsWith('/api/demo-orders')) return false;
  if (process.env.ECOGLOBE_DEMO_ORDERS !== 'true') {
    sendJson(res, 404, { error: 'Saved demo orders are not enabled.' }); return true;
  }
  const auth = await requireSessionAuth(req);
  if (!auth.companyId && !auth.isAdmin) throw new ApiError(403, 'Company membership required for saved demo orders.');
  await ensureSchema();
  if (url.pathname === '/api/demo-orders' && req.method === 'GET') {
    const rows = await query(`SELECT d.Id id,d.ListingId listingId,l.Title title,d.Quantity quantity,d.TotalAmount totalAmount,d.CurrencyCode currencyCode,d.DeliveryAddress deliveryAddress,d.Status status,d.CreatedAt createdAt,
      b.LegalName buyer,s.LegalName seller FROM dbo.DemoOrders d JOIN dbo.Listings l ON l.Id=d.ListingId JOIN dbo.Companies b ON b.Id=d.BuyerCompanyId JOIN dbo.Companies s ON s.Id=d.SellerCompanyId
      WHERE @admin=1 OR d.BuyerCompanyId=@company OR d.SellerCompanyId=@company ORDER BY d.Id DESC`, [int('admin',auth.isAdmin?1:0),int('company',auth.companyId)]);
    sendJson(res,200,{orders:rows}); return true;
  }
  if (url.pathname === '/api/demo-orders' && req.method === 'POST') {
    if (!auth.companyId) throw new ApiError(403,'Choose a company to create a demo order.');
    const body = await readJsonBody(req);
    const listingId = Number(body.listingId), quantity = Number(body.quantity);
    if (!Number.isSafeInteger(listingId) || listingId<1 || !Number.isFinite(quantity) || quantity<0.001 || quantity>1000000) throw new ApiError(400,'Enter a valid listing and quantity.');
    const address = typeof body.deliveryAddress==='string' ? body.deliveryAddress.trim() : '';
    if (!address || address.length>1000) throw new ApiError(400,'Enter a demo delivery address (up to 1000 characters).');
    const result = await runInTransaction(async(tx)=>{
      const listings=await txQuery(tx,`SELECT SellerCompanyId sellerId,COALESCE(PricePerUnit,0) price,COALESCE(CurrencyCode,'USD') currency FROM dbo.Listings WHERE Id=@listing AND ListingStatusId IN (SELECT Id FROM dbo.ListingStatuses WHERE Code='published')`,[int('listing',listingId)]);
      const listing=listings[0]; if(!listing) throw new ApiError(404,'Listing not found.');
      const rows=await txQuery(tx,`INSERT dbo.DemoOrders(ListingId,BuyerCompanyId,SellerCompanyId,CreatedBy,Quantity,TotalAmount,CurrencyCode,DeliveryAddress,Status)
        OUTPUT INSERTED.Id id VALUES(@listing,@buyer,@seller,@user,CONVERT(decimal(18,3),@qty),CONVERT(decimal(18,2),@total),@currency,@address,'submitted')`,
        [int('listing',listingId),int('buyer',auth.companyId),int('seller',listing.sellerId),int('user',auth.userId),text('qty',String(quantity)),text('total',String(Math.round(Number(listing.price)*quantity*100)/100)),text('currency',listing.currency),text('address',address)]);
      await txQuery(tx,`INSERT dbo.DemoOrderEvents(DemoOrderId,ActorUserId,Status) VALUES(@id,@user,'submitted')`,[int('id',rows[0]!.id),int('user',auth.userId)]);
      return rows[0];
    });
    sendJson(res,201,{order:result}); return true;
  }
  const match=/^\/api\/demo-orders\/(\d+)$/.exec(url.pathname);
  if(match && req.method==='PATCH') {
    const body=await readJsonBody(req); const requested=String(body.status);
    await runInTransaction(async(tx)=>{
      const rows=await txQuery(tx,`SELECT Status status FROM dbo.DemoOrders WITH(UPDLOCK,HOLDLOCK) WHERE Id=@id AND (@admin=1 OR BuyerCompanyId=@company OR SellerCompanyId=@company)`,[int('id',Number(match[1])),int('admin',auth.isAdmin?1:0),int('company',auth.companyId)]);
      if(!rows[0]) throw new ApiError(404,'Demo order not found.');
      const current=String(rows[0].status);
      if(!canAdvanceDemo(current,requested)) throw new ApiError(409,'Refresh the demo order before advancing.');
      await txQuery(tx,`UPDATE dbo.DemoOrders SET Status=@status,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id; INSERT dbo.DemoOrderEvents(DemoOrderId,ActorUserId,Status) VALUES(@id,@user,@status)`,[int('id',Number(match[1])),int('user',auth.userId),text('status',requested)]);
    }); sendJson(res,200,{ok:true});return true;
  }
  throw new ApiError(404,'Demo route not found.');
}
