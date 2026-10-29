# Shell, Dow, Westlake and Cabot products made sellable on development — 2026-10-29

Status: done on [development](https://eco-globe-dev-web.vercel.app). Data-only change through the admin API; no code, migration or deployment.

## Workbook audit

The supplied `Shell Gulf`, `Dow`, `Westlake` and `Cabot` play list (2) workbooks are byte-identical (SHA-256) to the versions imported on 20 October, and `FUEL-LSU play list (2).xlsx` is identical to the 16 October intake.

- Every data row on every tab matches the intake's row count. All 308 mapped rows resolve to active research records in the right company portfolio (Shell 85, Dow 89, Cabot 66, Westlake 68).
- Rows that were not imported keep their recorded reason. These are disposed or parked PFAS material, unidentified Shell chemicals, negative or inferred buyer matches, competing-supplier estimates ("Other generators") and summary tabs (sites, value estimate, sources, stream → buyers).
- Field differences occur only where a row deliberately reuses an older ALL-workbook record with slightly different wording, such as "Steam-cracker tar" for "Steam-cracker tar / pyrolysis pitch".
- One gap remains: research record #263 (Shell Deer Park pyrolysis pitch) has no city or state. The Cabot provider row gives Deer Park, Texas. The record was left unchanged.

## What was added

Each company's own "sells" rows became a published marketplace listing with one SDS. That is 44 listings, #54–97. Research records, portfolios and playlists were not changed.

| Company | Company ID | Listings | Source tab |
| --- | ---: | --- | --- |
| Shell Gulf (presentation demo) | 56 | 27 (#54–80) | Shell streams (25) and Other Shell streams (Norco and Deer Park pyrolysis pitch) |
| Dow (presentation demo) | 57 | 10 (#81–90) | What Dow sells |
| Cabot Corporation (presentation demo) | 58 | 2 (#91–92) | What Cabot sells |
| Westlake (presentation demo) | 59 | 5 (#93–97) | What Westlake sells |

Ten pickup sites named "… (demo pickup site)" use the workbook site addresses. These are Houma, Norco and Deer Park for Shell; Plaquemine, Freeport and Taft/Hahnville for Dow; Ville Platte and Franklin for Cabot; and Deer Park and Lake Charles/Westlake for Westlake. Shell Houma, Shell Deer Park and Dow Taft have no street address in the workbooks and say "street address pending". All coordinates are approximate city points.

Pricing and stock rules:

- **Price:** the workbook or research-record price per tonne where one exists, otherwise USD 100/t. Westlake brine sludge is −USD 50/t in the workbook, which is a gate fee the seller pays. Checkout cannot represent that, so the listing uses USD 100/t and says why.
- **Stock:** the annual volume estimate where one exists, otherwise the 100-tonne demo estimate. The minimum order is 1 tonne.
- **Description:** each one states the price and stock basis and that the listing is not a quote or verified stock. It also lists product facts (category, condition, quantity, frequency, volume, equivalents, composition, checked status) and the source tab, row and research record.
- **Excluded from descriptions:** buyer names, staff names, price-floor notes and current-route details, because the workbooks mark buyer names as internal.

SDS documents:

- 22 listings use an existing public-source reference sheet with matching material and a verified byte-identical hash. These are CO2, LPE-90, off-spec epoxy, PDC bottoms, PE wax, pyrolysis pitch ×2, quench oil, resin oil, spent sulfuric acid, and steam-cracker tar ×3.
- The other 22 use generated PDFs labelled "Safety Data Sheet — DEMONSTRATION DOCUMENT" that contain no safety data.
- Black gypsum deliberately uses a placeholder, because `Black_Gypsum_DG_Reference.pdf` describes a different material.

## Checks

- Replaying the publish script created nothing.
- Database fingerprints before and after were identical for MarketRecords, portfolio records and listings, reference links, DemoPresentations, playlist memberships, playlists, Companies, listings #1–53, other companies' locations, Orders and WantedListings. Listings went from 52 to 96 and published listings from 29 to 73.
- The buyer API (`bianca.buyer.e2e1`) shows all 73 published listings, and all 44 new SDS downloads are byte-identical to their source files.
- Real Stripe sandbox payments were made with the test card. The checkout was created through the buyer API and paid on Stripe's hosted page:

| Order | Listing | Seller | Shipping | Amount |
| --- | --- | --- | --- | --- |
| 43 | 54 Paint (1-gallon buckets) | Shell Gulf | Pickup (Houma) | $100 |
| 44 | 81 Quench oil | Dow | Delivery | $300 |
| 45 | 91 Black gypsum — Ville Platte | Cabot | Pickup | $70 |
| 46 | 97 Brine sludge | Westlake | Delivery | $100 |

All four reconcile as `paid`, are `in_progress` with one payment each, and reduced stock by 1 t.

## Open

- The other 40 listings passed the API, SDS and eligibility checks but were not individually purchased.
- The four company buyer pages were not opened in a browser for this pass, because the browser login helper was blocked. Checkout was created through the API instead.
- Buyer needs ("What X could buy", buyer and provider lists) remain research records only. No buyer requests were created.
- Orders 43–46 remain as demo orders on development. Admins now see the products both as research records and as listings.

Private evidence, including the plan, scripts, receipts, logs and fingerprints, is in `.local/verification/2026-10-29-sample-company-products/`.

## Map coverage follow-up

The browse map pins a marketplace listing when its pickup location has coordinates. Signed-in buyers see these pins. Signed-out visitors receive no listing coordinates, by design.

- **Before:** 71 of the 73 published listings had coordinates.
- **Fixed:** location 25 (Greenfield Biomass, 4801 Riverside Dr, Baton Rouge, LA) had its country saved as `70` and no coordinates. It now has country `US` and an approximate Baton Rouge point (30.4507, −91.1546). This puts #22 Premium Rice Hull Ash on the map. The same location also serves drafts #21, #26 and #28.
- **Result:** the buyer API now returns coordinates for 72 of the 73 listings.
- **Left unpinned:** #27 PVC Scrap (MKDK Shop) uses the test placeholder "123 Sesame Street, Pending", which is not a real address.
