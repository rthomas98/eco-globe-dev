# Lab MVP backend reciprocal review — 2026-09-09

Reviewer: Claude (frontend owner), Orca task `task_0192dc233a57`, worktree `codex-ana-frontend`.
Scope: backend/shared lab and sample changes in primary `/Users/robthomas/Development/eco-globe` against `docs/LAB_API_CONTRACT_2026-09-09.md` and `packages/backend/db/schema.sql`. Read-only review of primary; no backend or primary files edited.

## Reviewed files (sha256, all match `docs/LAB_TESTING_FILE_HASHES_2026-09-09.json`)

| File | sha256 |
|---|---|
| packages/backend/src/lab-routes.ts | 6373c671ee6c911c3c213a7ad5fe4f52d0d7f24c00430715ea1cba79a9d80cac |
| packages/backend/src/lab-validation.ts | dcf2492cdf0196e096691360ca273e11c19e318fb6500223f066240ced0b072c |
| packages/backend/src/sample-routes.ts | fa95a5b16746c4f88634df0960ec214ef8a3390896a9fa57745593cf686ec659 |
| packages/backend/src/lab-routes.test.ts | 47c1a1f3acc631be3e071da3b2221e26fd760718de3c697518d4031223425a48 |
| packages/backend/src/api.ts | 7d41b7e72a2643209f09bb65d3c68f6467ae9333a3c26a60d7dbcac09d595d18 |
| packages/backend/package.json | c540566679aee17b73efe76fff3c03df913d83a4079476b21da375de841de566 |
| packages/backend/db/migrations/20260909_lab_testing.sql | 872df53351e833b1ec90ed1e43f9c063f1576b65022d94eb494f349e7af1248e |
| packages/backend/db/migrations/20260831_sample_requests.sql | f2ea3024121fc81d846c9c7021769b7010fc30bc0bf49a19c0934e812df6f17f |
| packages/shared/src/lab-api.ts | 8f84a52829ef20d54c84001496d2c7dea869a03d7382309ac4c6ac1c23268d95 |
| packages/shared/src/index.ts | afea875e567027187c72b2ba2ae0c42604b727c5baabd483fae712a5ec6aac13 |
| docs/LAB_API_CONTRACT_2026-09-09.md | caee0523392e28b2cbf97cb349f71fab89437c8b4b98dad9a0e55bd206861eca |
| packages/backend/src/auth.ts (not in manifest; lab-relevant diff reviewed) | b46c8177d9b5adec5cce284d5710237af2fb775948d9b0d8d027318091530368 |
| packages/backend/src/http.ts (not in manifest; lab-relevant diff reviewed) | b3c4bc6580c0a43b4824a1ed2846f53745e040b373b9ded490f70a54383983fd |

## Verdict

Access policy, revocation, admin_override gating, idempotency, panel versioning, SQL column names and joins, and notification persistence all match the contract and schema. One blocking finding: the hand-written PDF validator rejects ordinary real-world PDFs. The rest are medium/low and can ship behind the coordinator's SQL and browser checks.

## Findings

### F1 — High: PDF validator rejects legitimate PDFs (blocks the report upload flow)

`packages/backend/src/lab-validation.ts:233-238` scans the raw latin1 bytes of the entire file, including compressed stream data, for `#[0-9a-f]{2}`. Random compressed bytes hit that pattern roughly once every 35 KB, so any PDF with an embedded image, font, or large content stream is refused with "Active or encrypted PDF files are not supported."

Evidence, run locally with `tsx` against a copy of the primary validator (no backend or DB touched):

| Fixture | Result |
|---|---|
| macOS Quartz text PDF, 12 KB, classic xref | PASS |
| macOS Quartz image PDF, 4 KB, classic xref | PASS |
| Classic-xref PDF with one 300 KB FlateDecode image XObject (same object layout as the test fixture at `lab-routes.test.ts:23-41`) | FAIL — 14 `#xx` hits inside the stream, "Active or encrypted PDF files are not supported." |

Three further rules refuse whole classes of ordinary laboratory PDFs:

