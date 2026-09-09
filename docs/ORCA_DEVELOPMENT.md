# Eco Globe development with Orca

Codex owns backend/API/SQL and tooling; Claude owns web/admin/mobile. Use `.agents/skills/eco-globe-agent-pair/SKILL.md` for supervised implementation and reciprocal review.

## Baseline and models

Continuing work uses `codex/deploy-ecoglobe-backend`, which includes the committed Orca setup. The earlier `origin/main` baseline predates that setup. Preserve primary uncommitted documents and maintenance work. Recheck the base before every new feature.

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

A fresh worker leaves SQL unconfigured and external email/signature providers disabled. Provision a dedicated local SQL Server database explicitly when database-backed checks are needed:

```sh
pnpm orca:sql:provision
pnpm orca:sql:start
pnpm orca:sql:migrate
pnpm orca:sql:status
pnpm orca:sql:smoke
pnpm dev:api:orca
# After stopping the owning API terminal with Ctrl-C:
pnpm orca:sql:stop
```

Docker Desktop must be running locally. The helper uses a pinned SQL Server 2022 Developer image, a dedicated loopback port, generated credentials in private state, and a persistent volume for this worktree. SQL credentials stay out of tracked environment files and command output. The API uses the dedicated database once its receipt exists and ownership/schema checks pass; stop the API before migration or SQL shutdown. Normal stop preserves the database and volume. After a successful smoke, stop and start SQL, then run `pnpm orca:sql:persistence` to check the retained fixture. Smoke uses synthetic development accounts and leaves its fixture in this dedicated database. Keep private runtime receipts together with their worktree; deleting them prevents safe ownership verification. Interrupted provisioning fails closed: preserve the receipt, port lease, container and volume, then compare the exact local daemon, ownership labels and container ID before repairing an incomplete receipt. Never recover by deleting data or adopting an unrelated resource.

The Apple Silicon development path runs the amd64 image under emulation. Microsoft supports SQL Server containers on Linux x86-64 and does not support emulated environments; successful local checks are development evidence only. See [Microsoft SQL Server container requirements](https://learn.microsoft.com/en-us/sql/linux/install-upgrade/quickstart-install-docker?view=sql-server-ver17).

Email, signatures and other external providers remain disabled with SQL enabled. A database check does not certify those product flows. Use synthetic local fixtures for authenticated checks; preserve production authentication behavior. Shared Azure database migration or reset is outside this workflow.

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

`.github/workflows/orca.yml` runs isolation regressions and backend unit tests/types in a detached worker on pull requests and pushes to main. It uses no Azure secrets. It also runs SQL ownership regressions with mocked Docker responses. This focused gate does not certify frontend builds or real SQL-backed product stories. The workflow becomes active when published.

## Verification evidence (2026-09-09)

The initial collaboration setup was committed as `c271104`. The combined SQL/lint revision passes 22 runtime isolation tests, 12 SQL ownership regressions, 21 setup-preservation tests and five backend tests. Root lint passes with zero errors and 57 existing web warnings (54 image-element warnings and three hook-dependency warnings); all six workspace type checks and all three build tasks pass. Mobile lint also rejected an intentional TypeScript violation supplied through stdin, without writing a fixture into source.

The dedicated `eco-sql-runtime` Orca worktree ran the pinned SQL image, applied schema and migrations through the final migration code, and passed real login/session checks, company create/read/update/soft-delete, cross-tenant rejection, logout revocation and restricted database-user checks. Repeated smoke runs use unique retained fixtures. The exact fixture (company ID 6) survived a container restart; the container and volume remain retained with SQL stopped. Codex reviewed the frontend changes; Claude reviewed the SQL changes and its findings were addressed, followed by a coordinator review of the final small refusal/test additions.

Earlier public homepage, admin login redirect, registration at 390px and web-to-API health checks remain prior setup evidence. No new visual behavior was introduced by this repair. External email/signature flows, production readiness and hosted CI remain unverified.

### Observed shutdown limitation

On this Apple Silicon host, Docker stop exhausted its 120-second grace period and returned container exit 137 (not OOM). A bounded native `SHUTDOWN;` experiment then stopped the same container in 0.63 seconds with exit 255, so clean shutdown is not certified. Neither experiment reset the database; the persisted fixture was verified before native shutdown. The shipped helper retains its explicit Docker stop behavior and persistent volume. Use this as a local test runtime with the documented emulation limitation, not as production SQL certification. A clean native Linux x86-64 shutdown check remains outstanding.
