#!/usr/bin/env python3
"""SQL ownership regressions; Docker responses mocked, no shared database touched."""
import importlib.util
import json
import os
import copy
import socket
import subprocess
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('isolation_tests', Path(__file__).with_name('orca-runtime.test.py'))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
spec = importlib.util.spec_from_file_location('sql_runtime', Path(__file__).with_name('orca-sql.py'))
sql = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sql)


class SQLTests(unittest.TestCase):
    setUp = base.IsolationTests.setUp
    tearDown = base.IsolationTests.tearDown
    git = base.IsolationTests.git

    def fixture(self):
        self.rt.prepare()
        self.db = sql.LocalSQL(self.rt)
        sql.rt.private_dir(self.db.directory)
        value = dict(version=1, owner=self.rt.owner, token='a'*64, port=50000,
                     database='eco_'+self.rt.key, name='eco-sql-'+self.rt.key,
                     volume='eco-sql-data-'+self.rt.key, image=sql.IMAGE,
                     container='b'*64, sa='Eg9!'+'c'*64, password='Eg9!'+'d'*64, ready=True, daemon='test-daemon')
        self.db.save(value)
        with sql.rt.private_file(self.rt.state / 'sql-ports.json', create=True) as stream:
            sql.rt.write_json(stream, {self.rt.key:50000})
        with sql.rt.private_file(self.db.directory / 'server.env', create=True) as stream:
            stream.write('ACCEPT_EULA=Y\nMSSQL_PID=Developer\nMSSQL_SA_PASSWORD='+value['sa']+'\n')
        return value

    def test_receipt_and_permissions(self):
        value = self.fixture()
        self.assertEqual(value, self.db.load())
        (self.db.directory / 'receipt.json').chmod(0o644)
        with self.assertRaises(sql.rt.Refusal): self.db.load()

    def test_foreign_receipt_port_and_credentials(self):
        value = self.fixture()
        for key, replacement in [('owner', {}), ('port',50001), ('database','master'), ('password','injected;Password=x'), ('container','foreign')]:
            bad = dict(value, **{key:replacement})
            self.db.save(bad)
            with self.assertRaises(sql.rt.Refusal): self.db.load()
        self.db.save(value)

    def test_inherited_sql_refused(self):
        self.fixture()
        with patch.dict(os.environ, {'SQL_CONNECTION_STRING':'must-not-use'}):
            with self.assertRaises(sql.rt.Refusal): self.db.load()

    def test_database_marker_must_match(self):
        value = self.fixture()
        with patch.object(self.db, 'verify'), patch.object(self.db, 'query', return_value='foreign'):
            with self.assertRaises(sql.rt.Refusal): self.db.verify_database(value)

    def test_credentials_only_stdin(self):
        value = self.fixture()
        with patch.object(self.db, 'docker', return_value='') as docker:
            self.db.query(value, 'SELECT 1', value['database'], app=True)
        args, kwargs = docker.call_args
        self.assertNotIn(value['password'], ' '.join(args))
        self.assertTrue(kwargs['data'].startswith(value['password']+'\n'))

    def test_missing_owned_database_never_recreated(self):
        value = self.fixture()
        with patch.object(self.db, 'verify'), patch.object(self.db, 'query', return_value='0') as query:
            with self.assertRaises(sql.rt.Refusal): self.db.migrate(value)
            self.assertEqual(query.call_count, 1)

    def test_connection_requires_ready(self):
        value = self.fixture()
        value['ready'] = False
        self.db.save(value)
        with patch.object(self.db, 'verify_database'):
            with self.assertRaises(sql.rt.Refusal): self.db.connection()

    def docker_fixture(self, value):
        labels = self.db.labels(value)
        bindings = {'1433/tcp':[{'HostIp':'127.0.0.1','HostPort':str(value['port'])}]}
        image = {'Id':'image-id','RepoDigests':[sql.IMAGE], 'Config':{'Entrypoint':['launch'], 'Cmd':None, 'Env':['PATH=/bin']}}
        container = {'Id':value['container'], 'Name':'/'+value['name'], 'Image':'image-id',
          'Config':{'Image':sql.IMAGE,'Labels':labels.copy(),'Env':['PATH=/bin','ACCEPT_EULA=Y','MSSQL_PID=Developer','MSSQL_SA_PASSWORD='+value['sa']], 'Entrypoint':['launch'],'Cmd':None},
          'HostConfig':{'PortBindings':bindings,'NetworkMode':'bridge','Privileged':False},
          'Mounts':[{'Type':'volume','Name':value['volume'],'Destination':'/var/opt/mssql','RW':True}],
          'State':{'Status':'running','Running':True}, 'NetworkSettings':{'Ports':bindings}}
        volume = {'Labels':labels.copy(),'Name':value['volume'],'Driver':'local','Options':None}
        return container, volume, image

    def test_foreign_container_volume_port_image_refused(self):
        value = self.fixture()
        original = self.docker_fixture(value)
        changes = [lambda c,v,i:c.update(Id='foreign'),
                   lambda c,v,i:v['Labels'].update({sql.LABEL+'.owner':'foreign'}),
                   lambda c,v,i:c['HostConfig'].update(PortBindings={}),
                   lambda c,v,i:c['Mounts'][0].update(Name='foreign'),
                   lambda c,v,i:c.update(Image='foreign'),
                   lambda c,v,i:c['Config'].update(Entrypoint=['foreign'])]
        for change in changes:
            c,v,i = copy.deepcopy(original)
            change(c,v,i)
            with patch.object(self.db,'docker',side_effect=[value['daemon'],json.dumps([c]),json.dumps([v]),json.dumps([i])]):
                with self.assertRaises(sql.rt.Refusal): self.db.verify(value, running=True)
        c,v,i = original
        with patch.object(self.db,'docker',side_effect=[value['daemon'],json.dumps([c]),json.dumps([v]),json.dumps([i])]):
            self.assertEqual(self.db.verify(value, running=True),'running')

    def test_daemon_mismatch_refused_before_container_access(self):
        value = self.fixture()
        with patch.object(self.db,'docker',return_value='foreign') as docker:
            with self.assertRaisesRegex(sql.rt.Refusal,'daemon'): self.db.verify(value)
            self.assertEqual(docker.call_count,1)

    def test_explicit_socket_ignores_remote_docker_environment(self):
        self.fixture()
        self.db.socket = self.base/'docker.sock'
        with socket.socket(socket.AF_UNIX) as listener:
            listener.bind(str(self.db.socket))
            with patch.dict(os.environ,{'DOCKER_HOST':'tcp://remote:2375','DOCKER_CONTEXT':'remote'}), patch.object(sql.subprocess,'run',return_value=subprocess.CompletedProcess([],0,'local','')) as run:
                self.assertEqual(self.db.docker('info'),'local')
                args, kwargs = run.call_args
                self.assertEqual(args[0][:3],['docker','--host','unix://'+str(self.db.socket)])
                self.assertNotIn('DOCKER_HOST',kwargs['env'])
                self.assertNotIn('DOCKER_CONTEXT',kwargs['env'])

    def test_changed_applied_migration_refused(self):
        value = self.fixture()
        path = self.rt.root/'packages/backend/db/schema.sql'
        path.parent.mkdir(parents=True)
        path.write_text('SELECT 1;')
        with patch.object(self.db,'verify'), patch.object(self.db,'verify_database'), patch.object(self.db,'query',side_effect=['1','', 'f'*64]) as query:
            with self.assertRaisesRegex(sql.rt.Refusal,'Applied migration changed'): self.db.migrate(value)
            self.assertEqual(query.call_count,3)

    def test_migration_ledger_uses_columns_after_schema_audit_columns(self):
        value = self.fixture()
        path = self.rt.root/'packages/backend/db/schema.sql'
        path.parent.mkdir(parents=True)
        path.write_text('ALTER TABLE dbo.OrcaMigrations ADD CreatedAt datetime2 NULL;')
        with patch.object(self.db,'verify'), patch.object(self.db,'verify_database'), patch.object(self.db,'query',side_effect=['1','','','']) as query:
            self.db.migrate(value)
            batch=query.call_args.args[1]
            self.assertIn('INSERT dbo.OrcaMigrations (Name, Hash) VALUES',batch)
            self.assertIn('BEGIN TRANSACTION',batch)


if __name__ == '__main__':
    base.runtime.ensure_python(script=__file__)
    unittest.main(verbosity=2)
