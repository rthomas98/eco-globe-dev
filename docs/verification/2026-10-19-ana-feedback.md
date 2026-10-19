# Ana feedback verification — 19 October 2026

The five-slide 15 October feedback is implemented and independently reviewed through the EcoGlobe Orca pair. The source base is `e141c4ca258edc819f09e06db47872f765e40d1e`. The initial reviewed manifest contains 27 files, SHA-256 `863a53cbb2e6e25501d7cb343445b80a14e260228e8a131df927052518e43cb1`. Browser follow-ups produced a final 29-file source manifest, SHA-256 `d0b054b284a970571b8eaef53e5c03aa303120e8afaad727ada075dab42cb650`. Existing fixes, FUEL/LSU accounts, private drafts, portfolios and research records are preserved.

## Changes and acceptance

| Feedback | Result | Evidence |
| --- | --- | --- |
| Savings weight basis | Direct pricing-unit quantity takes precedence and hides the unused weight basis. Clearing quantity allows derivation from explicit shipment weight and a supplied unit basis. No ambiguous ton conversion is assumed. | Browser: 200 tons, $250 listing price and $6 baseline yields −$48,800. At 100 metric tonnes, basis 1 yields 100 tons/−$24,400; basis 0.5 yields 200 tons/−$48,800. Tested at 390px. |
| Report logo | The supplied EcoGlobe logo appears in the printable report with preserved aspect ratio. Screen and report use the same resolved savings quantity. | Actual Chrome report popup, print preview and saved two-page PDF inspected. Logo visible and PDF text contains 200 tons, $1,200 baseline, $50,000 purchase and −$48,800 additional cost. |
| Pilot staff follow-up | New pilot requests and transitions to email preference enqueue durable staff alerts. Buyer copy describes recorded preference and does not promise a confirmation email. | Local browser created PR-2, selected email follow-up, and staff desk displayed the preference and note. SQL showed one queued event per action. |
| Close listing | Seller can confirm or cancel Close listing, find closed records using the Closed filter, and Restore to draft. Repeated submission does not duplicate the lifecycle audit. | Local browser at 390px; SQL retained two listing documents, an order and pilot history through close/restore. Double click produced one close audit. |
| Pending review alerts | A real transition to pending review queues one staff alert, including relevant edits to published listings/documents. Unchanged state and repeated reads do not generate duplicates. | Real SQL transaction/API smoke and local seller submit → staff approval → buyer visibility. |

The saved PDF is private QA evidence and uses synthetic data. No commercial price, quantity, location or certification was fabricated for existing business records.

## Checks

- Runtime isolation: 22 passed; backend unit tests: 143 passed; web unit tests: 263 passed on the final follow-up revision.
- All six workspace type checks passed. Lint passed with existing warnings and no errors.
- Backend, web and standalone admin production builds passed.
- React Doctor against the frozen source base: 87/100, no findings in the changed files.
- Dedicated Docker SQL smoke passed using real HTTP/auth/transactions and synthetic fixtures: six staff events and six stub deliveries, migration rerun, rollback, deduplication, access denials and record preservation.
- Final browser-to-SQL inspection retained two documents and one order; the two pilot requests were the original SQL fixture and the new browser fixture. Exactly one new queued event exists for each of the three event kinds.
- Both implementation owners reviewed the other owner's final artifacts. Worker lifecycle decisions preserved retained terminals and worktrees.

The aggregate checks/build manifest preceded a test-only SQL-smoke repair. Functional source files are identical; final type checks and SQL smoke cover the final manifest. Initial infrastructure failures (Docker unavailable, interrupted Orca runtimes, Corepack fetch and a development-mode production build) were resolved without resetting databases or weakening runtime ownership checks.

## Staff delivery and development release

Apply `packages/backend/db/migrations/20261019_staff_alerts.sql` before starting the new API. It creates only the outbox and index, without triggers or historical backfill. Operating instructions are in [STAFF_ALERTS.md](../../packages/backend/STAFF_ALERTS.md).

The approved staff recipient and allowlist are `info@ecoglobeworld.com`. Use the separate development admin origin for staff links. Buyer acknowledgements remain disabled because they were not confirmed. Keep existing refund QA settings for Kate intact. Delivery defaults disabled and refuses a mismatched global redirect.

The initial development release is commit `21dbc3b7f3b4da40bc99a10e5302a26e4c7ce167`. The additive migration preserved fingerprints across 15 existing business tables. API revision `ecoglobe-backend-dev--ana-21dbc3b` is healthy. Both development sites were rebuilt and aliased. A real listing-review event was accepted by the email provider for the approved staff inbox, in one attempt; inbox receipt remains a separate human check. The final print/restore follow-up release and acceptance results are recorded separately when complete.

## Retest on development after release

