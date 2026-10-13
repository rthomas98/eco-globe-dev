# Testing Progress development retest

The eleven findings and five earlier follow-ups in the supplied Testing Progress document were individually checked against the existing development site on October 13. The report was prepared October 9 from findings last recorded September 30. Prior fixes and approved MVP deferrals were preserved.

## Fixes

Application commit `b15b9ba` changes four frontend files:

- Sample checkout describes an assisted inquiry when online shipping is unavailable or the material/site is ineligible. It states domestic standard-material scope only when backend eligibility supports it.
- Carbon Calculator tells the user to enter shipping distance when facility coordinates are unavailable. The existing profile warning, manual input and Next logic are unchanged.

No backend, database, provider, payment, shipment, signature or authorization logic changed. The exact final patch received reciprocal review and matched all four integrated file hashes.

## Individual findings

| Item | Result and acceptance limit |
| --- | --- |
| T01 two-product checkout | One eligible listing opens checkout correctly. Full live two-product purchase acceptance remains blocked by the absence of a second published listing with a usable authentic seller SDS. Existing cart tests passed; they do not replace this live test. |
| T02 sample request | Assisted inquiry submitted and persisted on the staff screen without payment or label creation. Misleading sample header corrected. Prepaid shipping remains unavailable. |
| T03 loading speed | Visible listing results measured 1241ms, 784ms and615ms across one route transition and two reloads. The reported3–4seconds was not reproduced; no SLA or throttled/cold-device claim. |
| T04 notifications | Normal read actions cleared buyer and seller badges to zero; both persisted after reload. |
| T05 pilot coverage | Missing US delivery site is explained, Company settings is linked and submission is disabled. Domestic-only MVP policy preserved; positive US submission was not repeated. |
| T06 admin selected listing | Two selected listing rows opened their corresponding saved detail records. Wrong-product symptom not reproduced. |
| T07 admin amount filter | Maximum and minimum price-per-unit filters returned matching saved records. |
| T08 order photo | Buyer order cards loaded their saved photo document. Missing-photo records keep an honest fallback. Original customer-specific account was not used. |
| T09 attestation | Explicitly unavailable under the approved blockchain deferral; no misleading Attest action. |
| T10 participant analytics | Explicitly unavailable under the approved advanced analytics deferral; no participant selector or demo results. |
| T11 account analytics | No fabricated network/purchase totals on the deferred route. This does not claim implemented network analytics. |
| F01 buyer identity | Available test account login, menu and account profile agree. The exact new-registration scenario was not repeated. |
| F02 category filters | Used products and Oils/Liquid Feedstocks returned the currently published matching records; Reset restored the full catalogue. |
| F03 Carbon Next | Profile limitations are explained; entered manual distance enables Next and opens Weight. Remaining misleading instruction corrected. |
| F04 seller Apply | Shipping/order-state filters and Apply returned the expected saved order; Reset restored the list. |
| F05 shipment map | Saved shipment facts are available; the screen explicitly says live vehicle tracking is unavailable. No invented GPS positions or carrier events. |

## Checks and boundaries

Backend85tests, types and compiler passed without SQL/provider credentials. Frontend127tests, web/test/admin types and changed-file lint passed. Runtime isolation22checks and SQL ownership12checks passed. React Doctor reported three existing component complexity warnings with no error-level finding. Web/admin local builds passed before the final Carbon wording change; the final source is validated by the remote development web build.

A local disk-full interruption affected evidence capture and build output, not the hosted site. Only this task's newly generated frontend build caches were discarded; source, databases, dependencies and worktrees were preserved. No broader maintenance cleanup ran.

Orca run `run_cc1cd7ca68ce` used Claude Opus5.5 medium for frontend ownership and GPT6.1Sol medium with explicit Standard/Fast-disabled session arguments for backend verification and final review. The initial inherited-Fast worker stopped without changes. The user approved the documented manual dispatch fallback when Orca could not attach the replacement as a supervised process. Task settlement and reciprocal review remain recorded in Orca; no completed worker lacks a cleanup ownership decision.

Detailed browser captures, actor records, test logs and the full item-by-item report remain local and Git-ignored because this repository is public. Facility data, authentic SDS files and FedEx/sample-shipping validation remain owner/provider inputs. Commercial production signing, payments, shipments, automated refunds/payouts and live GPS are not certified by these checks.

## Released development acceptance

Application commit `b15b9ba61ac67fdb4cc8757cc3f67f4cfc3895ed` is pushed. Ready Vercel deployment `dpl_2Z6TiU4ur7PFSqGf7BjsVqW8eA7e` serves `https://eco-globe-dev-web.vercel.app`; direct alias inspection confirms the identity. The final remote build passed. Authenticated staged frontend-to-backend health returned200 with SQL connected; Vercel protection remained unchanged. Staged browser access required Vercel sign-in, so browser acceptance was performed after promotion on the live development alias.

Both changed screens passed live desktop and measured390px retests. Sample scope wording is truthful; manual Carbon distance still enables Next and opens Weight. Earlier saved order photos, actual invoice PDF, unpaid-history wording, received samples and original RFQ state passed regression checks. The backend and admin application were unchanged and not redeployed unnecessarily. This release creates no payment, quote, parcel, shipment or signature; one development assistance inquiry and test-account notification read states were retained for review.
