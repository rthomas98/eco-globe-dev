# Ana corrections: implementation plan

Reviewed 2026-09-09. Source: OneDrive presentation **Final features Ana.pptx**, all 21 slides, including screenshot annotations. Local source inspected at `cbf740d`; existing uncommitted work was preserved. This document is a plan, not implementation or production certification.

## Findings and evidence boundary

The user's clarification is authoritative: “does not match data” means real saved data is not reaching the frontend. Address the full persistence and retrieval path.

- `apps/web/src/components/seller/add-listing-page.tsx` builds a partial listing and saves through `apps/web/src/lib/custom-listings.ts` to localStorage. It drops form fields, hardcodes grade, creates an SDS fragment instead of storing the document, and its draft action only navigates away.
- The preview hardcodes Acme Corp, a verified badge, manufacturer, and fallback specifications.
- `seller-listings-data.ts` is a separate static dataset; `listing-detail-page.tsx` reads it and hardcodes specifications and gallery images.
- `public/product-detail-data.ts` reads the static browse dataset, invents seller names from location, marks sellers verified, estimates shipping, and falls back to the first listing for unknown IDs.
- `packages/backend/src/api.ts` already has SQL listing list/create/update routes. The inspected detail route has PATCH/DELETE but no GET. Existing list results do not cover all form fields and documents; a contract and schema gap review is required.
- Seller onboarding does invoke the backend and has catch/finally handling. Neither the frontend API helper nor proxy has an explicit fetch deadline. The slide's stalled save is reported evidence; its exact cause remains unverified.
- The current development site at `https://eco-globe-dev-web.vercel.app/browse/used-pallets` visibly shows $15.00 and MOQ 100 tons while signed out. The deck's $0.00 is not reproduced in that session. This does not prove authenticated pricing or SQL integration works. The page also shows availability of 60 tons, so quantity validation belongs in the listing verification.
- Authenticated seller onboarding, the uploaded Gasoline offspec record, and Tar's persisted price were not verified live. No accounts, listings, database records, or deployments were changed.

## Ordered work

| Order | Slides | Work | Completion evidence |
|---|---|---|---|
| 1 | 17–21 | Connect listing create, draft, edit, preview, seller detail and marketplace detail to the same persisted record. Correct company identity, specifications, images, documents, prices and units. | Save a distinctive listing, reload, reopen in a separate authorized session, and compare every field with the API response. No invented defaults. |
| 2 | 14 | Diagnose and repair seller onboarding stalled on “Saving…” after the free tier selection. | Free onboarding persists and advances; failed/expired requests show actionable errors and allow retry without duplicate company creation. |
| 3 | 11–13, 15–16 | Account recovery entry point, SDS wording and ordering, “Others” feedstock category, expanded MOQ label. | Correct labels and ordering in browser; category survives save/reload; actual SDS PDF uploads and downloads. |
| 4 | 2–8, 18 | Seller and buyer value-recovery estimates, entry points and carbon report integration. | Correct formulas, role context, consistent quantities/currency, shipping exclusions, matching on-screen and exported totals. |
| 5 | All actionable slides | Regression and deployment verification. | Slide-by-slide evidence against the exact release, with unresolved items explicitly tracked. |

### 1. Establish a complete listing data flow

1. Inventory fields from form → request → SQL → response → each view: company/facility identity, description, specifications, price/currency/unit, MOQ, available quantity, images, SDS, certifications and approval status.
2. Extend existing relational models and API routes only where needed. Add a detail read by canonical ID or slug; keep seller-owned reads distinct from approved public projections. Validate company ownership and listing visibility on the server.
3. Introduce a shared validated client contract and use the existing authenticated proxy. Replace static and localStorage reads in the affected journeys. Preserve existing browser-only drafts pending a deliberate recovery/import decision; do not reset the database.
4. Persist uploaded files through the document/storage flow and reference real document IDs and download URLs. Use one canonical saved listing ID across navigation and updates.
5. Preview the current form values and authenticated company; after saving, render returned server data. Use real loading, empty, unavailable and not-found states. Unknown IDs must never display a different product.
6. Separate missing, restricted and genuine zero prices. Never turn unavailable data into $0.00. Verify Tar against the saved record and the deck's expected USD 450 per metric tonne; do not hardcode a Tar-specific display fix.
7. Remove synthetic freight amounts from transactional totals or clearly represent freight as pending until a supported quote exists. Verify MOQ does not permit orders above available stock.

