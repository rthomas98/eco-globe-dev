# Stripe browser verification — 24 September 2026

Environment: Chrome, `https://eco-globe-dev-web.vercel.app`.
Authorized test identities: Bianca buyer, Sasha seller, demo admin.

## Observed results

| Check | Result | Evidence |
| --- | --- | --- |
| Buyer login | Pass | Bianca Marsh buyer navigation and marketplace loaded after explicit field replacement. |
| Seller login | Pass | Sasha G seller listings loaded after explicit field replacement. |
| Admin login | Pass | Admin navigation and sales loaded. |
| Buyer Add payment method | Blocked for Stripe | Dialog opened; Continue returned “Demo setup recorded by the backend. No bank account or card was connected, and no money can be transferred through this demo setup.” No Stripe redirect. |
| Seller Add payment method | Blocked for Stripe | Payout setup dialog opened and returned the same demo-only result. No Connect redirect. |
| Buyer Receipt / Review | Pass for existing records | TX-3 / EG-7 / $50,000 rendered in both dialogs. Review explicitly says Provider reference: Not recorded. |
| Seller Receipt / Review | Pass for existing records | TX-5 / EG-11 / $24,000 rendered in both dialogs. Review explicitly says Provider reference: Not recorded. |
| Admin payment visibility | Pass for existing records | Payments page rendered TX-1 through TX-5, including buyer TX-3 and seller TX-5. |

The initial native typing login attempts returned invalid credentials; retesting with Playwright fill (replacement) succeeded. This is not an established application login defect.

## Deployment check

Read-only Azure inspection located `ecoglobe-backend-dev` in resource group `rg-ecoglobe-dev`, subscription `7c180adf-5af5-4d10-ab71-5b381fe45b5e`. Latest ready revision was `ecoglobe-backend-dev--0000022`. Its container environment has no variables whose names contain `STRIPE`.

The restricted sandbox key has been verified and saved in Key Vault, but has not been wired into this deployment. Local integration changes have not been deployed.

## Not tested / not passed

Hosted checkout, saved-card persistence, payment success/decline, 3DS, webhook reconciliation, refunds, seller transfers and real provider receipt reconciliation cannot be established from these demo-only flows. Receipt download contents and Export files were not exercised in this pass. No real payment or payout was attempted. Clicking setup recorded the existing backend's demo setup for the two authorized test accounts.

Overall: portal controls verified; full Stripe end-to-end acceptance is blocked by missing deployed integration and configuration, not by the API key itself. Complete the remaining gates in `docs/STRIPE_INTEGRATION_STATUS.md` before repeating provider acceptance.

## Setup repair and deployed verification

- Azure backend revision `ecoglobe-backend-dev--0000023` is ready, using the existing managed identity and Key Vault reference `stripe-sandbox-secret-key`; `STRIPE_MODE=test`.
- Frontend deployment `dpl_CENzgATdtPfpEHCYYLDVBDU4HZUh` is ready at the existing public alias. Unrelated local design/workflow edits were excluded.
- Additive migration `20260924_stripe_setup.sql` applied successfully; no database reset.
- Chrome Buyer: Add payment method opens Stripe Checkout Sandbox; cancellation returns “Payment setup was cancelled. You can try again.” Retry succeeds with the published Stripe test card. Return displays “Payment method verified with Stripe.” SQL confirms company 30 has one binding, two setup sessions, BillingReady=true, Livemode=false.
- Chrome Seller: setup now calls Stripe and exposes provider failures rather than recording demo success. Connect was initially disabled. Enabled the sandbox Marketplace model and completed Stripe's synthetic account guide (`acct_1UJFb9CEJFcVhbh6`, separate from EcoGlobe company bindings).
- Diagnosed a cached pre-activation error using Stripe's `idempotent-replayed=true` response. A new recovery attempt was definitively rejected because this new integration requires Accounts v2; no EcoGlobe seller account was created.
- Accounts v2 implementation typechecks and has been deployed as revision `ecoglobe-backend-dev--0000024`. Provider probe fails with explicit missing permission `v2_account_storer_write` on the existing restricted key. Permission expansion must be approved before saving it in Chrome.
- Deployed unauthenticated setup and setup-status requests both return 401. Unsigned webhook returns 503 while signing-secret configuration is absent.
- Backend suite: 39/39 passed with local HTTP-server permission. Web/backend typechecks passed. React Doctor broad branch scan reports pre-existing issues; the changed payment component has size/complexity warnings.
- NOT accepted: seller onboarding completion, webhook delivery, order checkout charging, refunds, transfers/payouts. This release is payment-method setup, not complete payment lifecycle readiness.
