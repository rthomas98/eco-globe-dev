# Browse search radius repair — 2026-10-23

## Reproduced failure

Kate’s [Loom recording](https://www.loom.com/share/03f775e861244741b2583de53e844d97) shows **Clear all**, followed by a search for **Sugar**, restoring a 100-mile radius. The radius hides matching feedstocks outside the viewer’s area.

Chrome reproduced the reset on development revision `a5ec54f9c55f773c7dae6757d5977e1da842b09f`, both anonymously and as the authorized development buyer. The signed-in reproduction returned **No matches found**, with one marketplace match and five mapped demo matches outside the restored radius.

## Reviewed change

Application commit: `6718eac0a60554e14838d0d5fd0cd42f309c78a6`.

Only `apps/web/src/components/public/browse-page.tsx` changed:

- A missing `distance` now seeds the search form with `Any`, matching the map’s Off state.
- The location summary displays a distance only when `radiusMiles > 0`.

Explicit distances still pass through unchanged. SearchBar behavior, query matching, buyer Browse, APIs, database records, provider settings, and presentation-only purchase restrictions are unchanged.

The actual browser regression failed before the fix and passed on the fixed local build. No component test harness exists, so no synthetic helper or source-text test was added. The replay is retained privately as `.local/verification/2026-10-23-search/browser-regression.js` and runs through `cua_repl`.

## Objective checks

| Check | Result |
| --- | --- |
| Web library tests | 356 passed |
| Backend tests | 175 passed |
| Runtime isolation tests | 22 passed |
| Web and backend TypeScript | Passed |
| Web test TypeScript | Passed |
| Changed-file ESLint | Passed |
| Web and admin production builds | Passed |
| React Doctor changed-file scan | 0 errors; 3 existing warnings |
| Source-only build comparison | 999 non-environment files matched |

React Doctor warnings concern existing component size, complexity, and an unchanged array lookup. Build warnings concerning existing image elements remain.

## Chrome checks on the fixed local build

| Scenario | Result |
| --- | --- |
| Clear all, then search Sugar | Off retained; Sugar Bagasse returned |
| Search with explicit 100 mi | 100 mi retained |
| Choose Pyrolysis recommendation with Any | Off retained; Pyrolysis Pitch returned |
| FUEL/LSU, Encore CO2, Buyer needs, CO2 | Filters retained; Captured CO2 returned |

Local port `20192` used the development API, with no database or provider mutations. The owned local server was stopped after verification.

## Orca review

Run `run_e5bcaeb08ebd`, task `task_005b5595ecce`, dispatch `ctx_526a4b15b26c`. Claude `claude-opus-5-5`, medium, implemented the frontend change in an isolated worktree. Root Codex independently reviewed the exact diff and frozen file SHA-256 `3ff13f458cd8a21f8fc8b2613df02c36ae953815e7afe28a1de60c3618958c6f`.

Manual mode was restored after a permission-mode drift was observed. The settled worker was retained by Orca as `user_takeover`; its worktree and unsent user draft were preserved. No settled workers remain reclaimable. Untracked `docs/guides/` was excluded.

## Development release

Status: READY and promoted to https://eco-globe-dev-web.vercel.app.

- Deployment: `dpl_6P4nQY4pgWicM1AdiffM3o4MjsdE`.
- Project: `prj_ninBqYOGFifSR7g0MbZVER5UiC39` (`eco-globe-dev-web`).
- Team: `team_ojscz7JFEXHeavrrsh9QJ5Jl`.
- Source context SHA-256: `51a4fd36e2730219102f0a8e81038a9f117b767879bfddb62c6ae4271eb80db0`.
- Protected staged HTTP checks passed for Browse, the FUEL gallery, and the ALL gallery before promotion.

Chrome checks passed on the live development site after promotion:

| Scenario | Result |
| --- | --- |
| Clear all, then search Sugar | Off retained; one marketplace result and six ALL demo results |
| Explicit 100 mi, then search Sugar | 100 mi retained; intended geographic filtering remains active |
| FUEL/LSU, Encore CO2, Buyer needs, CO2 | Captured CO2 returned; all selected filters retained |
| Signed-in Bianca buyer search for Sugar | Matching feedstock returned; Any distance retained |
| Pyrolysis recommendation with Any | Pyrolysis Pitch returned; radius stayed Off |
| Show all listings on the Sugar map | Marketplace and demo markers visible; radius stayed Off |

The final Chrome tab remains signed in as the authorized development buyer. Private screenshots and browser outcomes are in `.local/verification/2026-10-23-search/`.

Only the existing development web project is in scope. The backend and admin service are not redeployed.
