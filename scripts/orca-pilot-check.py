#!/usr/bin/env python3
"""Run pilot integration checks only against this worktree's owned SQL."""
import json
import runpy
from pathlib import Path

root = Path(__file__).resolve().parent.parent
module = runpy.run_path(str(root / "scripts/orca-sql.py"))
rt = module["rt"]
rt.ensure_python(script=__file__)
runtime = rt.Runtime(root)
state = runtime.check()
local = module["LocalSQL"](runtime)
value = local.load()
with rt.lock(local.directory / "lock", blocking=False):
    with rt.lock(runtime.directory / "api.lock", blocking=False):
        if not rt.available(state["ports"]["api"]):
            raise rt.Refusal("API port occupied; left untouched")
        env = runtime.environment(state, database=True)
        env.update(
            ORCA_SQL_DATABASE=value["database"],
            ORCA_SQL_MARKER=value["token"],
            PORT=str(state["ports"]["api"]),
        )
        fixture = runtime.directory / "tmp" / "ana-browser-fixture.json"
        with rt.private_file(fixture, create=False):
            pass
        env["ORCA_ANA_FIXTURE"] = str(fixture)
        code = rt.foreground(
            ["pnpm", "exec", "tsx", str(root / "scripts/orca-pilot-integration.mjs")],
            root / "packages/backend",
            env,
        )
        print(json.dumps({"pilotIntegrationExitCode": code, "database": value["database"]}))
        raise SystemExit(code)
