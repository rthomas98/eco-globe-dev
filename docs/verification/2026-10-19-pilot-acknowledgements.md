# Buyer pilot acknowledgement verification — 19 October 2026

Automatic buyer acknowledgements are deployed to the development site. Live PR-3 produced one acknowledgement accepted by the email provider, and the user confirmed inbox receipt. Development delivery is restricted to `info@ecoglobeworld.com`. The QA pilot is closed, and the approved development SQL credential rotation is complete.

## Release binding

| Item | Verified value |
| --- | --- |
| Application commit | `f711c9762e6accf90b25a9037b6281696d8f1aef` |
| Reviewed 18-file manifest SHA-256 | `9ff3d422f4a0efab4496988c7d2619a575c41a6b4ba0417784cb492b1ac76ba0` |
| Source archive SHA-256 | `4a1f5b0307059efa8631140bb113e1ffbd5a9e79dd06a01ac6d32d5cdb48a6fc` |
| Backend image | `acrecoglobe7c180adf.azurecr.io/ecoglobe-backend@sha256:8f58607ca7d10ae5f009534bf0a385d7ece3184352ac5618190b75670bba8de9` |
| Ready API revision after credential rotation | `ecoglobe-backend-dev--sqlrot-f711c97-oct19` |
| Backend release build | ACR `ca1c`, succeeded |
| Web deployment | `dpl_F49xRRP1ts2sAhVH9JEDi4hdaxRh`, ready |
| Development web alias | <https://eco-globe-dev-web.vercel.app> |
| Existing admin site | <https://eco-globe-dev-admin.vercel.app>, unchanged web deployment |

The Vercel deployment uses the production target of the existing **development-named** project. No commercial production domain was changed. Cloud verification used Node 22.20.0; the deployed backend reports Node 22.23.3, and the existing Vercel project uses Node 24. Source-only builds excluded private evidence, credentials, intake files and local environment files.

## Implemented behavior

New pilot creation inserts a durable `dbo.PilotAcknowledgementOutbox` job in the same SQL transaction. The backend resolves the authenticated creator's saved, verified email; the client cannot specify a recipient. A unique request constraint and existing creation replay handling prevent duplicate jobs. Reads and email-follow-up preference changes do not enqueue another buyer acknowledgement. Historical pilot requests are not backfilled.

The message contains the PR reference, a receipt subject to staff review, and an authenticated buyer pilot link. It does not confirm a purchase, shipment or call. Buyer pages distinguish queued, provider-accepted, review-required and historical/unavailable states. Test messages and the frontend explicitly identify QA routing.

The processor uses bounded SQL claims, immutable payloads and provider idempotency keys. Only explicit rate-limit responses retry automatically. Ambiguous delivery, expired claims and configuration changes require review rather than blind resends. An admin-only status endpoint exposes delivery state without recipient or message payload data.

### Development configuration

| Setting | Value |
| --- | --- |
| `PILOT_ACK_EMAIL_ENABLED` | `true` |
| `PILOT_ACK_EMAIL_MODE` | `test` |
| `PILOT_ACK_EMAIL_TEST_RECIPIENT` | `info@ecoglobeworld.com` |
| `PILOT_ACK_EMAIL_ALLOWED_RECIPIENTS` | `info@ecoglobeworld.com` |
| `PILOT_ACK_WEB_URL` | `https://eco-globe-dev-web.vercel.app` |

Normal buyer-recipient delivery is implemented and unit-tested through explicit `buyer` mode, but is not enabled for general recipients on development. New isolated runtimes disable this provider flow by default. Existing staff-alert and refund-email settings were preserved.

## Review and objective checks

Orca run `run_fb23b50b387f` used isolated backend, frontend and combined worktrees. Codex owned backend and tooling; Claude owned frontend. The normal backend launcher inherited Fast mode and was stopped before product inspection, edits or tests. The previously approved manual-dispatch fallback then used verified `gpt-6.1-sol`, medium reasoning, Standard service and Fast disabled. The coordinator retained process supervision; Orca did not own that process lifecycle.

Claude implementation and reciprocal review used `claude-opus-5-5`, medium reasoning and Manual permissions. Reciprocal review found and corrected frontend wording that confused the viewing company member with the original request creator. Final review covered all 18 files. Three managed workers were released; the manually attached backend terminal was retained with its explicit ownership limitation. The final reclaimable-worker list was empty.

| Check | Result |
| --- | --- |
| Runtime isolation regressions | 22 passed |
| Focused frontend pure tests | 18 passed |
| Full backend tests | 150 passed |
| Full frontend tests | 269 passed |
| Workspace type checks | All six passed |
| Lint | Passed: zero errors, 38 warnings |
| Backend, web and admin builds | All passed |
| React Doctor | Exit 0, 88/100, no issues reported in seven tracked changed files scanned |
| New acknowledgement component | Independently reviewed; complete types, lint, build and live-browser coverage |