- `lab-validation.ts:234` rejects the names `/XRef` and `/ObjStm`, and `lab-validation.ts:243-251` requires a classic `xref` table at `startxref`. Every PDF 1.5+ file written with cross-reference streams (Word, Chrome print, Acrobat, most LIMS exports) fails with "PDF cross-reference is invalid".
- `lab-validation.ts:252-260` accepts a single `0 N` subsection only, so incrementally updated or digitally signed PDFs (`/Prev` chains, partial subsections) fail with "Unsupported PDF cross-reference format" or "Invalid PDF object table".
- `lab-validation.ts:225` requires `%%EOF` at end of file with only whitespace after; some producers append bytes.

The active-content scan is also not a real safety control: JavaScript or launch actions inside a Flate-compressed object stream are invisible to a byte regex, so the check blocks safe files while a crafted file still passes. Recommendation: parse with a real PDF library (for example `pdf-lib` `PDFDocument.load`, which throws on encrypted files, then inspect the catalog for `/OpenAction`, `/AA`, `/Names` → `/JavaScript`, `/EmbeddedFiles`), keep the header, size, and base64 round-trip checks, and drop the raw `#xx` / `/XRef` / `/ObjStm` rejections. Add a Flate-stream fixture and an xref-stream fixture to `lab-routes.test.ts`, since the current fixture at lines 23-41 is a minimal hand-built file that cannot detect this.

### F2 — Medium: internal referral notifications never get `SentAt`

`lab-routes.ts:201-204` inserts internal referral notifications with status `sent` but no `SentAt`, while `notifySampleCompany` at `lab-routes.ts:240-241` sets `SentAt=SYSUTCDATETIME()`. The admin notifications page reads `sentAt` (`apps/web/src/lib/api-notifications.ts:17`). Add `SentAt` to the internal insert for consistency with the status code.

### F3 — Medium: report upload ignores request status

`lab-routes.ts:368-374` only checks that the request exists, then `lab-routes.ts:393-395` unconditionally sets `Status='completed'`. A report can be attached to a `cancelled` request, silently reopening it as completed. Reject uploads when the current status is `cancelled`.

### F4 — Medium: admin_override gate is a live regression surface

`auth.ts:128-132`, `auth.ts:698-702`, `auth.ts:720-722` now require `MemberRoles.Code='admin'` AND `PermissionTiers.Code='admin_override'` for the admin role, and `auth.ts:785-793` invalidates sessions whose active role is no longer authorized. This is correct per the contract, but any existing internal admin member row on the shared database that carries a different tier will lose admin immediately on deploy, and their open sessions will start returning 401. Before deploy, the coordinator's SQL check should confirm every intended internal admin has `admin_override`. `api.ts:1647` correctly blocks non-admins from granting `admin_override` on member creation; I found no member-update path that changes the tier.

### F5 — Low: public report visibility does not require available quantity

`lab-routes.ts:345` `reportAccess` public branch checks `Sharing='shared'`, `Published=1`, listing `published`, seller not inactive. `publishedListing` at `lab-routes.ts:81` additionally requires `l.Quantity>0`. A sold-out published listing therefore still exposes shared reports anonymously. If the public listing page hides zero-quantity listings, add `l.Quantity>0` to the public branch so the two definitions of "publicly visible listing" match.

### F6 — Low: NVARCHAR(MAX) parameters against VARCHAR indexed columns

`lab-routes.ts:36-40` binds every string as `NVarChar(MAX)`. Comparisons against `LabRequests.IdempotencyKey VARCHAR(100)` (`lab-routes.ts:270`), `SampleRequests.IdempotencyKey` (`sample-routes.ts:107`), `LabPanels.FamilyCode` (`lab-routes.ts:447-458`), `MaterialTypes.Code` (`lab-routes.ts:426`) and `Status`/`Sharing` force implicit conversion of the column side and can defeat seeks on `UQ_LabRequests_Retry` and `UX_SampleRequests_Retry` under SQL_* collations. Small tables today; consider a `VarChar(n)` helper for code and key columns.

### F7 — Low: applock timeout surfaces as 500

`lab-routes.ts:265`, `lab-routes.ts:420`, `sample-routes.ts:102` raise `THROW 50001` when `sp_getapplock` times out after 10 s. That is a plain SQL error, so `index.ts:1010` returns 500 rather than 409/503. Acceptable for MVP; consider mapping.

### F8 — Low: sample PATCH is not idempotent for repeated status

