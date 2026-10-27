# Eco Globe development with T3 Code

T3 Code replaces Orca as the orchestrator for paired development. Codex owns backend/API/SQL and runtime tooling; Claude owns web/admin/mobile. The pairing rules in `.agents/skills/eco-globe-agent-pair/SKILL.md` are unchanged: one editor per file, reciprocal review of exact diffs, objective checks on the combined revision.

The isolated runtime and SQL helpers keep their historical `orca-*` names (`scripts/orca-runtime.py`, `scripts/orca-sql.py`, `pnpm orca:*`). They work in any linked Git worktree, including T3 worktrees, and need no Orca installation. Their runtime and SQL details remain in [ORCA_DEVELOPMENT.md](ORCA_DEVELOPMENT.md).

## Roles and models

| Role | T3 target | Options |
| --- | --- | --- |
| Coordinator | T3 thread in the `eco-globe` project on the selected base branch | Claude `claude-opus-5-5`, effort medium |
| Backend worker / frontend reviewer | `providerInstanceId: "codex"`, `model: "gpt-6.1-sol"` | `{ "reasoningEffort": "medium", "serviceTier": "default" }` |
| Frontend worker / backend reviewer | `providerInstanceId: "claudeAgent"`, `model: "claude-opus-5-5"` | `{ "effort": "medium", "fastMode": false }` |

Always pass `target.options` explicitly; do not rely on inheritance. Never request Fast mode or priority service. After each dispatch, check the returned `providerInstanceId`, `model` and `options` (the launch receipt) rather than trusting the agent's self-identification.

Children inherit the coordinator's runtime mode (full-access). Do not set `runtimeMode` unless the user asks for a supervised child; a supervised child waits for the user to approve each action in its own thread. Guardrails therefore belong in every task brief (see below) and in reciprocal review.

## Project configuration

The `eco-globe` T3 project defines these scripts:

| Script | Purpose |
| --- | --- |
| Prepare worktree | Runs on worktree creation: activates Node 22.20.0 through nvm, then `pnpm orca:prepare` (frozen install, port reservations, private state) and `pnpm orca:check`. |
| Web / Admin / API | Start a service. In a linked worktree they use the isolated `dev:*:orca` runtime with assigned loopback ports; in the primary checkout they fall back to `pnpm dev:*`. |
| Verify | `pnpm orca:verify`: runtime regressions, backend tests and backend types in a sanitized environment. |

Node 22.20.0 is installed through nvm (`~/.nvm`). The repository `.nvmrc` selects it; the shell default remains the system Node.

**Known limitation (verified 2026-10-27):** `delegate_task` with `isolation: "worktree"` created the worktree but did not run the `runOnWorktreeCreate` script. Every worker brief must therefore begin with the prepare command below. It is idempotent, so it is harmless if setup already ran. Do not run `pnpm orca:check` before `prepare` in a new worktree: `check` creates an empty runtime directory that makes the later `prepare` refuse ("Runtime directory exists without a reservation"). To recover, remove only that empty directory under `~/.local/state/eco-globe-orca/`.

```sh
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh" --no-use && nvm use >/dev/null && pnpm orca:prepare && pnpm orca:check
```

## Workflow

1. **Base.** Inspect `git status` and choose the base (currently `codex/deploy-ecoglobe-backend`). T3 worktrees start from the coordinator's local commit and do not copy uncommitted edits, so commit or deliberately exclude pending work first. Preserve user-owned uncommitted files.
2. **Dispatch.** Call `delegate_task` once per worker with `isolation: "worktree"`, `role: "implementation"`, `mode: "async"`, the target above and a stable `clientRequestId` (for example `feature-slug/backend/impl`).
3. **Brief.** Every task prompt must include:
   - the goal, acceptance criteria and the exact paths the worker owns (and any shared file assigned to it);
   - "Read AGENTS.md and .agents/skills/eco-globe-agent-pair/SKILL.md first", then run the prepare command above before any other runtime command;
   - never migrate, seed or reset a shared Azure database; never deploy, push or touch production providers; use the prepared worktree runtime and synthetic local fixtures only;
   - commit finished work on the worktree branch (no push) and report the worktree path, branch, commit SHA, changed files, checks run and remaining gaps.
4. **Review.** For each review round, call `delegate_task` again with `role: "review"` targeting the *other* agent, a new `clientRequestId` (for example `feature-slug/frontend-review/r1`), and a prompt containing the original brief, the commit/worktree to review, prior findings, responses and unresolved objections. Reviews may share the reviewed worktree read-only or diff by commit SHA from the primary checkout. Do not continue a review through `t3_thread_send` on a child thread.
5. **Fix.** Send concrete findings back to the owner as a new `delegate_task` in the owner's worktree context (include the worktree path and commit). Repeat focused review until no actionable findings remain.
6. **Integrate.** In the coordinator checkout, cherry-pick or merge only the reviewed commits. Run on the combined revision: `pnpm orca:verify` (in a prepared worktree), web/admin/backend type-check, lint and build, and the applicable browser stories including 390px width. SQL-unconfigured checks do not prove database-backed workflows; provision the isolated SQL runtime when they matter.
7. **Record.** Add a verification note under `docs/verification/` with the final commit or file hashes, test counts, browser evidence, pre-existing failures and blockers. Agreement between agents is not evidence. Commit, push or deploy only when the user asks.

Track tasks with `task_status` / `task_cancel` and their `taskId`; async completions wake the coordinator, so do not poll. Use `t3_thread_launch` only when the user wants a separate top-level thread.

## Migrating from Orca

- Orca's setup hook (`.agents/skills/eco-globe-agent-pair/scripts/orca_setup.py`) is no longer used: the collaboration tooling is committed, so T3 worktrees already contain it. The hook and its tests remain for existing Orca worktrees.
- Existing Orca worktrees under `~/orca/workspaces/eco-globe` and runtime state under `~/.local/state/eco-globe-orca` are left intact. Archive them deliberately once their data is no longer needed; never delete SQL volumes that hold needed fixtures.
- CI (`.github/workflows/orca.yml`) is unaffected.
