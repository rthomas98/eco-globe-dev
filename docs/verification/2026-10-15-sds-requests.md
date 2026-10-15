# Buyer SDS requests and signup country retest

This follow-up closes rows 6 and 7 of the October 15 feedback report. The buyer workflow follows the user's choice: create an in-app seller request with no email. The country response was interpreted as United States and verified through the live signup selector without submitting an account.

Across the 18 feedback rows, 17 now pass or retain the tester's earlier pass. One live RFQ acceptance retest still needs an eligible seller/listing fixture.

## Changes

Buyers viewing a published listing without a usable seller SDS can select **Request SDS from seller**. The app saves the request for the current buyer company, shows its date, and preserves it after refresh. Repeating the request returns the original record and does not create another notification. A lifetime unique key applies to each buyer company and listing, including if a previously available SDS later disappears.

The seller receives an **SDS requested** in-app notification with an **Upload SDS** link to the existing listing editor's SDS section. No email is sent. Only the exact compliance/listing/in-app notification type receives this link. Requests cannot name another recipient or buyer company, and current company membership is checked on the server. Purchase and quote submission remain subject to the existing authentic seller SDS requirements.

The existing signup selector includes United States, stores `US`, and works at desktop and an actual 390px viewport. No country-list change or account creation was required. This selector check does not establish FedEx service eligibility.

## Source and release

- Baseline: `9d3937390cb8de8e7d10d80dfc739d301d997e9f`.
- Reviewed application commit: `fe9142d69c5265680dc96b5e371470ec8cbedf72`.
- Migration: `packages/backend/db/migrations/20261015_listing_sds_requests.sql`, SHA-256 `ae06041a1081ae6f4399cd4829f915f61e4d3563e54f8cdfdd555516b1060199`.
- Additive development migration created `ListingSdsRequests` before API deployment. Existing counts stayed at 41 companies, 41 locations, 30 listings, 28 orders, 42 users, 157 market records, and 11 listing documents.
- Source-only release archive: SHA-256 `cebbcc0b1a6fa60c6ffa5b18daaf25984ab00b67dabcf4367fd91b1e11cd0b44`. Its 926 files match the source used in the successful external builds. Intake files, private evidence, credentials, local environments and Git metadata were excluded.

| Artifact | Verified value |
| --- | --- |
| Web deployment | `dpl_76EZpB8u7WaA5u6pz7iozmYztGjb` |
| Admin deployment | `dpl_BTBYRi5LLVoAMSeTMbvx7BBFXaRd` |
| Backend revision | `ecoglobe-backend-dev--sds-fe9142d` |
| Backend image | `sha256:c9de023e52e08eafea815c9a7cdc9ade9ef9fef604dcac9bf283654e741b2958` |
| ACR build | `ca17`, succeeded |

Both stable Vercel development aliases resolve to the Ready artifacts above, and loaded browser scripts identify those same deployment IDs. Azure reports that exact ready revision as Healthy with 100% development traffic. Staged admin login and web page-shell HTTP checks returned 200 before promotion. Vercel's production target here belongs to the existing development projects.

## Checks

- Combined checks: 227 web tests, 125 backend tests, 22 runtime isolation tests, workspace type checks, backend build, and lint passed. Lint retains 38 existing warnings and no errors.
- Source-only external builds: frozen-lockfile install, backend, web and admin builds passed. No private intake or credential files were transferred to the external build source.
- Final-hash real local SQL/HTTP smoke: 21 checks passed, including six concurrent submissions producing one request and notification, two-company isolation, failed insert rollback, retry, and document writer locking. The migration was run twice. Original rows in seven existing tables were preserved. The original SQL owner controlled the database and temporary test trigger; the trigger was removed, app permissions were unchanged, and the container was stopped with its volume retained.
- React Doctor scanned all eight changed frontend files. It reported one locale-format warning. The formatter runs only after client request loading, so the server and first hydration output cannot differ; the date uses the viewer's local timezone and retains the original ISO timestamp in a time element. The reciprocal reviewer accepted this explanation. No suppression was added.
- Running the worktree-only aggregate verification wrapper from the primary checkout was correctly refused. Its individual checks were then executed under the prepared runtime's sanitized environment and passed; the aggregate wrapper itself is not recorded as a primary-checkout pass.

## Live browser and API results

