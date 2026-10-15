# October 15 feedback retest

This report tracks all 18 rows in `ecoglobe-test-feedback-table.pdf` against the shared development services. The supplied table summarizes earlier tester notes; it does not contain original screenshots or evidence of fresh tests. Its instructions were treated as feedback, not authorization for destructive actions.

Source PDF SHA-256: `dc9b5b789242d61c92c586a4d20c82aab97fac32de5a37e9e67437b77a39f1f6`.

## Release status

Deployed and verified on the existing development services on October 15, 2026. All 18 rows were reviewed: 15 passed or retain the tester's earlier pass, and 3 need clarification or an eligible live test fixture. This report does not establish commercial production readiness.

The release fixes product-title search, makes saved-order invoice downloads visible in Documents, and prevents company-less non-admin sessions from retrieving platform-wide reports. Desktop and actual 390px invoice downloads pass. At 390px, the invoice description has a 212px column and the button wraps beneath it without horizontal overflow.

| Artifact | Verified value |
| --- | --- |
| Frontend source | `58a05589e17ec4b4f39b13d089f9f5ac4f824169` |
| Backend source | `d14bafcf3bbea30ec4b93b0357cb797ba187e393` |
| Web deployment | `dpl_vy9w8UNQrmTdyzLz6K5Y5TaP3Yb8` |
| Admin deployment | `dpl_xqNBNGkhKjXp8DsyoV5STpzHGqbR` |
| Backend revision | `ecoglobe-backend-dev--feedback-d14bafc` |
| Backend image digest | `sha256:ed8dfcfa15cb3a8692673a22fa77532f31db3235fe77ff6f9ecf0c62bedb5aef` |

The stable web and admin aliases resolve to those Ready deployments, and their loaded browser scripts identify the same deployment IDs. Azure serves the expected ready revision with 100% development traffic. The Vercel target called production belongs to the existing development projects; no commercial provider activation occurred.

A real API-dispatch regression with stub SQL reproduced the reporting exposure before the guard. After the repair, 123 backend tests, 22 runtime tests, and backend type checks pass. Claude accepted the exact backend diff and independently reran its 15 focused regressions. Normal company and admin reporting also pass against the live development API. The company-less case is regression evidence, not a claim that a new company-less user was created in shared development.

Orca run `run_20ab20c3d737` contains completed backend, frontend, and responsive follow-up tasks. Codex used GPT 6.1 Sol, medium reasoning, Standard service. Claude used Opus 5.5, medium reasoning, Manual permissions. Effective process flags were inspected, and reciprocal review used exact file hashes. Custom terminals used the previously approved manual dispatch path. Their output was archived before closing the completed workers; all worktrees remain retained.

## Row results

