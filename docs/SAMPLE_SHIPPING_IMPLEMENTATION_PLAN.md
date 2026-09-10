# Domestic sample shipping implementation

Source: EcoGlobe_Sample_Shipping_Domestic_1.docx and SampleRequest_1.png, SampleStates.png, SellerDispatch.png supplied by the user. Integrate and verify locally without resetting existing data. Existing pilot and map work must remain intact.

## Implementation sequence

1. Define the parcel catalogue: Small 2 kg / 30×20×15 cm, Medium 10 kg / 40×30×25 cm, Large 25 kg / 50×40×35 cm. No arbitrary weight/dimension input. Add server-owned eligibility and explicit seller sample settings. Restricted, liquid, gas, special handling, non-US routes and unverified receiving sites cannot enter paid checkout; persist a team referral when requested. Samples disabled must have a visible explanation.
2. Add a relational shipping extension to existing sample records, immutable addresses and quoted rate snapshots, payment/label references, deadlines, lifecycle events, operation retry keys and credit ledger. Keep legacy samples readable and prohibit legacy endpoints from changing paid samples.
3. Integrate the selected carrier aggregator for address verification, UPS/FedEx ground rates, prepaid labels, label voids and authenticated tracking events. Integrate Stripe shipping-only checkout and confirmed payment events. Never trust a client price or a success redirect as payment proof. Payment and label purchase are separate external operations: persist each step, retry safely, and refund when a label cannot be obtained.
4. Implement buyer checkout matching the supplied screen: fixed sizes, company receiving site, verified-address result, live rate choice, free material, shipping total and explicit identity-sharing consent. No fabricated rates, arrival dates, verification badges or live-payment claims. Missing configuration must produce an actionable unavailable state.
5. Implement seller dispatch and buyer tracking screens with persisted state: paid → awaiting_dispatch → in_transit → delivered; declined/expired trigger refund and label cancellation. Include downloadable prepaid label, absolute dispatch date and first-class Can't fulfil action. External tracking confirms delivery; failed/lost shipments need a refund resolution path.
6. Implement scheduled deadline processing, two-business-day reminders, retryable provider failures and missed-request records. Queue in-app notifications. Outbound email requires separately configured delivery and explicit authorization before sending test messages.
7. Apply shipping credit once to the buyer's first qualifying material order at the server payment boundary, with locking against double redemption. Show the applied credit in checkout and accounting. Do not simulate a credit by changing only UI totals.
8. Add admin oversight, refunds/retries, referrals and dispatch-rate reporting. Tenant and role checks protect addresses, labels, payment references and actions.
9. Verify boundary validation, idempotency, duplicate/out-of-order webhooks, double actions, cross-company access, stale rates, label failures, declined/expired refunds and credit redemption. Browser E2E: buyer checkout → confirmed test payment → seller label/dispatch → tracked delivery → order credit; separate decline, expiry and blocked-eligibility paths. Verify persistence after refresh in SQL.

## Confirmed decisions

- User has no carrier account yet. Implement EasyPost and Stripe test adapters, keep production disabled, and use explicitly labeled local simulation for browser verification. Real provider integration remains to be verified once accounts and test credentials exist.
- Dispatch window: user selected 10 business days. Count Monday–Friday and display the absolute deadline at the end of the tenth day in America/Chicago. The current calendar does not exclude public holidays.
- Provider testing and production activation are distinct. Use test credentials and test payments for E2E; no real postage purchase or production charge is needed for this implementation task.

## Existing implementation findings

The current SampleRequests API handles requested/accepted/shipped/received/declined, free-text delivery address and 1–50 lb quantity. It does not implement parcel rates, payment, labels, refunds or actual financial order credits. The existing company Locations table stores addresses but does not establish external address verification. Existing Stripe code is onboarding-related; it is not a paid sample integration.

## Implementation status

The relational model, buyer checkout, seller dispatch desk, admin oversight, eligibility controls, reconciliation, refunds and transactional order credits are implemented. The local migration was applied without resetting data. See [verification and provider setup](SAMPLE_SHIPPING_VERIFICATION.md) for evidence and remaining activation work.
