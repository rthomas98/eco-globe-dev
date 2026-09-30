import {randomUUID} from 'node:crypto';
import {queryRowsWithParams as query,sql} from './database.js';
import {sendEcoGlobePayload,type ResendEmailPayload} from './email.js';
import {refundHours,emailRetryState} from './refund-domain.js';
import {lockedRefund,queueRefundEmails,rp} from './refund-store.js';
let processing:Promise<number>|null=null;
export function processRefundReminders():Promise<number> {
 if(!processing)processing=processJobs().finally(()=>{processing=null;});return processing;
}
function parsePayload(value:string):ResendEmailPayload {
 const p:unknown=JSON.parse(value);
 if(!p||typeof p!=='object'||!('from' in p)||typeof p.from!=='string'||!('to' in p)||!Array.isArray(p.to)||!p.to.every(v=>typeof v==='string')||!('subject' in p)||typeof p.subject!=='string'||!('html' in p)||typeof p.html!=='string')throw new Error('Invalid saved email payload.');
 const text='text' in p&&typeof p.text==='string'?p.text:undefined;
 return {from:p.from,to:p.to,subject:p.subject,html:p.html,...(text?{text}:{})};
}
async function processJobs() {
 const pending=await query<{id:number}>(`SELECT TOP(100) Id AS id FROM dbo.RefundCases WHERE Status IN('awaiting_buyer','awaiting_seller') AND (LastReminderAt IS NULL OR DATEADD(hour,@hours,LastReminderAt)<=SYSUTCDATETIME()) ORDER BY Id`,[rp('hours',refundHours('REFUND_REMINDER_HOURS',24,168),sql.Int)]);
 for(const item of pending)await lockedRefund(item.id,async(row,exec)=>{
  if(!['awaiting_buyer','awaiting_seller'].includes(row.status)||!row.actionDueAt)return;
  const ready=await exec(`SELECT Id FROM dbo.RefundCases WHERE Id=@id AND (LastReminderAt IS NULL OR DATEADD(hour,@hours,LastReminderAt)<=SYSUTCDATETIME())`,[rp('id',row.id,sql.Int),rp('hours',refundHours('REFUND_REMINDER_HOURS',24,168),sql.Int)]);
  if(!ready.length)return;
  const tick=(await exec<{tick:number}>(`SELECT COUNT(*)+1 AS tick FROM dbo.RefundEmailOutbox WHERE RefundCaseId=@id AND ActionVersion=@version AND Kind='reminder'`,[rp('id',row.id,sql.Int),rp('version',row.actionVersion,sql.Int)]))[0].tick;
  await queueRefundEmails(exec,row,'reminder',`action-${row.actionVersion}-tick-${tick}`,'Your response is still needed to continue this refund review.',row.status==='awaiting_buyer'?'buyer':'seller');
  await exec('UPDATE dbo.RefundCases SET LastReminderAt=SYSUTCDATETIME() WHERE Id=@id',[rp('id',row.id,sql.Int)]);
 });
 // Explicit activation and recipient allowlist are required; default cannot send externally.
 if(process.env.REFUND_EMAIL_ENABLED!=='true')return 0;
 const allowed=new Set((process.env.REFUND_EMAIL_ALLOWED_RECIPIENTS??'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean));
 if(!allowed.size)return 0;
 const jobs=await query<{id:number;refundCaseId:number}>(`SELECT TOP(50) Id AS id,RefundCaseId AS refundCaseId FROM dbo.RefundEmailOutbox WHERE (State IN('queued','failed') AND NextAttemptAt<=SYSUTCDATETIME()) OR (State='sending' AND LeaseUntil<=SYSUTCDATETIME()) ORDER BY Id`,[]);
 let processed=0;
 for(const job of jobs){
  const token=randomUUID();
  // Autocommit claim precedes the network request. Crashes retain attempt/lease history.
  const claimed=(await query<{payloadJson:string;kind:string;actionVersion:number;attempts:number;firstAttemptAt:Date;jobKey:string}>(`UPDATE dbo.RefundEmailOutbox WITH(UPDLOCK) SET State='sending',LeaseToken=@token,LeaseUntil=DATEADD(second,45,SYSUTCDATETIME()),Attempts=Attempts+1,FirstAttemptAt=COALESCE(FirstAttemptAt,SYSUTCDATETIME()) OUTPUT INSERTED.PayloadJson AS payloadJson,INSERTED.Kind AS kind,INSERTED.ActionVersion AS actionVersion,INSERTED.Attempts AS attempts,INSERTED.FirstAttemptAt AS firstAttemptAt,INSERTED.JobKey AS jobKey WHERE Id=@id AND ((State IN('queued','failed') AND NextAttemptAt<=SYSUTCDATETIME()) OR (State='sending' AND LeaseUntil<=SYSUTCDATETIME()))`,[rp('token',token,sql.UniqueIdentifier),rp('id',job.id,sql.Int)]))[0];
  if(!claimed)continue;
  const row=(await query<{active:boolean;status:string;actionVersion:number}>(`SELECT Active AS active,Status AS status,ActionVersion AS actionVersion FROM dbo.RefundCases WHERE Id=@id`,[rp('id',job.refundCaseId,sql.Int)]))[0];
  if(!row||(claimed.kind==='reminder'&&(!row.active||!['awaiting_buyer','awaiting_seller'].includes(row.status)||row.actionVersion!==claimed.actionVersion))){
   await query("UPDATE dbo.RefundEmailOutbox SET State='cancelled',LeaseToken=NULL,LeaseUntil=NULL WHERE Id=@id AND LeaseToken=@token",[rp('id',job.id,sql.Int),rp('token',token,sql.UniqueIdentifier)]);continue;
  }
  if(emailRetryState(new Date(claimed.firstAttemptAt),new Date(),claimed.attempts-1)==='needs_review'){
   await query("UPDATE dbo.RefundEmailOutbox SET State='needs_review',LastError='Retry window expired; inspect provider delivery history before retrying.',LeaseToken=NULL,LeaseUntil=NULL WHERE Id=@id AND LeaseToken=@token",[rp('id',job.id,sql.Int),rp('token',token,sql.UniqueIdentifier)]);continue;
  }
  let permanent=false;
  try{
   const payload=parsePayload(claimed.payloadJson);
   if(!payload.to.every(to=>allowed.has(to.toLowerCase()))){permanent=true;throw new Error('Refund email destination has not been approved in the recipient allowlist.');}
   const result=await sendEcoGlobePayload(payload,claimed.jobKey);
   await query("UPDATE dbo.RefundEmailOutbox SET State='sent',ProviderEmailId=@provider,SentAt=SYSUTCDATETIME(),LastError=NULL,LeaseToken=NULL,LeaseUntil=NULL WHERE Id=@id AND LeaseToken=@token",[rp('provider',result.id),rp('id',job.id,sql.Int),rp('token',token,sql.UniqueIdentifier)]);processed++;
  }catch(error){
   const state=permanent?'needs_review':emailRetryState(new Date(claimed.firstAttemptAt),new Date(),claimed.attempts);
   const message=error instanceof Error?error.message.slice(0,500):'Email provider unavailable.';
   await query("UPDATE dbo.RefundEmailOutbox SET State=@state,LastError=@error,NextAttemptAt=DATEADD(minute,@minutes,SYSUTCDATETIME()),LeaseToken=NULL,LeaseUntil=NULL WHERE Id=@id AND LeaseToken=@token",[rp('state',state),rp('error',message),rp('minutes',Math.min(60,2**claimed.attempts),sql.Int),rp('id',job.id,sql.Int),rp('token',token,sql.UniqueIdentifier)]);
  }
 }
 return processed;
}
