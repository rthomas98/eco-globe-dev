# Feedstock illustration intake — 15 October 2026

## Scope

The user approved using Ana's supplied pictures as marketplace fallback illustrations, preserving seller-uploaded photographs. Synthetic graphene is explicitly held pending Ana's confirmation of the graphite-flakes picture.

The original Pictures.zip contains 32 PNGs and a 33-slide mapping deck. Originals remain unchanged and private. Thirty-one selected PNGs were converted to 1200 × 800 WebP at quality 84 (6,455,322 bytes total), preserving their proportions. Three embedded deck images differ in file encoding; full decoded-pixel comparison proves they exactly match their selected standalone originals. No new image generation was performed.

The shared resolver adds 67 explicit material names. Matching remains case-insensitive and exact after trimming. Five existing titles receive new fallbacks: Pyrolysis Pitch, Black Gypsum, Biochar, Hydrochar and Epoxy Off-Spec. Other existing illustrations remain unchanged. Unknown materials retain the existing empty state; broad categories and arbitrary substrings are not inferred.

The image layer does not publish internal market records, create listings, verify materials or suppliers, satisfy SDS requirements, or change facilities, prices, quantities or documents. Seller photos retain priority. Generated fallback illustrations retain the visible caption and descriptive alt text.

## Review and validation

Orca Run `run_4dfadeaaffe6`, Task `task_13dfd0f7048d`, Dispatch `ctx_ffb23664e321`. Claude Opus 5.5 medium handled the frontend in an isolated worktree. Launch receipt and visible Manual permission mode were checked before edits. Permission mode drift during read-only phases was corrected; source edits were individually approved in Manual. The coordinating Codex reviewed the exact three-file frontend patch and handled intake/asset tooling; Claude reciprocally reviewed and approved the asset manifest and tooling after resolving source-mapping questions. Source patch SHA-256: `24c77af651b8be024e188b4f0cf12ec08beae4d81383ddb2cd7ac3afbdd26174`.

Combined prepared-runtime checks passed:

- 218 frontend tests, including seven new tests covering exact matches, retained fallbacks, held/unknown materials, illustration identification and asset existence.
- 120 backend tests and 22 runtime-isolation checks; backend source is unchanged.
- Workspace type checks, lint, and both web/admin production builds. Lint retains existing warnings with zero errors.

The worker's raw Node test invocation does not configure the repository's existing alias/JSON loader requirements and reported eight failures. The established tsx runner from the web directory passed all 218 tests; no unrelated loader changes were made.

## Remaining pictures

Ana has not supplied new dedicated pictures for off-spec carbon black, used wooden pallets, used cooking oil, used dry-type transformers, or CO₂-derived ethanol. Existing matching artwork remains available where already implemented. Synthetic graphene remains excluded until Ana confirms its image. Image availability does not imply that a tradable listing exists.

## Release and browser acceptance

Application source commit: `468ecc77bf88247f27722211fd0399111d5ff3f6`, committed and pushed on `codex/deploy-ecoglobe-backend`.

- Web dev deployment: `dpl_5weR57YZi6f68MDiL9K5eY3QDs44`, Ready and promoted to https://eco-globe-dev-web.vercel.app.
- Admin dev deployment: `dpl_9hnqa5dRr4qm2G5W2HPPxe2QFKoM`, Ready and promoted to https://eco-globe-dev-admin.vercel.app.
- Backend source, configuration and deployment are unchanged. No migrations or provider operations were performed.

Live in-app browser acceptance:

- Public and buyer browse still show 18 published listings. All five overlapping titles load their new 1200px illustrations; PVC Scrap retains its uploaded document #8 photo. The other legacy images remain loaded.
- Biochar detail loads the new image with illustrative alt text/caption and retains the disabled Add to Cart / missing seller SDS notice.
- Black Gypsum search returns the matching listing when all distances are enabled. Its listing card and map popup both load the correct new image with illustrative captions. The default 100-mile search correctly excludes its Houston location from the current approximate network location.
- Buyer browse filtered to Biochar and public Biochar detail were checked at 390px; document scroll width is 390px. The buyer card image renders at 326px and detail image at 358px, both from the reviewed 1200px asset. Temporary viewport overrides were reset.
- No client console errors were observed in those browser stories.
- All 31 public WebP responses return HTTP 200/image-webp and exactly match the reviewed SHA-256 values. The admin deployment's sampled asset also matches.
- Twenty read-only API status/access assertions passed before and after deployment. The full snapshot-equality guard correctly flagged concurrent additions: Ana's account submitted CO2 listing #31 (pending review) with photo #10 and SDS document #11 while this release was being checked. Reconciliation by stable IDs proves all 29 pre-existing listings and nine pre-existing listing documents remain identical, with no removals or edits. Payments, orders, samples, internal market records, reference library and portfolios retain identical complete fingerprints. The original guard failure and reconciliation are both retained; they are not relabelled as an identical full snapshot.

Separate admin follow-up: Ana's concurrent CO2 draft uses an uploaded image from this generated picture set and an SDS attachment named `Carbon_Dioxide_Reference_SDS.pdf`. That filename also exists in the internal research library. Attachment contents have not been compared in this task, so a filename match alone does not establish file identity or supplier SDS suitability. Keep normal moderation and supplier-document review; this image release does not approve the draft or its attachments.

Private inventory, original/output hashes, source manifest, build logs, API fingerprints and screenshots are retained under `.local/verification/2026-10-15-picture-intake/`. Original intake files and private evidence are excluded from Git and release copies. Only reviewed application source/assets and manifests use the approved external-drive release directory.
