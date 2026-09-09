# Eco Globe development with Orca

Codex owns backend/API/SQL and tooling; Claude owns web/admin/mobile. Use `.agents/skills/eco-globe-agent-pair/SKILL.md` for supervised implementation and reciprocal review.

## Baseline and models

The initial setup uses `origin/main`. At setup, its tracked tree matches primary branch `codex/deploy-ecoglobe-backend`; the differing deployment commit IDs do not indicate different files. Preserve primary uncommitted documents and maintenance work. Recheck the base before every new feature.

Codex defaults to `gpt-6-astra`, medium reasoning, Standard service (`service_tier = "default"`). Claude defaults to `claude-fable-5-1`, medium. Keep permission handling Manual; do not add bypass flags. Shared installed Orca CLI, orchestration, and computer-use skills serve both agents.

## Isolated local runtime

Use a separate Orca worktree, Node 22.20.0, and the frozen pnpm lockfile. The setup hook copies only collaboration tooling, merges the Orca package commands, prepares private runtime state and installs dependencies. It does not copy primary environment files or credentials.

```sh
nvm use
pnpm orca:prepare
pnpm orca:check
pnpm dev:api:orca
# separate terminals:
pnpm dev:web:orca
pnpm dev:admin:orca
pnpm dev:mobile:orca
```

Private runtime state and persistent port reservations live under `~/.local/state/eco-globe-orca`, outside the checkout. The runtime prints assigned loopback ports. Services remain foreground processes; stop each with Ctrl-C in its owning terminal. Do not kill by port or stale PID file. Preserve runtime state when recovering; do not archive or remove a worktree containing data you still need.

This initial worker mode deliberately leaves Azure SQL unconfigured and external email/signature providers disabled. API health and public/UI checks are useful, but registration, authenticated marketplace operations, tenant isolation and persistent writes still require a separately provisioned, worker-scoped SQL Server database. Do not substitute the shared development Azure database, mock success, or treat this mode as end-to-end acceptance. No shared database migration or reset is part of setup.

Maps have no token in this mode. Expo uses offline non-interactive mode with reloads disabled and loopback API origins; a physical-device workflow needs a separately reviewed network configuration.

## Verification and review

```sh
nvm use
pnpm orca:verify
```

This runs runtime regressions, backend tests and backend types in a sanitized environment. To run broader product checks without inheriting credentials:

```sh
python3 - <<'PYTHON'
import runpy, subprocess
from pathlib import Path
root = Path.cwd()
runtime = runpy.run_path(str(root / "scripts/orca-runtime.py"))["Runtime"](root)
env = runtime.environment(runtime.check())
for check in ("type-check", "lint", "build"):
    result = subprocess.run(["pnpm", check], cwd=root, env=env)
    print(check, result.returncode)
PYTHON
```

Run checks in the prepared worktree with a sanitized runtime environment. Existing browser suites may reference fixed ports or require SQL-backed users; inspect their targets before running them. The onboarding and portal suites use `ECOGLOBE_WEB_BASE_URL`; set that explicitly to the assigned web origin, because the existing suites otherwise default to port 4040. For each feature, record the exact final revision or hashes, focused tests, build/type/lint results and browser evidence. Attribute pre-existing failures explicitly.

Use a dedicated Eco Globe local browser profile. Check web and admin routes at the assigned ports, and narrow widths such as 390px. Use Design Mode annotations to send precise frontend requests to Claude; Codex reviews API implications. Never send real credentials or submit transactions to shared services during local verification.

## Worktree setup hook

Configure Orca Project Settings > eco-globe > Setup Script:

```sh
python3 "$ORCA_ROOT_PATH/.agents/skills/eco-globe-agent-pair/scripts/orca_setup.py"
```

Run by default and wait for setup before agent startup. The hook uses the current primary tooling so new workers can use local setup changes before publication; it rejects conflicting target edits. After publishing, the files are also available directly in the Git base.

Archive remains a deliberate action after the owning service terminals have stopped. No automatic archive/delete or shared-database cleanup is configured.

## CI scope

`.github/workflows/orca.yml` runs isolation regressions and backend unit tests/types in a detached worker on pull requests and pushes to main. It uses no Azure secrets. This focused gate does not certify frontend builds or SQL-backed product stories. The workflow becomes active when published.

## Initial verification evidence

Fresh-worker setup, 20 runtime regressions, five backend tests, all workspace type checks and all three build tasks passed locally. Public homepage, admin login redirect, registration at 390px width and the web proxy to local API health were exercised. Lint is blocked by the pre-existing missing `apps/mobile/eslint.config.*` configuration; no lint pass is claimed. SQL-backed stories and hosted CI remain unverified.
