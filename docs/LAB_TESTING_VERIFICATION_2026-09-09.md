# Lab testing verification — 2026-09-09

Status: implemented and reviewed locally; automated checks passed. Chrome walkthrough subsequently verified the admin queue, saved assignment/notes, draft panels and persisted notifications. PDF upload interaction, narrow-screen and withdrawal-confirmation checks remain pending; see the walkthrough addendum. This is not production certification.

## Source and scope

Word document opened in Chrome, all nine pages read in Accessibility Mode, all five embedded mockups inspected. Source: `EcoGlobe_Lab_Testing_1.docx`, SHA-256 `973a35e2c2b9f019ab92b0c8cfcc2749af9b20bf4e00c04dedfec1d9954a9f62`. User confirmed the example panels remain internal drafts. Implementation follows referral option A; no payment, laboratory booking or outreach was performed.

Implemented reusable listing/sample referral form, SQL requests and immutable scope snapshots, company-private reports, explicit sharing and withdrawal, real PDF upload/download, admin queue/assignment/notes, internal notifications, versioned draft panels and laboratory-review publication guard. Sample requests include buyer/seller status transitions and in-app notifications. The pilot desk checklist is in the plan.

## Baselines and preservation

Local base: `cbf740dc591ec8845c1119682281971579ef63bc` plus previously reviewed uncommitted Ana corrections. Retained isolated checkouts were prepared with differing files preserved, without copying primary environment files.

Current live base is separate: `01a0e593ea42458a78186791bc307ee7e8179158` plus the pricing patch recorded in `FEEDSTOCK_PRICING_UPDATE_2026-09-09.md`. No lab deployment or shared Azure migration occurred. Do not deploy the older primary checkout wholesale over the newer live baseline.

A pre-integration inventory of 531 source files was checked: all 13 modified existing files belong to the intended integration allowlist, with no unexpected changes. The lockfile adds only the pinned PDF parser and its dependency records (38 lines). All 44 feature, contract and harness files match byte-for-byte between primary and combined verification checkout; see `LAB_TESTING_FILE_HASHES_2026-09-09.json`. Existing pricing files remain unchanged. Synthetic local Tar fixtures are deliberately distinct from the business pricing data.

## Passed automated checks

Run with Node 22.20.0 in the isolated combined checkout `codex-ana-backend`:

- `pnpm orca:verify`: 22 runtime isolation tests, 16 backend tests, backend types.
- Web types and test-source types; shared types.
- 20 frontend unit tests including pricing and recovery regressions.
- Web ESLint: zero errors, 52 existing warnings.
- Backend TypeScript build.
- Web production build: exit 0, 152 routes. Initial attempt inherited the runtime's development NODE_ENV and failed prerendering; rerun with NODE_ENV=production passed without source changes.
- Additive SQL migrations applied to owned database `eco_18c9077e5558f00eaafe0d1d`; no reset or volume deletion.
- Final `scripts/orca-lab-check.py`: exit 0. SQL request 6, report 3, sample 4, linked request 7. Covers draft non-disclosure, ordinary company-admin rejection, role boundaries, invalid input, idempotency and conflicting retries, queue owner/notes, admin-only requester contact, persisted notifications, PDF byte round-trip, private seller/anonymous denial, shared public access, consent withdrawal after cancellation, cancelled report-upload rejection, sample linkage and buyer/seller status transitions.

Earlier frontend-owner browser tests passed 10 mocked stories, including 390px layout, keyboard navigation, report upload, sharing withdrawal, panel publication guard, sample actions and admin notification retry/read. These do not replace the final real-SQL Chrome checks.

React Doctor ran as an advisory scan: exit 0 but analysis was incomplete (maintainability checks failed, no score). It flagged three existing-code errors: the generic authenticated proxy GET alias and two favorites state-updater effects; preserved pre-integration source contains the same patterns. Its diff scan covered 34 tracked files and did not include every untracked new feature file. Do not describe this scan as a clean pass.

## Chrome evidence

Google Chrome on `http://127.0.0.1:20016`, authenticated synthetic buyer and owned SQL:

- Listing `/buyer/browse/7` displayed actual SQL listing specifications and private laboratory report metadata with batch/date/result/download links.
- Listing referral form showed testing scope to be confirmed, four generic concern groups, turnaround preferences, company-private default, no charge/booking promise and required batch caveats.
- Submitted listing referral LAB-4, returned persisted confirmation and appeared on the listing.
- Submitted sample request 3 with testing selected; reused the form with explicit sample linkage; persisted LAB-5 and sample confirmation.
- Buyer Documents displayed real requests/reports and private/shared labels. Sharing report 1 changed the visible label to shared.
- Withdrawal opened the browser confirmation explaining immediate access removal. The Mac locked before that confirmation could be completed. Do not count withdrawal as browser-verified; server-side withdrawal is verified by SQL tests.

