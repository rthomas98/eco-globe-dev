# FUEL draft importer review

Read-only review of the coordinator's private scripts on 2026-10-16. No script execution, credential access, connection-helper inspection, SQL connection, or data write occurred.

| Artifact | SHA256 |
| --- | --- |
| `feedstock-plan.json` | `7d8ddc26ab0f3d89fd9bb868f37c010c0b5981caa3233da5aa93e26af005b134` |
| `import-drafts.mjs` | `66c02adea04789f4c67f12eb1ab1657e58881e9c054e40ad35e99094697ef311` |
| `verify-live.mjs` | `8f8f2eece1e9d856eccca42826e337ba37cde091d933cf8144c970a1a6f77bc4` |
| `preservation.mjs` | `70e7bdb0f7f68036e8dd86ad0b3d77107244c2197579bdde5c2a986f4fb1b4dc` |

These artifacts live under `/Users/robthomas/Development/eco-globe/.local/verification/2026-10-16-fuel-drafts/` and remain coordinator-owned.

## Contract compatibility

The plan contains 11 seller and 18 buyer drafts with unique source keys. Only the Zentech buyer row has quantity 20 and unit `tonne`. Unknown commercial/location fields are NULL, and all source SDS lists are empty. Seller insertion passes explicit NULL for unit/currency, avoiding SQL defaults. Buyer insertion uses `IsDraft=1`, `IsOpen=0`, NULL need-by/currency/country/target price. These match the proposed migration.

The importer checks the workbook hash and provisioning receipt, uses parameterized SQL and one SERIALIZABLE transaction, locks source-key lookups, and adds an admin audit row only when it inserts a draft. Seller slug uniqueness and buyer source-key lookup provide rerun identity. It does not update existing rows or create quote/order/provider records.

## Findings before apply

1. **Replay does not verify all draft invariants.** Seller replay omits `QuantityUnit`, `CurrencyCode`, material, source description, and absence of SDS. Buyer replay omits material, `NeedByDate`, `StateProvince`, and absence of responses. A drifted row can pass the replay check and be reported as a successful import. Compare every intended field and child-record invariant before accepting an existing ID.
2. **Current tenant ownership is not rechecked.** The importer compares plan IDs to an older receipt and checks a company-ID range and name suffix. It does not verify the planned user still has active owner membership in that exact company or verify all current company/profile identity fields. Recheck those facts in the transaction against the reviewed provision identity before inserts.
3. **Preservation results do not fail closed.** `preservation.mjs --after` records `unchanged:false` but does not assert it or exit unsuccessfully. Require every compared table to match before success. Its use of original column lists correctly avoids treating additive migration columns as mutations of existing facts.

The coordinator received these findings in `msg_0c7fe3c9536f`. Re-review modified scripts by their new hashes before execution. No conclusion here certifies workbook interpretation, live ownership, live API behavior, or a database migration.

## Focused re-review

Importer `d1328894d68e0af33723f76d43b54d1b45a5a096e45229364b2cd799908e9ead` checks exact current company/member/profile identity within the transaction and verifies the reported missing replay invariants. Preservation script `9381d790baf7da0b9812f156a480532a7622203ca4f96b37a19b0204489a1d49` now asserts every saved comparison after writing evidence. These resolve the three findings above by source inspection. No further blocking issue was found in this focused review. Execution and live proof remain coordinator-owned.

## Source-marker lookup re-review

Importer `40a3147f4b7255c986ec6ed49ab667ae2063ab58519292999edffe89febf0948` adds a same-company description/source-key alternative to the deterministic seller slug lookup. It can reuse a source draft created by the frontend with a random slug. The exact-one-row assertion, company/title/draft checks, NULL commercial fields, source-description equality, no-document invariant, and duplicate-title refusal remain in place. A matching slug in another tenant fails the company assertion before mutation. This focused change has no new blocking finding. No importer or SQL execution occurred in this worker.
