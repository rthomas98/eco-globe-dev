import type { IncomingMessage,ServerResponse } from 'node:http';
import { requireSessionAuth } from './auth.js';
import {queryRowsWithParams as query,runInTransaction,queryRowsWithParamsInTransaction as txQuery,sql} from './database.js';
import {ApiError,readJsonBody,sendJson,type AuthContext} from './http.js';
import {assertRefundAction,refundAmount,refundText,refundRequestKey,refundHours} from './refund-domain.js';
import {readRefundPayment,readRefundProof,assertNoUnrecordedRefund} from './refund-provider.js';
import {caseSelect,getRefundCase,lockedRefund,refundCompanyAccess,refundDetail,refundEvent,refundProjection,rp,type RefundCaseRow,type RefundExec} from './refund-store.js';
import {processRefundReminders} from './refund-reminders.js';
import {assertSessionMatches} from './checkout-routes.js';
import {stripeConfiguration} from './stripe-setup.js';
type OrderProof={id:number;buyerCompanyId:number;sellerCompanyId:number;currencyCode:string;paidCents:number|null;paymentIntentId:string|null;platformAccountId:string|null;livemode:boolean|null;providerSessionId:string|null;checkoutState:string|null};
async function orderProof(id:number,auth:AuthContext,write=false) {
 const row=(await query<OrderProof>(`SELECT o.Id AS id,o.BuyerCompanyId AS buyerCompanyId,o.SellerCompanyId AS sellerCompanyId,o.CurrencyCode AS currencyCode,ca.AmountCents AS paidCents,p.ProviderPaymentId AS paymentIntentId,ca.PlatformAccountId AS platformAccountId,ca.Livemode AS livemode,ca.ProviderSessionId AS providerSessionId,ca.State AS checkoutState FROM dbo.Orders o OUTER APPLY(SELECT TOP(1) * FROM dbo.CheckoutAttempts a WHERE a.OrderId=o.Id AND (a.State='paid' OR EXISTS(SELECT 1 FROM dbo.CheckoutAnomalies x WHERE x.ProviderSessionId=a.ProviderSessionId AND x.OrderId=o.Id AND x.ResolvedAt IS NULL)) ORDER BY a.Id DESC) ca OUTER APPLY(SELECT TOP(1) p.ProviderPaymentId FROM dbo.Payments p JOIN dbo.PaymentStatuses s ON s.Id=p.PaymentStatusId JOIN dbo.PaymentTypes t ON t.Id=p.PaymentTypeId WHERE p.OrderId=o.Id AND s.Code IN('captured','refunded') AND t.Code='buyer_funding' ORDER BY p.Id DESC) p WHERE o.Id=@id`,[rp('id',id,sql.Int)]))[0];
 if(!row)throw new ApiError(404,'Order not found.');
 if(!auth.isAdmin){
  if(auth.companyId!==row.buyerCompanyId&&auth.companyId!==row.sellerCompanyId)throw new ApiError(403,'Order company access denied.');
  if(write&&auth.companyId!==row.buyerCompanyId)throw new ApiError(403,'Only the buyer can request a refund.');
  await refundCompanyAccess(auth,auth.companyId,write);
 }
 if(row.providerSessionId&&row.platformAccountId&&row.livemode!==null&&row.paidCents){
  const config=stripeConfiguration();
  if(config.platform!==row.platformAccountId||config.live!==row.livemode)throw new ApiError(409,'Payment provider binding is unavailable.');
  const session=await config.stripe.checkout.sessions.retrieve(row.providerSessionId);
  assertSessionMatches({providerSessionId:row.providerSessionId,livemode:row.livemode,amountCents:Number(row.paidCents),currencyCode:row.currencyCode},session);
  if(session.payment_status==='paid'){const intent=typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id??null;if(row.paymentIntentId&&row.paymentIntentId!==intent)throw new ApiError(409,'Saved payment and checkout binding disagree.');row.paymentIntentId=intent;}
 }
 return row;
}
function binding(row:OrderProof) {
 if(!row.paymentIntentId||!/^pi_/.test(row.paymentIntentId)||!row.platformAccountId||row.livemode===null||!row.paidCents)throw new ApiError(409,'No confirmed Stripe checkout payment is linked to this order.');
 return {paymentIntentId:row.paymentIntentId,platformAccountId:row.platformAccountId,livemode:row.livemode,paidCents:Number(row.paidCents),currencyCode:row.currencyCode};
}
function admin(auth:AuthContext){if(!auth.isAdmin)throw new ApiError(403,'Administrator required.');}
async function sourceCases(type:string,id:number,auth:AuthContext) {
 const rows=await query<RefundCaseRow>(`${caseSelect} WHERE r.SourceType=@type AND r.SourceId=@id ORDER BY r.Id DESC`,[rp('type',type),rp('id',id,sql.Int)]);
 return Promise.all(rows.map(row=>refundProjection(row,auth)));
}
export async function createOrderRefund(orderId:number,auth:AuthContext,body:Record<string,unknown>) {
 const amount=refundAmount(body.amountCents),reason=refundText(body.reason,'Reason'),key=refundRequestKey(body.idempotencyKey);
 const proof=await orderProof(orderId,auth,true),payment=binding(proof);
 const providerPayment=await readRefundPayment(payment);
 return runInTransaction(async tx=>{
  const exec:RefundExec=(statement,params)=>txQuery(tx,statement,params);
  const lock=(await exec<{result:number}>(`DECLARE @r INT; EXEC @r=sys.sp_getapplock @Resource=@resource,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; SELECT @r AS result`,[rp('resource',`refund:order:${orderId}`)]))[0];
  if(lock.result<0)throw new ApiError(409,'Refund is busy. Retry.');
  const replay=(await exec<{id:number;sourceId:number;amountCents:number;reason:string}>(`SELECT Id AS id,SourceId AS sourceId,AmountCents AS amountCents,Reason AS reason FROM dbo.RefundCases WHERE BuyerCompanyId=@buyer AND RequestKey=@key`,[rp('buyer',proof.buyerCompanyId,sql.Int),rp('key',key)]))[0];
  if(replay){if(replay.sourceId!==orderId||Number(replay.amountCents)!==amount||replay.reason!==reason)throw new ApiError(409,'Refund idempotency key was reused with different details.');return {id:replay.id,created:false};}
  if((await exec('SELECT Id FROM dbo.RefundCases WHERE SourceType=\'order\' AND SourceId=@id AND Active=1',[rp('id',orderId,sql.Int)])).length)throw new ApiError(409,'This order already has an open refund case.');
  const paid=providerPayment;
  if(amount>paid.availableCents)throw new ApiError(409,'Amount exceeds the remaining Stripe refundable balance.');
  const row=(await exec<{id:number}>(`INSERT dbo.RefundCases(SourceType,SourceId,OrderId,BuyerCompanyId,SellerCompanyId,PaymentIntentId,PlatformAccountId,Livemode,AmountCents,PaidCents,CurrencyCode,Reason,RequestKey,CreatedByUserId,BaselineRefundedCents) OUTPUT INSERTED.Id AS id VALUES('order',@source,@source,@buyer,@seller,@intent,@platform,@live,@amount,@paid,@currency,@reason,@key,@user,@baseline)`,[rp('source',orderId,sql.Int),rp('buyer',proof.buyerCompanyId,sql.Int),rp('seller',proof.sellerCompanyId,sql.Int),rp('intent',payment.paymentIntentId),rp('platform',payment.platformAccountId),rp('live',payment.livemode,sql.Bit),rp('amount',amount,sql.Int),rp('paid',payment.paidCents,sql.Int),rp('currency',payment.currencyCode),rp('reason',reason),rp('key',key),rp('user',auth.userId,sql.Int),rp('baseline',providerPayment.charge.amount_refunded,sql.Int)]))[0];
  const refund=(await exec<RefundCaseRow & Record<string,unknown>>(`${caseSelect} WHERE r.Id=@id`,[rp('id',row.id,sql.Int)]))[0];
  await refundEvent(exec,refund,auth,'requested','Refund requested. Staff will review before processing any refund in Stripe.');
  return {id:row.id,created:true};
 });
}
export async function ensureSampleManualRefund(exec:RefundExec,sample:{id:number;buyerCompanyId:number;sellerCompanyId:number;paymentIntentId:string;shippingCents:number}) {
 if(!/^pi_/.test(sample.paymentIntentId))throw new ApiError(409,'Sample has no valid Stripe payment reference; staff must investigate.');
 const config=stripeConfiguration();
 // Serialized by the existing sample-shipping transaction lock; one source case.
 const exists=await exec(`SELECT Id FROM dbo.RefundCases WITH(UPDLOCK,HOLDLOCK) WHERE SourceType='sample' AND SourceId=@id`,[rp('id',sample.id,sql.Int)]);
 if(exists.length)return;
 const row=(await exec<{id:number}>(`INSERT dbo.RefundCases(SourceType,SourceId,SampleRequestId,BuyerCompanyId,SellerCompanyId,PaymentIntentId,PlatformAccountId,Livemode,AmountCents,PaidCents,CurrencyCode,Reason,RequestKey) OUTPUT INSERTED.Id AS id VALUES('sample',@source,@source,@buyer,@seller,@intent,@platform,@live,@amount,@amount,'USD','Paid sample shipping failed; staff refund review required.',@key)`,[rp('source',sample.id,sql.Int),rp('buyer',sample.buyerCompanyId,sql.Int),rp('seller',sample.sellerCompanyId,sql.Int),rp('intent',sample.paymentIntentId),rp('platform',config.platform),rp('live',config.live,sql.Bit),rp('amount',refundAmount(sample.shippingCents),sql.Int),rp('key',`sample-manual-refund-${sample.id}`)]))[0];
 const refund=(await exec<RefundCaseRow & Record<string,unknown>>(`${caseSelect} WHERE r.Id=@id`,[rp('id',row.id,sql.Int)]))[0];
 await refundEvent(exec,refund,null,'requested','Paid sample shipping requires staff review and a manual Stripe refund.');
}
export async function handleRefundRoute(request:IncomingMessage,response:ServerResponse,url:URL) {
 const path=url.pathname,order=path.match(/^\/api\/orders\/(\d+)\/refunds$/),item=path.match(/^\/api\/refunds\/(\d+)(?:\/(decision|request-information|respond|reconcile))?$/);
 if(path!=='/api/refunds'&&!order&&!item&&path!=='/api/admin/refund-reminders/process')return false;
 const auth=await requireSessionAuth(request),method=request.method;
 if(path==='/api/admin/refund-reminders/process'&&method==='POST'){admin(auth);sendJson(response,200,{ok:true,processed:await processRefundReminders()});return true;}
 if(path==='/api/refunds'&&method==='GET'){
  const role=url.searchParams.get('role'),status=url.searchParams.get('status')??'open';
  if(!['buyer','seller','admin'].includes(role??'')||!['open','all'].includes(status))throw new ApiError(400,'Valid role and status required.');
  if(role==='admin')admin(auth);else{if(!auth.companyId)throw new ApiError(403,'Active company required.');await refundCompanyAccess(auth,auth.companyId);}
  const rows=await query<RefundCaseRow>(`${caseSelect} WHERE (@all=1 OR r.Active=1) AND (@admin=1 OR ${role==='seller'?'r.SellerCompanyId':'r.BuyerCompanyId'}=@company) ORDER BY r.Id DESC OFFSET 0 ROWS FETCH NEXT 501 ROWS ONLY`,[rp('all',status==='all',sql.Bit),rp('admin',role==='admin'&&auth.isAdmin,sql.Bit),rp('company',auth.companyId??0,sql.Int)]);
  sendJson(response,200,{ok:true,refunds:await Promise.all(rows.slice(0,500).map(r=>refundProjection(r,auth))),hasMore:rows.length>500});return true;
 }
 if(order){
  const id=Number(order[1]);
  if(method==='POST'){const result=await createOrderRefund(id,auth,await readJsonBody(request));sendJson(response,result.created?201:200,await refundDetail(result.id,auth));return true;}
  if(method==='GET'){
   const proof=await orderProof(id,auth),cases=await sourceCases('order',id,auth),active=cases.find(r=>r.settlementHold);
   let paidCents:number|null=null,availableCents:number|null=null,reason:string|null=null;
   try{const payment=binding(proof);const provider=await readRefundPayment(payment);paidCents=payment.paidCents;availableCents=provider.availableCents;}catch(error){reason=error instanceof ApiError?error.message:'Stripe payment verification is currently unavailable.';}
   const canRequest=auth.isAdmin||auth.companyId===proof.buyerCompanyId;
   if(!reason&&!canRequest)reason='Only the buyer can request a refund.';
   if(!reason&&active)reason='An open refund case already exists.';
   if(!reason&&availableCents===0)reason='Payment has no remaining refundable balance.';
   if(!reason&&!auth.isAdmin){try{await refundCompanyAccess(auth,proof.buyerCompanyId,true);}catch{reason='Buyer transaction permission required.';}}
   sendJson(response,200,{ok:true,eligibility:{orderId:id,eligible:!reason,reason,paidCents,availableCents,currencyCode:proof.currencyCode,activeRefundId:active?.id??null,settlementHold:Boolean(active)},refunds:cases});return true;
  }
 }
 if(item){
  const id=Number(item[1]),action=item[2];
  if(!action&&method==='GET'){sendJson(response,200,await refundDetail(id,auth));return true;}
  if(action&&method==='POST'){
   const initial=await getRefundCase(id,auth,action==='respond'),body=await readJsonBody(request);
   if(action!=='respond')admin(auth);
   if(action==='reconcile'){
    if(typeof body.refundId!=='string'||!/^re_[A-Za-z0-9]+$/.test(body.refundId))throw new ApiError(400,'Valid Stripe refund reference required.');
    const refundId=body.refundId;
    assertRefundAction(initial.status,'reconcile');
    const proof=await readRefundProof(initial,refundId);
    const previous=initial.providerRefundId&&initial.providerRefundId!==refundId?await readRefundProof(initial,initial.providerRefundId):null;
    await lockedRefund(id,async(row,exec)=>{
     assertRefundAction(row.status,'reconcile');
     if(row.providerRefundId!==initial.providerRefundId||row.status!==initial.status||row.actionVersion!==initial.actionVersion)throw new ApiError(409,'Refund case changed. Refresh before verifying.');
     if(row.providerRefundId&&row.providerRefundId!==refundId){
      if(!previous)throw new ApiError(409,'Prior refund proof required.');
      if(previous.status!=='failed'&&previous.status!=='canceled')throw new ApiError(409,'The bound refund is not conclusively failed or canceled. Reconcile it in Stripe first.');
     }
     if(row.status==='refunded')return;
     const total=(await exec<{cents:number}>(`SELECT COALESCE(SUM(AmountCents),0) AS cents FROM dbo.RefundCases WHERE PaymentIntentId=@intent AND PlatformAccountId=@platform AND Livemode=@live AND Status='refunded' AND Id<>@id`,[rp('intent',row.paymentIntentId),rp('platform',row.platformAccountId),rp('live',row.livemode,sql.Bit),rp('id',id,sql.Int)]))[0];
     if(Number(total.cents)+row.amountCents>row.paidCents||row.baselineRefundedCents+row.amountCents>row.paidCents)throw new ApiError(409,'Refund total exceeds the confirmed payment.');
     if((await exec('SELECT RefundCaseId FROM dbo.RefundProviderReferences WHERE PlatformAccountId=@platform AND Livemode=@live AND RefundId=@refund AND RefundCaseId<>@id',[rp('platform',row.platformAccountId),rp('live',row.livemode,sql.Bit),rp('refund',refundId),rp('id',id,sql.Int)])).length)throw new ApiError(409,'Stripe refund is already used by another case.');
     await exec(`IF NOT EXISTS(SELECT RefundId FROM dbo.RefundProviderReferences WITH(UPDLOCK,HOLDLOCK) WHERE PlatformAccountId=@platform AND Livemode=@live AND RefundId=@refund) INSERT dbo.RefundProviderReferences(PlatformAccountId,Livemode,RefundId,RefundCaseId) VALUES(@platform,@live,@refund,@id)`,[rp('platform',row.platformAccountId),rp('live',row.livemode,sql.Bit),rp('refund',refundId),rp('id',id,sql.Int)]);
     const status=proof.status==='succeeded'?'refunded':['failed','canceled'].includes(proof.status??'')?'provider_failed':'provider_pending';
     const changed=row.status!==status||row.providerRefundId!==refundId||row.providerStatus!==proof.status;
     await exec(`UPDATE dbo.RefundCases SET Status=@status,Active=@active,ProviderRefundId=@refund,ProviderStatus=@provider,RequiredAction=NULL,ActionDueAt=NULL,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id`,[rp('status',status),rp('active',status!=='refunded',sql.Bit),rp('refund',refundId),rp('provider',proof.status),rp('id',id,sql.Int)]);
     if(row.sourceType==='sample')await exec(`UPDATE dbo.SampleShipping SET RefundState=@state,RefundId=@refund,UpdatedAt=SYSUTCDATETIME() WHERE SampleRequestId=@source`,[rp('state',status==='refunded'?'succeeded':status==='provider_failed'?'failed':'pending'),rp('refund',refundId),rp('source',row.sourceId,sql.Int)]);
     if(status==='refunded'&&row.orderId)await exec(`UPDATE dbo.CheckoutAnomalies SET ResolvedAt=SYSUTCDATETIME() WHERE OrderId=@order AND ResolvedAt IS NULL`,[rp('order',row.orderId,sql.Int)]);
     if(changed)await refundEvent(exec,{...row,status,requiredAction:null,actionDueAt:null},auth,status,`Stripe refund status verified: ${proof.status}. ${status==='refunded'?'Refund succeeded. Transfer and payout reconciliation are separate.':'Staff must investigate the unresolved refund in Stripe.'}`);
    });
   }else {
    if(action==='decision'&&body.decision==='decline'&&['approved','provider_failed'].includes(initial.status)){
     if(initial.providerRefundId){const old=await readRefundProof(initial,initial.providerRefundId);if(old.status!=='failed'&&old.status!=='canceled')throw new ApiError(409,'The external refund is unresolved. Reconcile it first.');}
     await assertNoUnrecordedRefund(initial,initial.baselineRefundedCents);
    }
    await lockedRefund(id,async(row,exec)=>{
    if(row.providerRefundId!==initial.providerRefundId||row.status!==initial.status||row.actionVersion!==initial.actionVersion)throw new ApiError(409,'Refund case changed. Refresh before recording this action.');
    let status:string,message:string,type:string,requiredAction:string|null=null,due:Date|null=null;
    if(action==='decision'){
     if(body.decision!=='approve'&&body.decision!=='decline')throw new ApiError(400,'Approve or decline required.');
     assertRefundAction(row.status,body.decision);

     message=refundText(body.note,'Decision note');status=body.decision==='approve'?'approved':'declined';type=status;
    }else if(action==='request-information'){
     assertRefundAction(row.status,'information');if(body.target!=='buyer'&&body.target!=='seller')throw new ApiError(400,'Buyer or seller target required.');
     message=refundText(body.message);requiredAction=message;status=body.target==='buyer'?'awaiting_buyer':'awaiting_seller';type='information_requested';due=new Date(Date.now()+refundHours('REFUND_ACTION_HOURS',48,720)*3600000);
    }else {
     assertRefundAction(row.status,'respond');const company=row.status==='awaiting_buyer'?row.buyerCompanyId:row.sellerCompanyId;
     if(auth.isAdmin||auth.companyId!==company)throw new ApiError(403,'Only the requested company can respond.');await refundCompanyAccess(auth,company,true);
     message=refundText(body.message);status='requested';type='response';
    }
    const version=row.actionVersion+1;
    await exec(`UPDATE dbo.RefundCases SET Status=@status,Active=@active,RequiredAction=@required,ActionDueAt=@due,ActionVersion=@version,LastReminderAt=CASE WHEN @due IS NOT NULL THEN SYSUTCDATETIME() ELSE NULL END,UpdatedAt=SYSUTCDATETIME() WHERE Id=@id;
    UPDATE dbo.RefundEmailOutbox SET State='cancelled',LastError='Required action changed.' WHERE RefundCaseId=@id AND Kind='reminder' AND State IN('queued','failed')`,[rp('status',status),rp('active',status!=='declined',sql.Bit),rp('required',requiredAction),rp('due',due,sql.DateTime2),rp('version',version,sql.Int),rp('id',id,sql.Int)]);
    await refundEvent(exec,{...row,status,requiredAction,actionDueAt:due,actionVersion:version},auth,type,message,action==='request-information'?(body.target==='buyer'?'buyer':'seller'):action==='respond'?(row.status==='awaiting_buyer'?'buyer':'seller'):undefined);
   });
   }
   sendJson(response,200,await refundDetail(id,auth));return true;
  }
 }
 throw new ApiError(405,'Method not allowed.');
}
