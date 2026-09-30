# Manual refunds MVP — 30 September 2026

## Business decision

Staff process refunds manually in Stripe while EcoGlobe monitors reliability. The marketplace tracks the process and reminds buyers and sellers when they have an outstanding action. Automated refund creation and payouts are deferred. Existing settlement remains staff managed pending a separate payout policy decision.

## Required behavior

1. A buyer requests a full or partial refund against a provider-backed payment. The server validates the amount, payment, company permissions and remaining refundable balance.
2. Staff review the request, request information from the buyer or seller, and approve or decline with a recorded explanation. Participants see the case and respond only for their own company.
3. Approval tells staff to process the refund in Stripe. It never moves money. Staff submit the Stripe refund reference; the server checks the payment, amount, currency, mode and account before recording the provider-confirmed result. Pending or failed refunds remain visibly unresolved.
4. Open cases hold settlement. A refund does not imply a transfer reversal, payout reversal or successful bank settlement. Provider evidence and accounting remain distinct.
5. Required buyer/seller actions have a default 48-hour deadline. Daily reminders continue while the action is outstanding, and stop when the participant responds or the case closes. Lifecycle notifications explain the next step. These defaults are operational settings, not an invented commercial refund policy.
6. A durable SQL email outbox handles retries, concurrency and stable provider idempotency. Staff can distinguish queued/sent/failed email states; acceptance by an email provider is not inbox-delivery proof.
7. Existing sample-shipping refunds must follow the same staff-run policy; carrier label voids remain a separate process.

## Implementation ownership

- Orca Codex worker: backend API, SQL migration, provider verification, reminders, backend tests and exact API contract.
- Orca Claude worker: buyer/seller/admin interfaces, both admin surfaces, responsive states and frontend checks.
- Coordinator: plan, reciprocal reviews, combined local SQL and browser acceptance, sandbox provider/email verification, verification report and authorized development release.

## Acceptance gates

- Positive: buyer request, seller/buyer information response, staff approval/decline, manual Stripe outcome verification, partial refund accounting and reminders for the correct pending party.
- Negative: cross-company reads/writes, non-admin decisions, invalid/excess amounts, repeated requests/refund references, wrong Stripe payment/mode/amount, pending/failed provider outcome and unavailable providers.
- Reliability: concurrent verification cannot overrefund, reminder retries do not duplicate, responses/closure stop reminders, restart preserves cases and email jobs.
- Frontend: authenticated buyer/seller/admin stories in a real browser at desktop and 390px, including errors and refreshed state.
- External: real sandbox payment/refund verification and email-provider delivery evidence. Record any access/permission limitation explicitly.
- Release: passing scoped tests/types/builds, reciprocal review, additive migration, completed development deployment and live browser smoke before declaring ready for Kate.

## Boundaries

No database reset, production refund/payout, commercial refund terms or fabricated provider success. Sandbox fixtures must be clearly labeled and isolated. Production readiness depends on the approved business policy and provider configuration.