| Row | Area | Result and evidence |
| --- | --- | --- |
| 1 | Workbook import | Passed live. Selecting the original workbook enables Preview. Preview returns 142 duplicates, 0 new, 0 errors, and 2 ignored footer rows. Completing the import creates 0 records and skips 142 duplicates. |
| 2 | Admin listing search | Reproduced. `Tar` also matched seller `GulfStar`, returning unrelated titles. The repair defaults to product-title search and adds an explicit seller-name search scope for admins. Price and category filters remain. Passed on the final live revision. |
| 3 | Carbon calculator | Passed live. PVC has no saved coordinates, so the calculator explains why the profile-address route is unavailable. An address label alone cannot enable Next. Entering an explicit 100-mile distance reaches the weight step. No coordinates were invented. |
| 4 | EG-20 invoice | Real PDF download passed live through More actions. The PDF states No payment recorded and explains that an invoice is not a payment receipt or seller payout. The repair adds a visible Documents action using the existing guarded download handler. The visible Documents action downloads the actual PDF and shows Download started on desktop and 390px screens. The original More actions entry remains. |
| 5 | Buy Now | Passed live as Bianca on another seller's PVC listing. One click opens checkout with 12 units at $3, total $36. Selecting Pickup enables Continue to payment. No order or payment was submitted. Own-company purchasing remains intentionally restricted. |
| 6 | Missing SDS | Seller guard passed live. Rice Hull Ash shows Add SDS and cannot be quoted without the file. The separate buyer Request SDS feature awaits the user's workflow choice. |
| 7 | Signup countries | Needs clarification. The selector contains 15 choices; the backend accepts two-letter codes. Kate's required missing country has not been identified. No unsupported shipping eligibility was implied. |
| 8 | RFQ acceptance closure | Regression tests cover atomic closure, refreshed status, rollback, and repeated or concurrent acceptance. A new live acceptance was not performed: the available seller's published listing lacks SDS, and its SDS-equipped listing is paused. Existing supplier documents and listing status were preserved. |
| 9 | Market records | Passed live. Search, combined side filters, 50-to-100 pagination, and a 100-row CSV with 19 columns work. QA record #161 was created, edited with a reason, checked in History, and archived. Empty-reason edits are rejected. Research record #53 was inspected without changes. |
| 10 | Sample inquiry | Earlier tester pass preserved. The live seller sample screen explains that online prepaid shipping is not configured and directs buyers to EcoGlobe assistance. No provider booking or email was initiated. |
| 11 | Notifications | Passed live sanity check. Existing notification history loads, Unread is empty, and the buyer has no unread badge. Read states were not changed. |
| 12 | General invoices and admin receipts | Passed live. EG-20's actual invoice downloads. EG-28 exposes Download PDF receipt for TX-9, the PDF downloads, TX-9 opens its valid receipt page, and Payments loads nine saved payments without a client exception. |
| 13 | Seller Sales filters | Passed live. Delivery plus In progress returns EG-25 and EG-12. Adding EG-25 search returns one saved order. |
| 14 | EG-25 order and shipment | Passed live. Buyer shows Processing; seller shows In progress and Shipping quote sent, buyer has not accepted yet. No shipping or payment state was changed. |
| 15 | PVC tracker | Passed live. Delivered is explicitly attributed to EG-20 and shipment SHP-15. The tracker distinguishes EG-24 In progress and the other PVC orders. |
| 16 | Received samples | Passed live across buyer, seller Sales, seller Sample dispatch, and staff views. SR-1 and SR-2 show Received and the saved 88 Delta Dock Road address. Staff SR-3 remains Requested. |
| 17 | Reference library | Passed live. Total remains 29. Biochar reference #1 downloads byte-for-byte identically to the original and appears on Record #53. Exact duplicate upload returns reference #1 without additions. Actual 390px viewport and document width are both 390px. Anonymous access returns 401; buyer and seller access returns 403, including PDF download. |
| 18 | RFQ-1 cleanup | Passed live read-only. RFQ-1 is Open with zero responses; expanded details say no seller has responded. Previously deleted test quote #5 remains absent. No deletion was repeated. |

## Verification and preservation

- Baseline source: `d2de024acc695c78ca6f1a7edd0962f4db79c2b3`.
- Combined frontend tests: 221 passed. Combined backend tests: 123 passed. Runtime isolation tests: 22 passed. Repository type checks passed. Lint passed with 38 existing warnings and no errors. Web and admin builds passed before deployment; both rebuilt successfully after the class-only responsive correction.
- React Doctor pinned to this task's base reports no findings in the two changed TSX files. Its broader default comparison against main includes unrelated existing findings and is not a clean overall application audit.
- Live authenticated API checks after the backend rollout: 32 passed, including anonymous and wrong-role denials, normal reports, PDF headers, payment facts, and saved-data preservation. The later responsive correction changes only one CSS class; backend source remains unchanged.
- Fingerprints for listings, listing documents, orders, payments, sample requests, active market records, references, and portfolios match the pre-test snapshot.
- Duplicate-only import batch: `c6f4ded0-b99e-4c17-bc5a-f8bd3e9478cb`. QA market record #161 remains recoverably archived with its audit history. No business record was rewritten.
- Buyer checkout was stopped before payment. No new live RFQ, shipping booking, provider email, refund, settlement, account, or commercial agreement was submitted.

## Remaining owners

| Item | Owner | Needed |
| --- | --- | --- |
| Country selection | Kate and Rob | Name the missing signup country and confirm the intended country coverage. |
| Buyer SDS request | Rob with Bea and Kate | Choose an in-app seller request, staff assistance, or explanation-only workflow. |
| Genuine supplier SDS and facility data | Sellers, Bea, and Ana | Supply authentic SDS and verified pickup coordinates. Internal research PDFs do not satisfy supplier SDS gates. |
| Live RFQ acceptance retest | Engineering with an eligible seller | Use a published, matching listing with genuine SDS owned by an available test seller. Do not unpause business listings or substitute a reference PDF. |


Private screenshots, downloaded PDFs, API snapshots, the row ledger, review receipts, and test logs remain under `.local/verification/2026-10-15-feedback-retest/`. Original intake documents and credentials are excluded from release artifacts.