`sample-routes.ts:68-69` returns 409 when `status` equals the current status (no self transition). A double-submitted "Accept" yields an error toast instead of a no-op. Frontend guards the button, but a 200 no-op when `from === to` would be friendlier.

### F9 — Low: non-GET on public lab paths returns 401 instead of 404/405

`lab-routes.ts:555-561` only handles GET for `/api/lab/config`, listing lab-reports and file paths. POST or HEAD on those paths falls to `requireSessionAuth` (`lab-routes.ts:600`), so anonymous callers see 401 and authenticated callers see 404 "Lab endpoint not found". Cosmetic. OPTIONS preflight is unaffected (`index.ts:911` handles it first).

### F10 — Low: report date validation is UTC-day based

`lab-validation.ts:53` compares against the server's UTC date. A laboratory ahead of UTC uploading a report dated "today" can be rejected as future for part of the day.

### F11 — Informational

- `lab-routes.ts:422-431` rejects unknown material codes on drafts too. Contract only requires published mappings to be real; stricter is fine, just noting for the panels UI error text.
- `lab-routes.ts:166-170` runs one report query per request in list projections (N+1). Fine at MVP volume.
- `sample-routes.ts:42-45` generates a random idempotency key when the client omits one, so an omitted key silently loses retry protection. Frontend always sends it.
- `lab-routes.ts:65-69` staff query excludes `inactive` users but not `suspended`. Consider `NOT IN ('inactive','suspended')`.
- `lab-routes.ts:516` notes replace rather than append; the prior value is only recoverable from the previous `admin_updated` event body. Matches the contract wording.

## Contract and schema checks that passed

- Private/shared/anonymous access: single predicate `reportAccess` (`lab-routes.ts:345`) used for both metadata (`lab-routes.ts:350`) and file bytes (`lab-routes.ts:578`); anonymous gets `@company=NULL`, `@admin=0`; invalid supplied bearer is 401 via `lab-routes.ts:559-561`; unauthorized file is 404 (`lab-routes.ts:586-587`). Seller of the listing has no private branch. Revocation (`lab-routes.ts:643`) and publication withdrawal (`lab-routes.ts:696`) are read live, so removal is immediate.
- Requester list and reads strip `ownerUserId`, `notes`, `companyName`, `requestedByName`, `requestedByEmail` unless admin (`lab-routes.ts:155-179`, `readRequest` binds `@admin` only when both requested and `auth.isAdmin`).
- Admin routes: `requireSessionAuth` then `requireAdmin` (`lab-routes.ts:600-602`); `isAdmin` derives from revalidated `activeRoleCode='admin'` (`auth.ts:819`), which now requires `admin_override` (`auth.ts:128-132`). Assignees and owner validation share `staffQuery` (`lab-routes.ts:65-69`, `lab-routes.ts:499`).
- Draft non-disclosure: public config selects `Status='published'` only (`lab-routes.ts:118`); drafts and `review` only appear in `panelProjection(row,true)` on admin paths. Seeded example panels are `draft` with empty mappings (`20260909_lab_testing.sql:58-69`).
- Versioned config: append-only insert with `MAX(Version)+1` under an applock (`lab-routes.ts:420`, `lab-routes.ts:456-458`); publishing retires the previous published version (`lab-routes.ts:446-449`); cross-family duplicate mapping is 409 (`lab-routes.ts:437-445`); `UX_LabPanels_Published` and `CK_LabPanels_Publication` back this at the schema level; `ReviewedByUserId` is set only when review is present (`lab-routes.ts:467`). Request creation pins `panelId`/`panelVersion` and returns 409 "scope changed" on mismatch (`lab-validation.ts:142-146`).
- Idempotency: canonicalized body (sorted `optionalTestIds`, trimmed strings) hashed; transaction-scoped applock keyed by company and key (`lab-routes.ts:264-267`); identical retry returns 200 with the same envelope, different payload 409 (`lab-routes.ts:274-281`); `UQ_LabRequests_Retry` and filtered `UX_SampleRequests_Retry` back it. Sample POST mirrors this (`sample-routes.ts:101-121`).
- Own listing rejected (`lab-routes.ts:283-284`, `sample-routes.ts:123-124`); sample ownership checked by company and listing (`lab-routes.ts:286-298`); listing must be published, seller active, quantity > 0 (`lab-routes.ts:76-81`).
- SQL column names and joins verified against `schema.sql`: `Users.Name/Email/AccountStatusId`, `Companies.LegalName/VerificationStatusId`, `Listings.LocationId/MaterialTypeId/ListingStatusId/Quantity`, `Locations.City/StateProvince`, `MaterialTypes.IsActive`, `Orders.BuyerCompanyId/ListingId`, `Notifications` columns incl. nullable `UserId`/`CompanyId`, and seed codes `in_app`, `orders`, `sent`, `listing`, `inactive`, `admin_override`, `published` all exist. `CHAR(64)` hash columns compare cleanly with 64-char hex.
- Notifications: internal referral fan-out to active `admin_override` staff via `dbo.Notifications` (`lab-routes.ts:193-212`), sample party notifications by company (`lab-routes.ts:231-252`, `sample-routes.ts:140-147`, `sample-routes.ts:249-259`), no email provider called. The admin page filters `userId` + category `orders` + subject, which matches the insert.
- PDF handling: base64 round-trip and 5 MiB decoded cap (`lab-validation.ts:216-221`), `ByteLength` check constraint, safe filename (`lab-validation.ts:308`), sanitized `content-disposition`, `nosniff`, `private, no-store`, `Vary: Authorization` on all lab responses (`lab-routes.ts:552-553`, `lab-routes.ts:588-595`); the web proxy forwards those headers and fetches with `no-store`. 8 MiB JSON body cap (`http.ts`) leaves room for a 5 MiB PDF in base64.
- Regression surface: `handleLabRoute`/`handleSampleRoute` run first in `handleApiRoute` (`api.ts` diff) but only claim `/api/lab/*`, `/api/admin/lab/*`, `/api/listings/:id/lab-reports`, and `/api/sample-requests*`; no pre-existing route in `api.ts` used those paths. Backend `test` script now includes the lab and listing suites.

