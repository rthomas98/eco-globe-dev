# FUEL and ALL demo playlists and map plan

Status: implemented and verified on development, FUEL first and ALL second. See docs/verification/2026-10-21-demo-playlists-progress.md for exact deployment and evidence limits. Audit date: 21 October 2026.

Ana needs a presentation catalogue that shows each company with the materials it buys and sells, using the familiar marketplace cards and map. Deliver FUEL first, then ALL. The user confirmed that ALL, including customer names, may appear in the public demo. Public examples must remain labelled as presentations, with commercial verification and purchasing handled by the existing marketplace.

The files repeat the earlier accepted sources. Reimporting them would not fix the missing map or playlist navigation. The work is to reconcile their coverage, extend the presentation model, and display reviewed company and material examples together.

## Audit results

The audit used source checkout `f561fe170eb9de177ef8ab6f31e8504f347bd429`, all six supplied workbooks, both archives, current source code, and fresh development API reads. The API audit at 15:18 UTC returned 422 research records across three pages, 29 public presentations, and 18 ordinary marketplace listings. Browser inspection confirmed that the demo page has company and buyer/seller filters, but no map or playlist selector.

| Source | Contents and current placement | Follow-up |
| --- | --- | --- |
| FUEL workbook | 11 main companies. Existing public examples comprise 11 seller offers and 18 buyer needs across seven companies. Four technology/service companies have no material examples. | Show all 11 company profiles, including an explicit no-material-data state. Add a named FUEL playlist, illustrations, geography, and linked network context. |
| FUEL supporting tabs | 66 prospective-buyer rows, 26 provider rows, and seven synergy rows. | Reconcile relationships separately from main-company offers. A potential buyer is not a confirmed order, and an equivalent material is not a confirmed requirement. |
| ALL workbook | 83 seller rows and 77 buyer rows across 90 distinct source company names. All 160 match existing portfolio 4 records by role, company, facility, and material. Street and postal values also match. | Create reviewed public presentation examples from these records, then reconcile the union with the other supplied workbooks. |
| Shell, Dow, Cabot, Westlake workbooks | Existing active internal portfolio memberships are 85, 87, 66, and 68 records respectively. Some records belong to several portfolios. | Reuse existing records and source mappings. Review context-only rows before deciding whether they belong in a company profile, a possible relationship, or a material card. |
| Pictures archive | 32 source PNGs and a mapping deck match the prior intake. All 31 selected illustration files still match their approved hashes in the application. | Reuse the illustration library in presentation cards and map popups. The current gallery has no material pictures. |
| SDS archive | 29 PDFs, 107 pages. Every PDF hash matches one existing internal reference. There are 94 associations across 93 ALL records, with six references deliberately unlinked. | Review relevant links for the expanded catalogue. An absent association is not automatically a defect. Keep research PDFs internal and separate from seller SDS documents. |

All six supplied workbook hashes match the earlier accepted versions. The ALL workbook's FUEL tab repeats the same 11 main companies. The earlier Oct15 supplement contained 18 duplicate rows already represented in the full ALL workbook. Preserve its additional provenance without creating duplicate entries.

The PDFs explicitly identify themselves as compiled references rather than supplier-issued documents. The Black Gypsum DG reference describes a gypsum/humate soil amendment, not the industrial carbon-black-plant material. Do not associate the two merely because their names overlap.

## Location coverage and exceptions

Address completeness means the source has text in the relevant cells. It does not establish a correct geocode, a current facility, or an approved pickup address.

| FUEL company | Material examples | Supplied main-company geography |
| --- | ---: | --- |
| BB&M Materials | 7 | No street or ZIP |
| Encore CO2 | 4 | 1624 Wyoming St, Baton Rouge, LA 70802 |
| Cavendish Energy | 6 | Baton Rouge, Louisiana only |
| Renovigo Chemicals | 5 | 3347 Nicholson Dr Suite A101, Baton Rouge, LA 70802 |
| Waste to Energy Systems | 5 | 30380 Payne Alley, Suite 2, Tickfaw, Louisiana 70466 |
| Zentech | 1 | LSU/Baton Rouge mentioned, no receiving address or ZIP |
| NovaSpark | 1 unconfirmed need | West Monroe, Louisiana only |
| ApplicaRAD, CodeGig, Westfield, Eray | 0 | No street or ZIP in the main-company rows |

