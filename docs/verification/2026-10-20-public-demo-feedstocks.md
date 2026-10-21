# Public demo feedstocks and company draft shortcuts — 20 October 2026

## Scope and authorization

The user requested clear Browse links to company buyer/seller drafts, then explicitly chose to make presentation examples visible to signed-out visitors as well as every signed-in account. This release uses a separate public presentation gallery. It does not publish source drafts as commercial stock or grant another company access to their editing screens.

Application commit: `8709f8e452208d5827ac8a31328b66f26c1f4cde` on `codex/deploy-ecoglobe-backend`.

## Result

- Public `/demo-feedstocks`, linked as **Explore demo feedstocks** from public and buyer Browse. Company and buyer/seller filters, estimate badges, and a presentation-only notice.
- Exactly 29 reviewed examples: 11 seller offers and 18 buyer needs across seven companies. All 29 prices are labelled estimates; 28 volumes are estimates. Zentech's supplied 20-ton quantity is retained without a volume-estimate badge.
- No contact details, precise locations, private notes, source citations, SDS/document links, source IDs, edit links, quote buttons or purchase actions in the public presentation response.
- Source drafts remain in their existing company screens. Signed-in Browse also has **Your company's demo drafts**, with Buyer RFQ and Seller listing shortcuts using `status=draft`.
- Role switching prefers the active eligible company. The draft shortcut verifies the raw backend company and role before updating client state; navigation is locked while switching.
- SQL-backed reviewed snapshots are separate from source records. Future private edits do not silently change public examples. Disabled snapshots and closed, published or inactive source records are excluded. Internal research/prospect records are not enrolled.

## Data preservation

Development enrollment created 29 snapshots. Repeating the same plan returned zero created and 29 unchanged. The migration was applied twice without resetting data. Hashes of all 19 existing protected business tables were identical before and after enrollment. Existing source drafts, prices, volumes, ownership, documents, orders and portfolios were preserved.

Private evidence: `.local/verification/2026-10-20-draft-shortcuts/`. The enrollment plan contains only reviewed display fields plus internal enrollment identifiers; it is not committed or included in release archives. Credentials, intake workbooks and private evidence are excluded from application release archives.

## Verification

| Check | Result |
| --- | --- |
| Combined workspace type checking | PASS |
| Combined workspace lint | PASS, existing warnings retained |
| Backend tests | PASS, 169 |
| Backend build | PASS |
| Focused frontend tests | PASS, 30 |
| Runtime isolation regressions | PASS, 22 |
| Web build | PASS |
| Admin build | PASS |
| Dedicated local SQL snapshot smoke | PASS |
| Development enrollment and identical rerun | PASS, 29 created then 29 unchanged |
| Existing 19 business table preservation | PASS |
| Deployed API public/privacy probes | PASS |
| Live development browser stories | PASS, 11 recorded stories |

The SQL smoke verifies migration idempotence, create-only enrollment, source preservation, immutable snapshots after private edits, disabled/closed/published/inactive source hiding, unknown-source refusal and persistence after reconnect. Synthetic fixtures and the owned volume are retained; the SQL container is stopped.

## Orca review and preservation

Codex backend: `gpt-6.1-sol`, medium, actual process `service_tier=default` and `features.fast_mode=false`. The initial inherited-Fast attempt stopped before product work; a replacement passed the process gate.

Claude frontend: `claude-opus-5-5`, medium. Orca repeatedly changed its permission mode. Manual was restored on detection; the user approved a scoped accept-edits fallback. Drift windows are recorded in the worker's NOTES.md. After freezing, all 30 source file hashes remained unchanged. Final reciprocal backend review used a full 618-line read in Manual; fragmented terminal pastes were not used as final review evidence.

Exact reciprocal source approvals:

- Backend patch: `bca6fb3e8d610373c34238682faf0b0ad014a5366419cf37775fe15b5e7fc73d`, accepted by Claude after the complete file read.
- Frontend patch: `6fab2c7b78a7bf7d0d2391ff2f0b252d61633623f51efcfce34882d9728f2121`, accepted by Codex against the 14-file manifest.

Both workers settled successfully. Release calls retained their terminals under Orca's external-terminal/user-takeover rules; no reclaimable worker remains. Worktrees and data are preserved. The unrelated untracked admin Word guide is preserved and excluded from this release.

## Deployment

- Backend revision: `ecoglobe-backend-dev--present-8709f8e`, ready and receiving 100% of traffic.
- Immutable backend image: `acrecoglobe7c180adf.azurecr.io/ecoglobe-backend@sha256:a36cde62ced43f6a44d2f2d0ec0cc3924351255ca5841573a894d2fb358daa61`.
- Azure image build: `ca1e`.
- Web deployment: `dpl_Fpv55nXFn3MsfdjcBoywXRs4WrBM`, READY and promoted to the existing development alias.
- Public gallery: https://eco-globe-dev-web.vercel.app/demo-feedstocks
- Azure environment and scaling configuration hashes match the previous revision. This release changes the development backend image and web application; it does not change provider credentials or deploy the separate admin frontend.

The initial update response still named the previous ready revision while the new image started. A subsequent `api-ready.json` control-plane read confirmed both latest and ready are `present-8709f8e`, the expected immutable image is running, and latest-revision traffic is 100%.

## Live acceptance

The deployed API returns the exact reviewed 29 snapshots to anonymous visitors and another company's account. POST/PATCH/PUT/DELETE are refused, private/source query parameters are refused, and direct presentation detail lookups are unavailable. Signed-out source draft access is denied; the other company receives 404 for Encore's private listing and RFQ. Every one of the 29 source draft responses matches its pre-release response. The normal catalogue remains 18 listings and two open buyer requests.

Browser stories on the development alias:

1. Signed-out Browse shows Explore demo feedstocks and hides company draft shortcuts. The gallery shows 29 cards with no card action links or buttons.
2. Seller filtering shows 11 examples; buyer filtering shows 18.
3. Encore's public buyer filter shows Captured CO2, and the filter survives reload.
4. Zentech shows Sugarcane bagasse ash at 20 t with only its price marked as an estimate.
5. At 390px, controls and the card fit with document scroll width exactly 390px. The viewport override was reset after testing.
6. Signed-in buyer Browse has both the public gallery link and Encore's own draft shortcuts. Buyer RFQ drafts opens only RFQ-8.
7. Buyer Draft survives reload; Open shows the company's empty open-request view; Draft restores RFQ-8.
8. The seller shortcut switches roles without changing company and opens only Encore's three draft listings, IDs 34–36.
9. Seller reload and browser Back from listing detail preserve `status=draft`. Closed clears the draft parameter and shows the correct empty closed view. Listing 34 still blocks submission for demo estimates and missing SDS.
10. Returning through Browse from the seller workspace opens Encore's buyer RFQ-8; no other company's private records appear.
11. Signed-in public gallery still shows all 29 examples. Zentech plus Seller offers shows the honest empty result, and Clear filters restores all examples.

A browser assertion initially ran before the Closed filter finished rendering; waiting for the expected empty-state text confirmed the correct result. No product change was needed.

Screenshots are retained privately under the evidence directory: `public-gallery-desktop.png`, `public-encore-co2.png`, `public-gallery-390.png`, `encore-browse-shortcuts.png`, `encore-private-seller-drafts.png`, and `public-demo-ready.png`.

## Operating boundary

These are approved presentation snapshots, not executable offers or open RFQs. Normal marketplace publication, SDS, ownership and transaction requirements continue to apply. New drafts and later private edits are not automatically exposed; refreshing a public example requires another reviewed snapshot operation. The current enrollment tool is create-only and has no public write endpoint.