## Frontend cleanup completed in this worktree

- `apps/web/src/lib/lab-testing-api.ts`: removed the local optional `LabAdminRequest` extension and now re-exports the shared `LabAdminRequest` (which carries `companyName`, `requestedByName`, `requestedByEmail`). New sha256: `558337a301849b76e1a119cc763ac57a06efff3a1971c533a86d532976f9c535`.
- No fixture changes were required: `describeRequester` in `apps/web/src/lib/lab-testing.ts` keeps its own optional-field parameter type, and the queue page's optional chaining compiles against the required string fields.
- Checks: `tsc --noEmit -p apps/web/tsconfig.json` exit 0, `tsc --noEmit -p apps/web/tsconfig.test.json` exit 0, `eslint` on the touched files exit 0. No services, browser, or database used.

## Coordinator-authorized follow-up: cancelled request consent (frontend)

Coordinator message `msg_cd4c62e5e1fb` reported that `lab-reports-section.tsx` disabled the sharing button when `request.status === "cancelled"`, while the backend still permits consent changes and a previously attached published, shared report stays visible after admin cancellation. Fixed in this worktree only:

- `apps/web/src/lib/lab-testing.ts`: new `canChangeSharing(status)` helper, always `true`, with the rationale documented inline.
- `apps/web/src/components/lab-testing/lab-reports-section.tsx`: the sharing button now uses `canChangeSharing(request.status)` instead of the cancelled check, so withdraw and grant stay available for every status.
- `apps/web/src/lib/lab-testing.test.ts`: regression test asserting the control is available for all six statuses including `cancelled`.
- Checks: web and test tsconfig type checks exit 0, eslint exit 0, `node --test src/lib/lab-testing.test.ts` 10/10 pass. The Playwright spec `tests/e2e/lab-testing.spec.js` was not changed or run (no browser in this dispatch); its existing withdraw-sharing case uses a `completed` request and still applies.

Backend follow-up F3 above is related: rejecting report uploads on cancelled requests would remove one way a cancelled request gains a shared report after the fact.

## Final re-review of backend fixes (task_f4b685d68ace)

Re-reviewed the primary fixes for F1, F2, F3, F5 and the suspended-staff note. Read-only; no backend or primary files edited.

