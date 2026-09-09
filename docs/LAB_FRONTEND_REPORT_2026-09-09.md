# Lab testing referral — frontend implementation report (2026-09-09)

Worker task `task_e2047f443e8d`, dispatch `ctx_b5f6c5c01d02`. Worktree `codex-ana-frontend`, base `cbf740d` plus the retained Ana corrections (all preserved; none reverted). Scope: `apps/web/**`, `tests/e2e/lab-testing.spec.js`, this report. No commit, push, deploy, Azure or shared-database writes, no edits to `packages/shared` or the backend. No laboratory was contacted and no example panel was published or seeded from the frontend.

Source: `docs/LAB_TESTING_PLAN_2026-09-09.md`, the source deck text and five mockups under `/private/tmp/ecoglobe-lab-source` (requirements only). Contract: the backend-owned `/api/lab` contract (`../codex-ana-backend/docs/LAB_API_CONTRACT_2026-09-09.md`, types `packages/shared/src/lab-api.ts`). My earlier `/api/lab-testing` proposal (msg_b977bcc0f770) was withdrawn after coordinator steering (msg_5a8eada9a476, msg_ae36a297b0ea); acknowledgment msg_fe3d594f24eb.

## What was built

- **Typed client** `src/lib/lab-testing-api.ts` mirrors the shared lab types field-for-field (`LabConfig`, `LabRequestWrite`, `LabRequest`, `LabAdminRequest`, `LabPanel`+`review`, `LabReportWrite`, `LabReport`) and the contract endpoints: `GET /api/lab/config`, `POST/GET /api/lab/requests`, `PATCH /api/lab/requests/:id/sharing`, `GET /api/listings/:id/lab-reports`, `GET /api/lab/reports/:id/file`, `GET/PATCH /api/admin/lab/requests[/:id]`, `POST /api/admin/lab/requests/:id/reports`, `PATCH /api/admin/lab/reports/:id`, `GET /api/admin/lab/assignees`, `GET/POST /api/admin/lab/panels`. All lab fetches use `cache: "no-store"`. **Integration note:** replace the local type block with `import type {...} from "@eco-globe/shared"` once the shared export lands; the field names already match.
- **Pure helpers** `src/lib/lab-testing.ts` (+ 8 node tests): form validation (turnaround required; explicit consent checkbox required before a shared request leaves the browser), scope cleaning (sorted, deduplicated `optionalTestIds`), idempotency key generation/validation (`[A-Za-z0-9_-]{16,100}`), status/turnaround/sharing labels, customer progress copy that never names a price or duration, `describeTestedBadge` ("Independently tested — laboratory, date" + batch/sample date; never "EcoGlobe certified"), report-form validation (real laboratory name, batch reference, non-future ISO dates with report ≥ sample, 1–4 actual results, safe `.pdf` filename, PDF signature, ≤ 5 MiB), panel publish blockers (laboratory, reviewer, date, evidence, tests, material mapping).
- **Reusable accessible form** `src/components/lab-testing/lab-testing-form.tsx` and modal host `lab-testing-dialog.tsx`: listing context line from the config; standard panel chips only when the config returns a published panel, otherwise "Testing scope to be confirmed"; four optional groups (processing behaviour / contaminants & safety / regulatory & compliance / consistency) each with its plain-English question, rendering the backend's generic concern checkbox for unpublished panels or named add-on chips for published ones; "Something not listed?" textarea; turnaround radio group (Standard / Expedited / Not urgent, "no duration is promised"); sharing radio group defaulting to **private**, with an explicit consent checkbox when "Share with the seller and the listing" is chosen; both warnings ("This does not replace your own testing", "Results describe a batch"); "Nothing is charged now" footer; no price. Error summary is `role="alert"`, focusable, with links to the offending fields; backend failures show Retry (same idempotency key, entries kept), 401 shows a sign-in link, 409 (scope changed) reloads the config and allows resend. Dialog: `aria-modal`, labelled heading, focus trap, Escape closes, focus returns to the opener, full-screen sheet under 640 px.
- **Entry point 1 — listing analysis area** `listing-analysis.tsx` on the public and buyer product pages (between Specifications and Overview): shared/published reports as batch cards with the tested badge, up to four headline results, batch context and an authorized download link through the proxy; otherwise "No independent analysis on this listing yet" and the **Request lab testing** button (members with an active company who are not the seller). The requester's own open requests show their status and progress line. Sellers viewing their own listing see reports only; anonymous visitors see shared reports and a sign-in prompt. `lab-report-card.tsx` is shared by every surface.
- **Entry point 2 — sample request** `src/components/samples/request-sample-modal.tsx` (ported from live 01a0e593 with the live field set) plus `src/lib/api-samples.ts` (ported client on the typed backend client, always sending an `idempotencyKey`). The modal carries the single line "Have this lab tested too?"; after the sample is created the same referral form opens with `sampleRequestId` linked, and the success screen offers the lab step when it was not ticked. The "Request a Sample (5–10 lb)" button is placed under Buy Now / Add to Cart as in the live revision; no checkout placement and no new buyer/seller navigation.
- **Documents**: `lab-reports-section.tsx` inside the existing buyer and seller Documents pages. Buyers see each request, progress, attached reports and a "Withdraw sharing" / "Share…" control (`PATCH /sharing`, confirmation before withdrawal). Sellers see shared, published reports per published listing (`listing-lab-reports.tsx`), which also appears in the seller listing detail Documents tab. Admin Documents links to the queue.
- **Internal admin queue** `/admin/lab-testing` (`lab-testing-queue-page.tsx`, sidebar entry in the Core group): status filter, table (request, listing/panel version, source listing vs sample, turnaround, sharing, owner, status), detail panel with the full ticked scope and free-text concerns, owner assignment from `/assignees`, status select (warns that Completed needs a report), internal notes, save with retry; report attachment form with laboratory name, batch reference, sample/report dates, 1–4 label/value/unit results, PDF input validated by signature and size before base64 upload, publish toggle explained as "shown publicly only while the requester's consent is shared", and per-report publish/withdraw.
- **Draft panel editor** `/admin/lab-testing/panels` (`lab-panels-page.tsx`): families with immutable versions and statuses, "New version from latest", editor for family code, name, material type codes (known codes listed from `/api/lookups` when available), standard tests, grouped add-on tests, and the laboratory review block (laboratory, reviewer, date, evidence). "Publish version" is blocked client-side until every review field, at least one test and one material mapping exist; the backend 400 is surfaced otherwise. Amber banner states drafts are internal and customers see "scope to be confirmed". No example panel is created by the UI.
- **Proxy** `app/api/backend/[...path]/route.ts`: 60 s upstream deadline for `POST /api/admin/lab/requests/:id/reports`; `Cache-Control` was already forwarded and upstream fetch is `no-store`.

