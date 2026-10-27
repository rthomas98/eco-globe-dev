# Add to Cart and checkout for every marketplace listing — 2026-10-27

Status: released to [development](https://eco-globe-dev-web.vercel.app). All 18 published marketplace listings can be added to the cart and bought through Stripe sandbox checkout. Demo presentation examples remain presentation-only by design.

## Cause

Checkout and RFQ require a usable seller SDS (`listing-safety.ts`). On development, 17 of 18 published listings had no documents, so Buy Now and Add to Cart were disabled everywhere except PVC Scrap. The payment flow itself worked.

## Development data (authorized; demo data only)

An admin session attached one SDS PDF to each of the 17 listings through `POST /api/listing-documents`, then re-published each listing (upload moves a published listing to pending review and queues one staff review alert). Listing ids → document:

- From the supplied reference set (public-source reference sheets, not supplier SDSs): 3 Pyrolysis Pitch, 4 Epoxy Off-Spec, 13 Refined UCO, 14 Used Dry Transformer (cast-resin sheet), 15 Hydrochar, 16 Used Pallets, 17 Biochar.
- Nearest available reference sheet, per the user's demo direction: 19 Tar (phenol tar), 7 Black Gypsum (Black Gypsum DG reference sheet, not an SDS), 5 Sugar Bagasse (bagasse ash).
- Generated one-page placeholders labelled "DEMONSTRATION DOCUMENT — not a real safety data sheet": 6, 8, 9, 10, 11, 12, 22.

Buyer reads afterwards: 18/18 published with an SDS; price, currency, quantity, unit, MOQ, location, description, slug and status unchanged on all 18; each of the first seven downloads byte-identical to its source file.

## Application change

Commit `1104329` (reviewed as `337de85`, identical `apps/web`):

- Add to Cart beside Buy Now on the buyer product page; cart button in the buyer sidebar and mobile header.
- Cart badge counts lines, not summed tonnage; accessible names for cart controls.
- `apps/web/src/lib/purchase-eligibility.ts` mirrors backend checkout rules for both product pages: active buyer/both company with owner/admin or execute permission, not own listing, recorded USD price, SDS, stock including quantity already in the cart, rounded total ≥ USD 0.50.
- Checkout address picker omits empty address parts.

Codex (`gpt-6.1-sol`, medium, Standard) review round 1 found three P2 issues (roles vs active-company permission, cumulative cart stock, $0.50 minimum); all fixed. Round 2: no actionable findings; reviewed-content digest `20f881cd1345f5a43343d45bb68420465a9bf6c7b4d223468482707df3893560`.

## Checks

| Check | Result |
| --- | --- |
| Web lib tests (tsx) | 365 passed (baseline 356 + 9 new) |
| Web and admin type-check | Passed |
| Changed-file ESLint | 0 errors; existing `<img>` warnings |
| Web and admin production builds | Passed |
| `git diff --check` | Clean |

Plain `node --experimental-strip-types` cannot resolve the `@/` alias in nine existing test files; run web lib tests with `tsx`.

## Browser evidence

Development, before the UI change (buyer `bianca.buyer.e2e1`, Stripe sandbox test card):

- Buy Now, pickup: order EG-29, Biochar 3 t, USD 1,500 — Stripe confirmed, payment TX-10 captured, order in progress, cart emptied.
- Two-item cart via public Add to Cart, delivery to the saved company site: order EG-30, Used Pallets 100 t, USD 1,500 — confirmed; PVC Scrap stayed in the cart with "Continue with 1 remaining cart item".

Local build against the development API: buyer-page Add to Cart, sidebar and 390 px header cart badge (2 items), cumulative stock message (6 t in cart + 101 > 106 disables Add to Cart only), seller-only account blocked with the buyer-company message, address rendered without empty parts.

Release: branch `codex/deploy-ecoglobe-backend` pushed (`7300310..1104329`). Clean `git archive` of `1104329` deployed to `eco-globe-dev-web` production target: `dpl_CcRdn8gQuzgi6Vt8vx5sUTfhzwAH`, Ready, serving the development alias; live backend health proxy connected. Live check: Biomass Wood Pellets shows its SDS, Buy Now and Add to Cart enabled, sidebar cart updates. No backend deployment or migration.

## Open

- Own-listing block for a company that both buys and sells is covered by unit tests only; no such demo account exists.
- Each cart item remains a separate order and Stripe payment.
- EG-29 and EG-30 are test orders on development and reduced Biochar and Used Pallets stock.