1. In buyer browse, open a listing and Estimate savings. Enter an explicit quantity and baseline; verify the difference and that no unused weight basis appears. Clear quantity and supply explicit weight/basis to test derivation.
2. Complete the calculator and Create report in Chrome. Allow the report window, inspect the logo, and Save as PDF. Compare the quantity and costs with the screen.
3. Submit a clearly labeled QA pilot. Select Email me instead. Confirm the staff pilot desk contains the request and preference; check the approved staff inbox separately.
4. As seller, cancel the Close listing confirmation once, then close an approved QA listing. Find it under Closed, open its documents/history and Restore to draft. Submit for review again; staff must approve before public browsing.
5. As staff, open the listing-review alert link. Repeated reads or saving an already pending review record must not create another event. Inspect `/api/admin/staff-alerts` with an authorized admin session if delivery needs investigation.

Use existing QA identities or explicitly approved fixtures. Do not close Ana's existing listings to run destructive demonstrations. No real purchase, signature, shipment or refund is required for these checks.

## Remaining limits

Human inbox receipt requires confirmation from the approved staff recipient. Buyer automatic acknowledgements remain unapproved. The in-app browser did not surface the report popup; the actual popup and saved PDF passed in Chrome. Existing calculator copy about unavailable quantity for an ambiguous ton unit remains a separate follow-up; the requested savings-unit behavior is covered above.

## Browser-discovered follow-ups

Chrome revealed that the load handler and its 800ms fallback could each open Print. The report now wraps automatic printing in a one-shot handler, with three regression tests for repeated, throwing and re-entrant calls. The manual Print action and supplied logo remain intact.

Live QA listing 28 retained its document and both orders through close/restore. A strict fingerprint caught the general PATCH path normalizing legacy empty unit/currency fields. A status-only closed → draft request now updates only status and audit timestamps, preserving the stored metadata exactly. The regression seeds legacy blanks and minimally shaped JSON and compares the stored bytes after restore. The test's original two blank fields were restored from retained pre-test data in a guarded transaction; the complete original business fingerprint matched before commit.

A second retained local SQL fixture passed without resetting the database or changing existing business records. Across the retained test history there were 15 events; nine queued jobs were delivered through the stub in this second run. Final runtime/backend/web tests, all workspace types, lint and all three production builds passed. The scoped frontend worker reviewed the final backend follow-up with no blockers; root independently reviewed its three frontend files.

## Final development acceptance

Application source commit: `52de9ec2010ebc832c81ccf861c19fc8388490a3` (pushed to `codex/deploy-ecoglobe-backend`). Subsequent report-only commits do not change the deployed application source.

| Service | Verified release |
| --- | --- |
| API | Healthy ready revision `ecoglobe-backend-dev--ana-52de9ec`, immutable image digest `sha256:936193304d4b369d3c5b233473f5fd85da11c6f3189b3b66f485770337d4bade`; ACR build `ca1a` succeeded |
| Web | Deployment `dpl_DA811vFdCNzdvN1u8RWAUcGbyfn1`, aliased to https://eco-globe-dev-web.vercel.app |
| Admin | Deployment `dpl_DxcXEiwHFJ3vwYT5SMQsw6QJyWhC`, aliased to https://eco-globe-dev-admin.vercel.app |

Final live browser → API → SQL checks passed:

- Chrome on the existing Rice Hull Ash listing reproduced the direct 200-ton/−$48,800 case. Clearing quantity exposed the explicit weight basis; 100 metric tonnes ÷ 0.5 derived 200 tons and the same result. Restoring direct quantity hid the unused basis again.
- Chrome generated and saved the final two-page PDF. Visual rendering and image extraction confirmed the supplied logo; PDF text matched the on-screen 200 tons, $1,200 baseline, $50,000 alternative and −$48,800 difference. Saving returned to the report without opening another Print dialog.
- Seller QA listing 28 passed cancel, close, Closed filter and restore. Its final complete business fingerprint matched the pre-test fingerprint; its document and both orders remained. QA listing 21 was used to test pending review and then returned to its original Paused state with its complete business fingerprint, two documents and seven orders retained. Neither QA listing was published for this test.
- The seeded Demo Buyer had no US site. A site explicitly named **QA ONLY — NOT A SHIPPING DESTINATION — Oct19 alerts** (ID 46) was added solely for this development test. No real facility coordinates, price, SDS or volume was invented for existing marketplace records. The live pilot PR-2 objective explicitly disclaimed any shipment, purchase, call or commercial commitment.
- PR-2 was submitted in Chrome, its email preference was saved, and the staff desk displayed the correct request, objective and preference through the alert's admin URL. Staff then closed this QA request; it is not an open commercial lead.
- The three actual staff jobs (listing review, new pilot, email preference) each reached `sent` with one attempt and a provider ID, addressed only to `info@ecoglobeworld.com`. The authenticated admin status endpoint returned all three jobs. Anonymous access returned 401; buyer and seller access returned 403; all denied responses were `private, no-store`. No duplicate event was created by reads or subsequent restoration.
- Existing refund QA recipients and enabled state were retained. These staff tests do not establish buyer acknowledgement delivery, and no buyer acknowledgement was enabled.

The private evidence directory contains final source/build manifests, SQL preservation results, provider IDs, screenshots and the saved PDFs. Credentials and private evidence were excluded from release artifacts and Git. Human confirmation of the three staff inbox deliveries and links remains pending; provider acceptance is confirmed.
