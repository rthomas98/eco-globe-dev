# Map, savings and demo portfolio verification — 14 October 2026

## Scope and status

This release addresses the four slides in `Feedback 10-8-2026.pptx`. The user explicitly chose internal research groups plus signed-in demo listing selection. Source verification passes; development deployment and live browser acceptance are pending at this checkpoint.

Existing marketplace, admin import, reference library, logistics, payment and signature fixes are preserved. Research estimates/prospects remain internal. Portfolio membership does not publish research records or grant access to listings.

## Changes

- Browse maps prefer browser location, then approximate network location, then a saved company facility. Initial location no longer gets replaced by a worldwide fit when catalogue data loads. Recenter and Show all remain explicit choices; manual pan/zoom and selected listing/radius behavior are preserved. Seller detail maps stay centered on the seller.
- The same-origin dynamic `/api/viewer-location` route uses Vercel's request geolocation headers only on Vercel, validates geographic ranges, rounds to two decimals, returns private/no-store responses and stores no IP address. Missing data returns null. Network location is approximate and may reflect a VPN, ISP or mobile network; no Houston coordinates are fabricated. See [Vercel request headers](https://vercel.com/docs/headers/request-headers).
- Estimate savings sits beside subtotal, above Buy Now/Add to Cart. Carbon Analytics precedes Independent analysis/Overview. The real calculator retains current quantity and opens its value-recovery step. Existing sign-in and supplier SDS gates remain.
- Admin Market records links to Portfolios on both admin deployments. Admins can create/edit internal groups, select existing research records separately from published demo listings, assign companies, inspect reason/actor history, archive, repair while archived, and restore. Updates require an expected rowversion; stale writes return409. Names and IDs come from existing data.
- Assigned buyer companies can select a Demo portfolio in Browse. The URL persists the selection. The server intersects its listings with the existing published catalogue. Anonymous, unassigned and archived selections are denied. Invalid links show no catalogue fallback. Company/portfolio switches hide old results immediately. Member summaries expose only IDs/names; internal records/descriptions/reference PDFs stay admin-only.

## Reviewed source

Base: `43a5a7668885be95f16b712a04e60ec35a4c172b`.

Orca Run `run_fb8db0f4bd24`: backend Codex GPT6.1Sol, medium, Standard with Fast disabled; frontend Claude Opus5.5, medium, Manual. The documented fallback attached operator-supervised processes after the regular existing-terminal launcher refused before dispatch. Orca tracks Tasks/Dispatches; coordinator retained process supervision. Separate prepared worktrees and reciprocal exact-artifact review were used.

- B01:16files; patch SHA256 `af8269b438a1059715d69a42e561cbdf65cfda103e854532a2a80bc506f7a05f`. Frontend and coordinator found no remaining blocker.
- F01:31files; patch SHA256 `408eace73a331a56e4799fb4a32faadcf2f9bcca7cb50936598c9b43515f4e50`. Backend independently passed41 focused tests and found no blocker. All source/artifact hashes match. F02 closes the record-label refresh observation after same-page saves: three files; patch SHA256 `f168910230e714313fc95aac98f552ba2c509df2a1c05b9fa5734c677e0d6cc3`, accepted by backend and coordinator.

Only reviewed application files are integrated. New source-text mirror tests and borrowed type copies were excluded from the frontend patch.

## Verification completed before deployment

| Check | Result |
| --- | --- |
| Runtime isolation |22 passed|
| SQL ownership regressions |12 passed|
| Combined backend suite |120 passed|
| Combined web suite |207 passed, including3 request-location tests and41 new frontend behavioral tests|
| Workspace types and explicit new-test types |Passed|
| Workspace lint |No errors;38 pre-existing warnings|
| Combined backend/web/admin builds |Passed in sanitized prepared integration runtime|
| React Doctor, staged47files, exact base |34files scanned; no errors,8 warnings (complexity, client-loaded date formatting, shared exports, bounded array lookups)|
| Real isolated SQL/HTTP |27HTTP assertions plus rowversion concurrency, audit and protected-table fingerprints passed|

Real SQL used only an owned local synthetic database with providers disabled. It verified assignment revocation, publication changes, stale/concurrent writes, rollback, archive/restore and empty membership. No database reset occurred. Driver tests establish audit-failure control flow separately from real SQL evidence.

Before fixing, the live buyer map showed a worldwide Atlantic-centered view; the purchase-card Estimate savings control was below Buy Now. Before-release API probe returned404 for the new portfolio endpoint before any QA writes. Actual before screenshots are retained in private task evidence.

Current protected baseline:27 admin-owned listings,27 admin-visible catalogue records (including existing drafts/paused),143 active research records,8 listing documents,29 internal reference PDFs. Buyer catalogue currently has18 published listings. These categories are intentionally distinct.

## Remaining release gates

Deploy the additive schema and API plus both development frontends, run authenticated live API preservation/access tests, and exercise actual browser stories at desktop and390px. Do not interpret local tests or this checkpoint as hosted/production certification. Final deployment IDs, live evidence and remaining data requirements will be recorded after acceptance.
