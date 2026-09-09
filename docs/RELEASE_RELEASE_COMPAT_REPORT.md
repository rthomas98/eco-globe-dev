# Release compatibility follow-up — frontend + shared contract, backend read-only review

Worktree /private/tmp/ecoglobe-release-frontend-20260909. Edited only `packages/shared/src/listing-api.ts` and `apps/web/**` (all staged, nothing committed). No backend/root edits, no services, no credentials. Git index still marks `packages/backend/src/api.ts`, `20260831_sample_requests.sql` and `.gitignore` as conflicted; left untouched as instructed.

## (1) Viewer-projected listing contract (teaser)
- `packages/shared/src/listing-api.ts`: `PersistedListing` gains `teaser?: boolean`, nullable `sellerCompanyId` / `sellerCompanyName` / `locationId`, optional flat `locationCity/StateProvince/CountryCode/Latitude/Longitude`, and `location: PersistedListingLocation` with nullable id/name/addressLine1/addressLine2/city/postalCode/latitude/longitude (matches backend `listingForViewer`). `ListingDocumentTypeCode` = photo|sds|certification|tds|coa|lab_report|other; `ListingDocument.contentType/byteLength/sha256` nullable for legacy URL-only rows; `ListingUpload` uses the same code union (+ `certificate`).
- `apps/web/src/lib/listings-api.ts`: `BackendListing` mirrors the above (`teaser`, nullable seller/location ids, flat location fields); `ListingLocation.id` nullable; `documentDownloadUrl` passes retained absolute legacy URLs through unchanged and proxies relative API paths.
- `apps/web/src/lib/listing-view.ts`: `toListing` reads `teaser`, builds the location from the nested object or the flat fields, labels price/MOQ as "Sign in to see price" / "Sign in to see MOQ" on a teaser; `formatLocation` shows region + country when the city is withheld.
- `components/public/browse-listings.ts`: `Listing.teaser: boolean`, `sellerCompanyId: number | null`.
- `product-detail-data.ts`: `ProductDetailModel.teaser`; MOQ label keeps the teaser text; available quantity is prefixed "Approx." (backend rounds it).
- Public product page: teaser note with a Sign in link (anonymous) or a Complete company onboarding link (signed in, no company); the "seller has not published a price" / "no price recorded" / "SDS pending" warnings are suppressed on a teaser; seller name shows "Shown to members"; the member tools card explains documents unlock after onboarding. Buyer product page: same guards plus an onboarding CTA. Purchase/sample CTAs stay disabled because `priceNum` is null and `canRequest` needs an active company. Listing cards already render the teaser labels via `listing.price` / `listing.moq`.
- Seller edit page coerces the (never-null for owned listings) seller id for the location picker.

## (2) Listing documents
- `apps/web/src/lib/api-listing-documents.ts`: `uploadListingDocument` is now a single `POST /api/backend/api/listing-documents` with `{ listingId, documentTypeCode, fileName, contentType, contentBase64 }` (no `/api/files` blob step, no `fileUrl`). New `listingDocumentUrl()` normalizes `fileUrl`: relative `/api/listing-documents/:id/download` → `/api/backend/...`; retained legacy absolute URLs untouched. `fetchListingDocuments`, `fetchAllListingDocuments` (admin queue) and the upload result all return browser-ready URLs; the admin queue now surfaces load errors (it needs an admin session: backend requires admin for the unfiltered list) instead of silently showing an empty queue. Type list gains photo/other labels; `ApiListingDocument` gains optional `contentType/byteLength`.
- The seller uploader (`listing-documents.tsx`) already used the single-request `listings-api.uploadListingDocument`; unchanged.

## (3) Checkout units and currency
- `placeCheckoutOrder` now requires `quantityUnit` and `currencyCode` and sends both on `POST /api/orders` (currency upper-cased); previously omitted, which made the backend default `quantityUnit` to `"tons"` and fail `requirePurchasableListing` for any listing recorded as `ton`/`kg`/`lb`/`unit` or non-USD. `buyer-checkout-page.tsx` passes the cart item's recorded `quantityUnit` and `currencyCode` (both carried from the persisted listing). Escrow → payment → in_progress chain and the sample `convertedOrderId` link are unchanged.

## (4) Backend snapshot review (read-only; `packages/backend/src/api.ts`, `listing-routes.ts`, `sample-routes.ts`, `onboarding-preferences.ts` vs a865ae6 and 01a0e59)
Verified: `tsc --noEmit` passes; `pnpm test` (tsx) 17/17 pass; `handleLabRoute`/`handleSampleRoute`/`handleListingRoute` run before the core router; interest, favorite, admin document PATCH and the unfiltered admin document list stay in the core router (list now admin-only); `GET /api/onboarding` returns both the live `company/location/profiles` shape and our `onboarding` preferences; `POST /api/onboarding` stores interests/other and is serialized per user; `createQuote`/`updateQuote`/`createOrder` all call `requirePurchasableListing` with unit and currency; sample conversion is buyer/admin-only, once, on a received sample, and the order must match buyer and listing.

Defects / risks found:
1. `listingForViewer` (listing-routes.ts ~200): `Number(listing.quantity)` turns a null quantity into `0`, so anonymous viewers of a listing with no recorded quantity see "Approx. 0 … available" instead of "Availability not specified". Should keep null when `listing.quantity` is null.
2. `createOrder` (api.ts ~3936): `quantityUnit` falls back to the literal `"tons"` when the body omits it, instead of `quote?.quantityUnit ?? listing?.quantityUnit`. Quote-acceptance orders (no unit in the body) are persisted with `QuantityUnit='tons'` regardless of the listing/quote unit. The frontend checkout now always sends the unit, but other callers do not.
3. `completeOnboarding` retry path (api.ts ~1294, diff vs 01a0e59): the `SellerProfiles` UPDATE no longer sets `LicenceTierId`, so a seller re-running onboarding with a different `licenceTier` keeps the old tier silently; the frontend still sends `licenceTier`. Same for buyer/seller subscription/approval statuses (intentional hardening, but the tier omission looks unintended).
4. Dead duplicate handlers: the core router still defines `/api/sample-requests*` handlers (api.ts ~7045+) and the `fileUrl`-based `POST /api/listing-documents` (`ListingDocumentBody`, `createListingDocument`) plus `POST /api/files`, but `handleSampleRoute` and `handleListingRoute` claim those paths first. They cannot be reached and will drift; recommend deleting or documenting.
5. `requirePurchasableListing` reads the listing without auth, so a paused/unpublished listing surfaces as 404 "Listing not found" during quote acceptance rather than a 409 explaining the listing is no longer purchasable.
6. Anonymous `GET /api/listing-documents?listingId=` returns the full document list (download links) for a published listing even though the listing teaser withholds `documents`; the product pages only render `listing.documents`, so the UI is consistent, but the endpoint itself is not gated like the listing projection.

## Checks on the final tree
| Check | Result |
|---|---|
| `packages/shared` tsc | pass |
| `apps/web` tsc (app + test config) | pass |
| `apps/web` unit tests | 20/20 |
| `apps/web` eslint | 0 errors, 54 pre-existing warnings |
| `apps/admin` tsc | pass |
| `apps/web` next build | pass, 168 routes |
| backend tsc / `pnpm test` (read-only) | pass / 17/17 |
