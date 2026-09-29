# FedEx booking, tracking and settlement implementation plan

Date: 2026-09-28. Status: proposed; no provider purchases or production activation authorized by this plan.

## Outcome and baseline

Extend the deployed staff-managed logistics flow with provider-confirmed booking, actual shipment telemetry and reconciled payments. Preserve the existing manual workflow for unsupported shipments and provider outages.

Current evidence: `docs/verification/2026-09-28-logistics-mvp.md` records delivery/pickup acceptance and development deployment. `docs/STRIPE_INTEGRATION_STATUS.md` records buyer setup acceptance, an Accounts v2 permission blocker for seller setup, and incomplete payment lifecycle. Provider account permissions must be rechecked before implementation; this planning pass did not inspect live dashboards.

## Proposed first release boundary

Carrier decision: FedEx only, as requested by the user. Choose the initial geography, currency and FedEx service based on the first real shipment lanes. Do not assume a parcel/sample-shipping integration can book bulk biomass freight. Support pickup without carrier booking. Keep admin approval for external booking and seller transfer initially; automate only after the acceptance gates pass.

Use FedEx REST APIs for supported parcel shipments and the appropriate FedEx Freight LTL integration for eligible freight. FedEx documents LTL rates, shipment creation, labels and pickup scheduling. Confirm the current freight portal, account and credentials with FedEx following its June 2026 separation; do not assume parcel credentials cover freight. Validate material, packaging, weight and route eligibility before offering automated booking. Unsupported bulk loads stay in staff coordination. No other carrier integration is planned.

## FedEx portal inspection — September 28, 2026

Chrome is signed in as Bea. My Projects reports that this login must join an organization or create one before creating projects and using APIs in transactions. No API project or enabled service could be verified for this login. FedEx states that a shipping account number and billing information are required to create an organization. The creation wizard was opened for inspection only; no organization, credentials or subscriptions were created.

Next prerequisite: invite Bea to the existing EcoGlobe developer organization, if there is one; otherwise complete organization setup using EcoGlobe's existing shipping account and billing details. A shipping account may exist even though this developer login has no organization membership.

## Phase 1 — FedEx account and service validation

- Identify initial routes, freight mode, shipment sizes, equipment, material restrictions, currencies and applicable FedEx services.
- Validate FedEx rates, shipment creation, pickup scheduling/cancellation, shipment cancellation, BOL/proof-of-delivery, sandbox and webhook support using representative shipments. Obtain commercial access and sandbox credentials; store references in Azure Key Vault.
- Start with FedEx tracking events and estimated delivery. Evaluate Advanced Integrated Visibility entitlement and service coverage before choosing webhook updates; otherwise use bounded polling. Delivery-location GPS is not continuous in-transit GPS. For actual in-transit telemetry, validate FedEx SenseAware device/service access and an available integration; it is not assumed included in ordinary tracking. Confirm the source and refresh cadence of GPS data. Milestone tracking must not be described as continuous GPS. Confirm who can view coordinates and how long shipment locations are retained.
- Agree who pays freight, platform fee allocation, carrier invoicing, seller release rules, inspection/dispute window, refunds and cancellation/accessorial charges.
- Verify Stripe seller onboarding permissions/capabilities and live business eligibility. Select charge/transfer approach and supported countries with Stripe before production activation.

Exit: documented provider capability matrix, successful authenticated sandbox probes, and approved operating rules. Re-estimate delivery effort after this gate; external onboarding is a schedule dependency.

## Phase 2 — Durable integration foundation

Codex owns backend/SQL; Claude owns frontend through the existing Orca pair workflow, with reciprocal review.

- Add relational booking attempts, provider identifiers, tracking events/positions, payment allocations, ledger entries, settlement attempts, webhook inbox and transactional outbox. Preserve existing data; additive migrations only.
- Separate booking, physical fulfilment, payment collection, seller transfer and bank payout states. Existing order completion does not prove financial settlement.
- Reserve an operation in SQL, call the provider outside the database transaction, then reconcile its result. Use stable idempotency keys, unique constraints and retry workers. An unknown provider result requires lookup/reconciliation before retrying a booking or money movement.
- Verify webhook authenticity according to each provider, deduplicate events, tolerate out-of-order delivery and reconcile missing events through scheduled reads.
- Enforce company/member permissions server-side. Audit staff actions and provider outcomes; protect private documents and location data. Store secrets only through existing Key Vault references.
- Add per-provider test/live separation, feature flags, alerts, recovery tools and a kill switch for new external operations.

Exit: crash/retry/concurrency tests prove no duplicate booking, charge, refund or transfer; cross-company access denied.

## Phase 3 — FedEx quote, shipment creation and pickup

- Capture validated pickup/delivery addresses, contacts, windows, weight/units, dimensions/package count, equipment and relevant material/accessorial details before requesting rates.
- Retrieve real FedEx rates; persist the request, response and internal quote version, plus provider quote ID/expiry when supplied, currency and itemized total. Define a local revalidation policy where the API does not supply a reservable quote or expiry. Clearly distinguish estimates from booked charges.
- Buyer approves the exact quoted price/version. Staff submits booking only after the required payment condition is satisfied. Price changes or expired quotes require renewed approval.
- Track FedEx shipment/label creation separately from pickup scheduling, pickup confirmation and actual collection. Persist provider confirmation IDs, tracking numbers, confirmed windows and documents. Do not mark booked on an outbound request alone.
- Handle rejection, unknown outcome, cancellation and rebooking. If payment succeeds but booking fails, resolve through explicit refund/retry state; never leave an unexplained paid order.
- Keep staff-entered quotes explicitly labeled and prevent duplicate manual/provider shipment creation.

