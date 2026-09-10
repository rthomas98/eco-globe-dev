# Sample shipping verification and activation

Verified locally on 2026-09-09. No production deployment, real payment, postage purchase, or outbound test email was performed.

## Implemented

- Buyer checkout with fixed Small/Medium/Large boxes, stored receiving sites, immutable rate/address snapshots, identity-sharing consent, free material and shipping-only payment.
- Seller label download, dispatch deadline, dispatch and decline actions; buyer tracking and admin policies, receiving-site review, referrals and reconciliation.
- Ten Monday–Friday business days from payment, ending in America/Chicago. Weekends and DST are handled; public holidays are not excluded. In-app reminders run with reconciliation.
- Server eligibility rejects unreviewed/restricted materials, liquids, gases, special handling, non-US routes and unverified sites. Existing listings require explicit sample enablement and review.
- Persisted payment, label, delivery, refund and label-cancellation states with retryable operations. Legacy endpoints cannot change paid sample records.
- A delivered sample creates a buyer/material credit. Order creation applies it transactionally with locking, a redemption ledger and a cap at the order total. Checkout displays available credit.
- EasyPost test and Stripe test adapters with authenticated webhook wakeups and authoritative provider reconciliation. Production mode is deliberately unavailable pending provider verification.

## Evidence

- Workspace type checking passed across all six configured tasks; focused sample UI lint and `git diff --check` passed.
- Backend suite: 31 tests passed, including eligibility, transition ownership, deadline/DST calculations, reminder dates, carrier units/rate filtering, mismatched payment rejection and label retry behavior.
- Local API/SQL integration passed on synthetic listing 1012: delivered request 1016, declined 1017, simulated expiry 1018, actual overdue reconciliation 1019 and awaiting dispatch 1020. It checked authorization, idempotency, PDF labels, refunds, referrals and concurrent order-credit redemption. Existing data was preserved.
- Browser: buyer selected Medium/FedEx and created SR-1015 at $28.90, confirmed explicitly simulated payment, then the isolated seller session dispatched it. Admin saw the update and simulated carrier delivery. The buyer record persisted delivery and available credit.
- Browser: seller declined SR-1014; admin showed declined, simulated refund succeeded and label cancellation succeeded.
- Desktop and 390-pixel seller layout were visually inspected. User browser sessions were preserved; seller testing used an isolated browser session.
- Bulk-order credit was verified through API and SQL, not through a complete browser bulk-order checkout.
- Focused sample UI lint passed. A broader React Doctor comparison against main reported existing/broader issues (43/100); that scan is not a clean repository-wide certification.

## Provider setup still required

1. Create an EasyPost account and obtain its test API key; configure UPS/FedEx Ground availability for the intended account. Obtain Stripe test credentials for shipping checkout.
2. In a non-production test environment configure `SAMPLE_SHIPPING_MODE=easypost_test`, `EASYPOST_API_KEY` (test key), `STRIPE_SECRET_KEY` (test key), and `SAMPLE_CHECKOUT_ORIGIN`. Store credentials outside source control.
3. Configure `SAMPLE_EASYPOST_WEBHOOK_SECRET` and `SAMPLE_STRIPE_WEBHOOK_SECRET`. Register the API endpoints `/api/sample-shipping/webhooks/easypost` and `/api/sample-shipping/webhooks/stripe`. EasyPost uses Basic authentication with username `ecoglobe`; Stripe uses its signed raw-body webhook header.
4. Apply `packages/backend/db/migrations/20260911_sample_shipping.sql` before serving the new API. Run a continuously available API process for the reconciliation timer. Review listing material eligibility and receiving sites in admin.
5. Verify real test-provider address validation, rates, checkout, label retrieval, authenticated duplicate/out-of-order events, tracking, refunds, label voids and failure retries. Review account-specific carrier behavior before implementing production activation. Test credentials alone do not enable production.

Local simulation requires both `SAMPLE_SHIPPING_MODE=simulation` and `ECOGLOBE_LOCAL_SAMPLE_TEST=1`, a non-production runtime, and loopback requests. Its labels are not postage and its rates, payments and refunds are synthetic.

## Remaining product limits

The refund screen currently links to marketplace browsing; it does not yet rank similar listings within the buyer's radius. Notifications are in-app only. Public holidays are not part of the deadline calendar. These limits and real-provider verification must be resolved or accepted before a production launch.
