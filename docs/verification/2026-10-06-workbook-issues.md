# Workbook fixes and development acceptance — 6 October 2026

The reviewed application changes are committed, pushed and deployed to [EcoGlobe development](https://eco-globe-dev-web.vercel.app). The 32 workbook issues are individually tracked: **25 resolved, 1 already corrected, 5 partly resolved, and 1 blocked by missing authentic SDS files**. This is not a claim that all 32 issues or the eight additional acceptance stories pass.

Six of the eleven partials closed in the [follow-up report](2026-10-06-partial-issues-followup.md): issues 2, 6, 7, 12, 21 and 26. Issues 4, 5, 13, 16 and 28 still need authentic facility data or configured sample shipping. Current release/evidence is in that report and the JSON tracker; the original release sections below preserve the prior-wave history.

The source workbook was read without modifying it. SHA-256: `29007012f883cc1448e02f150c40ee02318d327f6437d8ae211123aece44d75e`. Document contents were treated as defect reports, not operational instructions. Its credential-containing second sheet is not copied into this repository.

The initial independent evidence audit downgraded issues 12, 16 and 26 to partial because fresh regression scenarios do not prove the original EG-12 comparison, owner pickup-address repair or a successful seller quote response. It also verified the counts/hash manifest and removed encoded ephemeral checkout URLs from durable text evidence.

A later independent scope audit assessed the new original-record evidence, actual downloaded PDF, saved-facts overview and positive quote response/acceptance. It kept the full sample row partial because PVC online shipping remains unconfigured.

See [the row-by-row tracker](2026-10-06-workbook-issues.json) for reproduction notes, implementation, acceptance limitations and evidence filenames. Browser evidence is in [2026-10-06-workbook](2026-10-06-workbook/). Test accounts available locally were used as authorized; Bianca/Sasha's exact account-specific comparisons were not claimed.

## Individual issue status

| Issue | Area | Status |
|---|---|---|
| 1 | Feedstock IQ | Resolved |
| 2 | Listings | Resolved |
| 3 | Listing detail | Resolved |
| 4 | Map | Partial — owner data |
| 5 | Listing data | Partial — owner data |
| 6 | Listing detail | Resolved |
| 7 | Listings | Resolved |
| 8 | Home | Resolved |
| 9 | Copy | Resolved |
| 10 | Copy | Resolved |
| 11 | Analytics | Already corrected |
| 12 | My Orders | Resolved |
| 13 | Samples | Partial — shipping configuration |
| 14 | Copy | Resolved |
| 15 | Browse | Resolved |
| 16 | Checkout | Partial — owner data |
| 17 | Listing detail | Resolved |
| 18 | Tracker | Resolved |
| 19 | Listings | Blocked — authentic SDS |
| 20 | Checkout | Resolved |
| 21 | Payment | Resolved |
| 22 | Checkout | Resolved |
| 23 | Order details | Resolved |
| 24 | Order details | Resolved |
| 25 | Checkout | Resolved |
| 26 | Quotes | Resolved |
| 27 | Verification | Resolved |
| 28 | Facility data | Partial — owner data |
| 29 | Orders | Resolved |
| 30 | Samples | Resolved |
| 31 | Add Listing | Resolved |
| 32 | Buttons | Resolved |

## Initial released application — prior-wave evidence

- Source commit: `12d7df64227d4a1c1770e9b0b7e821f381a37444`, pushed to `origin/rthomas98/ecoglobe-mvp-backend`.
- The primary checkout was fast-forwarded to that reviewed revision. Nineteen pre-existing overlapping files were verified byte-for-byte against the release and backed up before reconciliation. QA credentials and the current tracker were preserved. No database reset occurred.
- Web deployment: `dpl_7GWUquVXYQKGVdk1TCTHaUpa43cv`, Ready, serving `https://eco-globe-dev-web.vercel.app`.
- Backend: Azure Container App `ecoglobe-backend-dev`, healthy revision 33 with 100% latest traffic; SQL health connected. Image `acrecoglobe7c180adf.azurecr.io/ecoglobe-backend:workbook-2eca48d`, digest `sha256:410bc3d249ee9b48c4d782b1489ea468684758eb445521c3e840538978ac519a`.
- The tracker follow-up changed frontend files only. The backend was not redeployed unnecessarily. The existing admin frontend was checked live against the updated backend.
- Two reviewed migrations added nullable pickup-contact fields and missing declared buyer/seller profiles. Existing profiles were compared before/after and unchanged; 3 buyer and 11 seller profiles were added. Historical orders/payments were not rewritten.
- This release targets shared **development** services. Stripe test mode remains test mode; this does not activate commercial production payments, signing or shipping.

## Initial implementation and review — prior-wave evidence

Supervised Orca workers split backend, transaction frontend and public/listing frontend ownership. Codex used the requested GPT 6.1 Sol configuration; Claude owned frontend changes. Scoped patches received reciprocal review and coordinator review before integration. A follow-up tracker defect discovered during live acceptance was reviewed, tested and released as `12d7df6`.

The changes remove demo purchase/order panels, preserve real records, add Feedstock IQ Coming soon screens, fix public photo loading, clarify privacy and missing data, make radius filtering use an actual origin, and add facility editing/validation. Checkout retains its cart and records pickup date/time/contact/vehicle. Fulfillment rejects unpaid listing-checkout orders and generic completion bypasses. Tracker stages now filter their records using the same shipment/payout evidence as their labels. Legacy samples appear alongside newer shipment records. Unit labels distinguish new metric tonnes from ambiguous recorded tons.

Confirmed QA listings 2 and 21 were reversibly paused and disappear from public browsing; their records and transaction history remain. Other listings were not hidden using name heuristics.

## Initial objective checks — prior-wave evidence

- Backend: **67/67** tests, types and build passed on the integrated release.
- Web: **95/95** tests after the tracker follow-up; application/test types, touched tracker lint and web build passed. The first integration had 90 tests before the five mixed-stage regression cases were added.
- Admin: types, lint and build passed on the first combined release; no subsequent admin source changes.
- Runtime isolation: **22/22**; SQL ownership: **12/12**. Node 22 was used explicitly.
- Application web lint: zero errors and 38 warnings. The broad web lint command fails on unchanged minified MapLibre vendor files; that failure is retained in the check receipt rather than labelled a pass.
- React Doctor reported 59/100 with nine warnings and no error-level diagnostics. Large existing components/formatting patterns remain; this is not a clean-score claim.
- A positive local SQL runtime check could not run because the Docker daemon was unavailable. Database-unconfigured local rendering was not treated as authenticated acceptance. Actual deployed Azure SQL/API/browser checks supplied the database-backed evidence.
- Initial sandbox attempts to write caches/build output in the integration worktree failed with EPERM. Only those blocked checks were repeated with authorized filesystem access and passed.

## Initial live FE/BE acceptance — prior-wave evidence

The Codex In-app Browser was used for before/after acceptance, normal account sign-in, field entry and saved-record checks. No browser session/token injection or shell browser automation was used.

**Unpaid scenario EG-27:** Stripe's hosted sandbox displayed an actual test-card decline. The app showed no captured payment and no receipt-completion action. Backend fulfillment and generic completion attempts both returned 409, with unchanged status and shipment count. Requested October 7 morning pickup and synthetic contact fields persisted. Cancellation through the app restored PVC inventory to 990. The page refresh shows Cancelled.

**Funded scenario EG-28:** Hosted Stripe sandbox was verified `livemode=false`, USD 30 for ten PVC units. A documented successful test card produced captured payment TX-9. The provider reference and receipt dialog display the actual record. Requested October 8 midday pickup saved as `2026-10-08T17:00:00Z` with the supplied synthetic contact/vehicle fields. Confirming the explicitly noncommercial QA pickup created delivered shipment SHP-16 and completed the order. Refresh, buyer tracker, admin sales and read-only SQL agree. There is one payment and **no seller payout** for this order. No physical pickup, real-money purchase or settlement is asserted.

**Tracker follow-up:** The earlier live Seller paid stage incorrectly included unpaid sibling orders. The released stage now shows only EG-1, which has a recorded paid payout; it excludes EG-2 and EG-5. Shipping shows the actual eligible shipments. Buyer Delivered shows EG-28/SHP-16 and excludes cancelled EG-27/26. All files lists the two actual PVC document links. Existing conflicting historic status/payout records remain visible as stored records, not fabricated repairs.

**Map/facility:** A two-mile search without an origin is rejected with useful guidance. Using the map center hides 18 out-of-radius and 2 unlocated listings; resetting to Any distance restores 20. API checks exercise a radius around a real saved location, anonymous denial, incomplete coordinate rejection and tenant/role boundaries. Facility editing rejects country `70` and a single unpaired coordinate. An owned QA facility name edit persisted with its original address fields and was restored through the editor.

**Staff/contact:** A clearly labelled `QA OCT06 contact persistence` message was submitted from the public form and appeared unchanged in the admin inbox. The endpoint sends no automatic email. Staff sales displays EG-28 completed and EG-27/26 cancelled; payment exceptions reports no open cases. QA company 42 cannot be approved without uploaded evidence. No existing business KYC decision was changed.

**Responsive scope:** Quote form and order details were checked at 390×844 and 768×1024; admin payment exceptions at 390×844. These tested pages have no horizontal document overflow, and the actual phone layouts were inspected. Temporary viewport overrides were reset. This is not acceptance of every route at every breakpoint.

## Current remaining inputs and acceptance

1. Provide authentic seller SDS files for Tar, Black Gypsum and Premium Rice Hull Ash (original issue 19). Seller publishing with actual photo/SDS remains an additional acceptance story; quoted checkout of listing 14 also correctly stops without its SDS.
2. Provide approved full addresses, valid country/postal codes and paired coordinates for PVC's Pending site22 and Rice Hull Ash's Riverside site25 (issues4/5/16/28). Missing commercial overview prose is disclosed; the empty-overview UI now uses saved facts.
3. Configure and validate PVC online prepaid sample requesting/shipping (issue13). Original received samples are now visible in staff UI and retain actual statuses, but this does not prove prepaid shipping works.
4. Positive staff approval/KYC decisions were not replayed against shared business records without actual evidence. Prior read/disabled-control checks are not claimed as full approval acceptance.

Actual receipt-file delivery and seller response/buyer acceptance are now verified in the [follow-up evidence](2026-10-06-partials/). The original statements above about missing acceptance describe the initial release and are superseded by the follow-up report.

No original workbook, authentic commercial documents, existing order history or private credentials were modified to manufacture a pass.

![Funded QA pickup completed on the live development site](2026-10-06-workbook/24-after-pickup-completed.png)

![Tracker payout stage uses the recorded paid order only](2026-10-06-workbook/29-after-paid-stage-evidence.png)
