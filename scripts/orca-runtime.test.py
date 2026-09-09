#!/usr/bin/env python3
"""Regression tests use temporary Git repositories, homes and actual local sockets."""
import importlib.util
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True

MODULE_PATH = Path(__file__).with_name("orca-runtime.py")
spec = importlib.util.spec_from_file_location("runtime", MODULE_PATH)
runtime = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runtime)


class IsolationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        # macOS /var is a system symlink; use the canonical temporary path.
        self.base = Path(self.temp.name).resolve()
        self.primary = self.base / "primary"
        self.primary.mkdir()
        self.git("init", "-q", str(self.primary))
        self.git("-C", str(self.primary), "-c", "user.name=Test", "-c", "user.email=test@example.invalid",
                 "commit", "--allow-empty", "-qm", "fixture")
        self.root = self.base / "worker"
        self.git("-C", str(self.primary), "worktree", "add", "-qb", "worker", str(self.root))
        self.state = self.base / "state"
        self.rt = runtime.Runtime(self.root, self.state)

    def tearDown(self):
        self.temp.cleanup()

    def git(self, *args):
        subprocess.run(["/usr/bin/git", *args], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                       env={"PATH": "/usr/bin:/bin", "HOME": str(self.base), "GIT_CONFIG_NOSYSTEM": "1"})

    def test_empty_registry_refused(self):
        self.rt.prepare()
        (self.state / "ports.json").write_text("")
        with self.assertRaises(ValueError):
            self.rt.prepare()

    def test_nested_package_manager_config_refused(self):
        path = self.root / "apps/web/.npmrc"
        path.parent.mkdir(parents=True)
        path.write_text("registry=https://unexpected.invalid")
        with self.assertRaises(runtime.Refusal):
            self.rt.prepare()

    def test_known_static_asset_symlink_only(self):
        (self.root / "apps/admin").mkdir(parents=True)
        (self.root / "apps/web/public").mkdir(parents=True)
        link = self.root / "apps/admin/public"
        link.symlink_to("../web/public")
        self.rt.prepare()
        link.unlink()
        link.symlink_to(self.primary)
        with self.assertRaises(runtime.Refusal):
            self.rt.check()

    def test_primary_refused(self):
        with self.assertRaises(runtime.Refusal):
            runtime.Runtime(self.primary, self.state)

    def test_prepare_idempotent_and_private(self):
        first = self.rt.prepare()
        self.assertEqual(first, self.rt.prepare())
        self.assertEqual(first, self.rt.check())
        self.assertEqual(len(set(first["ports"].values())), 4)
        self.assertEqual(self.state.stat().st_mode & 0o777, 0o700)
        self.assertEqual((self.state / "ports.json").stat().st_mode & 0o777, 0o600)

    def test_other_worktree_never_reuses_reservations(self):
        first = self.rt.prepare()
        other = self.base / "other"
        self.git("-C", str(self.primary), "worktree", "add", "-qb", "other", str(other))
        second = runtime.Runtime(other, self.state).prepare()
        self.assertFalse(set(first["ports"].values()) & set(second["ports"].values()))

    def test_concurrent_prepare_serializes(self):
        self.rt.prepare()
        code = (f"import runpy; m=runpy.run_path({str(MODULE_PATH)!r}); "
                f"print(m['Runtime'](m['Path']({str(self.root)!r}),m['Path']({str(self.state)!r})).prepare())")
        children = [subprocess.Popen([sys.executable, "-c", code], stdout=subprocess.PIPE, stderr=subprocess.PIPE) for _ in range(3)]
        results = [child.communicate(timeout=15) for child in children]
        self.assertTrue(all(child.returncode == 0 for child in children), results)
        self.assertEqual(results[0][0], results[1][0])

    def test_env_files_and_symlinks_refused(self):
        for name in (".env.local", ".env.development", ".env.production.local"):
            path = self.root / name
            path.write_text("AZURE_SQL_CONNECTION_STRING=must-not-be-used")
            with self.assertRaises(runtime.Refusal):
                self.rt.prepare()
            path.unlink()
        (self.root / "apps").symlink_to(self.primary, target_is_directory=True)
        with self.assertRaises(runtime.Refusal):
            self.rt.prepare()

    def test_tracked_public_env_is_exact_fingerprint_only(self):
        path = self.root / "apps/web/.env"
        path.parent.mkdir(parents=True)
        path.write_text("NEXT_PUBLIC_API_BASE_URL=https://unexpected.invalid")
        with self.assertRaises(runtime.Refusal):
            self.rt.prepare()

    def test_weak_and_symlink_state_refused(self):
        self.state.chmod(0o755)
        with self.assertRaises(runtime.Refusal):
            runtime.Runtime(self.root, self.state)
        self.state.chmod(0o700)
        (self.state / "ports.json").symlink_to(self.primary / "do-not-create")
        with self.assertRaises(runtime.Refusal):
            self.rt.prepare()
        self.assertFalse((self.primary / "do-not-create").exists())

    def test_modified_config_and_foreign_state_refused(self):
        self.rt.prepare()
        path = self.rt.directory / "config.json"
        value = json.loads(path.read_text())
        value["ports"]["api"] += 10
        path.write_text(json.dumps(value))
        with self.assertRaises(runtime.Refusal):
            self.rt.prepare()
        with self.assertRaises(runtime.Refusal):
            self.rt.check()

    def test_foreign_incarnation_refused(self):
        self.rt.prepare()
        self.rt.owner["inode"] += 1
        with self.assertRaises(runtime.Refusal):
            self.rt.prepare()

    def test_environment_strips_inherited_credentials_and_injection(self):
        config = self.rt.prepare()
        poison = {"NODE_OPTIONS": "--require=/bad", "AZURE_SQL_CONNECTION_STRING": "secret",
                  "RESEND_API_KEY": "secret", "DOCUSIGN_PRIVATE_KEY": "secret", "AWS_PROFILE": "prod",
                  "NPM_TOKEN": "secret", "PYTHONPATH": "/bad", "ECOGLOBE_API_BASE_URL": "https://prod.invalid"}
        with patch.dict(os.environ, poison):
            env = self.rt.environment(config)
        for key in ("NODE_OPTIONS", "AWS_PROFILE", "NPM_TOKEN", "PYTHONPATH"):
            self.assertNotIn(key, env)
        for key in runtime.EMPTY_SECRETS:
            self.assertEqual(env[key], "")
        self.assertEqual(env["HOME"], str(self.rt.directory / "home"))
        self.assertEqual(env["ECOGLOBE_API_BASE_URL"], f"http://127.0.0.1:{config['ports']['api']}")
        self.assertEqual(env["NEXT_PUBLIC_MAPBOX_TOKEN"], "")
        self.assertEqual(env["EXPO_NO_TYPESCRIPT_SETUP"], "1")
        self.assertEqual(env["EXPO_OFFLINE"], "1")

    def test_node_version_guard(self):
        config = self.rt.prepare()
        with patch.object(runtime.subprocess, "check_output", return_value="v24.0.0\n"):
            with self.assertRaises(runtime.Refusal):
                self.rt.environment(config)

    def test_busy_port_left_untouched(self):
        config = self.rt.prepare()
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", config["ports"]["api"]))
            listener.listen()
            with self.assertRaisesRegex(runtime.Refusal, "Unmanaged listener"):
                self.rt.run("api")
            self.assertEqual(listener.getsockname()[1], config["ports"]["api"])

    def test_service_lock_prevents_double_run(self):
        self.rt.prepare()
        with runtime.lock(self.rt.directory / "web.lock"):
            with self.assertRaisesRegex(runtime.Refusal, "Already running"):
                self.rt.run("web")

    def test_explicit_ports_and_mobile_localhost(self):
        config = self.rt.prepare()
        for service in ("web", "admin", "mobile"):
            command = self.rt.command(service, config)
            self.assertIn(str(config["ports"][service]), command)
            self.assertNotIn("4040", command)
        self.assertIn("--localhost", self.rt.command("mobile", config))
        self.assertNotIn("--offline", self.rt.command("mobile", config))

    def test_stubborn_group_has_bounded_shutdown(self):
        child_code = ("import signal,time; "
                      "signal.signal(signal.SIGTERM,signal.SIG_IGN); "
                      "print('READY',flush=True); time.sleep(30)")
        harness = (f"import runpy,os; m=runpy.run_path({str(MODULE_PATH)!r}); "
                   f"exit(m['foreground']([{sys.executable!r},'-c',{child_code!r}],{str(self.root)!r},dict(os.environ)))")
        process = subprocess.Popen([sys.executable, "-c", harness], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            self.assertEqual(process.stdout.readline().strip(), "READY")
            started = time.monotonic()
            process.send_signal(signal.SIGTERM)
            self.assertEqual(process.wait(timeout=8), 137)
            self.assertLess(time.monotonic() - started, 7)
        finally:
            if process.poll() is None:
                process.kill()
                process.wait(timeout=5)
            process.stdout.close()
            process.stderr.close()

    def test_exited_leader_descendants_are_cleaned_before_reap(self):
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            port = probe.getsockname()[1]
        ready = self.base / "descendant-ready"
        descendant = ("import socket,time,signal; "
                      "signal.signal(signal.SIGTERM,signal.SIG_IGN); s=socket.socket(); "
                      f"s.bind(('127.0.0.1',{port})); s.listen(); "
                      f"open({str(ready)!r},'w').close(); time.sleep(30)")
        leader = (f"import subprocess,time,os; subprocess.Popen([{sys.executable!r},'-c',{descendant!r}]); "
                  f"\nwhile not os.path.exists({str(ready)!r}): time.sleep(0.01)")
        self.assertEqual(runtime.foreground([sys.executable, "-c", leader], self.root, dict(os.environ)), 0)
        # SIGKILL delivery precedes the kernel closing descendant descriptors.
        deadline = time.monotonic() + 2
        while not runtime.available(port) and time.monotonic() < deadline:
            time.sleep(0.02)
        self.assertTrue(runtime.available(port))

    def test_foreground_signal_forwarding_releases_port(self):
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            port = probe.getsockname()[1]
        child_code = ("import signal,socket,time; s=socket.socket(); "
                      f"s.bind(('127.0.0.1',{port})); s.listen(); "
                      "signal.signal(signal.SIGINT,lambda *_:exit(0)); print('READY',flush=True); time.sleep(30)")
        harness = (f"import runpy,os; m=runpy.run_path({str(MODULE_PATH)!r}); "
                   f"exit(m['foreground']([{sys.executable!r},'-c',{child_code!r}],{str(self.root)!r},dict(os.environ)))")
        process = subprocess.Popen([sys.executable, "-c", harness], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            self.assertEqual(process.stdout.readline().strip(), "READY")
            process.send_signal(signal.SIGINT)
            self.assertEqual(process.wait(timeout=10), 0)
            self.assertTrue(runtime.available(port))
        finally:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=10)
            process.stdout.close()
            process.stderr.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