Exit: FE seller/admin quote -> buyer approval/payment -> staff booking -> confirmed booking, reload persistence, expiry/repricing, duplicate clicks, timeout recovery and cancellation tested against the real provider sandbox.

## Phase 4 — GPS and shipment visibility

- Bind FedEx tracking numbers and any subscribed visibility identifiers to owned orders; subscribe or poll only through supported, enabled services.
- Ingest timestamped positions, source, accuracy when supplied, ETA and milestones. Reject invalid coordinates; prevent old events overwriting newer state.
- Show last known position and last update time on the existing map, alongside source and fresh/stale/unavailable state. Do not animate or interpolate invented vehicle movement.
- Distinguish carrier-reported delivery from buyer inspection/receipt. Carrier delivery alone cannot release seller funds.
- Provide admin exception handling for delayed, untrackable or mismatched shipments. Stop displaying ongoing precise tracking after the configured completion/retention boundary.

Exit for shipment tracking: real FedEx events and available ETA visible in FE. GPS acceptance is a separate gate and remains incomplete until actual FedEx telemetry is available; stale, missing, delayed, duplicate and out-of-order events tested. Sandbox fixtures must be labeled simulated. Real GPS readiness additionally requires a consented pilot shipment with actual telemetry.

## Phase 5 — Payment collection and settlement

Payment collection work may run alongside Phase 3 after the shared contract is settled. Automated release depends on the booking and receipt states being reliable.

- Finish real Stripe sandbox seller onboarding and capability reconciliation. Setup readiness is distinct from actual payment/transfer/payout success.
- Create order checkout from server-owned versioned totals: goods, approved freight, fees and applicable tax policy. Do not trust browser totals or success URLs.
- Select the collection method and timing for expected order amounts and transit times. Do not assume a card authorization can cover an arbitrary shipment duration; account for asynchronous payment failure before booking/release.
- Reconcile amount, currency, platform account, test/live mode, order and payment IDs from authenticated provider events.
- Implement an auditable ledger and explicit settlement eligibility: confirmed collected/available funds, buyer receipt, agreed inspection period, no active dispute/refund hold, seller capability, and remaining payable amount.
- Start with staff-approved idempotent seller transfers. Track transfer to the seller's Stripe balance separately from payout to the seller's bank; only provider-confirmed payout is labeled paid out.
- Support full/partial refunds, transfer reversals where applicable, disputes, failed payouts, insufficient balance and recovery after partial external success. A refund does not imply an associated transfer has been reversed.
- Define carrier payment separately. A booked carrier may invoice EcoGlobe; do not assume all carriers are Stripe Connect recipients.
- Close generic CRUD paths that could forge provider payment, escrow, transfer or payout success. Keep legacy simulated records excluded from provider operations.

Exit: real Stripe sandbox checkout, required authentication, decline, asynchronous failure, onboarding retry, refund, transfer and payout-state scenarios pass FE/BE checks and ledger reconciliation. No duplicate money movement after replay/crash tests.

Stripe separate charges/transfers is a candidate architecture, subject to the account/country/business configuration. Stripe does not provide escrow accounts; use accurate delayed-settlement wording and confirm any true escrow requirement separately.

## Phase 6 — Combined acceptance and controlled launch

- Full story: buyer order -> current freight quote -> approved total -> verified collection -> provider booking -> tracking -> buyer inspection -> eligible settlement -> seller transfer -> verified payout status.
- Failure stories: paid but unbooked, booked then cancelled, missing GPS, delivered but disputed, failed transfer/payout, refund after transfer, provider outage and recovery.
- Test buyer/seller/admin permissions, reload persistence, mobile layout, document access, accessibility of primary actions and reconciled reports. Capture browser evidence and provider/database IDs without secrets.
- Run regression tests, types, focused lint and builds; document unrelated baseline failures separately. Review migration and rollback steps. Disabling automation must not stop processing already-started provider operations.
- Deploy to development first. Record sandbox acceptance separately from real-world acceptance. Production requires provider/account approval and a separately authorized limited pilot with spending limits, named operators and rollback controls.

## Decisions needed before provider-dependent implementation

1. FedEx is selected. Does EcoGlobe already have a FedEx shipping account and developer project, and is FedEx Freight LTL enabled? What are the first routes and shipment types?
2. Is carrier milestone/ETA tracking sufficient initially, or is actual GPS a launch requirement?
3. Who pays freight and when should seller funds become eligible for release? Proposed starting point: buyer receipt plus an agreed inspection period, no dispute, staff approval.
4. Initial countries/currency, expected order values and supported buyer payment methods?

## Source references

- Current implementation: `LOGISTICS_MVP_API.md`, `../STRIPE_INTEGRATION_STATUS.md`, `../verification/2026-09-28-logistics-mvp.md`.
- Stripe charge/transfer model: https://docs.stripe.com/connect/separate-charges-and-transfers
- Stripe payout distinction and escrow limitation: https://docs.stripe.com/connect/manual-payouts
- FedEx Freight LTL capabilities: https://developer.fedex.com/api/en-us/catalog/ltl-freight.html
- FedEx developer portal and freight separation notice: https://developer.fedex.com/api/en-us/home.html
- FedEx tracking: https://developer.fedex.com/api/en-ag/catalog/track.html
- FedEx visibility options: https://www.fedex.com/en-us/digital/premium-features/integrated-visibility.html
- FedEx SenseAware devices: https://www.fedex.com/en-us/senseaware/tracking-devices.html

Provider sources checked September 28, 2026. Candidate capabilities do not mean an account is configured or an integration has passed acceptance.
