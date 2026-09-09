# Ana corrections — frontend implementation report (2026-09-09)

Worktree `codex-ana-frontend`, base `cbf740d`. Scope: `apps/web/**` and frontend tests only. No commit, push, deploy, SQL, or backend edits. Coordinator owns combined SQL/browser verification.

## What changed (by slide)

- **17–21 Listing data flow.** All listing consumers now read persisted backend records through a typed client (`src/lib/listings-api.ts`, mirroring `@eco-globe/shared` `PersistedListing`; swap to the shared import at integration). Add/draft/edit/detail/list/public browse/buyer browse/favorites/homepage featured/hero suggestions/carbon calculator use `useListings`/`useListing`. Static datasets (`browse-listings` RAW list, `seller-listings-data.ts`, invented product-detail specs, Acme/verified/manufacturer/gallery/shipping/default-first-listing fallbacks) are removed. Unknown IDs render not-found. Prices: `describePrice` distinguishes missing (`Price unavailable`) from recorded zero; currency/unit rendered as recorded, never converted. MOQ shown as "Minimum Order Quantity (MOQ)" with explicit unit name. Quantity steppers clamp to MOQ..available. Shipping shown as "Quoted per order" (no synthetic amount). Documents (photo/SDS/certification) upload as base64 to `POST /api/listing-documents` and download via the proxy with binary headers forwarded. Facilities come from `GET /api/locations` (inline create via `POST /api/locations`). Draft → upload → submit (`pending_review`) sequence enforced; submission blocked without SDS. Absent seller choices are sent as absent/null (no fabricated unit/currency/material/state/frequency); custom claims preserved entry-by-entry.
- **Local drafts.** `ecoglobe.customListings` is preserved, listed on the seller listings page as device-only drafts with explicit Resume/Discard; a local draft is removed only after a successful backend save or a confirmed discard. Backend save failure keeps entries as a local draft.
- **14 Onboarding.** `backend-client.ts` adds a 20 s browser deadline covering body consumption; proxy adds 25 s (60 s uploads) upstream deadline including body read, returns 504 JSON. Onboarding shows retry (button becomes "Retry"), keeps entries, distinguishes expired session (sign-in link), prefills from `GET /api/onboarding`.
- **11** Register page: "Recover it here" link, existing-email (409) inline sign-in/recover links, account-help mailto for forgotten email (email is the account identifier).
- **12** Seller onboarding sustainability step explicitly covers SDS (PDF, per listing) and real formats (PDF certifications; PNG/JPEG/WebP photos, 5 MB); the non-persisting onboarding dropzone was removed rather than faking storage.
- **13** Buyer and seller feedstock interests are multi-select with "Others" + required description, sent as `feedstockInterests`/`otherFeedstockInterest`.
- **15** Explicit MOQ units everywhere. **16** SDS first, then claims (with "Others" description), then certifications.
- **2–8, 18 Value recovery.** `src/lib/value-recovery.ts` (pure): seller = (disposal incl. transport) × Q + price × Q; buyer = baseline × Q − price × Q, negatives shown as "Estimated additional cost". Step "Value recovery"/"Savings" inserted between Transport and Result; portal chosen explicitly via `portal` prop from each entry point (buyer detail pages purchase-control area and carbon analytics area; seller detail, add-listing preview, seller calculator page). Quantity derives from scenario tonnage with exact mass factors; unit-priced listings require an explicit weight basis. Exclusions disclosed. `carbon-report.ts` renders the same result object (section 3b) so on-screen and exported totals match. Manual distance is user-entered (mi/km) — the 14-mile placeholder is gone. Calculator facilities hydrate from `GET /api/locations`.
- **Purchase handoff.** Cart items carry currency, unit code, MOQ, availability, seller; Buy Now adds the real listing and opens `/buyer/checkout?listing=<id>`; checkout has no fallback product, keeps currencies separate, shows quantity/unit/price/seller from the saved record.

