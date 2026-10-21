#!/usr/bin/env python3
"""Repeatable sanitized Node22 verification; SQL uses the owned Orca helper only."""
import importlib.util
from pathlib import Path
import subprocess
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("orca_sql", ROOT / "scripts/orca-sql.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
runtime = module.rt.Runtime(ROOT)
config = runtime.check()
mode = sys.argv[1] if len(sys.argv) >= 2 else "checks"
local = module.LocalSQL(runtime)
if mode in ("provision", "start", "migrate", "status"):
    try:
        local.inherited()
        if mode == "provision":
            value = local.provision()
            print("Owned SQL provisioned", value["database"], value["port"])
        else:
            value = local.load()
            if mode == "status":
                print("Owned SQL status", local.verify(value))
            else:
                getattr(local, mode)(value)
                print("Owned SQL", mode, "PASS")
    except module.rt.Refusal as error:
        print("SQL ownership/helper refusal:", str(error), file=sys.stderr)
        raise SystemExit(1)
elif mode in ("checks", "sql", "plans"):
    env = runtime.environment(config, database=mode == "sql")
    if mode == "sql":
        value = local.load()
        local.verify_database(value)
        env.update(ORCA_SQL_DATABASE=value["database"], ORCA_SQL_MARKER=value["token"])
        commands = [["pnpm", "exec", "tsx", "src/demo-playlist-sql-smoke.ts"]]
    elif mode == "plans":
        commands = [["pnpm", "exec", "tsx", "src/demo-playlist-validate-plans.ts", *sys.argv[2:]]]
    else:
        commands = [["pnpm", "exec", "tsx", "--test", "src/demo-playlists.test.ts"], ["pnpm", "test"], ["pnpm", "type-check"], ["pnpm", "build"]]
    for command in commands:
        result = subprocess.run(command, cwd=ROOT / "packages/backend", env=env)
        if result.returncode:
            raise SystemExit(result.returncode)
else:
    raise SystemExit("Unsupported verification mode")
