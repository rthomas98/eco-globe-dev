# Frontend merge resolution — a865ae6 (HEAD, Ana corrections + lab testing) ⟵ origin/claude/peaceful-heyrovsky-284108 (01a0e59)

Worktree: /private/tmp/ecoglobe-release-frontend-20260909. Scope: apps/** only. Nothing committed, pushed, deployed, or run as a service. No backend/shared/root manifest edits.

## Left for the coordinator (not mine)
- `.gitignore` (root) — still conflicted.
- `packages/backend/db/migrations/20260831_sample_requests.sql`, `packages/backend/src/api.ts` — still conflicted (backend owner).
- Backend files already show working-tree edits (`listing-routes.ts`, `onboarding-preferences.ts`, `schema.sql`, `scripts/orca-ana-integration.mjs`) that I did not make; assumed to be the concurrent backend resolution.
- Backend contract expectations created by this resolution: `POST /api/listing-documents` must accept `documentTypeCode` `tds` and `coa` (theirs' migration adds them); `POST /api/onboarding` receives both `feedstockInterests`/`otherFeedstockInterest` (ours) and `licenceTier` (theirs); `PATCH /api/sample-requests/:id` accepts `convertedOrderId`; `GET /api/listings/:id/interest` POST endpoint, `GET /api/favorites`, `POST/DELETE /api/listings/:id/favorite`, `GET /api/interest-summary`, `GET /api/wanted-listings`, `POST /api/saved-searches`, and the order/escrow/payment checkout chain must exist on the merged backend.

## Resolution principle
Our HEAD (user-approved Ana corrections) is the base for listing data and forms: every listing consumer reads persisted backend records through `lib/listings-api.ts` + `lib/use-listings.ts`; no static catalogue, fabricated seller names, fallback images, default-first-listing, or synthetic shipping. On top of that base I carried over every incoming feature that did not contradict an approved correction.

## File-by-file (24 conflicted apps files + 2 supporting edits)

| File | Resolution |
|---|---|
| `lib/api-samples.ts` (AA) | Ours (typed `apiFetch` client, `idempotencyKey`) + theirs' `stashSampleConversion`/`takeSampleConversion` helpers and `convertedOrderId` on the PATCH body. |
| `components/samples/sample-requests-panel.tsx` (AA) | Ours (loading/error/retry states, tracking form, lab-testing dialog) + theirs' "Order in bulk" CTA on received, unconverted samples (parks the sample in session storage and routes to `/buyer/browse/<listingId>`) and the "Ordered · EG-n" chip. |
| `components/samples/request-sample-modal.tsx` (AA) | Ours (superset: same fields plus focus trap, retry, optional lab-testing step). |
| `components/buyer/buyer-checkout-page.tsx` | Ours (checkout bounded to the one persisted cart listing, no fallback product, separate currencies) + theirs' real order placement: `placeCheckoutOrder` (order → escrow funded → payment → in_progress) with delivery method/address/pickup date, then links a pending sample conversion via `updateSampleRequest({ convertedOrderId })`. Listing id comes from the cart item id (canonical backend id). Removed theirs' random local `EG-` id fallback; missing session/company now shows an error and keeps the cart. Success summary label changed from "Order reference (local, not yet submitted)" to "Order reference". |
| `components/cart/cart-context.tsx` | Ours (`available`, `sellerName`, nullable image). Theirs' `apiListingId` dropped: the cart `id` already is the backend listing id. |
| `components/public/browse-listings.ts` | Ours `Listing` model (`backendId`, `sellerCompanyName`, `documents`, …). Theirs' `apiListingId`/`sellerName`/`sellerFacilityId` superseded. |
| `components/public/browse-page.tsx` | Ours data path (`useListings("public")`, `hasCoordinates` map filter) + theirs' "Save search & get alerts" (`createSavedSearch`). |
| `components/public/featured-listings-section.tsx` | Ours (live published listings only; theirs re-added a static list). |
| `components/public/product-detail-data.ts` | Ours (no invented seller names/galleries). Fixed an auto-merge artifact (stray function header) that broke parsing. |
| `components/public/product-detail-page.tsx` | Ours + theirs' backend favorites (`fetchFavorites` on load for members, `setFavorite` on toggle), `recordListingInterest` (detail_view, cart_add), and a Documents card (non-photo attachments, "Verified" badge, member-gated downloads with a "Members" lock for anonymous visitors). |
| `components/buyer/buyer-product-detail-page.tsx` | Ours + interest signals and the Documents section (downloads always allowed: member page). |
| `components/buyer/buyer-browse-page.tsx` | Ours. |
| `components/buyer/buyer-favorites-page.tsx` | Ours data path + theirs' backend favorites merge (`fetchFavorites` ids joined with local ids; un-heart calls `setFavorite(id,false)`). |
| `components/buyer/carbon-calculator-modal.tsx` | Ours (persisted listings, value-recovery step, user-entered manual distance in mi/km, facilities from `/api/locations`) + theirs' "view" interest signal on open and the declared material-production footprint note in the Result step (listing `carbonIntensityKgCo2e` × tonnage, shown with the combined total). Theirs' Mapbox geocoding of manual addresses was **not** carried: the approved Ana correction replaced the placeholder distance with an explicit user-entered distance; `geocodeAddress` remains exported from `lib/carbon-emissions.ts` if wanted later. Removed dangling auto-merged remnants (`geocodeState` block, `listingCoords`, unused import). |
| `components/buyer/buyer-onboarding-page.tsx` | Both: theirs' `fetchOnboardingState` company prefill + ours' `readBackendOnboarding` prefill and `FeedstockInterestsField`. Kept ours' `usage` product field (theirs' `feedstockType` was orphaned). Restored `jobTitle` in business state (auto-merge dropped it). |
| `components/seller/onboarding-page.tsx` | Both imports; payload sends `feedstockInterests`/`otherFeedstockInterest` **and** `licenceTier`. |
| `lib/backend-auth.ts` | Both onboarding fields (`feedstockInterests`, `otherFeedstockInterest`, `licenceTier`). |
| `components/auth/register-page.tsx` | Ours (`SUPPORT_EMAIL` account-help mailto) + theirs' `COUNTRY_OPTIONS`; dropped the unused `Role` type (both sides agreed it was dead). |
| `components/seller/add-listing-page.tsx` | Ours (current full-width screenshot form, draft → upload → submit sequence, SDS required, local drafts) + theirs' optional TDS/COA slots, implemented with our `ListingDocumentUploader` (base64 to `/api/listing-documents`, 5 MB, PDF). Theirs' `OptionalDocRow`/local `addCustomListing` fallback removed. |
| `components/seller/listing-edit-page.tsx` | Ours + a "Technical documents" section (TDS/COA uploaders) for saved listings. |
| `components/seller/listing-detail-page.tsx` | Ours (theirs depended on the deleted static `seller-listings-data.ts`). Removed unused `useEffect` import. |
| `components/seller/listings-page.tsx` | Ours rows (persisted owned listings, SDS indicator, local drafts, status codes) + theirs' "Buyer interest" aggregate panel (`fetchInterestSummary`) and "Buyers are looking for" open-demand panel (`fetchWantedListings`, `portalMoney`). De-duplicated a doubled `useRouter` import. |
| `components/seller/seller-listings-data.ts` (DU) | Deleted (ours); no importers remain. |
| `components/seller/sales-page.tsx` | Whitespace only. |
| `lib/api-listings.ts` (theirs, non-conflicted) | Rewritten to keep only `recordListingInterest`; the static-twin mapper/`useApiListings` depended on the removed static catalogue and is superseded by `use-listings`. |
| `lib/listings-api.ts`, `components/seller/listing-documents.tsx` (supporting) | `ListingDocumentTypeCode` gains `tds`/`coa` (PDF accept, labels); new `documentTypeLabel()` helper used by the product pages. |

Non-conflicted incoming files (admin live-record cards, document-review queue, logistics, disputes, payments, account/team, notifications, welcome page, admin proxy route, `api-account`, `api-orders`, `api-portal`, `api-listing-documents`, `api-platform-settings`, `api-fulfilment`) are untouched and compile against the merged tree.

## Behavior reconciliation summary
- Listing data: persisted SQL records only (ours). Unknown ids → not found. Prices/units/MOQ as recorded.
- Access gates: anonymous visitors keep the sign-in-to-purchase gate, "Members" lock on document downloads, calculator sign-in gate, and the backend's viewer-based redaction (ours' fetch is per request, no cross-viewer cache).
- Documents: SDS/certification/photo (ours) + TDS/COA (theirs) on add/edit; product pages list attachments with the admin "Verified" badge.
- Samples: full lifecycle (ours' port) + sample-to-order conversion loop (theirs) end to end: Order in bulk → product page → Buy Now → checkout places the real order → sample linked → "Ordered · EG-n" on both sides.
- Money path: checkout now creates the real order/escrow/payment (theirs) on the bounded single-listing cart (ours).
- Favorites: local storage for anonymous, backend-persisted for members (theirs), against the persisted listing pool (ours).
- Interest signals: view/detail_view/cart_add recorded; seller sees aggregates and open buyer demand (theirs).
- Onboarding: interests multi-select (ours) + licence tier and company-shell prefill (theirs).
- Carbon calculator: value recovery + manual mi/km distance (ours, approved) + interest signal and material-production footprint note (theirs). Geocoding not carried (see above).

## Checks (Node 22.20, pnpm 9.15.4, `pnpm install --frozen-lockfile --ignore-scripts` succeeded)
| Check | Result |
|---|---|
| `apps/web`: `tsc --noEmit` | pass |
| `apps/web`: `tsc --noEmit -p tsconfig.test.json` | pass |
| `apps/web`: `node --test src/lib/*.test.ts` | 20/20 pass |
| `apps/web`: `eslint src` | 0 errors, 54 warnings (pre-existing `<img>`/hook-deps classes; baseline in Ana report was 52) |
| `apps/admin`: `tsc --noEmit` | pass |
| `apps/web`: `next build` | pass, full route table (168 routes), warnings only (`<img>`, unused eslint-disable directives) |
| Conflict markers under `apps/` | none |
| Browser / SQL-backed stories | not run (no services started per task constraints) |

## Staged
All resolved `apps/**` files are staged (`git add`), including the deletion of `seller-listings-data.ts`. No commit.
