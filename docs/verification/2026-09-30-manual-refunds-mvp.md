# Manual refunds MVP verification — 30 September 2026

## Result

The staff-run commercial refund workflow passes local real SQL/API, buyer/seller/admin Chrome acceptance, a real Stripe sandbox refund and approved Kate-only email delivery. General customer email activation and production financial operations are not enabled. The deployed development frontend/backend and Stripe sandbox acceptance also pass; details and role boundaries are recorded below.

## Implemented

Buyer full/partial requests; staff approve/decline and targeted information requests; permission-checked participant responses; provider-confirmed outcomes; audit timeline; active-case settlement hold; first reminder after 24 hours with a default 48-hour response deadline; daily reminders until response/closure; durable SQL outbox, leases, retry backoff, stable provider idempotency and visible failure states. Paid sample-shipping failures require manual review rather than automatic refunds. Legacy payout write endpoints reject unverified accounting success.

There is no automated refund, transfer reversal or payout. A recorded refund does not prove bank settlement. Staff still reconcile transfers/payouts separately. See [Stripe separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers).

## Objective checks

- Backend: 61 tests pass, TypeScript/build pass under Node 22.20.0.
- Frontend money/reference helpers: 5 tests pass; web/admin TypeScript and builds pass.
- Changed web ESLint: zero errors, two existing image warnings.
- Isolation: 22 runtime tests and 12 SQL ownership tests pass. An earlier run correctly refused the shell's default Node 26; rerun with the required Node 22 passed.
- React Doctor: broader project scan reports 8 existing errors and 157 warnings (score 46); none is in the new refund components. Existing proxy GET, map effects and sample/public component heuristics remain outside this change.
- API: 23 lifecycle/negative assertions, 13 completion/concurrency assertions and 4 additional cross-company access assertions pass. Unauthenticated/non-admin, invalid/fractional/excess amount, unpaid proof, wrong party response, private action visibility, idempotency conflicts, one-active-case constraint, provider proof rejection and no closed-case reopening are covered.
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

All QA email payloads were redirected only to kate@leapprosolutions.com with labeled test subjects. Provider accepted the notices and seller reminder. User confirmed Kate received them and the links work. Resend's send-only key cannot retrieve delivery events; inbox proof is the user's confirmation, not inferred from send success.

## Orca review

Claude frontend worker launch receipt: claude-opus-5-5, medium. Reciprocal frontend/backend reviews completed, including final read-only acceptance of financial proof and scoped email override (9 refund tests pass). Codex launch requested gpt-6.1-sol, medium, but the ChatGPT CLI rejected the model before implementation; the supervising Codex completed the backend. The requested model preference is saved in project workflow docs, without claiming the rejected worker ran successfully. The final origin-namespace review also returned ACCEPT, with backend TypeScript and 10 refund tests passing. Settled dispatches have ownership decisions; no reclaimable workers remain.

## Development release

Released and verified on the existing development services:

- Implementation commit `fd8ecc882bd8b45102b40339eaa5d61c749fd926`, followed by reviewed backend email isolation fix `70a9152` on `rthomas98/ecoglobe-mvp-backend`; both pushed to origin.
- Azure ready revision `ecoglobe-backend-dev--0000031`, image `acrecoglobe7c180adf.azurecr.io/ecoglobe-backend:refunds-70a9152`, latest traffic 100%. ACR build `caw` succeeded; live health confirms database connectivity.
- Web deployment `dpl_DSggJzw2hzBJ7YJtCyZaucUmqRi4` is Ready and promoted to [development web](https://eco-globe-dev-web.vercel.app).
- Admin deployment `dpl_8bN5SqCT7dPeDvqp7yDGEAsSMd7e` is Ready and promoted to [development admin](https://eco-globe-dev-admin.vercel.app).
- Both additive refund SQL migrations applied without database reset. Existing provider configuration preserved. Only refund QA emails are redirected/allowlisted to Kate; general recipients remain gated.

Development QA order EG-22 was created through the live backend using the existing Guard Test listing and paid $600 through Stripe sandbox Checkout in Chrome. Buyer-facing order/request views were exercised with the staff QA session; case RF-1 recorded a $10 partial request. The standalone admin frontend asked the buyer for confirmation with a 48-hour deadline. The correct company-4 buyer-role API session submitted the response; the admin frontend displayed it, approved the case, and verified the actual manually issued Stripe refund `re_3ULPFbCEJFfU7hsb1CWPURCQ` for payment `pi_3ULPFbCEJFfU7hsb1tgYgAx1`. Case became refunded/succeeded, hold cleared, buyer-facing order showed $590 remaining. Reconciliation replay passed. The full non-admin buyer/seller response UI flow was verified locally, as described above; a non-admin participant response browser session is not claimed for this live development case.

Development acceptance caught provider idempotency collisions with local QA. New email jobs include a canonical application-origin namespace, while stored keys/payloads remain immutable across retry/crash recovery. A transaction repaired only two confirmed provider-rejected development case-1 jobs (no provider ID/sent timestamp/in-flight lease); accepted or in-flight jobs were untouched, and a staff-visible audit entry records the repair. New targeted/action/decision/completion emails passed under the new namespace. All eight development QA notices were accepted by the provider with one attempt each. Kate's human inbox/link confirmation applies to the earlier local QA notice/reminder batch, not an inferred delivery event for each new development notice.

[Deployed admin confirmation](2026-09-30-refund-development-admin.png) · [Deployed order balance](2026-09-30-refund-development-order.png)

No production payment, refund, shipment, transfer or payout was executed.

## Operational handoff

Buyer: My Orders → order → Refunds → Request a refund, or Accounting → Refunds.
Seller: Accounting → Refunds → case → respond when requested.
Staff: Accounting → Refunds → case → ask/approve/decline; after approval issue the exact amount on the exact payment in the correct Stripe sandbox/account, copy the refund ID, and Verify Stripe refund. Investigate pending/failed outcomes in Stripe; the app holds the case until confirmed. Process due emails now invokes the same recurring processor.

Settings: REFUND_ACTION_HOURS=48, REFUND_REMINDER_HOURS=24 by default. Sending requires REFUND_EMAIL_ENABLED=true plus exact REFUND_EMAIL_ALLOWED_RECIPIENTS. REFUND_EMAIL_TEST_RECIPIENT affects only refund emails. QA override and subject prefix must remain together. Do not broaden the allowed recipients without approval. Environments sharing a send-provider key must use distinct canonical application origins; cloned databases at the same origin require separate email keys or a future explicit namespace. Existing outbox jobs retain their original persisted keys.

## Remaining boundaries

General customer reminder delivery requires approved recipient activation. Automated refunds/payouts remain deferred by business decision. Commercial refund terms and accounting transfer/payout reconciliation remain staff responsibilities. Existing legacy pending automatic sample refunds would require staff investigation; the development database check found zero such paid pending samples. Sample legacy recovery is not claimed as browser/provider-tested in this commercial-order story. Production provider activation remains separate.