Only three of the 11 main-company rows have a street address and ZIP. Those addresses cover 14 of the current 29 examples as potential company display locations. The remaining 15 examples lack a supplied street/ZIP pair. None has been geocoded or approved as a facility by this audit.

FUEL's prospective-buyer tab has 26 street-plus-ZIP rows, three street-only rows, and 37 with neither. Its provider tab has 17 street-plus-ZIP rows and nine with neither. Do not borrow a prospective customer's address for a FUEL company's pin.

All 160 ALL records contain street and postal text. The live records still mark address purpose and review status as unknown. Some source addresses are headquarters, offices, mailing addresses, or descriptions covering multiple sites.

Specific exceptions need attention:

- **J.M. Huber, ALL Buyers row 13, record 166:** the facility says Bauxite, Arkansas, while the street, city, and ZIP describe Atlanta 30339 and the state says Arkansas. Huber's [official contact page](https://www.huber.com/about/contact-us/) identifies the Atlanta address as Georgia. Ana must identify the intended plant. Hold this pin until resolved.
- **Dow Terneuzen, ALL Sellers row 54:** the workbook supplies postal code `4542` and an unnumbered street. Dow's [official location page](https://corporate.dow.com/en-us/locations.html) supplies Herbert H. Dowweg 5, 4542 NM Hoek. Retain the original source and propose this as a sourced correction for review.
- **Orion source rows:** the named Americas HQ is a company location, not evidence of the material's production or pickup site.
- **Renovigo:** the supplied address matches its [official contact page](https://renovigochemicals.com/contact.html). That supports a company display location, without establishing a pickup facility.
- **Cabot Ville Platte:** the supplied address matches Cabot's [official locations page](https://www.cabotcorp.com/company/worldwide-locations/north-america). Material availability and pickup suitability remain separate checks.

Use these rules for the proposed map:

1. Prefer a supplied, unambiguous business/facility address. Record whether it is a facility, headquarters, office, or unknown.
2. If the street is absent, resolve the supplied ZIP/postal code with country and label the pin **Approximate postal area**. Preserve leading zeros and international letters.
3. If street and postal code are both absent, keep the entry visible with **Location pending**. A confirmed city may support a separately labelled city approximation if Ana agrees. Never invent a company ZIP from a city name.
4. Conflicting addresses require review before a pin is displayed. A failed geocode must not fall back to zero coordinates or another company's location.
5. Show mapped and pending counts. Group overlapping markers so every material remains reachable.
6. Keep presentation geography out of shipping quotes, pickup instructions, commercial distance calculations, and booking.

Postal points are approximations. The [US Census explains](https://www.census.gov/programs-surveys/geography/guidance/geo-areas/zctas.html) that ZIP Codes describe delivery routing and ZCTAs approximate their geography. Some valid ZIP Codes lack a corresponding ZCTA. The implementation needs a reviewed international geocoder/postal source with suitable storage and display terms.

## Proposed presentation experience

Keep the existing **Explore demo feedstocks** link from Browse. Add a playlist selector to the presentation page with **FUEL/LSU** first and **ALL customers and feedstocks** second. Retain company and buyer/seller filters, and add material search and a synchronized map. Start the demo at any distance and fit the selected playlist's mapped entries. Do not silently hide distant companies behind the visitor's current-location radius.

FUEL includes all 11 company profiles. Material companies show their seller offers and buyer needs. Technology/service companies show their supplied business description without fabricated stock. Supporting customer/provider matches appear as clearly marked potential relationships, rather than confirmed purchases or sales.

ALL combines the supplied sources after reconciliation. The existing 160 records are its baseline, not a guaranteed final total for the six-workbook union. Preserve separate facilities, roles, materials, specifications, and quantities. Merge duplicate representations only when they describe the same underlying statement. Keep every source-row reference behind the resulting entry.

Use the existing card style and illustration component. Cards and popups show company, material, seller/buyer role, source status, price, quantity, period, and location precision. Display **Presentation only**, **Demo price estimate**, and **Demo volume estimate** where applicable. Show prospect or unconfirmed status independently from numeric estimates. A workbook's **Checked by EcoGlobe: Yes** is a source assertion, not a staff field-verification decision. It must not automatically produce a verified badge.

The user has approved public company names for this demo. Publish only reviewed presentation fields. Contacts, private notes, raw source documents, internal identifiers, and editing links remain protected. The existing private-draft screens remain company-scoped.

## Data shape and ownership

The current public presentation table accepts only seller Listing or buyer WantedListing sources. Its public response has no location or playlist fields. ALL's MarketRecords therefore cannot appear in the public gallery through today's contract. Normal Browse reads published marketplace Listings and cannot display internal records merely because they belong to a portfolio.

Use reviewed presentation snapshots as the base. Add an internal MarketRecord source variant, explicit public playlist membership, and approved display geography. Preserve the existing 29 snapshot identities and the strict legacy endpoint while a new playlist read contract supplies cards and markers.

Proposed caller interfaces, not existing APIs:

```ts
const playlist = await demoCatalog.readPlaylist("fuel-lsu");
// One result supplies company profiles, material cards, map items, and pending counts.

const preview = await demoPublishing.preview({ intakeId, playlist: "all" });
await demoPublishing.commit({
	previewId: preview.id,
	expectedDigest: preview.digest,
	idempotencyKey,
	reason: "Reviewed workbook reconciliation",
});
```

The public entry needs discriminated buyer/seller roles, a source-status label, and a location variant: reviewed point, postal-area approximation, or unresolved. Private provenance records the source kind, stable source identity, workbook sheet/cells, original address, geocoding result, review, and snapshot version. Public company identities must not grant company-account access.

Value types also need expansion. The existing snapshot accepts nonnegative numeric prices and a scalar quantity. ALL contains zero prices, negative gate fees, annual figures, ranges, and non-tonne units. Preserve these meanings before enrollment:

- Petromax's source has zero USD per gallon and 390,000 gallons per year. Do not replace zero or convert gallons to tonnes without a supported basis.
- Westlake brine sludge has a negative USD 50/t value. Display the direction as **Seller pays a gate fee**, not a positive selling price or a missing value.
- Keep annual volume separate from quantity available for a demo scenario. Keep ranges as ranges and retain source midpoint labels.
- Preserve workbook currency and price basis. Missing compatible values use the previously approved 100-tonne and USD 100/t demo estimates. Do not replace known values, ranges, or incompatible units with defaults.
- The user approved **EUR 100/t, labelled as a demo estimate**, for European records with missing workbook price/currency on 21 October 2026. Existing supplied currencies and amounts take priority; no currency conversion is implied.

| Module | Owns |
| --- | --- |
| Internal market registry and existing drafts | Original statements, ownership, source citations, field review, commercial status |
| Presentation publishing | Source reconciliation, preview, approval, geography, immutable revisions, public memberships |
| Public demo catalogue | Exact allowlisted playlist projection and withdrawal checks |
| Presentation frontend | Filters, profiles, illustrations, list/map synchronization, labels and pending states |
| Existing marketplace | Supplier SDS, listing approval, orders, payments, and fulfilment |

An import preview binds source hashes, existing row versions, proposed values, location decisions, and membership changes. Commit exactly the reviewed digest in a transaction. Retries return the existing receipt, while stale previews and conflicting retries fail. Source edits create a new review diff rather than silently rewriting public content. Archiving or disabling a source withdraws its presentation. Archiving a public playlist or removing public membership withdraws entries from that playlist without deleting the source.

### Alternatives considered

Two independent read-only design passes compared snapshot expansion with a reviewed read-time projection. The latter builds each public record from live private sources and checks its public-field hash against an approved hash. It reduces stored display copies, but adds runtime joins and can make presentation entries disappear after ordinary source edits.

Choose snapshots for predictable presentations and an explicit publication history. Reuse the alternative's strict field allowlist and source-withdrawal checks. Do not turn demo drafts into commercial listings or create customer accounts solely to make their map pins work.

## Delivery sequence and owners

| Priority | Work | Owner | Completion evidence |
| --- | --- | --- | --- |
| 1 | Reconcile all 11 FUEL companies, 29 existing examples, equivalents, and supporting network rows | Rob with Ana | Every source row has a mapped destination or an explicit context/pending reason |
| 1 | Confirm missing FUEL company display ZIPs/addresses, especially BB&M, Cavendish, Zentech's LSU destination, and NovaSpark | Ana and Bea | Sourced location and purpose, or visible pending state |
| 1 | Add reviewed playlist/geography/value contracts and FUEL cards/map | Rob, Orca backend/frontend pair | API, SQL, desktop/mobile, and live dev acceptance |
| 2 | Reconcile the 160 ALL baseline records with FUEL and the four company workbooks | Rob with Ana | Deduplicated preview preserving all source references and contextual distinctions |
| 2 | Resolve Huber, review Dow's sourced correction, and confirm European fallback currency | Ana and Bea | Reviewed data decisions before affected public values/pins |
| 2 | Publish the reviewed ALL presentation projection and map | Rob | Anonymous and signed-in demo acceptance with identical approved data |
| 3 | Reconcile every illustration and reference association against the expanded materials | Rob with Ana | No incorrect material substitutions. Graphene hold retained until confirmed |
| Final | Run the presentation script and approve source facts | Ana, Kate, and Bea | FUEL and ALL company/material/map checks on live dev |

Implementation uses the existing Orca workflow: Codex owns backend with GPT 6.1 Sol, medium reasoning and Standard service, while Claude owns frontend. Independent review and combined checks precede integration. Preserve completed fixes, source drafts, existing accounts, commercial stock, orders, reference documents, and private evidence. No database reset is required.

## Acceptance criteria

- FUEL opens first and shows all 11 profiles, with the current 11 seller and 18 buyer examples preserved unless a reviewed correction explains a change.
- Encore's Captured CO2 is discoverable as a buyer need. Zentech retains its supplied 20 tonnes. Unconfirmed hydrogen/fuel needs retain their qualification.
- ALL retains coverage of all 160 baseline rows. Every additional or consolidated source row has an explained disposition. No duplicate cards arise from reuploading identical files.
- Company, material, role, and playlist filters update both cards and markers. Overlapping pins, map popups, browser Back, and mobile layouts work.
- Full-address, postal-only, missing-country, conflicting-address, leading-zero, and unresolved-location cases have explicit results. No guessed pickup location is created.
- Source prices, zero values, gate fees, annual periods, ranges, and units survive unchanged. Estimated fields remain labelled separately.
- Approved illustrations load. Seller photos retain priority. Graphite is not substituted for graphene. Missing images show a clear neutral fallback.
- Anonymous and other-company requests expose only approved demo fields. Internal research PDFs and private drafts remain protected.
- Demo entries offer no cart, quote, purchase, payment, or edit action. Existing commercial listing and SDS rules continue to pass.
- Repeat import, failed commit/retry, concurrent stale preview, source withdrawal, playlist archival, membership removal, and unrelated-data preservation checks pass on the backend and SQL. The legacy 29-item presentation endpoint retains its approved behavior during migration.
- Run local FE/BE checks, independent review, then live development browser retests. Report source, SQL, browser, and provider evidence separately.

## Evidence and limits

### Implementation intake update

The current reviewed-input candidates retain all 29 FUEL examples and all 11 main profiles. The supporting tabs contribute 101 potential relationships, with related companies separated from main-company material examples. ALL currently combines 407 existing research records with 26 additional FUEL examples; three exact company/role/material duplicates are consolidated while retaining both source references and FUEL qualifications. Its 433 material examples do not create accounts or commercial stock.

The source upload hashes were rechecked unchanged. Geography is currently resolved offline against downloaded GeoNames country postal datasets under CC BY 4.0. Every point is labelled as an approximate postal area; none is a verified street, facility, or pickup geocode. The current candidates map 14 FUEL examples and 258 ALL examples, leaving 15 and 175 respectively pending. Huber's conflicting location remains pending. Postal lookup source hashes and derivations are retained privately.

An optional address-only US Census geocoding upload awaits direct approval after automatic approval review rejected external transfer of workbook locations. No workbook addresses have been sent to Census. This does not block source review or the postal-area implementation. These candidate counts are intake checks, not deployed acceptance evidence.

The original research pass changed no application source, workbooks, database business records, provider settings, or deployed services. It created this plan and private audit files. Routine admin login/logout supported read-only API checks. Implementation changes are being prepared separately in supervised Orca worktrees; they have not yet been integrated or released.

Private audit evidence is in `.local/verification/2026-10-21-playlist-map-audit/`: `upload-inventory.json`, `location-summary.json`, `live-readonly.json`, `reconciliation.json`, and `pdf-text-audit.json`. The source inventory retains worksheet cell references and archive member hashes. A full row-by-row geocode and worldwide address validation remain implementation/intake tasks. Populated address cells must not be described as verified facilities.

Two read-only design passes compared the approaches, and an independent intake review checked this plan against the source and live reconciliation. Primary source research above verifies selected exceptions and postal limitations. It does not establish that every named business currently buys or sells the supplied materials.
