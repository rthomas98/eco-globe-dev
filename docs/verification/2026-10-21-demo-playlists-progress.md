# FUEL and ALL playlists: development release verification

FUEL and ALL are deployed and verified on the development site. FUEL was published and accepted live before ALL was published. Combined code checks, real SQL tests, anonymous frontend/API checks and signed-in desktop/390px browser stories passed. This is a presentation release, not approval of the underlying research or commercial stock. No production service was changed.

Code release: `bc3c2cdcbf12a234e84ab5dee460fc430cd39594`, pushed to `codex/deploy-ecoglobe-backend`.

## Delivered source

The public gallery has FUEL and ALL selectors, company and buyer/seller filters, Unicode-aware search, illustrations, company profiles, synchronized cards and clustered map pins. Potential buyers, providers, synergies and similar generators are separate optional network context, disabled by default. Popups show the same values, source status, estimate basis and location precision as cards. There are no commercial purchase, quote or edit actions in presentations.

The backend adds strict GET-only public playlist endpoints and additive presentation tables. Private publication uses reviewed previews, source/target versions, actor-bound commits and idempotency. Withdrawal checks remain active on reads. The legacy 29 presentations and ordinary marketplace APIs are preserved. No reset, customer-account import or commercial listing publication is part of this release.

## Reviewed data

| Playlist | Main company profiles | Material examples | Mapped | Pending | Potential relationships |
| --- | ---: | ---: | ---: | ---: | ---: |
| FUEL/LSU | 11 | 29 | 14 | 15 | 101 |
| ALL | 240 | 432 | 257 | 175 | 142 |

FUEL has 11 seller examples and 18 buyer needs. Four service/technology companies retain profiles with no material examples and pending locations. ALL combines 406 existing research rows and 26 additional FUEL examples. A further research row saying “No UCO purchases verified” remains private context, so all 407 scoped research records have a disposition. Three exact duplicate examples retain both source references.

Workbook values win over defaults. Zero prices, signed gate fees, source ranges, annual periods, units and Zentech’s supplied 20 tonnes are preserved. Missing compatible values use explicitly labelled demo estimates; 18 European missing prices use the approved EUR100/t estimate. PDC-bottoms disposal-cost context remains price pending. No authentic seller SDS is invented; the 29 reference PDFs remain internal. Existing approved illustrations are reused, with the graphene hold preserved.

All eight uploaded file hashes match the source audit. The user approved the address-only Census upload. Of 154 distinct US business-address inputs, 103 matched, 49 did not and two tied. Review accepted 76 exact matches with unchanged ZIPs and independent postal-area consistency. These are interpolated address-range points, not confirmed facilities or pickup sites. Other locations remain postal approximations or pending. Public US/GB/NL postal metadata is reduced to the area actually geocoded; raw source codes remain private. Every FUEL material pin identifies its company display-location basis. Research material points use their own source record’s address, not another company’s location.

Final private plan SHA256 values: FUEL `a15dd70bd1c500c6a003458060ebc831bafb856e03f7acb738b53435c6c84ffc`; ALL `d1dfd8a50f20b25464aabd6ec168fc2c614724b63571f9851864392526d935b0`. Missing/conflicting locations, including Huber’s conflicting facility, remain pending.

## Verification evidence

- Reciprocal Orca source reviews accepted the final 14 backend and 10 frontend files. Codex used GPT6.1Sol, medium, Standard with Fast explicitly disabled. Claude’s recurring Auto-mode drift was paused and restored to Manual; final settlement required no further source edits. The documented frontend dispatch fallback retained coordinator process supervision and preserved its worktree.
- Combined source-only external checks passed: 22 runtime isolation tests, 12 mocked SQL ownership tests, 175 backend tests, backend types/build, web types, root lint (zero errors, 38 existing warnings), 33 focused frontend tests, web build and admin build. Backend tests ran serially after a cold external-volume run exceeded the existing workbook-parser deadline; that deadline was retained. A mocked Unix-socket test passed after using a shorter temporary path. No product behavior was weakened for either environment issue.
- Actual dedicated local SQL passed publication/read at 432 materials and 292 profiles, concurrent identical retries, actual stale409 races, cross-playlist locks, source/target version binding, withdrawal to zero, immutable values after source edits, reconnect persistence and unrelated-source preservation. SQL testing found and fixed binary row-version conversion and empty FOR JSON handling. This is emulated development SQL evidence.
- Root published both reviewed public payloads into marker-verified local SQL using retained synthetic sources. Actual local API reads match both final plans exactly, refuse query/write/source-detail paths and keep private admin research unauthorized. Real local browser stories passed for company profiles, CO2 search, map popups, source values, estimates and mobile map/list return. Earlier stub evidence is kept separate.
- Cached React Doctor0.9.18 scanned all 10 changed frontend files with telemetry, score and supply-chain network checks disabled. Raw exit1 and diagnostics are retained: two cleanup reports were adjudicated against actual ownership/MapLibre cleanup, one string-includes performance report is not an array lookup, and four Fast Refresh export warnings are maintainability advisories. No clean React Doctor score is claimed.

