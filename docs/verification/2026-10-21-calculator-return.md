# Calculator return to feedstock

## Request and reproduction

Ana requested a clear Back button on the savings screen that returns to the feedstock being considered. On the development web site, Browse → Tar (`/browse/19`) → Estimate savings opened step 4. The existing footer Back moved to step 3; only the header X returned to the listing.

## Change

- A named **Back to Tar** (or the original listing title) control is present throughout the calculator, including the loading/error header.
- Opening from a detail page closes the overlay without navigating, retaining the selected purchase quantity.
- Opening from a Browse card links to that card's listing detail in the same public/buyer portal. Changing comparison scenarios does not change the original destination.
- Wizard navigation is explicitly labelled **Previous step**. Close, Escape and Done remain available. Standalone seller calculation has no fabricated listing destination.
- Destinations are constructed from an encoded listing ID and a closed set of portal contexts. No external return URL or browser history is used.

Calculation logic, backend code, listing and account data, document requirements, and presentation visibility rules are unchanged. No database migration or direct data edit was needed.

## Review and verification

The supervised Orca frontend worker used Claude Opus 5.5, medium reasoning. Codex independently reviewed the exact six-file frontend diff; Claude reviewed the coordinator's isolated verification tooling. Permission-mode drift was paused and restored to Manual. The source-only build starts at `c9ad8bf74383242d111c72dc9d534c0151f324b2`; private source hashes, logs and browser evidence are under `.local/verification/2026-10-21-calculator-return/` and are excluded from deployment.

Workspace types, lint, all 169 backend tests, five focused navigation tests, 22 runtime isolation checks, and backend, web and admin builds pass. The development backend health check confirms its SQL connection. React Doctor 0.9.18 reports zero new diagnostics against the exact baseline across the six changed files. Its full repository scan reports three errors in unchanged map files and existing warnings; those are outside this change.

The worker submitted `worker_done` for `task_2f6fb6d72d04` / `ctx_7a3337544206`. Release accounting retains its terminal as user-owned (`user_takeover`, no process action). No reclaimable workers remain. The isolated worktree and its source are preserved.

## Development release

Application commit: `e8a38361baa3294bd18d09ae379c2f68f55f038b`.

The existing `eco-globe-dev-web` Vercel project built the exact reviewed source and promoted deployment `dpl_J6gUq11dx9t1Z3VzRN8T5vkixcnk` to <https://eco-globe-dev-web.vercel.app>. The release excludes intake files, private evidence and credentials. Local checks used Node 22.20.0. The existing Vercel project used Node 24.x. No backend revision or admin frontend was deployed.

The local web build recovered from a transient network timeout and passed without a source change. Automatic browser approval blocked the protected deployment URL when it redirected to Vercel account pages. Live browser verification used the approved dev domain after promotion.

## Live browser results

All 11 recorded stories pass:

1. Tar savings uses the selected 20 tons and a $550 baseline to calculate $6,500 savings. Previous step works, Back to Tar returns to `/browse/19` with quantity 20 retained, and the missing-SDS purchase block remains.
2. Adding a Biochar comparison keeps Tar as the return destination.
3. Buyer Biochar savings returns to `/buyer/browse/17`.
4. Public Browse's Tar Footprint entry returns to `/browse/19`.
5. At 390 × 844, Back to Tar, Close, Previous step and Next fit the viewport. Back returns to Tar.
6. Buyer Browse's Tar calculator entry returns to `/buyer/browse/19`.
7. A long UCO listing name fits the mobile header and retains its full accessible label.
8. Signed-out Tar retains the calculator and pricing sign-in requirement.
9. The signed-out presentation gallery retains all 29 examples, including Encore's Captured CO2.
10. Escape closes the calculator.
11. The header X closes the calculator.

The original Encore buyer session and default viewport were restored. No purchases, shipping, signatures, emails, listing publication or account provisioning were performed. Seller editing and the standalone seller calculator were reviewed in source; they were not exercised in this live buyer-focused retest.

Private evidence: `browser-stories.json`, `live-desktop.png`, `live-mobile.png`, `checks.json`, `build-source.json`, `review-verdict.json`, deployment and promotion receipts under `.local/verification/2026-10-21-calculator-return/`.

The unrelated untracked admin Word guide remains preserved.
