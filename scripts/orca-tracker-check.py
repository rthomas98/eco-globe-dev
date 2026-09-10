#!/usr/bin/env python3
"""Exercise sample shipping only against the verified owned local SQL/API."""
import runpy
from pathlib import Path
root=Path(__file__).resolve().parent.parent
m=runpy.run_path(str(root/'scripts/orca-sql.py'));rt=m['rt'];rt.ensure_python(script=__file__)
r=rt.Runtime(root);s=r.check();local=m['LocalSQL'](r);v=local.load();local.verify_database(v)
env=r.environment(s,database=True)
f=r.directory/'tmp'/'ana-browser-fixture.json'
with rt.private_file(f,create=False):pass
env.update(ORCA_ANA_FIXTURE=str(f),ORCA_SQL_DATABASE=v['database'],ORCA_SQL_MARKER=v['token'])
raise SystemExit(rt.foreground(['pnpm','exec','tsx',str(root/'scripts/orca-tracker-integration.mjs')],root/'packages/backend',env))