Primary files: `apps/web/src/components/seller/{add-listing-page,listing-edit-page,listing-detail-page,listings-page,seller-listings-data}.tsx/ts`, `apps/web/src/components/public/{product-detail-data,product-detail-page,browse-listings}.ts/tsx`, `apps/web/src/lib/custom-listings.ts`, and `packages/backend/src/api.ts`.

### 2. Recover seller onboarding

Trace the exact request through `/api/backend/api/onboarding` to backend `/api/onboarding`, session/company lookup and SQL transaction. Confirm the deployed API origin and response before assigning a cause. Add bounded request handling and retry behavior where missing. Preserve entered information when an error occurs. Free-tier completion must not depend on payment setup; verify the subsequent payout setup/skip path independently.

Primary files: `apps/web/src/components/seller/onboarding-page.tsx`, `apps/web/src/lib/backend-auth.ts`, `apps/web/src/app/api/backend/[...path]/route.ts`, `packages/backend/src/api.ts`.

### 3. Apply the usability corrections

- Slide 11: add a visible recovery link on registration, especially the existing-email error. Reuse the implemented password-recovery flow. Account identity currently uses email; use accurate wording and provide account-help guidance for a forgotten email rather than inventing a username recovery flow.
- Slide 12: explicitly mention safety data sheets in onboarding sustainability instructions; align accepted formats with real document support.
- Slide 13: add “Others” to buyer feedstock interests and preserve the selected value through the backend. Proposed behavior: reveal a description field when selected.
- Slide 15: display “Minimum Order Quantity (MOQ)” with an explicit unit.
- Slide 16: place SDS first, followed by sustainability claims and certifications. Preserve the existing SDS requirement and use real uploaded-document state.

### 4. Add value recovery to the existing carbon workflow

Seller: insert an estimator step between Transportation and Results. Ask for disposal plus transport-to-disposal cost per tonne. For quantity Q, avoided disposal cost is disposal rate × Q; sales earnings are listing price × Q; total recovery is their sum. Label results as estimates and disclose excluded sale-shipping expenses. Proposed readable label for the deck's “Affording costs”: “Avoided disposal costs.”

Buyer: ask for the combined baseline feedstock production and delivered cost per tonne. Baseline cost = baseline rate × Q. Alternative purchase cost = listing price × Q. Estimated savings = baseline cost − alternative purchase cost. Disclose that alternative shipping is excluded; retain negative values as additional cost. The deck's example gives (155 − 150) × 500 = 2,500 in savings before alternative shipping.

Add estimator access beside the existing carbon calculator beneath purchase controls and in the carbon analytics area below the map, as shown in slides 5, 6 and 18. Reuse the selected listing and quantity. Choose buyer/seller calculation by explicit active portal context, including dual-role users.

Extend `carbon-calculator-modal.tsx` and `carbon-report.ts` so each scenario and its CO₂ report carries the same inputs, currency, normalized quantity, calculation and exclusions. Do not silently mix dollars/euros or tonnes/units. Unit-priced products need an explicit weight basis before a per-tonne estimate can run. Retain existing carbon calculations and comparisons.

## Decisions requested

1. Should all signed-in buyers and sellers see prices, or should membership restrictions remain? Current screenshots and current public behavior differ. Restricted prices must never appear as zero either way.
2. Should these estimators standardize on USD per metric tonne, or support multiple currencies and weight units? Existing listings include EUR and per-unit prices. Until clarified, preserve recorded units/currencies and avoid implicit conversion.

## Verification and release sequence

- Verify API field round trips, company isolation, public visibility, canonical IDs, missing/zero prices and document references with focused integration checks.
- Verify onboarding success, expiration, backend failure and retry without duplicate records.
- Check estimator arithmetic, zero and negative results, invalid inputs, unit handling and report parity. Do not claim baseline-minus-purchase savings include freight.
- Run relevant type checks, lint and backend/web builds after implementation; browser-test each affected journey at desktop and mobile widths.
- Use authorized test accounts for seller/buyer/dual-role comparisons. Recheck Tar and Gasoline offspec by actual IDs, not titles alone.
- Track each slide as resolved, already corrected, blocked or pending, with evidence from the current build. Verify the deployed revision and repeat key flows after release.

If paired implementation is chosen, follow the repository's EcoGlobe agent-pair skill and Orca development guide: Codex owns backend/contracts, Claude owns frontend, with reciprocal review and objective checks before integration. No workers were started for this planning review.
