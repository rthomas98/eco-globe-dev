# Seller report — 22 September 2026

Source: `Seller x Ecoglobe.pdf`, three pages supplied by the user.

## Findings and changes

- Seller header Search had no handler. It now opens a searchable seller navigation catalogue, including distinct report names.
- New-listing uploads required a separate save. Upload now saves a valid draft automatically and attaches the file. Concurrent document selections share the initial draft save; uploaded document updates use functional state updates.
- Sales combined saved orders with sample rows. Sample actions showed success without saving. Sales now uses saved orders and shipments, displays the saved quote status, validates quote input, preserves errors, and reloads after saving. Existing demo orders and sample requests remain separate.
- Sales filters had no handlers. Apply and Reset now operate on shipping type, actual category, escrow status, order status, and date range. Search and order tabs also filter saved orders.
- Tracker already fetched data but had no visible refresh feedback. It now shows progress and the last successful check time.
- DocuSign drafts had no assigned signers, and the live API has no DocuSign configuration. Company participants can register themselves as signer on an unsent draft. The API checks the contracting company, locks the draft during assignment, prevents duplicate company signers, and does not send or sign. The UI reports provider readiness and signing prerequisites.
- Delivery tracking and partner approvals were component-only state on fictional records. Delivery now loads and updates saved shipments. Partner relationships load real order counterparties and save company-specific approval in `CompanyPartners`. Relationship approval does not alter company verification.

## Local verification

Chrome, Sasha seller test account:

- Search opened, filtered to Sales and Reports · Sales, and navigated to Sales.
- Completed filter returned only EG-6 and EG-3.
- Photo upload before Save created QA draft listing 28; file 6 `facility.png` was saved. Reopened detail rendered the 1400px image.
- Zero-value, no-shipment QA order EG-12 was created between the authorized test companies. Sending a zero-cost quote updated the row to Quote sent / awaiting approval; reload retained that state.
- QA shipment SHP-7 was confirmed delivered; timestamp and terminal state survived reload. No payment, carrier booking, or escrow release was performed.
- Marsh Materials BV partner approval survived reload.
- Tracker showed Checking for updates and then a last-check time.
- QA contract CT-4 registered Sasha as signer and remained Not sent. No envelope was sent and no agreement signed.

Checks: web, admin and backend TypeScript checks; ESLint (only existing raw-image warnings); 11 backend regression tests passed. Authenticated API checks cover unauthenticated access, invalid and unrelated partner writes, missing contracts, idempotent signer registration, and unsigned/provider-unconfigured state. React Doctor scoped to HEAD reported zero errors and maintainability/accessibility warnings; the broader branch scan includes unrelated existing findings.

## Release verification

Pending deployment and live Chrome checks. Real DocuSign signing remains dependent on provider configuration, template, and signed-document storage.
