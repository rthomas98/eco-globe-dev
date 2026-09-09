# Feedstock pricing update — 2026-09-09

Source: `Feedstock prices.xlsx`, Sheet1!D3:G19. Workbook retained unchanged. [Extracted source and SHA-256](data/feedstock-prices-2026-09-09.json).

The user authorized both live and local pricing. The primary local backend configuration and the live Azure API use `sqldb-ecoglobe-dev`, so the same saved prices serve both. Dedicated Orca synthetic fixture databases were not altered. Prices are USD per metric tonne unless the workbook explicitly says each. Tar at USD225 supersedes the earlier slide value of USD450.

| Feedstock | Workbook price | Result |
|---|---:|---|
| Black gypsum | $45 / metric tonne | Updated and SQL-verified |
| Hydrochar | $100 / metric tonne | Updated and SQL-verified |
| Biochar | $500 / metric tonne | Updated and SQL-verified |
| Epoxy offspec | $1,900 / metric tonne | Updated and SQL-verified |
| Scrap polymer blend | $225 / metric tonne | Updated and SQL-verified |
| Premium Rice Hull ash | $250 / metric tonne | Updated and SQL-verified |
| Guard test Bagasse | $60 / metric tonne | Updated and SQL-verified |
| Biomass wood pellets, A | $230 / metric tonne | Updated and SQL-verified |
| Rice Husk | $30 / metric tonne | Updated and SQL-verified |
| Harvested and Baled Corn Stover | $70 / metric tonne | Updated and SQL-verified |
| Shredded, Refined Sugar Bagasse | $80 / metric tonne | Updated and SQL-verified |
| Pyrolysis pitch | $350 / metric tonne | Updated and SQL-verified |
| Tar | $225 / metric tonne | Updated and SQL-verified |
| Refined Used Cooking Oil | $1,300 / metric tonne | Updated and SQL-verified |
| Certified organic wood chips | $45 / metric tonne | Updated and SQL-verified |
| Used Pallets | $5 / each | Pending quantity confirmation |
| Used Dry Transformer | $15,000 / each | Updated and SQL-verified |

## Database evidence

Sixteen matching records were updated in one serializable transaction, with explicit ID/title and unit checks. Readback compared every selected listing, including all unrelated records, against the expected before/after projection. Only PricePerUnit, CurrencyCode, QuantityUnit (if an explicit item-basis correction is authorized), and UpdatedAt can be written by the script. Existing quantity, MOQ, status, documents, company identity and transactions are preserved. Hydrochar and Scrap Polymer Blend now explicitly use USD as supplied; this is a replacement quote, not an exchange-rate conversion.

[Applied receipt and before-images](data/feedstock-prices-applied-1788978773447.json) support manual rollback with a current-value guard. [Correction script](../scripts/apply-feedstock-prices.mjs) defaults to planning; repeat application skips already-correct records. The source only identifies these specific records; it is not a default-pricing rule for future listings.

## Live frontend

The currently deployed source was `01a0e593ea42458a78186791bc307ee7e8179158`, which differs from the primary checkout and the earlier local Ana correction implementation. A narrow patch was built from that exact live revision to preserve its existing features and access rules. It updates the 14 unambiguous matching built-in catalog entries; Premium Rice Hull Ash and Guard Test Bagasse are API-backed entries. The local Ana code already reads persisted SQL values and required no hardcoded price insertion.

The deployed API can legitimately redact a price to null. The old detail-page adapter converted that into a displayed zero. The patch now labels it Price unavailable and prevents purchase with a missing price; genuine numeric zero stays zero. It does not change membership access policy. Per-tonne versus per-item suffixes are explicit on detail price cards.

[Exact live patch](data/feedstock-prices-live.patch), [file hashes](data/feedstock-prices-live-hashes.json). Candidate deployment: `dpl_Gcc4S5zUGSgHfmAVwYnrjXBvo2MF`. Promoted successfully to `https://eco-globe-dev-web.vercel.app` using the verified deployment ID and explicit team. Live Chrome inspection after API hydration showed restricted Tar pricing as Price unavailable, with purchasing disabled; the transient built-in catalog showed the corrected USD225/ton. A signed-in entitled live session was not used, so member-visible price verification is SQL readback plus the browser adapter tests, not a claim of a live authenticated checkout.

## Verification

- Sixteen SQL record updates and unchanged-record comparison passed.
- Web TypeScript check passed.
- Production candidate build passed and its health endpoint confirmed Azure SQL connected.
- Four Playwright tests passed (22.7s): all sixteen SQL prices and units mapped to details; restricted price unavailable and purchase disabled; genuine zero preserved; corrected Tar and transformer catalog fallback prices.
- Explicit lint check against the deployed revision's shared configuration reported three pre-existing rel=noreferrer errors and five image warnings. The relevant link/image code is unchanged; this is not a clean-lint claim. The deployed revision has no discoverable web ESLint config, so the shared config was supplied explicitly.

## Missing input

- Used Pallets: workbook price is USD5 each. SQL currently says 500 tonnes available and a 100-tonne minimum. Price/unit change is held until the user confirms those quantities actually represent pallet counts. Other workbook updates were completed independently.
- Gasoline offspec: IDs 23 and 24 both have zero price and are not in the workbook. They remain unchanged pending a supplied price.
- Other products absent from the workbook, including White Label, Recycled Tire Crumb Rubber and Dark Viscous Liquid Tonnels, retain their existing prices.

No commit, database reset, email, transaction repricing or unrelated application release was performed.

The owned loopback browser-test server was stopped after verification. Prior local Ana corrections and unrelated user edits remain untouched.