Remaining real-SQL Chrome stories: complete withdrawal (including cancelled request), admin queue and PDF upload/notifications/panel draft screens, and narrow viewport. A synthetic report may remain shared in the dedicated local fixture database; it contains no business data.

## Review and publication boundary

Claude reviewed backend/shared files and found a real PDF compatibility defect, missing notification timestamp, and cancelled-upload behavior. Codex fixed these, aligned public report visibility with available listings, and excluded suspended staff. Focused reciprocal re-review accepted the final hashes; see `LAB_BACKEND_RECIPROCAL_REVIEW_2026-09-09.md`. PDF parsing uses pinned pdf-lib 1.17.1 with parsed-dictionary checks, including compressed object streams. This is not malware certification; downloads remain authorized attachments with no-store/nosniff.

Codex reviewed frontend integration and required company-private copy, real requester identity, shared API types, persisted admin notifications, removal of unsupported sample conversion, and sharing controls after cancellation. Owner fixes are integrated; see `LAB_FRONTEND_RECIPROCAL_REVIEW_2026-09-09.md`.

Before any separately authorized live release: reconcile with the newer live baseline, verify intended internal admin memberships carry admin_override, apply additive migrations to the intended database, then repeat authenticated production checks. Laboratory review and actual partner arrangements remain business prerequisites before publishing panel scopes. Nothing was committed, pushed or deployed.

## Runtime cleanup

Completed frontend/review workers were released and the coordinator shell closed. Owned API/web foreground processes exited after Ctrl-C. The dedicated SQL container stopped successfully through its owner helper (status exited, schemaReady true), preserving its data volume and fixtures. Browser verification can resume after the Mac is unlocked and the owned services are restarted.

## Chrome walkthrough addendum

At the user's request, restarted the owned SQL/API/web services and opened Chrome. Visually inspected the buyer listing referral form (screenshot), sample testing entry, and persisted buyer Documents reports. Signed into the synthetic staff account through the normal login UI; opened the actual lab queue and LAB-4, saved assignment to EcoGlobe Administrator and an internal walkthrough note, observed Saved, navigated away and reopened the request with the assigned owner retained. Inspected all four panel families at draft v1 with no review metadata, and actual persisted lab referral notifications. No laboratory was contacted and no panel was published.

Chrome is left on `/admin/lab-testing` with LAB-4 selected, marked as the user-facing deliverable. The owned SQL container and API/web services remain running for the requested walkthrough (API session 12489, web session 3264, local web port 20016). This supersedes the prior runtime cleanup state. Remaining pending browser tests were not represented as completed by the walkthrough.

## Queue row-selection correction

Whole-row clicks now select the request and update the right-hand details region; native LAB buttons remain keyboard accessible. Selected rows are highlighted. Desktop split begins at 1024px, with bounded table scrolling and sticky details. Claude implemented the one-file change and passed targeted ESLint and web types; Codex reviewed the exact diff and integrated matching bytes in primary and the running checkout. Chrome verified clicking LAB-7 owner and LAB-4 turnaround cells updates the corresponding region, Enter selects LAB-5, and at 1200px the details remain right of the table without page overflow. Restored normal viewport and left LAB-4 open. Final queue hash: 4d60d85f5fa6beb413a9803a3a66719cae4dc8f325c0da125a082e76d5deb5c9. No backend changes; previous backend/SQL/build evidence is carried forward.

## Request form screenshot alignment

Matched user reference `codex-clipboard-28751445-ad26-4238-ac89-72f9f3c0ceca.png` with a full-viewport presentation: gray background, 1340px maximum content, 2.3:1 form/guidance grid, white rounded form card, four guidance cards, outlined concern groups, larger turnaround tiles and sharing cards, full-width submit. Both listing and sample hosts use the same presentation. Draft assays remain internal, and company-private default, consent validation, scope snapshots and idempotent submission are unchanged. Four files reviewed by Codex and integrated byte-for-byte from Claude's isolated checkout; hashes updated.

Checks: frontend owner reported web/test types, focused ESLint, 20 frontend tests and 10 mocked lab browser stories passing. Coordinator ran production web build with NODE_ENV=production: exit 0. No backend source or SQL schema change; previous backend/SQL checks carried forward.

In-app browser: inspected the full-page form at 1342px against the reference screenshot; all four guidance cards rendered beside the form and exactly four generic concern checkboxes appeared. At 390px, dialog clientWidth and scrollWidth both 390, guidance stacked below the form. Selected Processing behaviour and entered a synthetic concern, submitted and observed private LAB-1002 confirmation. Created synthetic sample 1002, observed linked testing form with the same guidance, submitted and observed final sample/testing confirmation. No outside laboratory contact or shipment. Restored browser viewport and left a fresh redesigned listing form open. Services remain running for user review.
