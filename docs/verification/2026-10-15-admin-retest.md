# Admin receipt and Payments retest — October 15, 2026

Status: fixes committed, pushed, deployed and verified on the live development sites. The October 12 workbook is test evidence, not authorization for business-data changes. The source workbook remains unchanged and private.

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

Coordinator checks on the combined source passed: 211 web tests, workspace types, lint (zero errors, 38 existing warnings), and both web/admin production builds. Backend source is unchanged. The frontend owner's React Doctor review identified no new finding attributable to the edits; broader existing findings are not claimed resolved. Extra component-render harnesses remain private verification evidence rather than adding a custom test loader to the application.

Live development browser acceptance passed:

- Sales → EG-28 displays View receipt and Download PDF receipt beside its saved payment. The existing TX-9 link opens the correct receipt.
- Transactions → TX-9 displays both actions. Its View receipt opens the numeric receipt route; its PDF download succeeds.
- Accounting → Payments loads all nine saved staff-visible payment records without a cart provider or client exception, and survives refresh and return navigation from receipts.
- Invalid reference links show the explicit error; Back to payments recovers. The buyer payment center still loads its company records. The unrelated buyer receives the expected access-denied message for TX-9.
- Actual PDFs downloaded from the order, transaction and direct backend all parse as one page. Their extracted text matches the baseline saved receipt, including TX-9, EG-28, USD 30.00, captured and the seller-payout limitation. Generation metadata changes PDF hashes over time; no false byte-identity claim is made.
- Order, transaction, receipt and fully loaded Payments views were checked at an explicitly measured 390px width, with document scroll width equal to viewport width. Screenshots were visually inspected; the viewport override was reset.
- The staff sample region matches its pre-change text exactly. Buyer samples retain separate From and Ship to lines. SR-1/SR-2 remain Received and SR-3 remains Requested.
- Twenty final live API checks passed, including health, receipt facts/download, anonymous and unrelated-company rejection, missing receipt and non-GET rejection. All eight pre/post API fingerprints matched: payments, orders, owned listings, samples, listing documents, internal market records, references and portfolios. No original business record was edited.

Private screenshots, PDFs, API fingerprints, check logs and source-workbook hash are stored in `.local/verification/2026-10-15-admin-retest/` and are excluded from Git. One browser assertion initially matched Next.js's route-announcer alert as well as the intended error; the corrected text-scoped locator passed. This was a test-locator failure, not a hidden product failure.

## Development release and collaboration

| Target | Accepted release |
| --- | --- |
| Application source | `7e67962d428f8852bde294990f3970b0feaa2100` |
| Development web | `dpl_6vWGFzuRjkYTds1qLhuWXFqQL2wz` |
| Development admin | `dpl_ABuQDfrHTiEQRznbdXSpoMWE4vcF` |
| Backend / database | Unchanged; no redeployment or migration |

Both hosted builds passed before promotion. Alias inspection and the browser's loaded assets confirm these exact deployments on the existing development URLs. Vercel calls its target `production` within these development projects; no commercial production activation occurred. A URL-based promotion command reported a team mismatch; verified deployment IDs and the existing team scope succeeded without changing team access. The first GitHub push timed out; its HTTP/1.1 retry succeeded.

Orca run `run_e07cc833b848` records frontend task `task_fd435c4202c5` and backend task `task_60a5e40876fc`, both succeeded. Codex reviewed the exact frontend artifact; Claude verified the unchanged backend hashes and approved the receipt/access/sample contracts. The initial backend launch inherited Fast and stopped before source work; a custom-argv Standard, Fast-disabled, Manual session completed the backend work through the documented operator-supervised fallback. Claude's initially Manual launch drifted to Auto; the coordinator restored and verified Manual before final review corrections and validation. No global permission/model configuration was changed. All dispatches settled, release decisions were recorded, and no reclaimable worker remains. Orca retained terminals because of operator takeover or absent supervised resource ownership; no process exit is claimed. Worktrees and private evidence are preserved.

## Retest after release

1. Sign in to the development admin site and open Sales → EG-28. In Payments, open TX-9 and download its PDF receipt.
2. Open Accounting → Transactions → TX-9. Confirm the receipt view and PDF download are available there too.
3. Open Accounting → Payments. Confirm saved payment records load, receipt links work and returning from a receipt does not crash.
4. Confirm SR-1/SR-2 remain Received and SR-3 remains Requested. Buyer samples must keep the seller separate from the delivery address.

Facility verification, authentic supplier SDSs and prepaid shipping/provider setup remain separate owner inputs. This release must not change original orders/payments, sample statuses, research records, provider modes or commercial-production settings.