## Verification run here

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` (apps/web) | pass |
| `pnpm exec tsc --noEmit -p tsconfig.test.json` | pass |
| `node --test src/lib/*.test.ts` | 10/10 pass (deck example (155−150)×500=2,500; negative savings; zero; invalid input; unit basis; price semantics; MOQ unit names) |
| `pnpm exec eslint src` | 0 errors, 52 warnings (pre-existing `img`/hook-deps classes; baseline had 57) |
| `pnpm exec next build` (apps/web) | pass, full route table |
| `tests/e2e/ana-listings.spec.js` (9 mocked-backend scenarios) | **written, not executed** — coordinator took over browser verification; run with `ECOGLOBE_WEB_BASE_URL=http://127.0.0.1:<web port> pnpm exec playwright test tests/e2e/ana-listings.spec.js` |
| SQL-backed / authenticated / Tar & Gasoline offspec by real ID / 390 px screenshots | not performed here (coordinator) |

Temporary dev server on port 20020 was started and stopped (SIGINT) by this worker.

## Follow-up pass (after worker_done)

- The two checkout findings and the explicit-classification finding referenced by the coordinator were not present in this dispatch's structured inbox (dispatch, run and wait queries all returned no messages). Applied from the description: `validateDraft` now requires an explicit material type and category before any backend save (the API would otherwise classify as "other"); checkout pickup location now comes from the selected listing's recorded facility instead of a hardcoded address; the success screen labels the locally generated reference as "not yet submitted" rather than an order ID. Type-check, lint and unit tests re-run clean. If the queued findings differ, resend them to this terminal.

## Final dispatch ctx_d9a31ed4bb13 (2026-09-09, after integration)

- Checkout: an explicit `?listing=` id that is not in the cart now renders a "not in your cart" state with Open listing / Browse links and never substitutes the first cart item; unqualified visits still use the first item. Pickup location comes from the selected listing's saved facility.
- Onboarding (buyer and seller): `retryable` prop on the layout so validation errors keep "Next" and only backend save failures show "Retry"; reviewed and approved by the coordinator.
- Explicit classification on draft save was already enforced in `validateDraft` (material type and category); backend now also requires `materialTypeCode` at save and returns a listing to pending_review (SDS still present) or draft (no SDS) after a document delete. Re-reviewed: compatible.
- Mocked spec run from this worktree against the coordinator's combined web (127.0.0.1:20016, channel chrome, 15 s action timeout): 7 of 9 pass; the add-listing story failed only because the spec does not select a Frequency, which is now required before review (the coordinator's SQL story also needed Frequency = Monthly), and the buyer onboarding story needed the Retry-label delta that had not yet been integrated. Spec selectors were tightened (`Next`/`Currency` with `exact: true`); the Frequency selection was not added because no further changes were authorised. The coordinator is running the nine mocked tests on the integrated 20016 runtime.
- My temporary worktree dev server on port 20020 was started for local verification and stopped with SIGINT; no SQL or coordinator runtime was touched.

## Open items / assumptions

- Price visibility policy (all signed-in vs membership) unchanged: current public behavior preserved.
- Currencies/units preserved; kg/lb ↔ t uses exact mass factors only inside the estimator quantity derivation; no currency conversion anywhere.
- Onboarding product fields other than interests/industry/jobTitle/website (generation, restrictions, volume, specs, notes) have no backend field in the contract and remain unpersisted (client state only).
- Backend review findings sent to `ctx_2ff889f11314` and coordinator (document delete returns published listings to draft; materialTypeCode defaulting to "other"; legacy FileUrl-only documents hidden; slug lookup param typing; N+1 documents; blank-string onboarding fields clear stored values; session invalidation on missing active company).

## Changed-file manifest (sha256 prefix)

d173930700633bfe apps/web/src/app/(seller)/seller/carbon-calculator/page.tsx
a4f933fc539f85fc apps/web/src/app/api/backend/[...path]/route.ts
0618011fbfd2b4fb apps/web/src/components/auth/register-page.tsx
4e030a7e2a180c85 apps/web/src/components/buyer/buyer-browse-page.tsx
5365738eb6e2cb60 apps/web/src/components/buyer/buyer-checkout-page.tsx
f93916d607fdaca9 apps/web/src/components/buyer/buyer-favorites-page.tsx
daf6cd868b46cdd3 apps/web/src/components/buyer/buyer-onboarding-page.tsx
a63b7444e54d3420 apps/web/src/components/buyer/buyer-product-detail-page.tsx
99f990fd5b12a421 apps/web/src/components/buyer/carbon-calculator-button.tsx
8084a003a2ed46ba apps/web/src/components/buyer/carbon-calculator-modal.tsx
10dfd15e0e8aca62 apps/web/src/components/buyer/carbon-report.ts
b9e5685273a0ee47 apps/web/src/components/buyer/value-recovery-step.tsx (new)
8fa4036c48d8b69a apps/web/src/components/cart/cart-context.tsx
2d648e2338a5be93 apps/web/src/components/cart/cart-panel.tsx
8979a5eb4e5ee006 apps/web/src/components/onboarding/feedstock-interests.tsx (new)
f997298b58dee7af apps/web/src/components/public/browse-listings.ts
a6d63da6aef1884b apps/web/src/components/public/browse-page.tsx
bb3b445718e95d35 apps/web/src/components/public/featured-listings-section.tsx
b97e102fea5259bd apps/web/src/components/public/hero-section.tsx
4714a984e9397ed6 apps/web/src/components/public/product-detail-data.ts
3f55bfc4e009ec80 apps/web/src/components/public/product-detail-page.tsx
0bed37c9349ff0de apps/web/src/components/seller/add-listing-page.tsx
00311e48e51465a9 apps/web/src/components/seller/listing-detail-page.tsx
de9dbb83abff30c0 apps/web/src/components/seller/listing-documents.tsx (new)
13d17b3edb2bdac3 apps/web/src/components/seller/listing-edit-page.tsx
f4db06ee24d4f8f3 apps/web/src/components/seller/listing-form.ts (new)
e9c6c8eabfc4cdbf apps/web/src/components/seller/listing-location-picker.tsx (new)
2a18fc54f87e2d6b apps/web/src/components/seller/listings-page.tsx
a7ef050c00e63320 apps/web/src/components/seller/onboarding-page.tsx
DELETED           apps/web/src/components/seller/seller-listings-data.ts
2d54ff5ea5dbc23b apps/web/src/lib/backend-auth.ts
06d619607d64f3e7 apps/web/src/lib/backend-client.ts (new)
e779f12d36c2e4df apps/web/src/lib/custom-listings.ts
d52a2a2315f6829a apps/web/src/lib/listing-format.ts (new)
6c341219efc5046c apps/web/src/lib/listing-format.test.ts (new)
21cc79dcc50ea5bd apps/web/src/lib/listing-view.ts (new)
f98649e44ece408d apps/web/src/lib/listings-api.ts (new)
f577aa30fc94c3f2 apps/web/src/lib/use-company-locations.ts (new)
ca31613a2edd0c01 apps/web/src/lib/use-listings.ts (new)
a34e727d11631614 apps/web/src/lib/value-recovery.ts (new)
b0ece3087a5f20eb apps/web/src/lib/value-recovery.test.ts (new)
398cb38516c800a1 apps/web/tsconfig.json (excludes *.test.ts from app type-check)
b5ebbc68bc402ed7 apps/web/tsconfig.test.json (new)
8c7bd099d713d272 tests/e2e/ana-listings.spec.js (new)


## Coordinator final verification

The historical worker results above are superseded by the coordinator verification in `docs/ANA_CORRECTIONS_VERIFICATION_2026-09-09.md`. The final test file includes the explicit Monthly frequency selection. All nine mocked browser scenarios passed together in 10.9 seconds against the combined runtime after the reviewed retry-label change. Eight distinct SQL-backed browser stories passed (seven together and the additional checkout story separately); the affected SQL onboarding story passed again after the label delta. The full final SHA-256 manifest is `docs/ANA_CORRECTIONS_FILE_HASHES_2026-09-09.json`; it supersedes earlier hash prefixes in this report.
