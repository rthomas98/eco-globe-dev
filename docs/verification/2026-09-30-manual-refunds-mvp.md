# Manual refunds MVP verification — 30 September 2026

## Result

The staff-run commercial refund workflow passes local real SQL/API, buyer/seller/admin Chrome acceptance, a real Stripe sandbox refund and approved Kate-only email delivery. General customer email activation and production financial operations are not enabled. Development release evidence is recorded below when complete.

## Implemented

Buyer full/partial requests; staff approve/decline and targeted information requests; permission-checked participant responses; provider-confirmed outcomes; audit timeline; active-case settlement hold; first reminder after 24 hours with a default 48-hour response deadline; daily reminders until response/closure; durable SQL outbox, leases, retry backoff, stable provider idempotency and visible failure states. Paid sample-shipping failures require manual review rather than automatic refunds. Legacy payout write endpoints reject unverified accounting success.

There is no automated refund, transfer reversal or payout. A recorded refund does not prove bank settlement. Staff still reconcile transfers/payouts separately. See [Stripe separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers).

## Objective checks

- Backend: 60 tests pass, TypeScript/build pass under Node 22.20.0.
- Frontend money/reference helpers: 5 tests pass; web/admin TypeScript and builds pass.
- Changed web ESLint: zero errors, two existing image warnings.
- Isolation: 22 runtime tests and 12 SQL ownership tests pass. An earlier run correctly refused the shell's default Node 26; rerun with the required Node 22 passed.
- React Doctor: broader project scan reports 8 existing errors and 157 warnings (score 46); none is in the new refund components. Existing proxy GET, map effects and sample/public component heuristics remain outside this change.
- API: 23 lifecycle/negative assertions plus 13 completion/concurrency assertions pass. Unauthenticated/non-admin, invalid/fractional/excess amount, unpaid proof, wrong party response, private action visibility, idempotency conflicts, one-active-case constraint, provider proof rejection and no closed-case reopening are covered.
- Two simultaneous requests with the same key created one case. Two simultaneous outbox invocations passed; one daily reminder was persisted for the seller.
- Closed-reminder cancellation, malformed payload failure/recovery, expired retry window and unapproved destination rejection pass against real local SQL/outbox. Simulated post-send crash reused provider email 01a0f2ca-c7d5-751e-b5f0-481d7121672e without a second message.
- Pending/failed/canceled provider state handling and proof amount/payment/currency/time/baseline guards are covered by focused tests. The actual external refund observed was succeeded; no real provider outage or pending bank refund is claimed.

## Browser and provider evidence

Local QA order EG-12, $25 paid: browser rejected $30 request, saved $10 partial request (RF-2), staff asked seller for confirmation with a 48-hour deadline, seller responded, staff approved, manually refunded $10 in Stripe's sandbox, and entered re_3UL33oCEJFfU7hsb1pcvsPYq. Backend retrieved the actual provider proof; case became refunded/succeeded, hold cleared, remaining balance $15. Reconciliation replay was idempotent. A newer QA case could not reuse that historical refund and was safely declined against its saved baseline.

The direct buyer order route previously displayed static TS98773 data; it now loads the same live company-scoped order as the list, with unknown fee/subtotal values shown as Not recorded.

Buyer and admin refund case views were observed at 390px with document width and scroll width both 390. Seller request/response and completion were observed at desktop. Screenshots are adjacent to this report.

- [Admin provider confirmation](2026-09-30-refund-admin.png)
- [Buyer live order and remaining balance](2026-09-30-refund-buyer-order.png)
- [Buyer 390px](2026-09-30-refund-buyer-390.png)
- [Admin 390px](2026-09-30-refund-admin-390.png)

All QA email payloads were redirected only to kate@leapprosolutions.com with labeled test subjects. Provider accepted the notices and seller reminder. User confirmed Kate received them and the links work. Resend's send-only key cannot retrieve delivery events; inbox proof is the user's confirmation, not inferred from send success.

## Orca review

Claude frontend worker launch receipt: claude-opus-5-5, medium. Reciprocal frontend/backend reviews completed, including final read-only acceptance of financial proof and scoped email override (9 refund tests pass). Codex launch requested gpt-6.1-sol, medium, but the ChatGPT CLI rejected the model before implementation; the supervising Codex completed the backend. The requested model preference is saved in project workflow docs, without claiming the rejected worker ran successfully. Settled dispatches have ownership decisions; no reclaimable workers remain.

## Development release

Pending final release validation.

## Operational handoff

Buyer: My Orders → order → Refunds → Request a refund, or Accounting → Refunds.
Seller: Accounting → Refunds → case → respond when requested.
Staff: Accounting → Refunds → case → ask/approve/decline; after approval issue the exact amount on the exact payment in the correct Stripe sandbox/account, copy the refund ID, and Verify Stripe refund. Investigate pending/failed outcomes in Stripe; the app holds the case until confirmed. Process due emails now invokes the same recurring processor.

Settings: REFUND_ACTION_HOURS=48, REFUND_REMINDER_HOURS=24 by default. Sending requires REFUND_EMAIL_ENABLED=true plus exact REFUND_EMAIL_ALLOWED_RECIPIENTS. REFUND_EMAIL_TEST_RECIPIENT affects only refund emails. QA override and subject prefix must remain together. Do not broaden the allowed recipients without approval.

## Remaining boundaries

General customer reminder delivery requires approved recipient activation. Automated refunds/payouts remain deferred by business decision. Commercial refund terms and accounting transfer/payout reconciliation remain staff responsibilities. Existing legacy pending automatic sample refunds would require staff investigation; the development database check found zero such paid pending samples. Sample legacy recovery is not claimed as browser/provider-tested in this commercial-order story. Production provider activation remains separate.
