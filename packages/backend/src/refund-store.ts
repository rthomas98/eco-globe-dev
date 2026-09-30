import { queryRowsWithParams as query,queryRowsWithParamsInTransaction as txQuery,runInTransaction,sql,type QueryParameter } from './database.js';
import { ApiError,type AuthContext } from './http.js';
import {buildResendPayload} from './email.js';
import {escapeRefundHtml,refundEmailJobKey} from './refund-domain.js';
export const rp=(name:string,value:unknown,type:QueryParameter['type']=sql.NVarChar(2000)):QueryParameter=>({name,value,type});
export type RefundCaseRow={id:number;sourceType:'order'|'sample';sourceId:number;orderId:number|null;sampleRequestId:number|null;buyerCompanyId:number;sellerCompanyId:number;buyerCompanyName:string;sellerCompanyName:string;paymentIntentId:string;platformAccountId:string;livemode:boolean;amountCents:number;paidCents:number;baselineRefundedCents:number;currencyCode:string;status:string;active:boolean;reason:string;requiredAction:string|null;actionDueAt:Date|null;actionVersion:number;createdAt:Date;updatedAt:Date;providerRefundId:string|null;providerStatus:string|null};
export const caseSelect=`SELECT r.Id AS id,r.SourceType AS sourceType,r.SourceId AS sourceId,r.OrderId AS orderId,r.SampleRequestId AS sampleRequestId,r.BuyerCompanyId AS buyerCompanyId,r.SellerCompanyId AS sellerCompanyId,b.LegalName AS buyerCompanyName,s.LegalName AS sellerCompanyName,r.PaymentIntentId AS paymentIntentId,r.PlatformAccountId AS platformAccountId,r.Livemode AS livemode,r.AmountCents AS amountCents,r.PaidCents AS paidCents,r.BaselineRefundedCents AS baselineRefundedCents,r.CurrencyCode AS currencyCode,r.Status AS status,r.Active AS active,r.Reason AS reason,r.RequiredAction AS requiredAction,r.ActionDueAt AS actionDueAt,r.ActionVersion AS actionVersion,r.CreatedAt AS createdAt,r.UpdatedAt AS updatedAt,r.ProviderRefundId AS providerRefundId,r.ProviderStatus AS providerStatus FROM dbo.RefundCases r JOIN dbo.Companies b ON b.Id=r.BuyerCompanyId JOIN dbo.Companies s ON s.Id=r.SellerCompanyId`;
export async function refundCompanyAccess(auth:AuthContext,company:number,write=false) {
 if(auth.isAdmin) return;
 if(auth.companyId!==company) throw new ApiError(403,'Refund company access denied.');
 const rows=await query(`SELECT m.Id FROM dbo.CompanyMembers m JOIN dbo.AccountStatuses st ON st.Id=m.MemberStatusId JOIN dbo.MemberRoles mr ON mr.Id=m.MemberRoleId JOIN dbo.Companies c ON c.Id=m.CompanyId JOIN dbo.AccountStatuses cs ON cs.Id=c.VerificationStatusId WHERE m.UserId=@user AND m.CompanyId=@company AND st.Code='active' AND cs.Code NOT IN('inactive','suspended') AND (@write=0 OR mr.Code IN('owner','admin') OR m.CanExecuteTransactions=1)`,[rp('user',auth.userId,sql.Int),rp('company',company,sql.Int),rp('write',write,sql.Bit)]);
 if(!rows.length) throw new ApiError(403,'Active company refund permission required.');
}
export async function getRefundCase(id:number,auth:AuthContext,write=false) {
 const row=(await query<RefundCaseRow>(`${caseSelect} WHERE r.Id=@id`,[rp('id',id,sql.Int)]))[0];
 if(!row) throw new ApiError(404,'Refund case not found.');
 if(!auth.isAdmin) {
  if(auth.companyId!==row.buyerCompanyId&&auth.companyId!==row.sellerCompanyId) throw new ApiError(403,'Refund company access denied.');
  await refundCompanyAccess(auth,auth.companyId,write);
 }
 return row;
}
export async function refundProjection(row:RefundCaseRow,auth:AuthContext) {
 const {platformAccountId: _platform,livemode:_live,baselineRefundedCents:_baseline,active,...rest}=row;
 void _platform;void _live;void _baseline;
 let canRespond=false;
 if(!auth.isAdmin&&((row.status==='awaiting_buyer'&&auth.companyId===row.buyerCompanyId)||(row.status==='awaiting_seller'&&auth.companyId===row.sellerCompanyId))) {
  try {await refundCompanyAccess(auth,auth.companyId!,true);canRespond=true;}catch{canRespond=false;}
 }
 const targeted=auth.isAdmin||(row.status==='awaiting_buyer'&&auth.companyId===row.buyerCompanyId)||(row.status==='awaiting_seller'&&auth.companyId===row.sellerCompanyId);
 return {...rest,requiredAction:targeted?row.requiredAction:null,actionDueAt:targeted?row.actionDueAt:null,settlementHold:Boolean(active),canRespond,canManage:auth.isAdmin};
}
export async function refundDetail(id:number,auth:AuthContext) {
 const row=await getRefundCase(id,auth);
 const events=await query(`SELECT e.Id AS id,e.EventType AS eventType,u.Name AS actorName,e.Message AS message,e.CreatedAt AS createdAt FROM dbo.RefundCaseEvents e LEFT JOIN dbo.Users u ON u.Id=e.ActorUserId WHERE e.RefundCaseId=@id AND (@admin=1 OR e.Visibility='all' OR e.Visibility=@role) ORDER BY e.Id`,[rp('id',id,sql.Int),rp('admin',auth.isAdmin,sql.Bit),rp('role',auth.companyId===row.buyerCompanyId?'buyer':'seller')]);
 const emails=await query(`SELECT Id AS id,RecipientRole AS recipientRole,Kind AS kind,State AS state,Attempts AS attempts,LastError AS lastError,ProviderEmailId AS providerEmailId,CreatedAt AS createdAt,SentAt AS sentAt FROM dbo.RefundEmailOutbox WHERE RefundCaseId=@id AND (@admin=1 OR RecipientRole=@role) ORDER BY Id DESC`,[rp('id',id,sql.Int),rp('admin',auth.isAdmin,sql.Bit),rp('role',auth.companyId===row.buyerCompanyId?'buyer':'seller')]);
 return {ok:true,refund:await refundProjection(row,auth),events,emails};
}
export type RefundExec=<T extends Record<string,unknown>=Record<string,unknown>>(statement:string,params:QueryParameter[])=>Promise<T[]>;
export async function queueRefundEmails(exec:RefundExec,row:RefundCaseRow,kind:'notice'|'reminder',key:string,message:string,target?:'buyer'|'seller') {
 for(const role of target?[target]:['buyer','seller'] as const) {
  const company=role==='buyer'?row.buyerCompanyId:row.sellerCompanyId;
  const recipients=await exec<{email:string}>(`SELECT DISTINCT LOWER(u.Email) AS email FROM dbo.CompanyMembers m JOIN dbo.Users u ON u.Id=m.UserId JOIN dbo.AccountStatuses s ON s.Id=m.MemberStatusId JOIN dbo.MemberRoles mr ON mr.Id=m.MemberRoleId WHERE m.CompanyId=@company AND s.Code='active' AND (mr.Code IN('owner','admin') OR m.CanExecuteTransactions=1) AND u.Email IS NOT NULL`,[rp('company',company,sql.Int)]);
  const valid=recipients.filter(r=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
  for(const [index,recipient] of (valid.length?valid:[{email:''}]).entries()) {
   const web=process.env.ECOGLOBE_WEB_URL;
   let link='';try{const origin=new URL(web??'');if(['https:','http:'].includes(origin.protocol))link=new URL(`/${role}/accounting/refunds/${row.id}`,origin).toString();}catch{/* Visible email job failure below if application URL is missing. */}
   const plain=`EcoGlobe refund case RF-${row.id} (${row.sourceType==='order'?'EG':'SR'}-${row.sourceId})\n${message}\n${row.requiredAction?`Required action: ${row.requiredAction}\nDue: ${new Date(row.actionDueAt!).toISOString()}\n`:''}Staff process refunds in Stripe. EcoGlobe verifies their status; no money is moved by this message.\n${link}`;
   let payload:string|null=null,error:string|null=null;
   if(!recipient.email) error='No active company transaction contact has a valid email.';
   else if(!link) error='Application email link is not configured.';
   else {try {payload=JSON.stringify(buildResendPayload({to:process.env.REFUND_EMAIL_TEST_RECIPIENT?.trim() || recipient.email,subject:`${process.env.REFUND_EMAIL_SUBJECT_PREFIX?.trim() ? process.env.REFUND_EMAIL_SUBJECT_PREFIX.trim()+' ' : ''}${kind==='reminder'?'Action reminder: ':''}EcoGlobe refund RF-${row.id}`,text:plain,html:`<p>${escapeRefundHtml(plain).replaceAll('\n','<br>')}</p>`}));}catch{error='Email recipient configuration is invalid.';}}
   const jobKey=refundEmailJobKey(web,row.id,key,role,index);
   await exec(`IF NOT EXISTS(SELECT Id FROM dbo.RefundEmailOutbox WITH(UPDLOCK,HOLDLOCK) WHERE JobKey=@key) INSERT dbo.RefundEmailOutbox(RefundCaseId,RecipientRole,Kind,ActionVersion,JobKey,Recipient,PayloadJson,State,LastError) VALUES(@id,@role,@kind,@version,@key,@recipient,@payload,@state,@error)`,[rp('id',row.id,sql.Int),rp('role',role),rp('kind',kind),rp('version',row.actionVersion,sql.Int),rp('key',jobKey),rp('recipient',recipient.email||null),rp('payload',payload,sql.NVarChar(sql.MAX)),rp('state',error?'needs_review':'queued'),rp('error',error)]);
  }
 }
}
export async function refundEvent(exec:RefundExec,row:RefundCaseRow,auth:AuthContext|null,type:string,message:string,target?:'buyer'|'seller') {
 const event=(await exec<{id:number}>('INSERT dbo.RefundCaseEvents(RefundCaseId,ActorUserId,EventType,Message,Visibility) OUTPUT INSERTED.Id AS id VALUES(@id,@user,@type,@message,@visibility)',[rp('id',row.id,sql.Int),rp('user',auth?.userId||null,sql.Int),rp('type',type),rp('message',message),rp('visibility',target??'all')]))[0];
 await queueRefundEmails(exec,row,'notice',`event-${event.id}`,message,target);
}
export async function lockedRefund<T>(id:number,work:(row:RefundCaseRow,exec:RefundExec)=>Promise<T>) {
 return runInTransaction(async tx=>{
  const exec:RefundExec=(statement,params)=>txQuery(tx,statement,params);
  // Serialize on the entire source, not just case: partial-refund totals cannot race.
  const source=(await exec<{sourceType:string;sourceId:number}>('SELECT SourceType AS sourceType,SourceId AS sourceId FROM dbo.RefundCases WHERE Id=@id',[rp('id',id,sql.Int)]))[0];
  if(!source)throw new ApiError(404,'Refund case not found.');
  const lock=(await exec<{result:number}>(`DECLARE @r INT; EXEC @r=sys.sp_getapplock @Resource=@resource,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; SELECT @r AS result`,[rp('resource',`refund:${source.sourceType}:${source.sourceId}`)]))[0];
  if(lock.result<0)throw new ApiError(409,'Refund is busy. Retry.');
  const row=(await exec<RefundCaseRow & Record<string,unknown>>(`${caseSelect} WHERE r.Id=@id`,[rp('id',id,sql.Int)]))[0];
  return work(row,exec);
 });
}