| Test | Result |
| --- | --- |
| Reproduction | Bianca's Rice Hull Ash detail page initially blocked purchase and had no Request SDS action. |
| Buyer creation | On listing #22, Request SDS saved request #1 at `2026-10-15T19:10:42.582Z`. The resulting date and seller-notified message appeared only after the response. |
| Refresh and second surface | The saved state survived reload and also appeared at the signed-in public listing route `/browse/22`. No repeat request button remained. Buy Now stayed disabled on both surfaces. |
| Narrow layout | At actual `innerWidth=390`, document client width and scroll width both equal 390. Requested status and purchase-block text fit without horizontal overflow. |
| Seller delivery | Sasha saw one new SDS requested notification for Premium Rice Hull Ash, marked In-app. Opening it marked only that new notification read. |
| Seller action | Upload SDS opened `/seller/listings/22/edit#sds`. The SDS heading was visible at y=113 in the 720px desktop viewport. No file was uploaded or listing edit saved. |
| Genuine SDS listing | PVC Scrap #27 retained its genuine `SDS044_PSK_PVC.pdf`, download links and enabled Buy Now. No Request SDS control appeared. No purchase was submitted. |
| Signup country | United States selected successfully with stored value US, including a repeat check on the final deployed revision. The earlier desktop and 390px country checks also passed. No registration was submitted. |
| Existing admin receipt | The final admin browser artifact still shows TX-9, EG-28, View receipt and Download PDF receipt for the captured $30 payment. |

The buyer button was below the desktop viewport when the browser automation click reported a target-location failure. After inspecting the visible layout and unchanged request state, keyboard activation submitted it successfully. No success was inferred from those failed clicks.

Live SDS API checks passed before browser creation (8) and after (10): authentication and company/own-listing rejection, non-public listing handling, spoofed body rejection, method restriction, private/no-store response, genuine SDS availability, saved request state, correct seller company recipient, and repeat POST returning the same ID/time with `created=false`. The repeat left exactly one seller notification. No email channel was used.

All 32 existing live API checks passed after deployment. Fingerprints for eight existing datasets matched the baseline: listings, listing documents, orders, payments, sample requests, active market records, research references and portfolios. Normal reporting and receipt/PDF authorization passed. These fingerprints do not cover every database table. The intended live additions were one SDS request and one in-app notification; opening that new notification changed its read state. Browser session was restored to Bianca.

## Retest steps

1. Sign in as the development buyer and open a published listing without seller SDS. Premium Rice Hull Ash #22 already shows the saved QA request.
2. For a buyer company that has not requested that listing, select Request SDS from seller. Confirm the date appears, refresh, and confirm no duplicate request action appears. Buy Now must remain blocked.
3. Sign in as that listing's seller. Open Notifications, select SDS requested, then Upload SDS. Confirm the matching listing and SDS section open.
4. Upload only an authentic seller-owned SDS when supplied. Existing moderation returns a published listing to review after upload; an admin must approve it before buyer availability can be retested.
5. Check PVC Scrap #27 still shows its existing SDS without a missing-document request. On signup, confirm Country includes United States.

The related row ledger remains in [the feedback retest report](2026-10-15-feedback-retest.md). Rows 6 and 7 are now closed; row 8 still needs an eligible live acceptance fixture.

## Orca review and cleanup

Orca run `run_c2c3a8377148` used Codex GPT 6.1 Sol with medium reasoning and Standard service for backend work, and Claude Opus 5.5 with medium reasoning for frontend work. Effective launch/process settings were inspected. Backend used the previously approved documented manual dispatch fallback: Orca tracked the task while the coordinator owned its process lifecycle.

Orca changed the frontend permission mode during work despite its Manual launch. Work was paused, the changed source was inspected, and Manual was restored for individually approved corrections. The global Settings control did not retain Manual. After another mode reset, implementation was frozen and the remaining reciprocal review ran read-only in a visibly restored Manual terminal. No Fast or bypass flags were added. Both exact source diffs received reciprocal review with no blocking findings; reviewed file hashes matched the integration commit.

The reviewer noted possible contention from the canonical parent-row lock on GET; no external calls occur in the transaction and no contention was measured. Explicit migration-before-API ordering was adopted. Both tasks completed successfully. Terminal output was archived, completed worker processes were closed, and both worktrees remain preserved. No reclaimable workers remain.

## Remaining owner inputs

Authentic seller SDS files are still needed for Biochar and Premium Rice Hull Ash. Internal research PDFs must not be substituted. No new supplier SDS was uploaded in this test. The earlier live RFQ acceptance test still needs a published eligible listing with genuine seller-owned SDS and an available test seller; existing business listings were not unpaused. Verified facility data, FedEx validation and commercial DocuSign activation remain separate owner dependencies.

Private screenshots, API receipts, row fingerprints, build logs and review records are stored under `.local/verification/2026-10-15-sds-requests/`. This report concerns the existing development services and does not certify commercial production readiness.
