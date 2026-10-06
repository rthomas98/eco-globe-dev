#!/usr/bin/env python3
"""Run Oct 6 SQL/API acceptance only in this worktree's owned isolated database."""
import importlib.util
from pathlib import Path
import sys

root = Path(__file__).absolute().parent.parent
spec = importlib.util.spec_from_file_location("oct06_sql", root / "scripts/orca-sql.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
rt = module.rt
try:
    runtime = rt.Runtime(root)
    config = runtime.check()
    local = module.LocalSQL(runtime)
    receipt = local.load()
    with rt.lock(local.directory / "lock", blocking=False):
        local.verify(receipt)
        with rt.lock(runtime.directory / "api.lock", blocking=False):
            if not rt.available(config["ports"]["api"]):
                raise rt.Refusal("Assigned API port occupied; left untouched")
            env = runtime.environment(config, database=True)
            env.update(ORCA_SQL_DATABASE=receipt["database"], ORCA_SQL_MARKER=receipt["token"], PORT=str(config["ports"]["api"]))
            code = rt.foreground(["pnpm", "exec", "tsx", str(root / "scripts/oct06-backend-acceptance.mjs")], root / "packages/backend", env)
            if code:
                raise rt.Refusal("Oct 6 SQL/API acceptance failed")
except (rt.Refusal, OSError, ValueError):
    print("Oct 6 acceptance refused or failed; preserve SQL state and inspect owned runtime availability.", file=sys.stderr)
    sys.exit(1)
