import type Stripe from 'stripe';
import { stripeConfiguration } from './stripe-setup.js';
import { ApiError } from './http.js';
export type RefundBinding={paymentIntentId:string;platformAccountId:string;livemode:boolean;paidCents:number;amountCents:number;currencyCode:string;createdAt?:Date;baselineRefundedCents?:number};
export function assertRefundMatches(binding:RefundBinding,refund:Pick<Stripe.Refund,'payment_intent'|'amount'|'currency'|'status'|'created'>) {
 if(binding.createdAt && refund.created < Math.floor(new Date(binding.createdAt).getTime()/1000)) throw new ApiError(409,'Stripe refund predates this request. Staff must reconcile historical refunds separately.');
 const intent=typeof refund.payment_intent==='string'?refund.payment_intent:refund.payment_intent?.id;
 if(intent!==binding.paymentIntentId||refund.amount!==binding.amountCents||refund.currency.toUpperCase()!==binding.currencyCode.toUpperCase()) throw new ApiError(409,'Stripe refund does not match this payment, amount, currency or mode.');
 if(!['succeeded','pending','requires_action','failed','canceled'].includes(refund.status??'')) throw new ApiError(409,'Unknown Stripe refund status.');
}
export async function readRefundPayment(binding:Omit<RefundBinding,'amountCents'>) {
 const config=stripeConfiguration();
 if(config.platform!==binding.platformAccountId||config.live!==binding.livemode) throw new ApiError(409,'Payment belongs to a different Stripe account or mode.');
 const account=await config.stripe.accounts.retrieve(config.platform);
 if(account.id!==binding.platformAccountId) throw new ApiError(409,'Stripe credentials do not match the payment account.');
 const payment=await config.stripe.paymentIntents.retrieve(binding.paymentIntentId,{expand:['latest_charge']});
 const charge=payment.latest_charge;
 if(payment.status!=='succeeded'||payment.livemode!==binding.livemode||payment.amount_received!==binding.paidCents||payment.currency.toUpperCase()!==binding.currencyCode||!charge||typeof charge==='string') throw new ApiError(409,'Stripe payment does not match the saved payment proof.');
 return {config,payment,charge,availableCents:Math.max(0,charge.amount-charge.amount_refunded)};
}
export function assertConfirmedRefundBalance(binding:RefundBinding,refundedCents:number,status:string|null) {
 if(status==='succeeded'&&refundedCents<(binding.baselineRefundedCents??0)+binding.amountCents)throw new ApiError(409,'Stripe refunded balance does not include this requested refund beyond its saved baseline.');
}
export async function readRefundProof(binding:RefundBinding,refundId:string) {
 const {config,charge}=await readRefundPayment(binding);
 const refund=await config.stripe.refunds.retrieve(refundId);
 assertRefundMatches(binding,refund);
 assertConfirmedRefundBalance(binding,charge.amount_refunded,refund.status);
 const refundCharge=typeof refund.charge==='string'?refund.charge:refund.charge?.id;
 if(refundCharge!==charge.id) throw new ApiError(409,'Refund charge does not match the payment.');
 return refund;
}

export async function assertNoUnrecordedRefund(binding:RefundBinding,recordedCents:number) {
 const {config,charge}=await readRefundPayment(binding);
 const refunds=await config.stripe.refunds.list({payment_intent:binding.paymentIntentId,limit:100});
 if(charge.amount_refunded!==recordedCents || refunds.data.some(r=>r.status==='pending'||r.status==='requires_action')) throw new ApiError(409,'Stripe has an unresolved or unrecorded refund. Reconcile it before closing this case.');
 if(refunds.has_more) throw new ApiError(409,'Extensive refund history requires staff reconciliation before closing this case.');
}
