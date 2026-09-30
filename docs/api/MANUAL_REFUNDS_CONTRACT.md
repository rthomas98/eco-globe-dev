# Manual refunds API contract

All endpoints use the existing bearer session. `apiFetch` includes `/api` normally; use paths exactly as below. Errors `{ok:false,error:string}`. Money is integer cents, currency is uppercase ISO currency. No endpoint creates a Stripe refund or transfer.

## Types

```ts
export type RefundStatus = 'requested'|'awaiting_buyer'|'awaiting_seller'|'approved'|'provider_pending'|'provider_failed'|'refunded'|'declined';
export interface RefundCase {
 id:number; sourceType:'order'|'sample'; sourceId:number; orderId:number|null; sampleRequestId:number|null;
 buyerCompanyId:number; sellerCompanyId:number; buyerCompanyName:string; sellerCompanyName:string;
 paymentIntentId:string; providerRefundId:string|null; amountCents:number; paidCents:number; currencyCode:string;
 status:RefundStatus; reason:string; requiredAction:string|null; actionDueAt:string|null;
 actionVersion:number; createdAt:string; updatedAt:string; providerStatus:string|null;
 settlementHold:boolean; canRespond:boolean; canManage:boolean;
}
export interface RefundEvent {id:number; eventType:string; actorName:string|null; message:string; createdAt:string}
export interface RefundEmail {id:number; recipientRole:'buyer'|'seller'; kind:'notice'|'reminder'; state:'queued'|'sending'|'sent'|'failed'|'cancelled'|'needs_review'; attempts:number; lastError:string|null; providerEmailId:string|null; createdAt:string; sentAt:string|null}
export interface RefundDetail {ok:true; refund:RefundCase; events:RefundEvent[]; emails:RefundEmail[]}
export interface RefundEligibility {orderId:number; eligible:boolean; reason:string|null; paidCents:number|null; availableCents:number|null; currencyCode:string; activeRefundId:number|null; settlementHold:boolean}
```

`sent` means email-provider acceptance, never proof of inbox delivery. Non-admins see only their own company's emails. `canRespond` is true only for the required company action with transaction permission. `canManage` means administrator. All timestamps ISO UTC. A pending/failed provider refund is unresolved; staff must investigate in Stripe. Refunds do not establish transfer/payout reversal.

## Read

- `GET /api/refunds?role=buyer|seller|admin&status=open|all` → `{ok:true,refunds:RefundCase[],hasMore:boolean}`. `role` required; admin role requires admin session. Company roles validate current active company membership.
- `GET /api/refunds/:id` → `RefundDetail`. Participant company or admin only.
- `GET /api/orders/:id/refunds` → `{ok:true,eligibility:RefundEligibility,refunds:RefundCase[]}`. Owning buyer/seller or admin. Eligibility fails closed when provider unavailable; no fake amount.

## Create

- `POST /api/orders/:id/refunds` body `{amountCents:number,reason:string,idempotencyKey:string}` → `RefundDetail` (201 new, 200 replay). Buyer with transaction permission or admin. Reason 10–2000 characters, amount positive safe integer no more than provider refundable balance, key 16–100 alphanumeric/underscore/hyphen. Only one active case per source. A paid Stripe checkout binding is required; seeded bookkeeping entries alone are ineligible.
- System creates sample-shipping cases for failed paid shipping automatically, but no buyer refund is executed automatically. Simulation samples remain visibly simulation and do not appear as real Stripe-refund cases.

## Staff actions

- `POST /api/refunds/:id/decision` `{decision:'approve'|'decline',note:string}` → `RefundDetail`. Note 10–2000 characters. Approve from requested; decline from requested/awaiting buyer/awaiting seller/approved only. Pending/failed external refund requires reconciliation in Stripe and cannot be closed to release settlement silently.
- `POST /api/refunds/:id/request-information` `{target:'buyer'|'seller',message:string}` → `RefundDetail`. Requested/awaiting information only, message 10–2000 characters. Required step due in 48 hours by default; version increments and cancels old reminder jobs.
- `POST /api/refunds/:id/respond` `{message:string}` → `RefundDetail`. Only targeted company with transaction permission; response returns to requested and stops reminders.
- `POST /api/refunds/:id/reconcile` `{refundId:string}` → `RefundDetail`. Admin only, approved/provider_pending/provider_failed; reference must match `re_...`. Server read-only retrieves Stripe refund and payment/charge, checks immutable namespace/payment/amount/currency. Only `succeeded` completes a case. A bound reference may be replaced only after Stripe conclusively reports it failed or canceled. Historical references remain uniquely bound to the case. Repeated successful reconciliation is idempotent.

## Staff email operation

- `POST /api/admin/refund-reminders/process` → `{ok:true,processed:number}`. Admin only, invokes the same bounded recurring processor used every minute. No client-specified dates or recipient overrides. First reminder after 24 hours by default, then daily while a buyer/seller action remains outstanding, no reminder on staff-owned steps. SQL claims, stable provider idempotency keys, retry cap and explicit needs-review state prevent blind retries beyond Resend's 24h idempotency window.

## Policy

Buyer/seller action deadlines and reminder intervals configurable on backend by `REFUND_ACTION_HOURS` (default48, 1–720) and `REFUND_REMINDER_HOURS` (default24, 1–168). The processor uses server time. Email jobs preserve exact content and recipients, with existing development override respected. Missing recipients/provider errors are visible, not swallowed. Active cases hold settlement; no automatic settlement/payout API is added by this MVP.

## Visibility and activation

Information requests and participant responses are visible only to staff and the targeted company. Other participants receive null requiredAction/actionDueAt. Decision notes are shared with both companies. Reminders continue daily after a deadline until response or closure; staff can see overdue cases. An in-flight message may already have left the provider when a participant responds.

`REFUND_EMAIL_TEST_RECIPIENT` overrides only refund-email destinations in QA; the override must also be allowed. Refund email delivery is disabled unless REFUND_EMAIL_ENABLED=true and REFUND_EMAIL_ALLOWED_RECIPIENTS contains every destination address. The approved QA destination is kate@leapprosolutions.com, with an explicit development recipient override and [QA TEST] subject prefix. This does not authorize general customer delivery. Missing recipient approvals remain visible as needs_review.

Prior provider-confirmed refunded balance is saved as an immutable baseline on case creation. An unexpected or mismatched new Stripe refund fails closed and holds settlement for staff investigation; no administrative checkbox invents financial completion. Legacy manual payout-create/update endpoints reject unverified financial records; settlement remains staff managed outside the app.