## Verification run here

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` (apps/web) | pass |
| `pnpm exec tsc --noEmit -p tsconfig.test.json` | pass |
| `node --test src/lib/*.test.ts` | 18/18 pass (8 new lab tests) |
| `pnpm exec eslint src` after the inbox additions | 0 errors, 52 warnings (unchanged baseline) |
| `pnpm exec eslint src` | 0 errors, 52 warnings (all pre-existing `img`/hook-deps classes; baseline 52) |
| `pnpm exec next build` | pass; routes `/admin/lab-testing`, `/admin/lab-testing/panels` generated (152 pages) |
| `git diff --check` | clean |
| `tests/e2e/lab-testing.spec.js` (10 mocked-backend scenarios, Chromium) | **10/10 pass** against a temporary `next dev` on 127.0.0.1:20021 started and stopped (SIGINT) by this worker |

Spec scenarios: anonymous visitor sees the shared report, tested badge, batch line, download href and sign-in prompt but no request button and no "EcoGlobe certified"; buyer form defaults to private, shows scope-to-be-confirmed and both warnings, has no `$` amount, blocks a shared request until consent is ticked, retries a 503 with the **same** idempotency key and posts the contract body (`panelId/panelVersion` null, sorted `optionalTestIds`, `turnaround`, `sharing`); sample placement posts the sample with an idempotency key, then the lab request with `sampleRequestId: 55`; 390 px viewport with no horizontal scroll, keyboard open, Space toggles the first group, Escape closes and focus returns; buyer Documents lists a completed request with its report and withdraws sharing via `PATCH …/sharing {sharing:"private"}`; admin queue saves `{status, ownerUserId, notes}`, rejects an empty report form, rejects a non-PDF by signature, and uploads a real PDF whose decoded base64 equals the file with 1 result and `published:false`; panel editor blocks publishing without review evidence and material mapping.

Not performed here (coordinator-owned): SQL-backed runs, real authenticated internal-admin sessions, backend 409 same-key/different-payload behaviour, download authorization by role, screenshots.

## Assumptions and open items for reciprocal review

- `LabConfig.panel.name` is used as the category label in the form heading; when `panel` is null the heading is "Standard panel" with the to-be-confirmed note. `optionalTests` ids ending in `-concern` are treated as the generic group question (one checkbox per group); any other ids render as chips inside their `group`.
- The consent checkbox is a UI confirmation only; per contract the explicit `sharing:"shared"` choice is the recorded consent.
- Requester requests on the listing page come from `GET /api/lab/requests?listingId=`; 401/403 is treated as "no requests" so reports still render.
- Seller Documents fetch `GET /api/listings/:id/lab-reports` per published/paused listing (N calls; acceptable for seller list sizes).
- Report card shows at most four results (the contract caps at four). Cards label state as "Shared on the listing" only when `sharing === "shared" && published`.
- The admin listing detail page remains the pre-existing static mock; lab data was not added there because it has no live listing binding.
- `@eco-globe/shared` import switch and the sample/lab backend routes are integration dependencies (backend port of `/api/sample-requests` per contract).


## Inbox additions (coordinator msg_e3c361ded0f0 and msg_01a4ac12c312, same dispatch)

- **Sample listing/status panel** `src/components/samples/sample-requests-panel.tsx` ported from live 01a0e593 into the existing buyer Orders page (above the tabs) and seller Sales page (above the stats), exactly where the live revision placed it. Seller: Accept / Decline on requested, Mark shipped on accepted with an inline optional tracking-number field (replaces the live `window.prompt`, which would block automation). Buyer: Mark received on shipped, plus a "Lab testing" button that opens the same referral form linked to that sample, and a plain "View listing" link. The live "Order in bulk" conversion action is **removed** because the local checkout has no sample-conversion hook; nothing broken is left in place. `api-samples.ts` gained `updateSampleRequest` (`PATCH /api/sample-requests/:id` with the contract's `{status, sellerResponse, trackingNumber}`). The panel hides itself when the caller has no samples or no company session, and shows loading/error/retry otherwise.
- **Actual staff lab notifications** `src/components/admin/lab-notifications-section.tsx` on the existing admin Notifications page, above the demo groups, which are now labelled "Demo activity (sample data)". It reads `GET /api/notifications?userId=<signed-in id>&categoryCode=orders` through `src/lib/api-notifications.ts`, keeps rows whose subject is the backend's "Lab testing referral received", shows subject, body, date, listing id and the LAB-n reference parsed from the body, links to `/admin/lab-testing`, offers Retry on error and "Mark read" via `PATCH /api/notifications/:id {notificationStatusCode:"read"}`. Copy states these are in-app rows and no email is sent.
- Browser scenarios 8–10 cover both panels (buyer receipt + lab entry + absence of bulk conversion; seller accept → shipped with tracking) and the notifications section (503 → Retry → rows, unrelated subjects filtered, queue link, mark read, demo label present).

## Review fix after worker_done (msg_88fabb4f2ff1, same dispatch)

- `LabAdminRequest` gains optional admin-only `companyName`, `requestedByName`, `requestedByEmail` (backend owns the shared type). The queue table and detail render them via `describeRequester` (company name, person, mailto link); the fallback is `Company #id` plus "Requester contact not supplied by the backend." No automatic emailing.
- Private sharing option now reads "My company only" (colleagues can open it); report cards say "Private to the requesting company only".
- Re-verified: tsc, 19/19 node tests, eslint 0 errors / 52 warnings, next build, `tests/e2e/lab-testing.spec.js` 10/10 (admin scenario now asserts the requester identity and mailto link). Temporary dev server on 20021 started and stopped again.

## Dispatch ctx_dd7ca7342c2e (task_1516be6bf54e): shared types wired

- `apps/web/src/lib/lab-testing-api.ts` no longer declares the lab API types. It imports and re-exports `LabSharing`, `LabTurnaround`, `LabRequestStatus`, `LabOptionalTest`, `LabPanel`, `LabConfig`, `LabRequestWrite`, `LabResult`, `LabReport`, `LabRequest`, `LabReview`, `LabPanelWrite`, `LabReportWrite` from `@eco-globe/shared`; `LabGroupCode` and `LabPanelStatus` are derived from the shared types. The only local extension is `LabAdminRequest = SharedLabAdminRequest & { companyName?, requestedByName?, requestedByEmail? }` because the backend shared type does not yet carry the requester identity requested in review (msg_88fabb4f2ff1); the queue falls back to `Company #id` and an explicit "not supplied" note. Delete that extension once the shared type has the fields.
- With coordinator authorisation the backend-owned `packages/shared/src/lab-api.ts` (sha256 `765fa5e4…7dc7a`) and `packages/shared/src/index.ts` (sha256 `afea875e…aac13`) were copied byte-for-byte from `../codex-ana-backend` into this worktree for type-checking only; their source was not changed. `packages/shared/src/listing-api.ts` was already identical.
- Both usability corrections are in place: private sharing title "My company only" (form and labels; no "To me only" remains) and admin-only requester identity in the queue table (`describeRequester`) and detail (company, person, mailto link, safe fallback).
- Focused checks after the change: `tsc --noEmit` (apps/web), `tsc --noEmit -p tsconfig.test.json`, `tsc --noEmit` (packages/shared), 19/19 node tests, eslint clean on the lab files, `next build` (152 pages), `git diff --check`.

## Changed-file manifest (sha256; "before" is the pre-edit snapshot taken before any change in this task)

| File | Before (sha256, pre-edit snapshot) | After (sha256) |
|---|---|---|
| `apps/web/src/lib/lab-testing-api.ts` | (new) | 24024cd9c667b211fc1043c7e84b9b0f577fceba13b75d1d77ef27a0a7e730ba |
| `apps/web/src/lib/lab-testing.ts` | (new) | d3ce205fe4dca6d37e8ea6e6c55ea7f36054e22e11885b8663ceffefe7e2736c |
| `apps/web/src/lib/lab-testing.test.ts` | (new) | f445fcca30571bd955f712255bcae75ccce31124a23b48e7a7855cde69c9ae93 |
| `apps/web/src/lib/api-samples.ts` | (new) | 6935a634c71cdf92467c17b7f3df3e6a538f1d7b56959df23faebc51be9d3a55 |
| `apps/web/src/lib/api-notifications.ts` | (new) | d31751f8e67b566a93adf5cb10a891443f1a4be0d315da55bf26e605b88c0020 |
| `apps/web/src/components/lab-testing/lab-testing-form.tsx` | (new) | aadcce88051c32b1ca24306ca12745722aa3e87552828c51c2291cf9a2dcfb9c |
| `apps/web/src/components/lab-testing/lab-testing-dialog.tsx` | (new) | 98976c5b70cc5af3003953eb1c0a090e7affed7ce12643a068e42ab82658b86f |
| `apps/web/src/components/lab-testing/lab-report-card.tsx` | (new) | eb78898b9785dd965a0a949651d60217ccd80dc6a8d30545710e759894b2fd25 |
| `apps/web/src/components/lab-testing/listing-analysis.tsx` | (new) | 7e756c13d9a528d26a7208c307b8faa15a5e168be508654cc2688c4ad84d482d |
| `apps/web/src/components/lab-testing/listing-lab-reports.tsx` | (new) | 127b20de6551a927c6581a3742ec2c61943589b95b8df6b25e69c5e3ff752853 |
| `apps/web/src/components/lab-testing/lab-reports-section.tsx` | (new) | 2e8ee2bb99809e512952174ed6a0aa6e414976f295bb41ba67cb646eb3068363 |
| `apps/web/src/components/samples/request-sample-modal.tsx` | (new) | 79b450c528d3384e0f71b9bf305fd1c6fb5797489895c13e01de6750c92978b4 |
| `apps/web/src/components/samples/sample-requests-panel.tsx` | (new) | d18c3c0cb2b346a4f3f9fb6582059fabe2d0366b1ee9cfaa55ad57b523633de2 |
| `apps/web/src/components/admin/lab-testing-queue-page.tsx` | (new) | 467e66dfff15c506eafa5e4eb58eb70a2ce04a05956558d1d6a60a31e8749f13 |
| `apps/web/src/components/admin/lab-panels-page.tsx` | (new) | 8097fbce0ec70421338eabd07a2f9e300cb90dc1c09acb261baf77a6451b2943 |
| `apps/web/src/components/admin/lab-notifications-section.tsx` | (new) | f28a8ddf460743cb8c945d62cc65f9ef1a40dacc2c4ac194737d56df33150918 |
| `apps/web/src/components/admin/notifications-page.tsx` | (committed base, unmodified before this task: 8f861abaa29382cd9c8551812137c02e8027dd39f8c20296b68d92db0cab8682) | 085fe4486ff3965acfdc4bdde19b13d2e226bf9ab9703c8a3ce1495bf07be1ee |
| `apps/web/src/app/(admin)/admin/lab-testing/page.tsx` | (new) | 67e03a6e1669fdaf8e8bdfcd6b9e1f5808c61db68973ca13d91674f579361a2b |
| `apps/web/src/app/(admin)/admin/lab-testing/panels/page.tsx` | (new) | 6f1cda729ebea91bf9134bba78dba039f013040eb38556763975e1f7667adb9b |
| `apps/web/src/components/admin/admin-sidebar.tsx` | (committed base, unmodified before this task: ca7fdf25e93e60a79cabafe46485ded2ee57215cf91fc21d658bb3c80ebae688) | e401dcbe2f8a18d4d656896ef644be3ee290ff936394fb8608bce08be1ae70bb |
| `apps/web/src/components/buyer/buyer-product-detail-page.tsx` | a63b7444e54d3420fe11432be6d53bb3c567a143161d284c75c691b6e6554e53 | 1588f36ad2bde3b70d118fd62705addd8d59a994ad5a7a82b389676295c23b08 |
| `apps/web/src/components/buyer/buyer-orders-page.tsx` | (committed base, unmodified before this task: ee108af899de34d4df4d89409aa2b99b55c12d8646b7b186247796543fa5bc7f) | bd3179d76a755a2b885f4433cc05a54ce15ab7156c31fe823b821b121e269808 |
| `apps/web/src/components/public/product-detail-page.tsx` | 3f55bfc4e009ec80100ef9af1d3a09c62f9926ab2969d489ad62c3216e619380 | e5b7792f829c1423eb89454ea7789c846dd108e1dfc6ef396b8928ed1bb843a5 |
| `apps/web/src/components/seller/listing-detail-page.tsx` | 00311e48e51465a9a4c6c1c4ec7b448c49f8093ee88d4e16705da62eb4c155f7 | 00656b43670e578c23ff72aa2efa019640c160cad5a0aff6bafb00b55bf93123 |
| `apps/web/src/components/seller/sales-page.tsx` | (committed base, unmodified before this task: d0cb22f935fb7caa1aae8d95156e03b275661bab06fcfded236c837c86793b99) | df5cedd07fdceb4bf614b2988166da5797df709bd0ecfe72071edc9b1d4b51e4 |
| `apps/web/src/components/documents/documents-center.tsx` | (committed base, unmodified before this task: b2df8f4dd4ef641dac35df681c6510360e77e1bca570d79025778150d0d0e58b) | e435329fae576d4dd74a426e7cad3003f1b61ec99057474d6a1e8537dbb25774 |
| `apps/web/src/app/api/backend/[...path]/route.ts` | a4f933fc539f85fc1dc4aa57f3eeb71d5f0e4149176d7f5bc54c3b5f9a6beb3e | aef363d3c7cc7b9eba51532092256d8996fe8e126ca8cca497bcbefa5dce9299 |
| `apps/web/tsconfig.test.json` | b5ebbc68bc402ed7feb0860c71a2fbb7227fe809de2fdc8a0e2242b889543678 | a13cafd8707e6743dfa4edd6742a00c1190736c194ea9d1a2270404ae153a7e9 |
| `tests/e2e/lab-testing.spec.js` | (new) | 3a8572857d1ecd3c99d2477c2828c1b662dee165389fe2fed86114293ad03c1f |
| `docs/LAB_FRONTEND_REPORT_2026-09-09.md` | (new) | see `shasum -a 256` after final save |

Unchanged retained Ana files keep the hashes in `docs/ANA_CORRECTIONS_FILE_HASHES_2026-09-09.json`. The full pre-edit snapshot of every previously modified apps/web file is in the worker scratchpad `before-hashes.txt`.

Copied for type-check only (backend-owned, unchanged source): `packages/shared/src/lab-api.ts` 765fa5e43bd585d45b098b6492c6dcdfbb8046a381c7c6b8ceff750c9f17dc7a, `packages/shared/src/index.ts` afea875e567027187c72b2ba2ae0c42604b727c5baabd483fae712a5ec6aac13.
