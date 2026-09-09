# Ana corrections verification — 2026-09-09

Ana's 21-slide review was inspected in Chrome. The accepted corrections are implemented in isolated backend and frontend worktrees and verified in a combined SQL-backed local runtime. Final integration and runtime cleanup are recorded below.

Source plan: [Ana corrections plan](ANA_CORRECTIONS_PLAN_2026-09-09.md). Baseline commit: `cbf740dc591ec8845c1119682281971579ef63bc`.

## Acceptance evidence

| Slides | Correction | Executed evidence |
|---|---|---|
| 17–19 | Real listing fields, saved company identity and specifications | SQL integration and authenticated browser create, preview, save, reload and edit; no Acme/default product fallback |
| 17–19 | Persisted photos, SDS and certifications | SQL binary upload/download equality, MIME/signature/size checks and visibility checks; browser uploads both PDFs and downloads persisted SDS |
| 20–21 | Accurate prices and units | Null, zero and 450 tested separately; USD/EUR and mass units retained; synthetic Tar displays USD450/metric ton; checkout carries 2.5t at USD1,125 |
| 17–21 | Public and private visibility | Published listing readable; draft and unknown ID unavailable publicly; tenant access, internal approval and document access checked against SQL |
| 14 | Seller onboarding free-tier completion and safe retry | Browser injects one 504 then retries against SQL, reuses the same company and reaches success without payment setup; SQL concurrent retry tests prevent duplicates |
| 11 | Registration recovery | Narrow browser view shows recovery link; mocked existing-email response exercises inline recovery/sign-in links |
| 12, 16 | SDS wording and ordering | SDS instructions on onboarding; listing wizard places SDS before claims and certifications; submission requires real SDS |
| 13 | Others interest and description | SQL onboarding round trip persists both fields; browser validates description and retries a failed save |
| 15 | Minimum Order Quantity (MOQ) wording and units | Listing forms and details display full wording and recorded units; SQL rejects invalid purchase quantities |
| 2–5, 18 | Seller value recovery | Browser verifies 10t × USD50 disposal cost plus 10t × USD450 sale price = USD5,000; sale shipping excluded |
| 6–8 | Buyer savings | Browser verifies (USD500 − USD450) × 10t = USD500 and negative USD500 at baseline USD400; alternative shipping excluded |
| 4, 8 | Report parity | Shared result object feeds interface/report; browser opens seller report and verifies matching USD5,000 total and USD4,500 sale proceeds; unit tests cover buyer formulas |
| All | Responsive and integrated behavior | Visible Chrome desktop inspection and 390px browser overflow check; combined types, lint and builds |

## Checks

- Seven real SQL-backed Playwright stories passed together in 26.0 seconds. The additional checkout handoff story passed in 6.2 seconds. The final spec contains all eight stories in `tests/e2e/ana-corrections.spec.js`.
- The seven-story run covers public/private reads, seller edit/download, buyer positive/negative savings, seller calculator/report, registration/narrow view, full draft/upload/submit, and onboarding failure/retry.
- Frontend: ten calculation/format unit tests passed, including Ana's `(155 − 150) × 500 = 2,500` example, negatives, zero, unit basis and missing-price semantics.
- Backend: nine tests passed. Runtime isolation: 22 regressions passed. SQL ownership: 12 regressions passed.
- Real SQL integration and final review regression script passed: additive migration, full record round trip, concurrent onboarding, authorization, retained file bytes, approval/SDS races, concurrent PATCH preservation, explicit classification and typed ID/slug lookup.
- Combined monorepo type checking passed (6 tasks), lint passed (3 tasks, 0 errors), and build passed (3 tasks). Web lint reports 52 warnings in existing image/hook categories; baseline had 57. Lint is not warning-free.
- Final onboarding label follow-up: SQL-backed seller retry passed again, all nine mocked frontend browser scenarios passed together in 10.9 seconds, and combined type checking and lint passed again. The two label changes were the only product delta after the earlier combined checks.
- A first mocked run completed seven scenarios before the development server exited with SIGINT; the final nine-scenario run above passed after restarting the owned service. This was a runtime interruption, not a failed acceptance assertion.

## Review and reproducibility

Orca run `run_bb2abb2a8cfc`. Backend: `task_81ebf3348b1d` / `ctx_2ff889f11314`. Frontend: `task_f534cfd7ef59` / `ctx_744377dc5d59`, followed by `task_d31916c07b07` / `ctx_d9a31ed4bb13`.

Codex reviewed the frontend saved-field defaults, custom claims, facility projection and checkout handoff. Claude reviewed the backend contract, classification requirements, document state transitions and legacy-file behavior. Findings were resolved and re-reviewed before combined checks. The coordinator additionally reviewed the final onboarding retry-label change. Final SHA-256 manifest identifies the integrated content; no commit or deployment is implied by these reviews.

Local verification used dedicated database `eco_18c9077e5558f00eaafe0d1d`, web port 20016 and API port 20019. Synthetic fixture credentials remain in owner-only runtime state and are not part of the repository. Run the SQL harness only with the owned runtime stopped; it manages its own API process. The `--review` mode preserves the established browser fixtures.

## Limits and rollout requirements

- No production database, deployed service or real Tar/Gasoline record was changed. The named test records are synthetic. Apply the additive migration and deploy both API and web before expecting these changes in the hosted application, then verify the real records there.
- Existing URL-only documents without stored bytes remain in SQL but are excluded from downloadable projections. Re-upload or migrate their actual files before rollout; fabricated links are not substituted.
- Actual external email delivery, payments, signatures and map-provider integration are not certified. Local registration fixtures were verified with an internal development helper because email delivery is disabled locally. Checkout verification covers the real listing handoff, not financial settlement; its local reference is labelled not yet submitted.
- Onboarding generation/restrictions/volume/specification/notes fields outside Ana's accepted interest and saving corrections remain client-only. Persisted listing specifications are covered by this work.
- No currency conversion was introduced. Public price visibility policy is preserved. Unit-priced products require an explicit mass basis in carbon calculations.
- List projection currently reads documents per listing, a known scaling limitation.
- Unrelated pre-existing checkout changes and files are preserved. No database reset, commit, push or deployment was performed.

## Final integration and cleanup

- Integrated 59 reviewed backend/frontend files into the primary checkout after checking every target against its initial hash. Added the coordinator browser spec, plan and backend report. The 62-file [SHA-256 manifest](ANA_CORRECTIONS_FILE_HASHES_2026-09-09.json) identifies task content; this verification document and the manifest itself are excluded to avoid circular hashes.
- Primary product files are byte-identical to the combined verified worktree. Only the reports were updated after verification. The pre-existing root `package.json` changes remain byte-identical to the initial checkout; no unexpected tracked changes were found. `git diff --check` passed.
- Final combined build passed: three successful tasks, including a fresh web build after the label delta; backend/shared cached results remain applicable because those files did not change.
- Both worker dispatches completed through accepted lifecycle messages and were released, with transcripts captured. Worker reports: [backend](ANA_BACKEND_REPORT_2026-09-09.md), [frontend](../apps/web/docs/ANA_FRONTEND_REPORT_2026-09-09.md).
- Coordinator web/API processes exited and were awaited. Ports 20016, 20019 and the frontend worker's 20020 were confirmed closed. Dedicated SQL shutdown completed with status `exited`, schema ready, and persistent volume `eco-sql-data-18c9077e5558f00eaafe0d1d` retained. The coordinator shell was closed; isolated worktrees and fixture data are retained for review.
- No commit, push or deployment was performed.
