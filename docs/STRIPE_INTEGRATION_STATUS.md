# Stripe sandbox integration

## Target and current status

Account: `acct_1TwOYYCEJFfU7hsb` (Ecoglobe World sandbox).
This work connects provider-backed payments; existing explicitly simulated demo orders remain separate.

On 2026-09-24 the user completed key creation in Chrome. The named restricted sandbox key was verified in the dashboard, stored in `kv-ecoglobe-dev` as `stripe-sandbox-secret-key`, and accepted by a read-only Stripe API request (HTTP 200). The temporary local credential file was removed after storage. The deployed backend now uses this credential through its existing managed identity. Buyer card setup is browser-verified; seller Accounts v2 requires an additional restricted-key permission.

The approved application key is named `EcoGlobe backend — sandbox`. Its proposed permissions are write access to Customers, Payment Intents, Setup Intents, Payment Methods, Charges and Refunds, Checkout Sessions, Connect Accounts, Account Links, and Transfers; read access to Events and Payment Disputes. All other permissions remain None.

## Local changes

- Use the official Stripe SDK to authenticate raw webhook bodies with a five-minute timestamp tolerance. Missing webhook configuration returns 503; invalid signatures return 400 before reconciliation.
- Limit webhook request bodies to 1 MiB.
- Remove automatic billing/payout activation when Stripe is not configured. Return an explicit unavailable response instead.
- Persist provider-scoped, test/live-separated company bindings and setup sessions; seller readiness is distinct from payout transaction statuses.
- Buyer setup/cancellation/retry and provider-verified return are deployed and Chrome-verified.
- Seller Accounts v2 implementation is deployed; the restricted key lacks v2_account_storer_write.

## Remaining implementation and acceptance gates

1. Credential creation, storage, and the deployed backend secret reference are complete. EcoGlobe Key Vault is in Azure subscription Main (`7c180adf-5af5-4d10-ab71-5b381fe45b5e`), not the current CLI default subscription.
2. Company/provider bindings, setup sessions, retry idempotency and redirect-origin validation are implemented. Buyer acceptance passed. Complete seller Accounts v2 acceptance after approval of the required Accounts v2 Write permission.
3. Create order checkout sessions from authorized stored order totals, including shipping and the applicable platform fee. Persist session/payment bindings; browser return parameters must never establish payment success.
4. Reconcile authenticated webhook events with durable event deduplication, transactional state updates, amount/currency checks and monotonic transitions. Bind seller events to stored account IDs, not metadata alone. Reconcile saved payment methods from completed setup sessions.
5. Connect refunds and delayed seller transfers to authorized backend workflows with idempotency, balance accounting and retry handling. Keep simulated payments out of provider operations.
6. Register sandbox webhook endpoints and securely store signing secrets. Configure sample shipping separately: the existing flow also needs an EasyPost test account and key.
7. Test normal and declined payments, setup cancellation/retry, seller onboarding retry, duplicate/out-of-order events, refunds, cross-company denial and sandbox/live isolation. Then verify buyer, seller and admin screens in Chrome against stored provider results.

Buyer setup is deployed and accepted in Chrome. Seller setup and the wider payment lifecycle remain incomplete. Local type checking and signature tests alone do not establish end-to-end payment readiness.