The full application checks ran in source-only ACR verification run `ca1b`, which succeeded without provider credentials or a pushed verification image. The gate receipt binds the reviewed manifest above.

Local SQL smoke is **NOT_RUN**: both the fresh owned SQL runtime and a retained QA runtime stalled during engine startup on this emulated host. Their volumes and fixtures were preserved. These failures do not count as SQL test passes. Actual Azure SQL transaction and duplicate checks below provide separate deployed-function evidence.

## Database and live end-to-end evidence

The additive migration was applied before deployment. Cryptographic row fingerprints across 17 existing business tables matched before and after migration; the new outbox contained zero jobs. No reset or historical backfill occurred.

The live browser created explicitly labelled QA pilot **PR-3** using the existing synthetic QA delivery location. It booked no call, purchase or shipment. The buyer selected email follow-up separately.

| Live check | Result |
| --- | --- |
| Browser submission and queued state | Passed |
| Buyer acknowledgement | Exactly one job, `sent`, one attempt, provider message ID present |
| Staff notifications | New-pilot and email-follow-up alerts each `sent` once |
| Four concurrent creation replays | All returned existing PR-3; no second job |
| Repeated email preference | No second buyer acknowledgement or extra staff preference alert |
| Client-supplied recipient injection | Rejected with HTTP 400 |
| Admin status access | Anonymous 401, buyer 403, authenticated admin success; private/no-store |
| Buyer projections | No outbox payload or intended recipient exposed |
| Historical PR-2 | No acknowledgement record; no backfill |
| Deployed enqueue function rollback | Insert inside an intentionally rolled-back Azure SQL transaction did not persist |
| Deployed enqueue duplicate | SQL error 2627; existing PR-3 job snapshot unchanged |
| Link from accepted email payload | Opened correct authenticated PR-3 in live browser |
| Desktop and 390px layout | Passed; 390px viewport and document width both 390px |
| Listing and refund preservation | Existing counts/checksums unchanged in final snapshot |
| QA shipment count | Zero |

The rolled-back SQL test can advance the outbox identity counter without committing a row. The shared API image and exact deployed database were checked before invoking the compiled enqueue function. No delivery processor was started in that diagnostic process.

With direct user approval, PR-3 was closed as lost through the admin frontend. Its QA completion note, closure note and history remain available. No real pilot was closed.

### Credential rotation and final retest

During diagnostic cleanup, a connection-pool return value exposed the development SQL password in tool output. The session was closed, and the value was excluded from files and release artifacts. The user approved a scoped rotation, completed on 19 October 2026:

- The replacement was generated in memory and stored in the existing `kv-ecoglobe-dev/sql-admin-password` secret before the handover, keeping recovery possible without a local password file.
- The existing SQL administrator password and only the password portion of the API's `azure-sql-connection-string` secret were changed. Other inline secrets, Key Vault references, environment settings, scale, permissions and the immutable application image were preserved.
- The new API revision is ready. A fresh SQL connection with the exposed password fails with `ELOGIN`; the replacement connects to the expected development database.
- Complete acknowledgement and staff-outbox snapshots matched before and after rotation. The accepted buyer acknowledgement remains a single job with one attempt; rotation triggered no new email.
- The final retest checks live API and web-proxy SQL health, fresh buyer login, closed PR-3 with its accepted QA acknowledgement, historical PR-2 without backfill, and anonymous/buyer rejection from the admin outbox endpoint. Buyer and admin pilot pages were also refreshed in the browser after rotation.

Saved direct database connections using the old SQL administrator password must retrieve the current Key Vault version. Application login passwords were not changed. The application source and the full test/build evidence above remain unchanged.

## Evidence limits and follow-up

- The user confirmed receipt of `[QA TEST ONLY] EcoGlobe PR-3: pilot request received` at `info@ecoglobeworld.com`. This is human inbox confirmation in addition to provider acceptance.
- Buyer mode is implemented and unit-tested; the live provider test used the approved QA route only.
- No general-recipient rollout or commercial production readiness is claimed.

Private receipts and screenshots are retained under `.local/verification/2026-10-19-pilot-acknowledgement/`. They include `combined-manifest.json`, `review-verdict.json`, `verification-gates.json`, `migration-dev.json`, deployment receipts, `live-api-checks.json`, `live-sql-function-checks.json`, `final-live-checks.json`, `follow-up-approvals.json`, `rotation-state.json` and `post-rotation-checks.json`. The original final-check receipt records the earlier checkpoint; the follow-up receipts record the completed approvals. These files are not part of the published source archive.
