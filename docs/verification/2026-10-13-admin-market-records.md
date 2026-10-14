# Admin market records and workbook import verification

Verified on October 13, 2026, through 8:52 PM America/Chicago (October 14 UTC). This report covers the internal research registry on the shared development services.

## Result

The feature is deployed and passed frontend, backend, browser, and hosted Azure SQL acceptance. The supplied workbook created **142 internal records: 81 sellers and 61 buyers**. Two subsequent browser imports, one through each frontend, created zero additional records and skipped all 142 duplicates. Two recognized footer rows were ignored on each import.

Open [Market records in the admin site](https://eco-globe-dev-admin.vercel.app/admin/market-records) or [Market records in the main site](https://eco-globe-dev-web.vercel.app/admin/market-records). See the [admin instructions](../ADMIN_MARKET_RECORDS.md) for the workflow.

## Behavior delivered

- Admins can create buyer and seller research records without seller registration; edit them with a reason; archive and restore them; inspect their audit history; search and filter; paginate; and export loaded records to CSV.
- Source classifications and the workbook's checked claim remain distinct from staff review. Price, annual volume, and address have independent review status, supporting citation, reviewing admin, and timestamp. Changing a reviewed value or its associated units, currency, or citation clears its review.
- Unknown amounts remain blank. Zero remains explicit. Negative prices represent gate fees. Annual capacity is not available inventory. Research addresses are not operational pickup addresses.
- Imports require a preview, reason, and explicit acknowledgement. Valid rows can be excluded. The server stores the preview, applies the import atomically, and records the outcome. Identical retries return the stored result. Duplicate detection includes archived records and prior identities retained before edits.
- The registry remains admin-only and separate from marketplace accounts, listings, KYC, inventory, and orders. There is no automatic publication or conversion action.
- File parsing has upload, decompression, entry, row, cell, response, execution-time, and worker-memory limits. Formula, macro, active-content, malformed archive, and external workbook-link cases are rejected. Passive HTTP(S) citation links in the source template are preserved as text.

## Release identity and review

| Component | Verified release |
| --- | --- |
| Feature source | `d195a5a63a53036f832c6c03e5b2d421f9c315be` |
| Final backend source | `aac7e0aaff81fe8004cb67b49894039c090f3c4c` |
| Azure ready revision | `ecoglobe-backend-dev--records-aac7e0a` |
| Backend image digest | `sha256:58061427d3eb79ae35764dda2e9d78b99a43ed2b9f30950190bae7b9ccc673b4` |
| Web deployment | `dpl_F3RZeyx6jNZEJQbFffDxiyjfFnu4` |
| Admin deployment | `dpl_G52yKtP74HNthyEDuNokDaaDRn8e` |

Both Vercel development aliases resolve to the tested Ready deployments. Their frontend source is from `d195a5a`; all 28 reviewed frontend files are unchanged in `aac7e0a`. Azure serves the corrected backend image with 100% traffic on the latest revision. Vercel's target is named `production` within these existing **development** projects; this was not an EcoGlobe commercial production activation.

Supervised Orca workers used the project roles: Codex owned backend work using GPT 6.1 Sol, medium reasoning, Standard service; Claude owned frontend work in Manual mode. Reciprocal review covered the integration and the later SQL correction. The coordinator independently ran checks and browser acceptance. Existing worker worktrees were preserved.

## Automated and hosted acceptance

| Evidence | Outcome |
| --- | --- |
| Backend tests on final source | 109 passed, zero failed or skipped |
| Frontend tests | 154 passed, zero failed or skipped |
| Runtime and SQL ownership checks | Passed |
| Workspace type checks | Passed |
| Repository lint | Zero errors; 38 existing warnings |
| Backend, web, and standalone admin builds | Passed |
| Live API acceptance | 57 checked requests passed |
| Hosted SQL expiry, rollback, and recovery acceptance | Five checks passed |
| Final post-import API and SQL verification | Passed |

Live API checks covered anonymous and non-admin rejection; private, non-cacheable responses; create/edit/review/archive/restore/history; stale-version conflicts; forged review metadata rejection; invalid upload rejection; same-request replay; changed-intent conflict; concurrent imports; historical identity deduplication; and row exclusion behavior.

Hosted SQL acceptance used a newly created synthetic preview. Expiration returned 410. A controlled invalid second row caused the entire import to roll back records, aliases, row decisions, and audit writes. Restoring that preview and retrying the same intent succeeded. All synthetic records were subsequently archived through the application API.

Live testing caught a SQL rowversion projection defect: direct style-2 conversion returned eight raw characters instead of the required 16-character hexadecimal token. Casting to `BINARY(8)` before conversion corrected the projection while retaining strict validation and optimistic concurrency checks. A focused regression test was added, independently reviewed, and passed before the backend was redeployed. Actual hosted edits and stale-version rejection then passed.

Docker remained unavailable, so isolated local SQL execution was not claimed. The SQL transaction and recovery evidence above comes from the identified development Azure SQL database. The local rowversion regression uses a driver stub and is separate evidence.

## Browser acceptance

Actual in-app browser testing passed on the live development frontends:

1. Direct seller creation, invalid-value feedback without losing form inputs, disabled controls while saving, persistence after reload, explicit zero price, and annual volume.
2. Price review with the real admin and server timestamp; other fields remained unconfirmed. Editing the price into a gate fee reset the price review.
3. Archive, restore with the same ID, final archive, and complete actor/reason history.
4. Real workbook preview and import: 142 created, zero duplicates, zero errors, two footer rows ignored. Reload displayed the stored outcome.
5. Reimport through standalone admin: zero created, 142 duplicates, two footer rows ignored. Reload displayed the stored outcome.
6. Pagination from 50 to 100 to 142 loaded records, then a downloaded CSV containing 142 data rows.
7. A measured 390-pixel viewport: responsive cards rendered with the desktop table hidden and no horizontal document overflow. The viewport override was reset afterward.
8. Direct buyer-need creation with unknown price and volume preserved, followed by archive of the synthetic record.
9. Buyer and seller attempts to open the registry redirected to access-denied screens. Signed-out access redirected to login.
10. The main site's admin register loaded the same 142 records through its own proxy. A raw workbook preview and completed no-op import returned zero created and 142 duplicates; its result persisted after reload.
11. Existing buyer and seller received-sample histories still displayed Received for SR-1 and SR-2.

An early browser locator wait expired while the main-site preview was loading. The subsequent state inspection showed the completed preview, and commit plus reload passed; no failed import was hidden or treated as success.

## Data preservation and source provenance

The additive migration created four registry tables and the required audit lookup codes. No database reset was performed. Final read-only SQL counts matched the baseline: **40 companies, 39 locations, 27 listings, 28 orders, and 41 users**. Final authenticated API hashes for listings, companies, and orders matched their pre-change baseline exactly. Public listing count remained **18**.

The registry contains 142 active workbook records and 13 archived synthetic QA records. No QA records remain active. The workbook's SHA-256 remained:

`44ecf2746750fe5aed9970ed294123fbc9401959006a15e8ab01e3820167a438`

The imported records retain 27 source checked claims, 118 unknown prices, 80 unknown volumes, and one negative price. **None** has a staff-confirmed field or an invented source reviewer/date. The workbook was not modified or committed. Raw workbook rows, CSV exports, screenshots, credentials, provider responses, and detailed test receipts are Git-ignored under `.local/verification/2026-10-13-admin-records/`.

## Limits and remaining business review

Admins still need to validate the source facts and cite evidence before confirming fields. Importing a source claim does not establish KYC, stock availability, a safe pickup location, or an offer. Publication remains in the existing listing workflow.

This is a scoped feature acceptance, not certification of every marketplace flow or provider integration. No refund, shipment, payment, or agreement was created by these tests. Previously fixed transactional flows were covered by their existing automated tests and preserved source/data; every historical browser scenario was not rerun.

The broader dependency audit and React Doctor scan are not clean. React Doctor's feature findings were reviewed, with no feature errors; unrelated warnings and dependency findings remain separate maintenance work. The import dependency `yauzl` was pinned to the corrected 3.2.1 release. No unrelated framework upgrade was included.
