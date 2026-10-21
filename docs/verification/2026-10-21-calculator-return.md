# Calculator return to feedstock

## Request and reproduction

Ana requested a clear Back button on the savings screen that returns to the feedstock being considered. On the development web site, Browse → Tar (`/browse/19`) → Estimate savings opened step 4. The existing footer Back moved to step 3; only the header X returned to the listing.

## Change

- A named **Back to Tar** (or the original listing title) control is present throughout the calculator, including the loading/error header.
- Opening from a detail page closes the overlay without navigating, retaining the selected purchase quantity.
- Opening from a Browse card links to that card's listing detail in the same public/buyer portal. Changing comparison scenarios does not change the original destination.
- Wizard navigation is explicitly labelled **Previous step**. Close, Escape and Done remain available. Standalone seller calculation has no fabricated listing destination.
- Destinations are constructed from an encoded listing ID and a closed set of portal contexts. No external return URL or browser history is used.

Calculations, backend behavior, database records, document requirements and presentation privacy/public-gallery controls are unchanged.

## Review and verification

The supervised Orca frontend worker used Claude Opus 5.5, medium reasoning. Codex independently reviewed the exact six-file frontend diff; Claude reviewed the coordinator's isolated verification tooling. Permission-mode drift was paused and restored to Manual. The source-only build starts at `c9ad8bf74383242d111c72dc9d534c0151f324b2`; private source hashes, logs and browser evidence are under `.local/verification/2026-10-21-calculator-return/` and are excluded from deployment.

Current checks: workspace types, lint and all 169 backend tests pass. The development backend health check confirms its SQL connection. React Doctor 0.9.18 reports zero new diagnostics against the exact baseline across the six changed files. Its full repository scan reports three errors in unchanged map files and existing warnings; those are outside this change.

The worker submitted `worker_done` for `task_2f6fb6d72d04` / `ctx_7a3337544206`. Release accounting retains its terminal as user-owned (`user_takeover`, no process action). No reclaimable workers remain. The isolated worktree and its source are preserved.

Build and live browser results are pending.
