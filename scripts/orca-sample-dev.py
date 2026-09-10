#!/usr/bin/env python3
"""Explicit opt-in local sample simulation using the owned runtime and SQL only."""
import runpy
from pathlib import Path
root = Path(__file__).resolve().parent.parent
module = runpy.run_path(str(root / 'scripts/orca-sql.py'))
rt = module['rt']
rt.ensure_python(script=__file__)
runtime = rt.Runtime(root)
state = runtime.check()
local = module['LocalSQL'](runtime)
value = local.load()
local.verify_database(value)
with rt.lock(runtime.directory / 'api.lock', blocking=False):
    if not rt.available(state['ports']['api']):
        raise rt.Refusal('API listener occupied; left untouched')
    env = runtime.environment(state, database=True)
    env.update(PORT=str(state['ports']['api']), SAMPLE_SHIPPING_MODE='simulation', ECOGLOBE_LOCAL_SAMPLE_TEST='1')
    raise SystemExit(rt.foreground(['pnpm','exec','tsx','watch','src/index.ts'], root / 'packages/backend', env))
