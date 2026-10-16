# FUEL draft backend verification

Base: `8fc484ba5407b134743475d2fc25605d2183d6bb`. All work is uncommitted in the assigned backend worktree. No shared SQL/provider writes, commit, push, deploy, browser actions, SQL receipt adoption, or reset occurred.

## Launch and approvals

Live process 71246 used `gpt-6.1-sol`, medium reasoning, `service_tier=default`, `features.fast_mode=false`, `--ask-for-approval on-request`, and `--sandbox workspace-write`. Its session flags override the global Fast setting. The worktree was clean at the selected base before design. The prepared runtime belongs to this root, uses Node 22.20.0, and has SQL unconfigured.

Coordinator approved design-only work, accepted design hash `3419279bfd10be361a53ff18fb0eddeb048b32a8fab160e91796931c38108320`, then approved implementation. It subsequently required buyer write permissions for view-only members. The implementation checks active buyer/both membership, active company/member state, and owner/admin role, requester/approver/executor tier, or CanExecuteTransactions permission before writes. Owner/admin membership overrides its tier, while other viewers/view_only members remain denied even with execution enabled. Platform admins retain their existing override. Draft publication and acceptance lock the wanted parent first.

## Executed checks

Checks used `Runtime.check()` and `Runtime.environment()` from the prepared checkout. Sandbox access to the private runtime lock required explicit escalation. These checks used no database credentials or live provider credentials.

| Check | Result | Evidence |
| --- | --- | --- |
| Backend test suite after final D1, zero-price, and notes corrections | 137 pass, 0 fail | `/private/tmp/ecoglobe-drafts-backend-d1-final-checks.log` |
| Backend type check, including prepared SQL smoke | Pass | Same log |
| Backend build | Pass | Same log |
| Shared type check | Pass | `/private/tmp/ecoglobe-drafts-backend-checks.log` |
| Runtime isolation regression suite | Pass | Same log |
| SQL ownership regression suite, mocked Docker | 12 pass | Same log |
| Repository lint | Pass, existing frontend warnings | Same log |
| `git diff --check` | Pass | Tool receipt |

New domain cases cover null-preserving create, omitted fields versus explicit clears, validation before publish, legacy immediate-post defaults, optional need-by, numeric scale, invalid calendar dates, lifecycle conflicts, and accepted closure. Actual API/RFQ handler tests with a stubbed SQL driver reject draft quote/acceptance and view-only create/edit/publish without executing wanted mutations. Final D1 cases allow owner/admin at view_only, deny nonowner viewer/view_only even with execute enabled, and preserve requester create/edit/publish. The driver asserts exact SQL grouping but does not execute SQL. Explicit zero target prices and verbatim nonblank notes now have regression coverage. The driver tests are not SQL constraint or locking proof.

Earlier check attempts exposed a shared source/rootDir mismatch and SQL smoke helper type errors. The contract moved to the repository's declaration-file convention, and the helper now validates JSON entities. A test expectation changed to preserve the stored legacy IsOpen bit when an accepted historical request receives an unrelated PATCH; status still projects closed. The final suite and types pass after these corrections.

## Prepared, unexecuted SQL proof

`packages/backend/src/private-drafts-sql-smoke.ts` requires explicit `ORCA_DRAFT_SMOKE=1`, a loopback database name matching the owned runtime convention, an owner token, and disabled provider credentials. It checks the database owner before mutation. The smoke applies the migration twice, retains labeled synthetic local fixtures, checks old rows by hash, tests private save/read/clear/publish behavior and both CHECK constraints, denies cross-tenant/viewer/quote paths, and races repeated publish and quote acceptance. Synthetic quote supply uses labeled test commercial values only inside that owned local database.

The coordinator has not authorized provisioning or SQL execution because the local Docker engine is unavailable. The smoke has been type-checked only. Real SQL ALTER/CHECK execution, migration reruns, row preservation, HTTP acceptance, and concurrency remain unverified. No production or hosted-readiness claim is made.

## Review and integration gates

The coordinator owns the source-data mapping/import and browser/live proof. The importer received a separate source review in `FUEL_DRAFT_IMPORT_REVIEW.md`. Frontend v3 passed this worker's focused reciprocal review: patch `fbf6aeddb05d25d22b379eb3aeb6a4a81dc087d2d196dec8b9fd3b1e3c8fca77`, manifest `d7314cc575fe8ea0903e4c2a6a5fcb5484ace47c9ac4c1a1dac0f90fc926d493`. All 16 frontend file hashes matched. Fresh initialization now keeps unit/currency/facility/cadence unset, resume preserves saved nulls/notes/aliases, and D1 precedence matches the final coordinator decision. The existing UI-only need-by prerequisite is retained by explicit coordinator decision. This review performed no frontend edits or browser actions. The frontend owner must still review the replacement final backend hashes before integration. Candidate hash manifests and patches are stored under `/private/tmp/ecoglobe-drafts-backend-review/`; a review that changes files requires a new manifest and affected checks.

## Final D1 replacement

Coordinator message `msg_316f1ed0bcce` is authoritative: owner/admin membership overrides its tier, while only the nonowner branch applies viewer/view_only denial. The final SQL predicate is:

```sql
AND (r.Code IN ('owner','admin') OR (r.Code<>'viewer' AND pt.Code<>'view_only' AND (pt.Code IN ('requester','approver','executor') OR m.CanExecuteTransactions=1)))
```

The final single affected test/type/build run passed all three checks after this exact grouping and all review corrections were present. The cancelled stale approval supplied no final-run evidence. No local SQL smoke has run; the coordinator separately owns its reviewed DEV rollback/migration path.
