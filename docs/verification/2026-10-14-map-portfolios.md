# Map, savings and demo portfolio verification — 14 October 2026

The corrections from `Feedback 10-8-2026.pptx` are implemented and verified on the live development web and admin sites. The user approved internal research groups plus signed-in demo listing selection. Existing application fixes and business data are preserved.

- [Development marketplace](https://eco-globe-dev-web.vercel.app/buyer/browse)
- [Development admin portfolios](https://eco-globe-dev-admin.vercel.app/admin/market-portfolios)
- Deployed application source: `73f96b2f8b7a6a158aa61781d5f1e55b338604f3`. Subsequent report changes do not change application source.

## Corrections

**Map location.** Browse prefers browser location, then approximate IP/network location, then a saved company facility. Initial location is preserved when listings arrive. Recenter and Show all work with selection/radius; manual pan/zoom is preserved until a new selection/radius or explicit camera action. Seller detail maps remain facility-centered.

The dynamic same-origin `/api/viewer-location` route validates Vercel request geolocation headers, rounds coordinates to two decimals, returns `private, no-store`, and neither reads nor persists the raw IP. Missing data returns null. The live test network resolved to Prosper, Texas; the map visibly centered there. No Houston coordinates were hardcoded. IP location is approximate and may reflect an ISP, mobile network or VPN. Bea still needs to check the result on her Houston network. See [Vercel request headers](https://vercel.com/docs/headers/request-headers).

**Savings placement.** Estimate savings is beside subtotal, above Buy Now/Add to Cart. Carbon Analytics precedes Independent analysis and Overview. The real calculator opens at the savings/value-recovery step with the current quantity and recorded unit/currency. No savings figures were invented. Existing sign-in, sample and seller SDS gates remain.

**Admin portfolios and demo selection.** Both admin deployments support portfolio list/create/edit, real-data lookups, separate research and published-listing membership, company assignment, reason/actor history, reversible archive, repair while archived, and restore. Expected rowversions reject stale changes. Adding research membership refreshes its labels after saving without a page reload.

Assigned buyer companies can select a Demo portfolio in Browse. The URL retains the selection. The server intersects it with already-visible published listings and denies anonymous, unrelated-company and archived access. Invalid or denied links never fall back to the full catalogue. Groups grant no additional access. Estimates, prospects, internal descriptions, research records and reference PDFs remain admin-only; no research row becomes a marketplace listing.

## Verification

| Layer | Result |
| --- | --- |
| Runtime isolation | 22 passed |
| SQL ownership regressions | 12 passed |
| Backend suite | 120 passed |
| Combined web suite | 207 passed, including 3 location-route tests and 41 new frontend behavioral tests |
| Types | Workspace and explicit new-test type checks passed |
| Lint | No errors; 38 existing warnings |
| Builds | Final combined backend, web and admin builds passed; both hosted Vercel builds and Azure image build passed |
| React Doctor | Exact-base scan included 34 changed source files; no errors, 8 warnings concerning complexity, client-loaded date formatting, shared exports and bounded array lookups |
| Owned local SQL/HTTP | 27 HTTP assertions plus direct concurrency, audit, rowversion, revocation and protected-table fingerprint assertions passed |
| Live development API | 41 authenticated assertions passed; separate final preservation/cleanup check passed |

Local checks used prepared isolated runtimes with providers disabled. Real SQL used only a worktree-owned synthetic database, without reset. Driver tests establish audit-failure rollback control flow separately from real SQL evidence. Company-switch clearing is covered by functional tests; company/member restrictions are covered by SQL and live API checks, rather than a claimed multi-company browser test.

The first private test-type configuration lacked Node type resolution; correcting it to the worktree's existing definitions passed without source changes. An early read-only deployment probe reached the previous Azure revision and returned 404 before readiness; no QA write occurred. The acceptance run was repeated only after the expected immutable image was the latest ready revision.

## Live browser acceptance

Tests used the actual in-app browser and existing development users.

| Story | Observed result |
| --- | --- |
| Buyer/public map | Viewer marker and camera centered at the detected network location, replacing the reproduced Atlantic/world view |
| Camera controls | Show all and repeated Recenter worked; selection plus 500-mile radius still allowed explicit recentering; a keyboard pan remained offset while filtering |
| Anonymous public page | Network-centered viewer marker remained; seller facilities and pricing remained hidden |
| Buyer savings | Purchase-card action above Buy Now; current 25-ton quantity opened at Step 4; desktop and 390px verified |
| Public detail savings | Above Add to Cart; PVC calculator preserved 12 units; real 390px page and calculator had no horizontal overflow |
| Existing SDS behavior | Rice Hull Ash purchase remained blocked for missing seller SDS; existing PVC SDS downloaded as a 100,571-byte PDF, and its purchase control remained enabled |
| Standalone admin | Required-field validation, unpublished-listing rejection, real listing/company/record search, create, edit, audit and membership display passed |
| Same-page labels | Adding research record 51 displayed its saved label without reloading |
| Archive/repair/restore | Archived group denied buyer selection; edit saved while it stayed archived; explicit restore returned the two selected listings |
| Research filter | Open in Market records returned only the portfolio's record 53, still classified as a prospect and separate from field verification |
| Buyer demo selection | Portfolio selection returned only PVC Scrap and Tar, and survived reload |
| Invalid/access checks | Blank link and unavailable group displayed zero listings; buyer admin entry redirected to access-denied dashboard selection |
| Web admin at 390px | Existing admin login worked; list/new/detail and empty-membership creation passed without horizontal overflow |
| Cleanup | Three QA portfolios retained archived with audit history; no active QA selector remained; Bianca buyer session and original 18-listing catalogue restored |

Desktop and responsive screenshots, before/after captures, HTTP results and hash manifests remain in private task evidence under `.local/verification/2026-10-14-map-feedback`. Screenshots are stored with their actual JPEG format. Incorrect early viewport targeting was excluded from responsive conclusions; the accepted narrow checks explicitly measured a 390px document. Temporary viewport override was reset.

## Data preservation

The additive migration created only `MarketPortfolios`, `MarketPortfolioRecords`, `MarketPortfolioListings` and `MarketPortfolioCompanies`. Counts before and after the transaction matched:

| Existing table | Unchanged count |
| --- | --- |
| Companies / locations / users | 41 / 40 / 42 |
| Listings / orders | 27 / 28 |
| Research records, including archived | 156 |
| Listing documents | 8 |
| Internal reference PDFs / links | 29 / 94 |

After all browser tests, complete API results matched the pre-change baseline for 27 owned listings, 27 admin-visible catalogue entries, 143 active research records, 8 listing documents and 29 references. Admin catalogue access includes existing drafts/paused entries; it is distinct from the buyer's 18 published listings.

QA portfolios 1, 2 and 3 are archived, with 5, 6 and 2 audit events respectively. No original company, listing, research classification, document, SDS, order or reference was edited. No email, shipping booking, payment, signature or commercial-production action was performed. Source-only external build copies excluded environment files, credentials, original intake files and private evidence.

## Release and review

| Target | Verified release |
| --- | --- |
| Azure dev API | `ecoglobe-backend-dev--map-portfolios-73f96b2`, healthy and latest ready |
| API image | `sha256:7d2c72a1d2cf4dacf8702a86b43362fcfbf51aa0d11c77cd555ea2c760a5e5d5` |
| Vercel dev web | `dpl_GxDSu2HCTTuADYYrVfZbWPmpPAN8` |
| Vercel dev admin | `dpl_aUbmYsTSbbSmDDuRenXg8daMCzVh` |
| Migration SHA-256 | `aabec75d8d43328286adf8d6ee850bf0781e546372f6df7a937eac45000babf0` |

Both Vercel builds were checked before promotion; their existing development aliases resolve to these exact deployments. `production` is Vercel's target name within the existing **development projects**, not commercial production activation.

[EcoGlobe's Orca pair workflow](../../.agents/skills/eco-globe-agent-pair/SKILL.md) used separate prepared worktrees and reciprocal exact-artifact review. Backend: GPT 6.1 Sol, medium, Standard with Fast disabled. Frontend: Claude Opus 5.5, medium, Manual. The documented fallback attached operator-supervised processes after the normal existing-terminal launcher refused before dispatch; Orca tracked Tasks/Dispatches while the coordinator retained process supervision.

Reviewed artifacts:

- B01, 16 files: `af8269b438a1059715d69a42e561cbdf65cfda103e854532a2a80bc506f7a05f`.
- F01, 31 files: `408eace73a331a56e4799fb4a32faadcf2f9bcca7cb50936598c9b43515f4e50`.
- F02, three-file incremental label refresh: `f168910230e714313fc95aac98f552ba2c509df2a1c05b9fa5734c677e0d6cc3`.

All final source hashes matched the owners' reviewed artifacts and committed release.

| Orca task | Outcome | Evidence |
| --- | --- | --- |
| Backend `task_dd3658d6529f` | Succeeded | B01, real SQL/HTTP evidence, F01/F02 reciprocal reviews, closeout |
| Frontend `task_c50779429ee2` | Succeeded | F01/F02, functional tests, types/lint/build, B01 reciprocal review |

Both successful dispatches were settled and released. The manual-fallback terminals were retained with `no_owned_resource`; no reclaimable worker decision remains. The standard helper stopped only the owned local SQL container with status 0, retaining its database volume, fixtures and receipts. All worktrees are preserved.

## Data still requiring owner verification

Seller facility names, pickup addresses and coordinates must come from verified business data. Authentic supplier SDSs remain needed for Biochar (17) and Premium Rice Hull Ash (22); internal research references do not satisfy this requirement. PVC Scrap (27) already has `SDS044_PSK_PVC.pdf` and does not need a replacement on the evidence checked here. These existing data requirements were not filled with estimates or fabricated values.
