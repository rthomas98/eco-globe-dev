# Final release follow-up — quantity-unit aliases, backend re-review

Edited (staged, not committed): packages/shared/src/listing-api.ts, apps/web/src/lib/listings-api.ts, apps/web/src/lib/listing-format.test.ts, apps/web/src/components/seller/listing-form.ts, listing-edit-page.tsx, add-listing-page.tsx, onboarding-page.tsx. No backend, root, service, credential, commit, push or deploy actions.

## Unit aliases preserved
- Shared `ListingQuantityUnit` and frontend `QuantityUnitCode`/`QUANTITY_UNIT_CODES` now include `tons`, `tonnes`, `units` alongside `ton`, `tonne`, `kg`, `lb`, `unit` (matches the backend save allow-list).
- Seller form `UNIT_OPTIONS` lists the plural aliases as first-class choices; new `unitOptionsFor(current)` appends any unknown recorded code as "<code> (as recorded)" so the edit form's initial value is never blanked or swapped. `formFromRecord` already seeds `unit` from `record.quantityUnit` verbatim and `formToWriteBody` sends it verbatim, so an existing `tons`/`units` listing round-trips unchanged.
- Display already treated aliases via `describeUnit` (tons→"t", units→"units"); a unit test now pins that.
- Seller onboarding prefills `licenceTier` from `sellerProfile.licenceTierCode`; the payload always carries `licenceTier`, and with the backend's new explicit-change semantics a retry would otherwise downgrade a paid tier to the "free" default.

## Backend re-review (read-only, after coordinator sync)
Confirmed fixed: `listingForViewer` keeps a null quantity null; `createOrder` falls back to `quote.quantityUnit` then `listing.quantityUnit`; `completeOnboarding` updates `LicenceTierId` only when `licenceTier` is in the body and leaves subscription/approval/payout untouched; per-listing document list returns `[]` and non-photo downloads return 401/403 for viewers without a company or admin role; `admin_override` permission tier is admin-only on member create and update. Acknowledged as intentional: 404 for non-public listings, unreachable legacy handlers kept as reference.

Remaining actionable items (none release-blocking):
1. Frontend (fixed here): licence tier prefill on seller onboarding retry — see above.
2. `listingForViewer` still nulls `locationCity` / `locationLatitude` / `locationLongitude` but keeps `location.stateProvince` / `countryCode` — consistent with the teaser intent; no change needed, noted for the contract doc.
3. Anonymous `GET /api/listing-documents?listingId=` now hides documents, but `photo` downloads stay public by id; product photos are only discoverable through member responses, so this is acceptable, documented as behaviour.

## Checks
shared tsc pass; web tsc (app + test) pass; web unit tests 21/21; eslint (seller + lib) 0 errors; admin tsc pass. Full build not repeated (no changes outside the files above since the last passing build besides option/type edits covered by tsc).
