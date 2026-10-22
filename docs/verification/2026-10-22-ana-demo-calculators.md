# Ana feedback: demo tools and purchase eligibility

The requested calculator and picture changes are released on [development Browse](https://eco-globe-dev-web.vercel.app/browse?source=demo&playlist=fuel-lsu&distance=Any&q=CO2) and the [demo gallery](https://eco-globe-dev-web.vercel.app/demo-feedstocks). Sample, SDS and cart behavior for presentation examples remains deferred while Rob waits for Ana's decision.

## Released changes

- Demo gallery and Browse cards offer **Estimate savings** and **Transport footprint**. These calculators use local scenario inputs without API writes, saved reports or commercial listing identities.
- Supplied prices retain their currency, unit and source label. Buyer targets require confirmation. Missing, range and text prices require a separate entered scenario price. Seller-paid disposal fees do not enter ordinary buyer-savings calculations. Negative savings show additional cost.
- Transport requires a physical state, compatible mode, shipment metric tonnes and miles. It uses the existing product transport factors. It does not infer density, routes, material factors or lifecycle savings. Positive values below 0.001 t CO2e display as **<0.001**.
- Exact CO2 and CO2-derived title aliases use the existing CO2 illustration. Seller-uploaded photos retain priority. Browse demo map popups show a labelled thumbnail.
- Closing a calculator returns focus to its opener. Inputs reset on close or another example. Existing filters, selected examples and gallery return paths remain intact.

## Tar and Biochar purchasing

The existing Encore buyer session reproduced the reported block on live development:

| Listing | Seller SDS | Public control | Buyer control |
| --- | --- | --- | --- |
| Tar, 19 | Missing | Add to Cart disabled | Buy Now disabled |
| Biochar, 17 | Missing | Add to Cart disabled | Buy Now disabled |
| PVC Scrap, 27 | Present | Add to Cart enabled | Buy Now enabled |

The UI matches the backend checkout requirement for a usable seller SDS. Authentic supplier documents are still needed for Tar and Biochar. No cart, order, payment or seller-document mutation was submitted during this task. Enabling a purchase control is not proof of a completed purchase.

## Verification

Application commit: `45de8a7a3088828f6e458079191147753501091a`.

| Check | Result |
| --- | --- |
| Web application and test types | Pass |
| Changed-file lint and Git whitespace check | Pass |
| Web library tests | 356 passed |
| Five focused backend suites | 27 passed |
| Runtime isolation | 22 passed after allowing temporary loopback test bindings |
| Web and admin production builds | Pass |
| Independent source review | Approved the exact eight-file revision after fixing small positive emissions displayed as zero |
| Local browser | Signed-out FUEL Browse at 390px and desktop, FUEL gallery on desktop, and ALL gallery/Browse on desktop passed |
| Live development browser | Existing Encore buyer session: FUEL savings, target confirmation, small footprint, ALL missing-price and gate-fee cases, gallery tools, buyer Browse, selected-result return and popup controls passed |

The image regression failed with an assertion before the mapping fix and passed all seven cases afterward. Calculator tests cover blank inputs, zero prices, negative savings, target confirmation, range/text/missing prices, gate fees, overflow, incompatible modes and display precision.

Browser checks confirmed the supplied $100/t scenario price with 10 tonnes and a $150/t baseline produces $500 savings. A $50/t baseline produces $500 additional cost. Missing-price Dow PDC bottoms retains **Not stated** while an entered EUR 80/t scenario with 2 tonnes and a EUR 120/t baseline produces EUR 80 savings. Westlake's supplied seller-paid $50/t gate fee remains labelled and blocks ordinary buyer savings. One tonne over one mile by rail displays **<0.001 t CO2e**.

The 390px dialog fits without horizontal overflow. Back, Escape and keyboard focus handling passed. The mobile map's facts region scrolls, and its gallery control remains reachable. Closing a calculator preserves an explicitly selected buyer result and its URL. Gallery return retains the buyer route and selection.

Local browser error capture was empty. The live tab recorded one Google identity error from the earlier Vercel login page; its source URL was on `vercel.com`, before application testing. No EcoGlobe application errors were captured.

React Doctor exits nonzero with three existing map-effect diagnostics and nine warnings. The complete `ListingMap` component is byte-identical to the base. Existing export and complexity warnings remain. The new optional backdrop mouse-dismissal warning was reviewed against explicit Close, Back and Escape actions and the focus trap. This is an adjudicated scan, not a scanner pass.

## Development release

Deployment: `dpl_ECvCP1ungbHdykMiQM8u7sDcavMq`, in the existing `eco-globe-dev-web` project. The live `eco-globe-dev-web.vercel.app` alias was verified against that exact deployment.

Source context SHA256: `39cb9d9dd7a63c50e4626283beb0c0d04149672eed92c27523f50dabe6a38bae`.

Before/after public API hashes matched for FUEL, ALL, marketplace listings and legacy presentation examples.

The staged URL required Vercel authentication. Existing CLI authentication verified the staged Browse response and FUEL/ALL API proxies before promotion. Browser acceptance then ran on the public development alias. Deployment Protection was not changed. Source-only release files excluded environment files, credentials, private intake and evidence.

No backend, database, playlist, price, volume, permission, email-provider or production-service changes are included. All other tracked application files were checked against the starting hashes. The existing untracked `docs/guides/` directory was preserved and excluded from the release.

## Still awaiting confirmation or supplier data

- Ana must confirm whether demo sample, SDS and cart actions are previews or real requests. These controls remain unchanged.
- A common CO2 document was not attached as the SDS for chemically distinct derived products. Material-specific seller SDS mappings remain unconfirmed; research references were not promoted to supplier SDS files.
- Tar and Biochar require authentic seller SDS files before checkout can proceed.

Private evidence is retained under `.local/verification/2026-10-22-ana-feedback/`, including source manifests, review receipts, test logs, screenshots, API hashes and deployment identity checks.

## Orca task outcomes

Run `run_f1b497cf4d96` settled both tasks successfully. The frontend task delivered the eight reviewed files. The backend task audited eligibility and independently reviewed the changes without backend edits. The frontend also reviewed the checkout audit.

Orca drifted out of Manual during the initial image batch. Further edits were paused, the exact image and popup files received independent review, and Manual was restored. Calculator edits then used individual approval checkpoints. The Codex backend worker's launch was verified as GPT 6.1 Sol, medium, Standard, with Fast disabled.

Both workers sent their original task/dispatch completion messages. Documented release calls retained the frontend terminal as user-owned and the backend terminal as external. There are no reclaimable worker terminals. Worktrees and evidence remain preserved. This task's local server was stopped and its temporary viewport override was reset.
