# Disk-space maintenance

EcoGlobe includes a conservative maintenance command for local development
storage. It only targets rebuildable JavaScript dependencies and these generated
directories:

- `.next`
- `.turbo`
- `coverage`
- `playwright-report`
- `test-results`
- `node_modules` (deep cleanup only)

The command never targets source code, Git history, lockfiles, environment
files, Convex data, uploads, archived outputs, Python environments, iOS Pods,
PHP dependencies, or application storage. It also protects any target directory
that contains a Git-tracked file.

## Commands

```bash
# Read-only report
pnpm space:status

# Remove caches and test output, but keep installed dependencies
pnpm space:clean

# Also remove node_modules; run pnpm install before developing again
pnpm space:clean:deep

# Clean caches only when system free space is below 50 GB
pnpm space:auto

# Safely remove packages no project still references from the shared pnpm store
pnpm space:prune-store
```

Override the automatic threshold when needed:

```bash
SPACE_MIN_FREE_GB=75 pnpm space:auto
```

The cleanup refuses to run when it detects an active EcoGlobe development
process. Stop the dev server first. A direct dry run is also available:

```bash
node scripts/space-maintenance.mjs deep-clean --dry-run
```

## Turborepo cache

The local `.turbo` cache can grow quickly after repeated builds, lint runs, and
type checks. `pnpm space:auto` is the default local safeguard. Remote caching
can reduce dependence on the local cache, but it requires an approved remote
cache account and credentials and is therefore not enabled automatically.

## Docker

Moving the web application into Docker does not reduce its storage needs. It
usually adds image layers, build cache, and volumes. Use Docker when a service
needs a consistent container runtime, not as a replacement for this cleanup.
