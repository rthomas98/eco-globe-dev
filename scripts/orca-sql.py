#!/usr/bin/env python3
"""Explicit local-only SQL opt-in: provision, start, stop, status, migrate.

Developer SQL Server under amd64 emulation is local development only, unsupported
by Microsoft for production. State and volumes are never automatically deleted.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import secrets
import stat
import pwd
import subprocess
import sys
import time

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('orca_runtime', Path(__file__).with_name('orca-runtime.py'))
rt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rt)
IMAGE = 'mcr.microsoft.com/mssql/server@sha256:97b448857967be55e005424a660056fe6d51814435804dc07e8f79f028bab5fb'
LABEL = 'dev.ecoglobe.orca'


class LocalSQL:
    def __init__(self, runtime):
        self.runtime = runtime
        self.directory = runtime.directory / 'sql'
        self.socket = Path(pwd.getpwuid(os.getuid()).pw_dir) / '.docker/run/docker.sock' if sys.platform == 'darwin' else Path('/var/run/docker.sock')

    def inherited(self):
        if any(os.environ.get(k) for k in ('AZURE_SQL_CONNECTION_STRING', 'SQL_CONNECTION_STRING')):
            raise rt.Refusal('Inherited SQL connection variables refused; unset them first')

    def docker(self, *args, data=None):
        # Docker Desktop credentials/context stay with the operator; SQL secrets
        # are never inherited by Docker CLI or placed on its command line.
        rt.no_symlinks(self.socket)
        info = self.socket.stat()
        if not stat.S_ISSOCK(info.st_mode) or info.st_uid not in (0, os.getuid()):
            raise rt.Refusal('Expected owned local Docker Unix socket')
        env = {k: os.environ[k] for k in ('PATH', 'HOME') if k in os.environ}
        result = subprocess.run(['docker', '--host', 'unix://' + str(self.socket), *args], input=data, text=True, capture_output=True, env=env, timeout=180)
        if result.returncode:
            # SQL errors are useful, but only return numbered engine diagnostics;
            # suppress query text and arbitrary Docker output entirely.
            codes = re.findall(r'Msg \d+, Level \d+, State \d+(?:, Server [^,\n]+)?, Line \d+', result.stdout)
            raise rt.Refusal('Docker operation failed: ' + args[0] + ('; ' + '; '.join(codes) if codes else ' (output withheld to protect credentials)'))
        return result.stdout.strip()

    def save(self, value):
        with rt.private_file(self.directory / 'receipt.json', create=True) as stream:
            rt.write_json(stream, value)

    def load(self):
        self.inherited()
        rt.private_dir(self.directory)
        for path in self.directory.iterdir():
            if path.name not in {'receipt.json', 'server.env', 'lock', 'smoke.json'}:
                raise rt.Refusal('Unexpected SQL state')
            with rt.private_file(path):
                pass
        with rt.private_file(self.directory / 'receipt.json') as stream:
            value = json.load(stream)
        keys = {'version', 'owner', 'token', 'port', 'database', 'name', 'volume', 'image', 'container', 'sa', 'password', 'ready', 'daemon'}
        if set(value) != keys or value['version'] != 1 or value['owner'] != self.runtime.owner or value['image'] != IMAGE:
            raise rt.Refusal('Foreign SQL receipt')
        if not re.fullmatch('[a-f0-9]{64}', value['token']):
            raise rt.Refusal('Invalid SQL ownership token')
        suffix = self.runtime.key
        if (value['name'] != 'eco-sql-' + suffix or value['volume'] != 'eco-sql-data-' + suffix
                or value['database'] != 'eco_' + suffix or type(value['port']) is not int
                or not 50000 <= value['port'] <= 59999):
            raise rt.Refusal('Modified SQL identity or port')
        for key in ('sa', 'password'):
            if not re.fullmatch('Eg9![a-f0-9]{64}', value[key]):
                raise rt.Refusal('Invalid SQL credential state')
        if value['container'] is None:
            raise rt.Refusal('Incomplete provisioning; preserve receipt and volume; compare owned labels and exact container ID before manual recovery; never reset or adopt foreign resources')
        if not re.fullmatch('[a-f0-9]{64}', value['container']):
            raise rt.Refusal('Invalid container receipt')
        if type(value['ready']) is not bool:
            raise rt.Refusal('Invalid SQL readiness state')
        with rt.lock(self.runtime.state / 'sql-ports.lock'), rt.private_file(self.runtime.state / 'sql-ports.json') as stream:
            leases = json.load(stream)
        if leases.get(self.runtime.key) != value['port'] or list(leases.values()).count(value['port']) != 1:
            raise rt.Refusal('SQL port lease mismatch')
        with rt.private_file(self.directory / 'server.env') as stream:
            if stream.read() != 'ACCEPT_EULA=Y\nMSSQL_PID=Developer\nMSSQL_SA_PASSWORD=' + value['sa'] + '\n':
                raise rt.Refusal('Modified SQL server environment')
        return value

    def labels(self, value):
        return {LABEL + '.owner': value['token'], LABEL + '.worktree': self.runtime.key,
                LABEL + '.database': value['database']}

    def verify(self, value, running=False):
        if not value['container']:
            raise rt.Refusal('Incomplete provisioning; preserve receipt and volume; coordinator must compare exact ownership labels and container ID before manual receipt recovery; never delete/reset or adopt foreign resources')
        if value['daemon'] != self.docker('info', '--format', '{{.ID}}'):
            raise rt.Refusal('Docker daemon identity mismatch')
        container = json.loads(self.docker('inspect', value['container']))[0]
        volume = json.loads(self.docker('volume', 'inspect', value['volume']))[0]
        image = json.loads(self.docker('image', 'inspect', IMAGE))[0]
        if (container['Image'] != image['Id'] or IMAGE not in image['RepoDigests']
                or container['Config']['Entrypoint'] != image['Config']['Entrypoint']
                or container['Config']['Cmd'] != image['Config']['Cmd']):
            raise rt.Refusal('SQL image identity or command mismatch')
        labels = self.labels(value)
        bindings = {'1433/tcp': [{'HostIp': '127.0.0.1', 'HostPort': str(value['port'])}]}
        mounts = container['Mounts']
        environment = container['Config']['Env']
        expected_env = ['ACCEPT_EULA=Y', 'MSSQL_PID=Developer', 'MSSQL_SA_PASSWORD=' + value['sa']]
        merged = dict(item.split('=', 1) for item in [*image['Config']['Env'], *expected_env])
        if sorted(environment) != sorted(k + '=' + v for k, v in merged.items()):
            raise rt.Refusal('Modified SQL container environment')
        if (container['Id'] != value['container'] or container['Name'] != '/' + value['name']
                or container['Config']['Image'] != IMAGE or any(container['Config']['Labels'].get(k) != v for k, v in labels.items())
                or volume['Labels'] != labels or volume['Name'] != value['volume']
                or volume['Driver'] != 'local' or volume.get('Options') not in (None, {})
                or container['HostConfig']['PortBindings'] != bindings
                or container['HostConfig']['NetworkMode'] != 'bridge'
                or container['HostConfig']['Privileged']
                or len(mounts) != 1 or mounts[0]['Type'] != 'volume'
                or mounts[0]['Name'] != value['volume'] or mounts[0]['Destination'] != '/var/opt/mssql'
                or not mounts[0]['RW']):
            raise rt.Refusal('Foreign or modified SQL container/volume/port')
        if running and (not container['State']['Running'] or container['NetworkSettings']['Ports'] != bindings):
            raise rt.Refusal('Owned SQL container not running on verified loopback port; status=' + container['State']['Status'] + ', exit=' + str(container['State'].get('ExitCode')))
        return container['State']['Status']

    def query(self, value, query, database='master', app=False):
        # Password is read from stdin by the container shell, never in argv.
        password = value['password'] if app else value['sa']
        return self.docker('exec', '-i', value['container'], '/bin/sh', '-c',
                           'IFS= read -r SQLCMDPASSWORD; export SQLCMDPASSWORD; exec /opt/mssql-tools18/bin/sqlcmd -S localhost -C -I -b -h -1 -W -U "$1" -d "$2"',
                           'sql', 'eco_app' if app else 'sa', database, data=password + '\n' + query + '\n')

    def verify_database(self, value):
        self.verify(value, running=True)
        actual = self.query(value, 'SET NOCOUNT ON; SELECT Token FROM dbo.OrcaOwner;', value['database'], app=True)
        if actual.strip() != value['token']:
            raise rt.Refusal('Database ownership marker mismatch')

    def provision(self):
        self.inherited()
        self.runtime.check()
        rt.private_dir(self.directory)
        with rt.lock(self.directory / 'lock', blocking=False):
            if (self.directory / 'receipt.json').exists():
                value = self.load()
                self.verify(value)
                return value
            # Serialize allocation against all worktrees; port lease is durable.
            with rt.lock(self.runtime.state / 'sql-ports.lock'):
                leasepath = self.runtime.state / 'sql-ports.json'
                with rt.private_file(leasepath, create=True) as stream:
                    raw = stream.read()
                    leases = json.loads(raw) if raw else {}
                    if self.runtime.key in leases:
                        raise rt.Refusal('SQL lease without receipt; manual recovery required')
                    if any(type(p) is not int or not 50000 <= p <= 59999 for p in leases.values()) or len(set(leases.values())) != len(leases):
                        raise rt.Refusal('Invalid SQL port reservations')
                    port = next((p for p in range(50000, 60000) if p not in leases.values() and rt.available(p)), None)
                    if port is None:
                        raise rt.Refusal('No available SQL port')
                    value = dict(version=1, owner=self.runtime.owner, token=secrets.token_hex(32), port=port,
                                 database='eco_' + self.runtime.key, name='eco-sql-' + self.runtime.key,
                                 volume='eco-sql-data-' + self.runtime.key, image=IMAGE, container=None,
                                 sa='Eg9!' + secrets.token_hex(32), password='Eg9!' + secrets.token_hex(32), ready=False,
                                 daemon=self.docker('info', '--format', '{{.ID}}'))
                    # Refuse names that already exist, even if labels resemble ours.
                    if self.docker('ps', '-aq', '--filter', 'name=^/' + value['name'] + '$') or self.docker('volume', 'ls', '-q', '--filter', 'name=^' + value['volume'] + '$'):
                        raise rt.Refusal('SQL resource name already exists; left untouched')
                    leases[self.runtime.key] = port
                    rt.write_json(stream, leases)
                    self.save(value)
            labels = [item for k, v in self.labels(value).items() for item in ('--label', k + '=' + v)]
            self.docker('volume', 'create', *labels, value['volume'])
            envpath = self.directory / 'server.env'
            with rt.private_file(envpath, create=True) as stream:
                stream.write('ACCEPT_EULA=Y\nMSSQL_PID=Developer\nMSSQL_SA_PASSWORD=' + value['sa'] + '\n')
                stream.flush()
                os.fsync(stream.fileno())
            value['container'] = self.docker('create', '--platform', 'linux/amd64', '--name', value['name'],
                *labels, '--network', 'bridge', '--publish', f"127.0.0.1:{port}:1433", '--mount',
                'type=volume,source=' + value['volume'] + ',target=/var/opt/mssql', '--env-file', str(envpath), IMAGE)
            self.save(value)
            return value

    def start(self, value):
        state = self.verify(value)
        if state != 'running':
            if not rt.available(value['port']):
                raise rt.Refusal('SQL port occupied; listener left untouched')
            self.docker('start', value['container'])
        deadline = time.monotonic() + 120
        while time.monotonic() < deadline:
            self.verify(value, running=True)
            try:
                self.query(value, 'SELECT 1;')
                return
            except rt.Refusal:
                time.sleep(2)
        raise rt.Refusal('SQL Server did not become ready in 120 seconds; amd64 emulation may be unsupported')

    def migrate(self, value):
        self.verify(value, running=True)
        database = value['database']
        exists = self.query(value, f"SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name = '{database}';")
        if exists.strip() == '0':
            if value['ready']:
                raise rt.Refusal('Owned database disappeared; refusing recreation')
            self.query(value, f'CREATE DATABASE [{database}];')
            self.query(value, f"CREATE TABLE dbo.OrcaOwner (Token varchar(64) NOT NULL); INSERT dbo.OrcaOwner (Token) VALUES ('{value['token']}');", database)
            self.query(value, f"CREATE LOGIN eco_app WITH PASSWORD = '{value['password']}', DEFAULT_DATABASE=[{database}];")
            self.query(value, "CREATE USER eco_app FOR LOGIN eco_app; ALTER ROLE db_datareader ADD MEMBER eco_app; ALTER ROLE db_datawriter ADD MEMBER eco_app; DENY INSERT, UPDATE, DELETE ON dbo.OrcaOwner TO eco_app;", database)
        self.verify_database(value)
        scripts = [self.runtime.root / 'packages/backend/db/schema.sql', *sorted((self.runtime.root / 'packages/backend/db/migrations').glob('*.sql'))]
        self.query(value, "IF OBJECT_ID('dbo.OrcaMigrations') IS NULL CREATE TABLE dbo.OrcaMigrations (Name varchar(200) PRIMARY KEY, Hash char(64) NOT NULL); DENY INSERT, UPDATE, DELETE ON dbo.OrcaMigrations TO eco_app;", database)
        for script in scripts:
            self.verify_database(value)
            name = script.name
            if not re.fullmatch('[A-Za-z0-9_.-]+', name):
                raise rt.Refusal('Unsafe migration filename')
            content = script.read_text()
            digest = hashlib.sha256(content.encode()).hexdigest()
            previous = self.query(value, f"SET NOCOUNT ON; SELECT Hash FROM dbo.OrcaMigrations WHERE Name='{name}';", database).strip()
            if previous:
                if previous != digest:
                    raise rt.Refusal('Applied migration changed: ' + name)
                continue
            self.query(value, 'SET XACT_ABORT ON; BEGIN TRANSACTION;\nGO\n' + content +
                       f"\nGO\nINSERT dbo.OrcaMigrations (Name, Hash) VALUES ('{name}', '{digest}'); COMMIT;", database)
        value['ready'] = True
        self.save(value)

    def connection(self):
        value = self.load()
        self.verify_database(value)
        if not value['ready']:
            raise rt.Refusal('Run explicit SQL migrate before API launch')
        return f"Server=127.0.0.1,{value['port']};Database={value['database']};User Id=eco_app;Password={value['password']};Encrypt=true;TrustServerCertificate=true"


def main():
    rt.ensure_python(script=__file__)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['provision', 'start', 'stop', 'status', 'migrate', 'smoke', 'persistence'])
    args = parser.parse_args()
    try:
        runtime = rt.Runtime(Path(__file__).absolute().parent.parent)
        runtime.check()
        sql = LocalSQL(runtime)
        if args.action == 'provision':
            value = sql.provision()
        else:
            value = sql.load()
        with rt.lock(sql.directory / 'lock', blocking=False):
            if args.action == 'start':
                sql.start(value)
            elif args.action == 'stop':
                sql.verify(value)
                # Never stop a database while the owned API is active.
                with rt.lock(runtime.directory / 'api.lock', blocking=False):
                    sql.docker('stop', '--time', '120', value['container'])
            elif args.action in ('smoke', 'persistence'):
                with rt.lock(runtime.directory / 'api.lock', blocking=False):
                    if not rt.available(runtime.check()['ports']['api']):
                        raise rt.Refusal('API port occupied; left untouched')
                    env = runtime.environment(runtime.check(), database=True)
                    env.update(ORCA_SQL_DATABASE=value['database'], ORCA_SQL_MARKER=value['token'], PORT=str(runtime.check()['ports']['api']))
                    fixture = sql.directory / 'smoke.json'
                    with rt.private_file(fixture, create=args.action == 'smoke'):
                        pass
                    env['ORCA_SQL_SMOKE_RECEIPT'] = str(fixture)
                    command = ['pnpm', 'exec', 'tsx', str(runtime.root / 'scripts/orca-sql-smoke.mjs')]
                    if args.action == 'persistence':
                        command.append('--persistence')
                    if rt.foreground(command, runtime.root / 'packages/backend', env):
                        raise rt.Refusal('Local SQL/API smoke failed')
            elif args.action == 'migrate':
                with rt.lock(runtime.directory / 'api.lock', blocking=False):
                    sql.migrate(value)
            status = sql.verify(value)
        print(json.dumps({'status': status, 'database': value['database'], 'port': value['port'],
                          'container': value['container'], 'volume': value['volume'], 'image': IMAGE, 'schemaReady': value['ready']}))
        return 0
    except rt.Refusal as error:
        print("orca-sql: " + str(error), file=sys.stderr)
        return 1
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        print('orca-sql: operation refused or failed; credentials and SQL output withheld; inspect ownership state and Docker availability.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
