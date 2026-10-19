# Ana feedback verification — 19 October 2026

The five-slide 15 October feedback is implemented and independently reviewed through the EcoGlobe Orca pair. The source base is `e141c4ca258edc819f09e06db47872f765e40d1e`. The reviewed manifest contains 27 files, SHA-256 `863a53cbb2e6e25501d7cb343445b80a14e260228e8a131df927052518e43cb1`. Existing fixes, FUEL/LSU accounts, private drafts, portfolios and research records are preserved.

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

- Runtime isolation: 22 passed; backend unit tests: 143 passed; web unit tests: 260 passed.
- All six workspace type checks passed. Lint passed with existing warnings and no errors.
- Backend, web and standalone admin production builds passed.
- React Doctor against the frozen source base: 87/100, no findings in the changed files.
- Dedicated Docker SQL smoke passed using real HTTP/auth/transactions and synthetic fixtures: six staff events and six stub deliveries, migration rerun, rollback, deduplication, access denials and record preservation.
- Final browser-to-SQL inspection retained two documents and one order; the two pilot requests were the original SQL fixture and the new browser fixture. Exactly one new queued event exists for each of the three event kinds.
- Both implementation owners reviewed the other owner's final artifacts. Completed backend worker was released and closed. The frontend terminal was retained for user takeover; its unsent user draft was preserved.

The aggregate checks/build manifest preceded a test-only SQL-smoke repair. Functional source files are identical; final type checks and SQL smoke cover the final manifest. Initial infrastructure failures (Docker unavailable, interrupted Orca runtimes, Corepack fetch and a development-mode production build) were resolved without resetting databases or weakening runtime ownership checks.

## Staff delivery and development release

Apply `packages/backend/db/migrations/20261019_staff_alerts.sql` before starting the new API. It creates only the outbox and index, without triggers or historical backfill. Operating instructions are in [STAFF_ALERTS.md](../../packages/backend/STAFF_ALERTS.md).

The approved staff recipient and allowlist are `info@ecoglobeworld.com`. Use the separate development admin origin for staff links. Buyer acknowledgements remain disabled because they were not confirmed. Keep existing refund QA settings for Kate intact. Delivery defaults disabled and refuses a mismatched global redirect.

At preparation time, development was still running the prior API image and web/admin deployments. Local SQL delivery was stubbed; it does not establish provider delivery or human inbox receipt. Deployment and external delivery results are recorded separately below when available.

## Retest on development after release

1. In buyer browse, open a listing and Estimate savings. Enter an explicit quantity and baseline; verify the difference and that no unused weight basis appears. Clear quantity and supply explicit weight/basis to test derivation.
2. Complete the calculator and Create report in Chrome. Allow the report window, inspect the logo, and Save as PDF. Compare the quantity and costs with the screen.
3. Submit a clearly labeled QA pilot. Select Email me instead. Confirm the staff pilot desk contains the request and preference; check the approved staff inbox separately.
4. As seller, cancel the Close listing confirmation once, then close an approved QA listing. Find it under Closed, open its documents/history and Restore to draft. Submit for review again; staff must approve before public browsing.
5. As staff, open the listing-review alert link. Repeated reads or saving an already pending review record must not create another event. Inspect `/api/admin/staff-alerts` with an authorized admin session if delivery needs investigation.

Use existing QA identities or explicitly approved fixtures. Do not close Ana's existing listings to run destructive demonstrations. No real purchase, signature, shipment or refund is required for these checks.

## Remaining limits

Human inbox receipt requires confirmation from the approved staff recipient. Buyer automatic acknowledgements remain unapproved. The in-app browser did not surface the report popup; the actual popup and saved PDF passed in Chrome. Existing calculator copy about unavailable quantity for an ambiguous ton unit remains a separate follow-up; the requested savings-unit behavior is covered above.
