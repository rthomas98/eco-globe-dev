# Ana backend implementation and verification

Base HEAD: cbf740dc591ec8845c1119682281971579ef63bc. Worktree: /Users/robthomas/orca/workspaces/eco-globe/codex-ana-backend. No commit, push, deployment, reset, shared database access, or production credentials. Initial worktree was clean; frontend ownership was preserved.

Implemented complete SQL listing create/read/update/soft-close, numeric IDs and stable slug detail reads, public published-only projections and authenticated active-company reads, complete specifications, nullable prices/quantities, genuine zero prices, explicit money/units, real company verification and saved location identity. Draft/pending/paused/closed writes are seller-scoped; only internal platform admins publish. Published content edits require reapproval. The new additive migration preserves existing rows and stores real PDF/image bytes, MIME, size, SHA256 and soft deletion in SQL; downloads enforce the listing visibility boundary. Bodies are capped before parsing; accepted signatures, base64 and decoded size are validated.

Onboarding serializes concurrent retries per user, reuses the owned company/facility, prevents existing member elevation, preserves approval/billing/payout state and dual-company role, and persists industry/job title/website and buyer Others interests plus description. Auth now distinguishes company admins from internal admin_override, prevents external grants of that tier (including uppercase normalization), and rejects stale active-company membership. Quote/create-order checks reject unpublished records, invalid quantity ranges and mismatched recorded money/units where applicable. Facilities POST now returns the complete saved location shape.

## Passed checks

- 22 runtime isolation regressions via sanitized orca:verify.
- 9 backend tests (five carried forward; four added for specifications, file validation/limits, Others input, body cap).
- Backend type check and final build; shared package type check.
- 12 SQL ownership regressions.
- Real dedicated SQL migration and scripts/orca-ana-check.py integration: concurrent onboarding retries without duplicate company/facility, buyer Others round trip, every listing form field, PATCH preservation, null/zero/450 money, USD/EUR and mass unit preservation, second authorized login/reload, public/tenant/unknown-ID isolation, admin approval, binary PDF/certification/PNG upload/SQL storage/download equality, invalid signatures, private file rejection, soft file/listing deletion preserving bytes, quote MOQ/availability/unit/currency rejection, company-admin escalation refusal, inactive membership rejection and revoked session rejection.
- git diff --check.

## Stable retained runtime and browser fixtures

Dedicated database eco_18c9077e5558f00eaafe0d1d, SQL loopback port 50001, container 34ad1339043a37aa17449e7cf2a09d6467c1916651cbf05f43bd7fed2401c0ef, persistent volume eco-sql-data-18c9077e5558f00eaafe0d1d. SQL remains running. The integration-owned API child was terminated and awaited; API origin reserved for coordinator is http://127.0.0.1:20019. No API or browser process is owned by this worker now. Coordinator subsequently restarted the API in session63506; that process belongs to the coordinator. Verified Node binary: /Users/robthomas/Library/Application Support/Herd/config/nvm/versions/node/v22.20.0/bin/node (v22.20.0).

Owner-only credentials fixture: /Users/robthomas/.local/state/eco-globe-orca/18c9077e5558f00eaafe0d1d/tmp/ana-browser-fixture.json. It contains synthetic login credentials; do not print its contents. Seller user 13, company 10, primary facility 7; buyer user 14. Published synthetic Tar listing 7, slug tar-5d11ec51-71e4-4759-a669-fc19eb53571c, USD450/ton. Draft Gasoline offspec listing 8, slug gasoline-offspec-draft-2ab43067-6c94-4789-a545-69c91a5470b8. Both have persisted photo and SDS. Closed integration listing 6 and document IDs 14,15,16 remain retained, as do earlier unique test runs. Do not rerun integration during coordinator-owned browser work: it updates the synthetic fixture and uses the same API reservation.

## Exact limits and reciprocal review

Email and signature providers remain disabled. Registration created the synthetic users but correctly returned 503 on unavailable email delivery; the test explicitly verified only those just-created local users with the existing internal helper. Real email delivery, production registration, payments, signatures, hosted services and production Tar/Gasoline records are not certified. The named Tar/Gasoline fixtures are synthetic, not the deck's production records. SQL under Apple Silicon amd64 emulation is local development evidence; container restart/shutdown persistence was not repeated in this task. Frontend lint/build, browser stories and release validation belong to the combined coordinator flow; the backend package has no lint script.

