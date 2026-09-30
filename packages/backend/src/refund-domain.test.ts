import test from 'node:test';
import assert from 'node:assert/strict';
import {assertRefundAction,refundAmount,refundRequestKey,refundText,emailRetryState,escapeRefundHtml,refundStatuses,refundEmailJobKey} from './refund-domain.js';
import {assertRefundMatches,assertConfirmedRefundBalance,type RefundBinding} from './refund-provider.js';
const binding:RefundBinding={paymentIntentId:'pi_correct',platformAccountId:'acct_platform',livemode:false,amountCents:1250,paidCents:3000,currencyCode:'USD'};
const proof={payment_intent:'pi_correct',amount:1250,currency:'usd',status:'succeeded' as const,created:1790776800};
test('refund amounts reject unsafe, fractional, zero and negative money',()=>{for(const n of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER,'1250',null])assert.throws(()=>refundAmount(n));assert.equal(refundAmount(1250),1250);});
test('refund reason and idempotency key are bounded',()=>{assert.throws(()=>refundText('short'));assert.throws(()=>refundText('a'.repeat(2001)));assert.equal(refundText('  Broken parcel evidence  '),'Broken parcel evidence');for(const key of ['short','x'.repeat(101),'spaces are invalid key'])assert.throws(()=>refundRequestKey(key));assert.equal(refundRequestKey('refund-stable-key-123'),'refund-stable-key-123');});
test('closed refunds cannot reopen; uncertain external outcomes cannot be declined',()=>{for(const status of ['refunded','declined'])for(const action of ['approve','decline','information','respond'] as const)assert.throws(()=>assertRefundAction(status,action));for(const status of ['provider_pending'])assert.throws(()=>assertRefundAction(status,'decline'));assert.doesNotThrow(()=>assertRefundAction('refunded','reconcile'));});
test('approval needs review state and responses need a targeted action',()=>{for(const status of refundStatuses)if(status!=='requested')assert.throws(()=>assertRefundAction(status,'approve'));for(const status of ['requested','approved','provider_pending'])assert.throws(()=>assertRefundAction(status,'respond'));for(const status of ['awaiting_buyer','awaiting_seller'])assert.doesNotThrow(()=>assertRefundAction(status,'respond'));});
test('Stripe proof rejects wrong payment, amount, currency and unknown outcome',()=>{assert.doesNotThrow(()=>assertRefundMatches(binding,proof));for(const change of [{payment_intent:'pi_wrong'},{amount:1251},{currency:'eur'},{status:null}])assert.throws(()=>assertRefundMatches(binding,{...proof,...change}));for(const status of ['pending','requires_action','failed','canceled'] as const)assert.doesNotThrow(()=>assertRefundMatches(binding,{...proof,status}));});
test('ambiguous sends stop before Resend idempotency expiry and cap attempts',()=>{const first=new Date('2026-09-30T00:00:00Z');assert.equal(emailRetryState(first,new Date('2026-09-30T22:59:00Z'),7),'failed');assert.equal(emailRetryState(first,new Date('2026-09-30T23:00:00Z'),1),'needs_review');assert.equal(emailRetryState(first,first,8),'needs_review');});
test('user messages cannot inject email HTML',()=>{assert.equal(escapeRefundHtml('<script>"x" & \'y\'</script>'),'&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;');});

test('historical external refunds cannot close a newer request',()=>{assert.throws(()=>assertRefundMatches({...binding,createdAt:new Date((proof.created+1)*1000)},proof));assert.doesNotThrow(()=>assertRefundMatches({...binding,createdAt:new Date(proof.created*1000+999)},proof));});

test('succeeded refund must add to the saved baseline even within the same second',()=>{assert.throws(()=>assertConfirmedRefundBalance({...binding,baselineRefundedCents:1250},1250,'succeeded'));assert.doesNotThrow(()=>assertConfirmedRefundBalance({...binding,baselineRefundedCents:1250},2500,'succeeded'));assert.doesNotThrow(()=>assertConfirmedRefundBalance({...binding,baselineRefundedCents:1250},1250,'pending'));});

test("email replay stays stable within an origin and cannot collide between local and development",()=>{
 const args=[1,"event-1","buyer",0] as const;
 const local=refundEmailJobKey("http://localhost:20032",...args);
 const development=refundEmailJobKey("https://eco-globe-dev-web.vercel.app",...args);
 assert.notEqual(local,development);
 assert.equal(development,refundEmailJobKey("https://eco-globe-dev-web.vercel.app/",...args));
 assert.notEqual(development,refundEmailJobKey("https://eco-globe-dev-web.vercel.app",1,"event-1","seller",0));
});
