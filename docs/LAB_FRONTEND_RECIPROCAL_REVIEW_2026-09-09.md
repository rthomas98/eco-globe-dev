# Frontend reciprocal review — 2026-09-09

Reviewer: supervising Codex, backend owner. Scope: the 30 frontend files in the final SHA-256 manifest, compared with preserved pre-integration primary source and the shared lab API contract.

Accepted integration after owner fixes: the API client reuses shared types; admin queue reads real requester/company details; private copy names the requesting company; admin referrals use persisted notifications; sample actions match available API transitions; unsupported conversion UI was removed; cancelled requests retain report-consent controls. Existing public/buyer listing, buyer orders, seller sales and Documents components receive bounded feature entry points rather than a new customer navigation branch.

The key privacy finding was a disabled sharing control for cancelled requests, which could prevent withdrawal while a shared report remained public. Owner removed that status restriction and added a regression; the API already checks consent independently of status. Final source, API/client contracts and focused diff reviewed without further blocking findings. File identities are recorded in `LAB_TESTING_FILE_HASHES_2026-09-09.json`.

Combined verification: web/test/shared types, 20 frontend tests, lint (zero errors), production build and real SQL harness pass. Chrome created listing and sample referrals and displayed persisted documents. Final browser withdrawal/admin/narrow-screen checks remain blocked by the locked Mac, as recorded in `LAB_TESTING_VERIFICATION_2026-09-09.md`.