Backend API-focused reciprocal review of frontend source found saved-record defaults and custom claims-array collapse in listing-form.ts and sent fixes to the coordinator. The facility-create response mismatch was fixed here and SQL-tested. Frontend reviewed the backend contract and implementation, returned bounded findings, and those changes were implemented and SQL-tested. Final follow-up counterpart review was accepted by the coordinator in msg_3244d4469e69, citing frontend receipt msg9a2037d16062; coordinator owns integration and combined checks. No backend edits or checks are pending absent further review findings.

## Reciprocal review follow-up

Coordinator chose explicit materialTypeCode as a draft-create requirement, with matching frontend validation; no second schema migration was added. Listing key reads now use typed integer ID or VARCHAR(180) slug equality. File deletion returns reviewed content to pending_review when a real SDS remains, and draft when the last SDS is removed. SQL transactions acquire the listing row before saved-record and document mutations; concurrent PATCH values are preserved and publication cannot race last-SDS removal. Existing FileUrl-only records remain in SQL but do not fabricate downloadable bytes; contract documents deliberate re-upload. Explicit empty onboarding preferences intentionally clear values; omitted fields preserve them, and frontend preloads saved preferences. Inactive active-company tokens intentionally become 401.

`python3 scripts/orca-ana-check.py --review` passed after final changes: explicit material and partial draft validation, typed ID/slug and oversized unknown key reads, simultaneous PATCH field preservation, legacy URL retention and exclusion, certificate deletion to pending_review, last-SDS deletion to draft, and concurrent approval/SDS-removal refusal. It retained review listing 9 and legacy document 21, and deep-compared browser listings 7 and 8 unchanged. Backend nine tests, build and shared type-check passed again after this delta; earlier 22 runtime and 12 SQL ownership tests remain applicable. Test API stopped and runtime returned to coordinator; no further integration run is authorized without coordination.

List projection currently fetches documents per returned listing; this N+1 query pattern is a known scaling limitation, not a data-fidelity or authorization failure. Full monorepo lint/build and UI/browser tests remain coordinator-owned combined checks.

## Final file SHA-256

- `packages/backend/package.json`: `f457b0027a0bcc27844ed8511d7b792e2143eba6d37be32f6253be8462f3d15b`
- `packages/backend/src/api.ts`: `a38a95080c54fc8da40120fa03e33398a3a7aaa9058f707c2a12a3b9098d42d1`
- `packages/backend/src/auth.ts`: `b46c8177d9b5adec5cce284d5710237af2fb775948d9b0d8d027318091530368`
- `packages/backend/src/http.ts`: `b3c4bc6580c0a43b4824a1ed2846f53745e040b373b9ded490f70a54383983fd`
- `packages/backend/src/listing-routes.ts`: `2ecbd28fd5cd703adb0684fb9d2d5a570238bdf5fa4c791fb9d44ee2300f809f`
- `packages/backend/src/listing-routes.test.ts`: `b77c273325f1aa33f3e34215573611363aeb356e5035617e7cabaa65974f61ca`
- `packages/backend/src/onboarding-preferences.ts`: `5037fa95641e83ac9814920aa115ea5549960a1d6e622f153dbf329ac09a7a25`
- `packages/backend/db/migrations/20260909_listing_content.sql`: `f680575be0e975b51f812fd68f500504d24aab3452b03001cb7c72134e3ba227`
- `packages/shared/src/index.ts`: `adddac6c437ff7e26259f9259ae7fde104d930f4f073d69f68347aaafc5a9a74`
- `packages/shared/src/listing-api.ts`: `697acc7012c584efb221f65699578c23121efece0def89dda5732f9a755ef6cb`
- `scripts/orca-ana-check.py`: `c8d9fc931855ee0c720eae857f5a75835b7f665e294fd8728fefe35eeea9721b`
- `scripts/orca-ana-integration.mjs`: `e29c677413023f97232c19d0c7c8ed29bb84a8c7c2fd630038a37dd0e82b2e30`
- `scripts/orca-ana-review.mjs`: `fffbd7cb06b902fc591cd33a1d164b0f7185f8ab2857f13e214747f7953f9a0c`
- `docs/ANA_LISTING_API_CONTRACT.md`: `c3412031752bb8d973e50b946c4f3fd2226374b1daa5658933ca2c6c726609a5`