## Development deployment and live acceptance

The private publisher required a real commit, exact source/runtime/dependency/plan/script hashes, preserved dependency resolution, successful checks, a fresh admin session and the exact development SQL identity. It bound 24 implementation files, 444 compiled runtime files and 7,030 dependency files across the resolved SQL dependency closure. Non-database preflight completed before the additive migration. Each publication repeated the same commit input to verify idempotency.

| Development service | Verified release |
| --- | --- |
| Web | `dpl_CHUqHdzYFXHa9BYr3y74D61yi3Ms`, ready and serving `eco-globe-dev-web.vercel.app` |
| Admin | `dpl_8hty89LmugM5iiMqV9kXHtvB3Zow`, ready and serving `eco-globe-dev-admin.vercel.app` |
| API | `ecoglobe-backend-dev--playlist-bc3c2cd`, active, healthy, provisioned, receiving 100% traffic |
| Backend image | ACR run `ca1f`, pinned digest `sha256:e695d816c613e8e99a94e99dd704fdc6c16015301e2666f8c20078ae08950dcb` |

The API environment and scaling match the prior revision. Both Vercel deployments carry the reviewed commit and source-context digest; authenticated provider reads confirmed their exact project/team identities and live alias targets. Database health reports connected.

FUEL revision 1 was published at `2026-10-21T20:02:00.786Z`. Live acceptance verified its 29 examples, Encore's CO2 buyer need, matching popup values/source/location labels, and desktop/390px navigation. ALL revision 1 was published afterward at `2026-10-21T20:10:28.829Z`.

Live ALL checks verified 432 rendered material cards, 257 mapped and 175 pending; potential network disabled by default; company filters and browser Back; buyer-only mobile filtering (271 examples); and 390px Map/List controls without horizontal overflow. BASF's EUR100/t demo estimate, 124,000 t/year source volume and approximate postal label agree between card and popup. Petromax retains USD0/gal and 390,000 gal/year. Westlake retains its seller-paid USD50/t gate fee and 85,000 t/year. Huber's conflicting address stays under review without a map action. No commercial purchase/edit actions appeared. Browser error/warning logs were empty.

Fresh anonymous HTTP reads returned the public gallery and both frontend proxy payloads successfully; the payloads equal the approved plans exactly. Signed-in browser checks used the existing Encore session. These are separate evidence types: no separate signed-out browser session is claimed. Private admin research remains unauthorized to anonymous API callers, and unsupported public query/write/source-detail paths remain refused. The admin login page also returned 200.

All 21 existing business/source tables matched before FUEL and after ALL, including accounts, passwords, companies, private drafts, commercial listings, orders, payments, samples, research records, references and portfolios. `CompanyLocations` was absent before and after. The legacy 29-item presentation API exactly matches the baseline JSON. The signed-in marketplace still displays 18 listings, the demo-gallery link remains available, and the removed private Browse panel remains absent. Calculator return-control source was untouched; that older workflow was not re-executed in this release.

The user approved temporarily setting Orca Keep computer awake from Agent to On for this run. The Mac locked again before restoration; the coordinator requested a manual unlock to restore Agent. Restoration remains pending until that UI change is observed. Password and lock settings remain unchanged.

## Remaining data verification

Ana and the team still need to confirm missing or conflicting country/postal/facility data for the pending pins, actual facility purpose and approved pickup addresses, source prices/volumes/periods, proposed customer relationships, material equivalents and the held graphene illustration. The four service/technology profiles need material information only if the team actually intends them to have feedstock examples. Authentic seller SDS files and normal commercial approval remain required before anything becomes purchasable; research references and demonstration values do not satisfy those requirements.

## Resource and evidence handling

The approved cache-only wrapper finished at2026-10-21T18:57:44.646Z: free bytes before1,688,317,952; after1,924,595,712; removed0; evaluated skip-active actions0. Concurrent disk activity explains the free-space change; no cleanup gain is claimed. Report: `/Users/robthomas/Development/.workspace-tools/last-space-report.json`. No Docker pruning or deep cleanup ran.

Full builds and release artifacts use approved source-only external folders. Intakes, PDFs, private evidence and credentials stay in their existing internal locations. All eight original upload hashes were rechecked at closeout and remain unchanged. The user-owned untracked admin guide is excluded from commits and release artifacts.

Both Orca workers settled; release checks report no reclaimable worker terminals. The CLI retained their external/fallback terminals without closing user-controlled resources. Worktrees and SQL fixtures remain preserved. Root stopped its owned local API and web processes. Local Docker did not answer the SQL stop/status calls or a subsequent bounded state read, so a clean local SQL shutdown is **not certified** and the container state is unknown. No reset, deletion, pruning or Docker restart was attempted. This local teardown limitation is separate from the healthy Azure development database and completed live acceptance.

Private receipts are in `.local/verification/2026-10-21-demo-playlists/`, including `final-acceptance.json`, `final-http.json`, `final-aliases.json`, both publication receipts, protected-table hashes, source/dependency manifests and browser screenshots. Original audit evidence remains in the adjacent `2026-10-21-playlist-map-audit` folder.
