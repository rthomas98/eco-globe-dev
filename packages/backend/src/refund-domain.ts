import { ApiError } from './http.js';
export const refundStatuses = ['requested','awaiting_buyer','awaiting_seller','approved','provider_pending','provider_failed','refunded','declined'] as const;
export type RefundStatus = typeof refundStatuses[number];
export function refundText(value: unknown, name='Message') {
 if(typeof value !== 'string' || value.trim().length<10 || value.trim().length>2000) throw new ApiError(400,`${name} must contain 10–2000 characters.`);
 return value.trim();
}
export function refundAmount(value:unknown) {
 if(typeof value!=='number'||!Number.isSafeInteger(value)||value<1||value>2147483647) throw new ApiError(400,'Refund amount must be positive integer cents.');
 return value;
}
export function refundRequestKey(value:unknown) {
 if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{16,100}$/.test(value)) throw new ApiError(400,'Stable refund idempotency key required.'); return value;
}
export function assertRefundAction(status:string, action:'approve'|'decline'|'information'|'respond'|'reconcile') {
 const allowed = action==='approve'?['requested']:action==='decline'?['requested','awaiting_buyer','awaiting_seller','approved','provider_failed']:action==='information'?['requested','awaiting_buyer','awaiting_seller']:action==='respond'?['awaiting_buyer','awaiting_seller']:['approved','provider_pending','provider_failed','refunded'];
 if(!allowed.includes(status)) throw new ApiError(409,'This refund action is not available in the current state.');
}
export function refundHours(name:string,fallback:number,max:number) {
 const raw=process.env[name]; if(!raw) return fallback;
 const n=Number(raw); return Number.isInteger(n)&&n>=1&&n<=max?n:fallback;
}
export function escapeRefundHtml(text:string) { return text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??c)); }
export function emailRetryState(firstAttempt:Date,now:Date,attempts:number) {
 return now.getTime()-firstAttempt.getTime()>=23*3600000||attempts>=8?'needs_review':'failed';
}
