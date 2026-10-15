# Admin receipt and Payments retest — October 15, 2026

Status: source fixes reviewed and combined checks passed; live release acceptance pending. The October 12 workbook is test evidence, not authorization for business-data changes. The source workbook remains unchanged and private.

## Reproduced findings

| Finding | Live development reproduction | Resolution |
| --- | --- | --- |
| Admin receipt discoverability | EG-28 and transaction TX-9 had no receipt download action. | Both details now render shared receipt-view and backend PDF-download actions. |
| TX-9 payment link | EG-28 linked to `/admin/accounting/payments/TX-9`; the receipt component converted the raw segment with `Number()`, rejecting the displayed reference. Numeric `/9` opened the actual receipt and downloaded its PDF. | Parser accepts numeric and TX-prefixed positive safe integer references, and rejects malformed references. |
| Accounting → Payments crash | Standalone admin page threw `useCart must be used within CartProvider`. | Staff/seller payment views no longer require a buyer cart. Buyers retain their required provider and paid-item cleanup callback. |
| Buyer sample address note | Current SR-1/SR-2 show seller and tracking separately from `Ship to` delivery address. The saved API identifies different buyer/seller companies. | Already corrected by the October 13 release; no sample data or source change required. |
| Staff sample history | SR-1/SR-2 remain Received and SR-3 remains Requested. | Passed read-only browser regression. |

## Backend baseline

Nineteen live read-only API checks passed before edits, using existing development users. Payment TX-9 belongs to order EG-28, records USD 30.00 and captured status, and downloads as a genuine one-page PDF. Anonymous callers are rejected; unrelated buyer/seller companies cannot read the payment or PDF. Missing-record and non-GET receipt checks also passed. These are hosted API/database results, not a claim of a newly provisioned local SQL runtime.

The existing backend passed 120 tests, types/build, 22 runtime-isolation checks and 12 mocked SQL-ownership regressions in its sanitized Node 22 runtime. No backend change or migration is currently required. The PDF states that captured payment is not seller payout.

## Release acceptance

The exact nine-file frontend artifact passed independent review after correcting two review findings: retaining the buyer cart invariant and keeping the new tests compatible with the existing runner. The final patch SHA-256 is `1873bfd5a2c39cce3c4ee644b2d3e993a6d0f964db7cdd5d29484e729ab19c3d`. All integrated file hashes match the reviewed artifact.

Coordinator checks on the combined source passed: 211 web tests, workspace types, lint (zero errors, 38 existing warnings), and both web/admin production builds. Backend source is unchanged. Extra component-render harnesses remain private verification evidence rather than adding a custom test loader to the application.

Live development browser acceptance remains pending. Private screenshots, PDFs, API fingerprints, check logs and source-workbook hash are stored in `.local/verification/2026-10-15-admin-retest/` and are excluded from Git.

## Retest after release

1. Sign in to the development admin site and open Sales → EG-28. In Payments, open TX-9 and download its PDF receipt.
2. Open Accounting → Transactions → TX-9. Confirm the receipt view and PDF download are available there too.
3. Open Accounting → Payments. Confirm saved payment records load, receipt links work and returning from a receipt does not crash.
4. Confirm SR-1/SR-2 remain Received and SR-3 remains Requested. Buyer samples must keep the seller separate from the delivery address.

Facility verification, authentic supplier SDSs and prepaid shipping/provider setup remain separate owner inputs. This release must not change original orders/payments, sample statuses, research records, provider modes or commercial-production settings.
