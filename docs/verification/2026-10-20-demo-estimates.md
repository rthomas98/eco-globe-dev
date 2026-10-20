# Demo estimates: development verification, 20 October 2026

Workbook prices and volumes now take priority. Missing compatible point values use USD 100 per metric tonne and 100 metric tonnes, with field-specific demo-estimate labels and source notes. The fallback volume has no assumed annual period. These values are presentation estimates, not verified stock or commercial offers.

The change is deployed to the [development marketplace](https://eco-globe-dev-web.vercel.app) and [development admin](https://eco-globe-dev-admin.vercel.app). Estimates and prospects remain internal; FUEL/LSU offers and buyer requests remain private drafts. No accounts, SDS files, facility details or public inventory were created by this release.

## Applied data

The approved plan covered 407 distinct internal research records in ALL, Shell, Dow, Cabot and Westlake, plus 29 existing FUEL/LSU drafts. It updated 398 research records and all 29 drafts. Nine scoped research records needed no change; together with 15 records outside the scope, 24 records remained unchanged.

| Change | Internal research | FUEL/LSU drafts |
| --- | ---: | ---: |
| Missing prices given labelled USD 100/t fallback | 376 | 29 |
| Missing volumes given labelled 100 t fallback | 336 | 28 |
| Workbook prices recovered before fallback | 4 | 0 |
| Workbook annual volume recovered before fallback | 1 | 0 |

The update preserved 26 existing research prices and 62 existing research volumes, including zero prices and negative gate fees. Zentech's buyer request RFQ-19 retains its supplied 20-tonne bagasse-ash quantity and receives only a price estimate. The 29 FUEL/LSU drafts comprise 11 seller listings and 18 buyer requests.

Eight workbook volume ranges remain ranges, without an invented midpoint or fallback quantity. One Dow PDC-bottoms disposal-cost figure remains excluded from the sale-price field. Alternate bases such as drums, cans, buckets and percentages remain in source citations; they were not converted into tonnes. Workbook estimates retain their unverified status.

Research changes used version-checked, audited admin updates. Draft changes used a single serializable SQL transaction with an exact before-state check and audit events. Hash checks across 19 protected tables passed. Original source notes, draft status, ownership, specifications, SDS and locations were preserved.

## Application behavior

- Seller list, detail and edit screens distinguish demo price from demo volume. Estimated quantity is not described as available stock.
- Buyer draft lists, details and resumed forms show the same field-specific labels.
- Drafts can still be saved. Seller review submission and buyer posting are disabled while the demo-estimate note remains; the backend rejects those transitions independently of the interface.
- Admin research screens distinguish demo estimates from other unverified source values and display workbook ranges. CSV exports include volume period and price/volume citations. Export formatting has focused automated coverage; a browser CSV download was not separately exercised.
- Existing role, facility and supplier-SDS requirements remain in force. Replacing a demo value does not itself verify the underlying commercial data.

## Verification

| Check | Result |
| --- | --- |
| Type checks | PASS |
| Lint | PASS: 0 errors, 38 existing warnings |
| Backend tests | PASS: 154/154 |
| Focused frontend tests | PASS: 36/36 |
| Runtime-isolation tests | PASS: 22/22 |
| Backend, web and admin builds | PASS |
| Live API comparison of every planned record and draft | PASS |
| Protected SQL rows outside target drafts | PASS: 19 table fingerprints unchanged |
| Public inventory, orders and portfolio assignments | PASS: 18 public listings and 2 public buyer requests unchanged; orders and portfolios unchanged |
| Live stored-draft publication guards | PASS: seller LS-32 and buyer RFQ-3 returned HTTP 400; both records unchanged |
| Live browser: seller list, detail and editor | PASS: values, labels, disabled review and enabled draft save |
| Live browser: buyer list, detail and editor | PASS: values, labels, disabled posting and enabled draft save |
| Live browser: workbook values | PASS: record 24 retains USD 300/t; record 264 retains its 20,000–60,000 t/yr range; RFQ-19 retains 20 tonnes with only a price-estimate badge |

Application checks ran in an isolated source-only workspace using Node 22.20.0. Private data tooling used the host Node 26.4.0 runtime. Credentials and private intake/evidence files were excluded from release sources and Git.

The whole-app React Doctor scan remains **not clean**: score 44/100, with 359 findings. Two warnings introduced by helper exports were fixed before release, reducing the scan from 361 to 359 findings. This scoped verification does not certify the rest of the application's health or resolve those remaining findings.

## Release and review

- Application commit: `b6826df69a31544a26cdb8cc5592da33d2140eb1`, branch `codex/deploy-ecoglobe-backend`, based on `30a40f9adfba1d68e4e7432ea63e6889833ab4af`.
- API revision: `ecoglobe-backend-dev--demo-b6826df`; health and database connectivity passed.
- API image: `acrecoglobe7c180adf.azurecr.io/ecoglobe-backend@sha256:eecaaaffcf060c150093b29591a7f6fbab1569ac72d670eaedb5f0f187748113`.
- Web deployment: `dpl_FCeGtHUoGhKAEcLwL3ejm8MFBouE`.
- Admin deployment: `dpl_7yoJWr4mDpLC2S9YkNow6gAA6aSH`.
- Both live development aliases were verified against those ready deployments. Existing API environment/secret references and scale were preserved. Commercial production was not changed.
- Approved data-plan SHA-256: `31e3d6d00c18a1ceb0f5876abe014db1555a98f9afe75bb07f7df61770347716`.

Orca run `run_106b52a3f65d` tracked the frontend worker and independent review. Both tasks succeeded; reviewed source and data scripts were bound to exact hashes before integration and execution. Worker-release receipts retained the user-owned terminals without closing their processes; no reclaimable workers remained. Manual permissions were verified during work; later mode drift was observed after the read-only review had settled, so this report does not claim uninterrupted Manual mode.

Private receipts, snapshots, logs and screenshots are retained under `.local/verification/2026-10-20-demo-estimates/`. Principal receipts are `live-data-verification.json`, `draft-apply-receipt.json`, `live-stored-guards.json`, `browser-checks.json`, `combined-checks.json`, `extra-checks.json`, `api-ready.json` and `frontend-aliases.json`.

## Retest and remaining confirmation

1. Sign in to a FUEL/LSU demo account. Under seller Listings, open a draft and check the separate demo price/volume badges, the estimate note and the disabled review control.
2. Switch to Buyer and open Requests for quote. Resume a draft; check that draft save remains available and posting is disabled. For Zentech RFQ-19, confirm 20 tonnes is retained and only the price is labelled as a demo estimate.
3. In admin Market records, inspect record 24 for preserved workbook price plus demo volume, and record 264 for the retained workbook range. Estimates and prospects should remain internal.

Ana and Bea still need to confirm actual commercial prices, quantities and their periods, facilities and applicable supplier-issued SDS documents before drafts can progress toward publication. No further input is needed to use the labelled private presentation estimates.
