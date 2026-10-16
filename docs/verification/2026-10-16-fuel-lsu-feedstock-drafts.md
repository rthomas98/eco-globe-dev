# FUEL/LSU feedstock draft verification — 2026-10-16

Status: the workbook-backed presentation drafts are available and verified on the development site. All 29 records remain drafts.

## Inventory

The source is `FUEL-LSU play list.xlsx`, limited to the 11 approved main companies. Workbook SHA-256: `40fdd42ef2760d7b9d3bdba676cf8e192a5a85143d367dc424fd3cd9958d3bd0`.

| Demo company | Seller drafts | Private buyer drafts |
| --- | ---: | ---: |
| BB&M Materials (Louisiana Tech) | 2 | 5 |
| Encore CO2 | 3 | 1 |
| Cavendish Energy LLC | 3 | 3 |
| Renovigo Chemicals | 2 | 3 |
| Waste to Energy Systems, LLC | 1 | 4 |
| Zentech | 0 | 1 |
| NovaSpark | 0 | 1 unconfirmed fuel requirement |
| ApplicaRAD | 0 | 0 |
| CodeGig | 0 | 0 |
| Westfield | 0 | 0 |
| Eray | 0 | 0 |
| **Total** | **11** | **18** |

The only supplied quantity is Zentech’s 20 metric tonnes of sugarcane bagasse ash. Other quantities and all prices, currencies, requested dates and approved facilities are unset. No SDS, certification or carbon-intensity values were invented. Existing headquarters addresses were not assigned as pickup facilities.

Each draft retains its workbook cell, statement, qualification and source key. Alternatives remain notes. NovaSpark’s fuel possibilities, Renovigo’s hydrogen need and Cavendish’s product forms remain unconfirmed.

## Application behavior

- Seller drafts support an unset facility, unit and currency. Submission retains the existing facility, supply-data and SDS requirements.
- Buyer requests support private drafts, a Draft filter, saved source notes and a resume route. Draft publication validates required fields.
- Discovery, quote responses and direct access enforce draft privacy. Cross-company reads return not found.
- NovaSpark retains its existing viewer permissions. The list hides write actions, the direct editor refuses write access and the API rejects publication.
- Seller details display recorded currency, state and composition. Missing values no longer appear as USD, Solid or a guessed composition.

## Verification results

| Check | Observed result |
| --- | --- |
| Backend unit and regression tests | 137 passed |
| Focused frontend tests | 33 passed |
| Combined types, lint and backend, web and admin builds | Passed; existing lint warnings remain |
| Final seller display types, lint and web build | Passed |
| React Doctor | No errors in the initial 16 changed files or the final single-file correction; advisory warnings remain |
| Development migration | Applied twice safely; both installed draft constraints exercised |
| Migration rehearsal | Verified in a transaction, then rolled back before the durable migration |
| Import | Two real records created through the live UI; remaining 27 added by the reviewed importer |
| Import replay | Zero new records; all 29 recognized, including after browser saves |
| Live API acceptance | 316 checks passed across all 11 accounts |
| Existing data | Original rows and columns across 17 tables retained their fingerprints |
| Public discovery | Same 18 listing IDs and one open buyer-request ID as the baseline |
| Live browser | Seller create, edit and save; buyer create, resume and save; incomplete submission rejection; Draft and Open filters |
| Account variants | Zentech’s 20-tonne draft, cross-company rejection and NovaSpark’s read-only list and direct editor passed |
| Responsive browser | Buyer list, buyer editor and final seller details fit 390px with document and body widths of 390px |
| Final seller browser retest | Missing currency, state and composition no longer display assumed values |

The prepared isolated local SQL smoke was not run because Docker Desktop was unavailable. Database evidence comes from the development migration rehearsal, installed constraint checks, real draft persistence, importer replay, API acceptance and preservation comparisons. This report does not claim a local SQL concurrency run or completed commercial publication.

Standard repository checks used on the source-only external build were:

```sh
pnpm type-check
pnpm lint
pnpm --filter=@eco-globe/backend test
pnpm --filter=@eco-globe/backend build
pnpm --filter=@eco-globe/web build
pnpm --filter=@eco-globe/admin build
```

The private import plan, source receipts, live API results, preservation comparisons and browser evidence are retained under `.local/verification/2026-10-16-fuel-drafts/`. Intake files, credentials and private evidence are excluded from Git and deployment archives.

## Development release

- Backend and initial client source: `7fea01bafdf45bbf56789f7be2f0c857eb424fd3`, including feature commit `173d2f4`.
- Final web source: `76a316e48cae99954d9c948f0c1c7b2d66c32fdb`.
- Backend revision: `ecoglobe-backend-dev--fuel-7fea01b`, active, healthy and provisioned.
- Backend image digest: `sha256:7f4089e0396f7d3291a9480ce339bd4d0815aa5656cd58789667af0344e2a26e`, built by ACR run `ca18`.
- Web deployment: `dpl_2AMim4D8aGLB9Rt5aVABQHbyLDhZ` at [development web](https://eco-globe-dev-web.vercel.app).
- Admin deployment: `dpl_77KvbewLCz5FeXTcp9pitqEERfgE` at [development admin](https://eco-globe-dev-admin.vercel.app).

Both client builds were staged, inspected and checked before promotion. The live aliases were verified against those deployment IDs. The backend image and provider settings were preserved during the final web-only display correction.

Orca coordinated Codex backend and Claude frontend work with reciprocal review of the frozen source. The final display patch was authored by Claude and independently accepted by the backend worker before coordinator integration. A superseded edit attempt made no file changes. Worktrees and evidence are preserved.

## Remaining data confirmation

Ana and Bea own confirmation of the actual materials, availability, quantities and units, prices and currencies, approved facility details, delivery requirements and supplier SDS documents before publication. Specific open confirmations are Cavendish’s sodium aluminate and ATH product forms, Renovigo’s hydrogen requirement and NovaSpark’s actual fuel requirement.

The [presentation guide](../FUEL_LSU_DRAFT_DEMO_GUIDE.md) describes the verified frontend routes and expected draft behavior.
