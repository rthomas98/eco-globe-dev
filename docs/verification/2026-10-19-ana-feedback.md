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