| File | sha256 (final reviewed) |
|---|---|
| packages/backend/src/lab-validation.ts | a34f7528def1f171907765088b9566ed465fbc0a2e132c8251efe3ab1cd637fc |
| packages/backend/src/lab-routes.ts | 7fb8f20c4283466782b7fb406e169f875846b4beca2fdd06685081b96c379d68 |
| packages/backend/src/lab-routes.test.ts | 5e887aeadf8e2a112fc3c1fb5a54040c7d5248bc00a20342dd32e8cd2524c94f |
| packages/backend/package.json | 835667ad0c8abed050b9642d196da5ff04eec7ce39cc7e7f42316192f071e835 |
| pnpm-lock.yaml | 4055ea049b4fdd073b6a61212e97613bc964dd7f48cd99954828eeaa9cc1141e |
| packages/backend/src/sample-routes.ts (unchanged) | fa95a5b16746c4f88634df0960ec214ef8a3390896a9fa57745593cf686ec659 |

### F1 PDF parser — resolved

`lab-validation.ts:223-284` now keeps the base64 round-trip, 5 MiB cap and header check, then loads the file with `pdf-lib` 1.17.1 (pinned in `packages/backend/package.json:19`, resolved in `pnpm-lock.yaml`, installed at that version) with `ignoreEncryption:false` and `throwOnInvalidObject:true`, requires at least one page, and walks the catalog plus every indirect object (object streams are decoded by the parser) rejecting the names JavaScript, JS, Launch, EmbeddedFile(s), OpenAction, AA, RichMedia, XFA and Encrypt. Names are matched on parsed `PDFName` objects only, so strings and binary stream bytes no longer trigger false positives. Any parser error maps to a 400. The new test at `lab-routes.test.ts:214-240` covers object-stream output, a Flate stream containing `#4A` bytes, and an OpenAction JavaScript rejection.

Verification with a copy of the new validator and the primary's `pdf-lib` install, no primary edits:

| Fixture | Old validator | New validator |
|---|---|---|
| macOS Quartz text PDF, classic xref | PASS | PASS |
| macOS Quartz image PDF, classic xref | PASS | PASS |
| Classic xref with 300 KB random Flate image stream | FAIL (`#xx` hits) | PASS |
| pdf-lib output with xref stream, object streams and a Flate image XObject | would FAIL (`/XRef`, `/ObjStm`) | PASS |
| Legitimate PDF whose metadata strings say "JavaScript /JS /OpenAction" and producer "AA" | n/a | PASS (strings are not names) |
| Page `/AA` with JavaScript action | n/a | FAIL 400 |
| Catalog `/OpenAction` with `/Launch` | n/a | FAIL 400 |
| File attachment (`/EmbeddedFiles`) | n/a | FAIL 400 |

Residual notes, low: `throwOnInvalidObject:true` will also refuse mildly malformed but otherwise readable PDFs, which is an acceptable upload policy; PDF/A-3 reports with attachments are refused by design. The whole-object walk is O(objects) and bounded by the 5 MiB cap.

### F2 SentAt — resolved

`lab-routes.ts:201-202` now writes `SentAt=SYSUTCDATETIME()` on the internal referral insert, matching the sample-party insert at `lab-routes.ts:240-241`.

### F3 cancelled upload guard — resolved

`lab-routes.ts:370-376` selects `Status` under `UPDLOCK,HOLDLOCK` and returns 409 "Cannot attach a report to a cancelled request." before insert, so a cancelled request can no longer be flipped to completed by an upload. `validateReport` is now awaited (`lab-routes.ts:365`).

### F5 visibility — resolved

`lab-routes.ts:345` adds `l.Quantity>0` to the public branch of `reportAccess`, matching `publishedListing`. Cosmetic only: `lab-routes.ts:81` now contains `l.Quantity>0` twice in the same WHERE clause; harmless, safe to leave or dedupe.

### Suspended staff — resolved

`lab-routes.ts:69` `staffQuery` now uses `us.Code NOT IN ('inactive','suspended')`, which applies to assignee listing, owner validation and internal notification fan-out.

### Verdict

No concrete defects found in the re-reviewed files. The lab backend is acceptable from the frontend reviewer's side, subject to the coordinator's own test run, SQL integration checks, and the F4 pre-deploy confirmation that every intended internal admin member carries the `admin_override` tier.
