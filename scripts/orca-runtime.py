#!/usr/bin/env python3
"""Isolated, foreground-only EcoGlobe runtime for linked Git worktrees.

prepare [--install], check, run {web,admin,mobile,api}, verify.
Reservations are durable and never automatically reclaimed. No database provisioning.
This is configuration isolation, not an OS/network sandbox. Run trusted source only.
"""
import argparse
import contextlib
import fcntl
import hashlib
import json
import os
from pathlib import Path
import pwd
import shutil
import signal
import socket
import stat
import subprocess
import sys
import time

NODE_VERSION = "22.20.0"
SERVICES = {"web": "apps/web", "admin": "apps/admin", "mobile": "apps/mobile", "api": "packages/backend"}
# Reviewed tracked public-only file. Both keys are explicitly overridden below.
PUBLIC_ENV_BLOB = "aff870f5760bc8940f8c637465ecae538095cfb8"
EMPTY_SECRETS = ("AZURE_SQL_CONNECTION_STRING", "SQL_CONNECTION_STRING", "RESEND_API_KEY",
                 "STRIPE_SECRET_KEY", "DOCUSIGN_INTEGRATION_KEY", "DOCUSIGN_USER_ID",
                 "DOCUSIGN_ACCOUNT_ID", "DOCUSIGN_PRIVATE_KEY", "DOCUSIGN_RETURN_URL",
                 "DOCUSIGN_WEBHOOK_HMAC_SECRET", "DOCUSIGN_BASE_URI", "DOCUSIGN_TEMPLATE_ID",
                 "AZURE_SIGNED_DOCUMENTS_CONTAINER_SAS_URL", "ECOGLOBE_DEMO_PASSWORD")


class Refusal(RuntimeError):
    pass


def no_symlinks(path):
    path = Path(path).absolute()
    for part in [*reversed(path.parents), path]:
        if part.is_symlink():
            raise Refusal(f"Symlink refused: {part}")
    return path


def private_dir(path):
    path = no_symlinks(path)
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    info = path.stat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise Refusal(f"Expected owner-only directory: {path}")
    return path


@contextlib.contextmanager
def private_file(path, create=False):
    no_symlinks(path)
    fd = os.open(path, os.O_RDWR | os.O_NOFOLLOW | (os.O_CREAT if create else 0), 0o600)
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077 or info.st_nlink != 1:
            raise Refusal(f"Expected owner-only regular file: {path}")
        with os.fdopen(fd, "r+", encoding="utf-8", closefd=False) as stream:
            yield stream
    finally:
        os.close(fd)


@contextlib.contextmanager
def lock(path, blocking=True):
    with private_file(path, create=True) as stream:
        try:
            fcntl.flock(stream, fcntl.LOCK_EX | (0 if blocking else fcntl.LOCK_NB))
        except BlockingIOError:
            raise Refusal(f"Already running or locked: {path.name}") from None
        try:
            yield stream
        finally:
            fcntl.flock(stream, fcntl.LOCK_UN)


def write_json(stream, value):
    stream.seek(0)
    json.dump(value, stream, sort_keys=True, indent=2)
    stream.write("\n")
    stream.truncate()
    stream.flush()
    os.fsync(stream.fileno())


def git(root, *args):
    return subprocess.check_output(["/usr/bin/git", "-C", str(root), *args],
                                   env={"PATH": "/usr/bin:/bin"}, text=True).strip()


def identity(root):
    root = no_symlinks(root)
    if not (root / ".git").is_file() or (root / ".git").is_symlink():
        raise Refusal("Only linked worktrees with a regular .git file are supported")
    actual = Path(git(root, "rev-parse", "--show-toplevel"))
    gitdir = Path(git(root, "rev-parse", "--absolute-git-dir"))
    common = Path(git(root, "rev-parse", "--git-common-dir")).resolve()
    if actual != root or gitdir == common or gitdir.parent != common / "worktrees":
        raise Refusal("Not a linked worktree root")
    info = root.stat()
    return {"root": str(root), "gitdir": str(gitdir), "device": info.st_dev, "inode": info.st_ino}


def audit_tree(root):
    # Never descend into dependency/build trees or inspect credential values.
    skip = {".git", "node_modules", ".next", ".turbo", "dist", ".expo", "__pycache__"}
    for base, dirs, files in os.walk(root, followlinks=False):
        for name in dirs + files:
            path = Path(base) / name
            if path.is_symlink():
                # The repository intentionally shares static assets with Admin.
                if path == root / "apps/admin/public" and os.readlink(path) == "../web/public":
                    no_symlinks(root / "apps/web/public")
                    continue
                raise Refusal(f"Symlink in project inputs: {path.relative_to(root)}")
            if name in {".npmrc", ".pnpmfile.cjs", "pnpmfile.cjs"}:
                if path != root / ".npmrc":
                    raise Refusal(f"Unexpected package-manager config: {path.relative_to(root)}")
            if name == ".env" or name.startswith(".env."):
                if name.endswith(".example") or name.endswith(".sample"):
                    continue
                if path == root / "apps/web/.env" and git(root, "hash-object", str(path)) == PUBLIC_ENV_BLOB:
                    continue
                raise Refusal(f"Unexpected env file: {path.relative_to(root)}")
        dirs[:] = [name for name in dirs if name not in skip]
    for relative in SERVICES.values():
        no_symlinks(root / relative)
    for name in (".npmrc", ".pnpmfile.cjs", "pnpmfile.cjs"):
        path = root / name
        if path.exists() and (name != ".npmrc" or path.read_text() != "auto-install-peers=true\nstrict-peer-dependencies=false\n"):
            raise Refusal(f"Unexpected package-manager config: {name}")


def available(port):
    sockets = []
    try:
        for family, host in ((socket.AF_INET, "127.0.0.1"), (socket.AF_INET6, "::1")):
            try:
                sock = socket.socket(family, socket.SOCK_STREAM)
            except OSError:
                if family == socket.AF_INET6:
                    continue
                raise
            sockets.append(sock)
            if family == socket.AF_INET6:
                sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
            sock.bind((host, port))
        return True
    except OSError:
        return False
    finally:
        for sock in sockets:
            sock.close()


class Runtime:
    def __init__(self, root, state=None):
        self.root = no_symlinks(root)
        self.owner = identity(self.root)
        self.key = hashlib.sha256(str(self.root).encode()).hexdigest()[:24]
        self.state = private_dir(state or Path(pwd.getpwuid(os.getuid()).pw_dir) / ".local/state/eco-globe-orca")
        self.directory = self.state / self.key

    def config(self, ports):
        return {"version": 1, "owner": self.owner, "ports": ports, "node": NODE_VERSION, "mode": "database-unconfigured"}

    def registry(self, stream):
        registry = json.load(stream)
        if set(registry) != {"version", "leases"} or registry["version"] != 1 or not isinstance(registry["leases"], dict):
            raise Refusal("Foreign reservation registry")
        used = set()
        for key, record in registry["leases"].items():
            if not isinstance(record, dict) or set(record) != {"owner", "ports"} or set(record["ports"]) != set(SERVICES):
                raise Refusal("Invalid reservation record")
            owner = record["owner"]
            if set(owner) != {"root", "gitdir", "device", "inode"} or hashlib.sha256(owner["root"].encode()).hexdigest()[:24] != key:
                raise Refusal("Foreign reservation owner")
            for port in record["ports"].values():
                if type(port) is not int or not 20000 <= port <= 49999 or port in used:
                    raise Refusal("Invalid or overlapping port reservations")
                used.add(port)
        return registry, used

    @contextlib.contextmanager
    def reservations(self, create=False):
        with lock(self.state / "ports.lock"):
            path = self.state / "ports.json"
            if create and not path.exists() and not path.is_symlink():
                with private_file(path, create=True) as stream:
                    write_json(stream, {"version": 1, "leases": {}})
            with private_file(path) as stream:
                yield stream

    def prepare(self):
        audit_tree(self.root)
        with self.reservations(create=True) as stream:
            registry, used = self.registry(stream)
            record = registry["leases"].get(self.key)
            if record is not None and record["owner"] != self.owner:
                raise Refusal("Reservation belongs to a different worktree incarnation")
            if record is None:
                if self.directory.exists():
                    raise Refusal("Runtime directory exists without a reservation")
                ports = {}
                for service in SERVICES:
                    port = next((p for p in range(20000, 50000) if p not in used and available(p)), None)
                    if port is None:
                        raise Refusal("No free local ports")
                    ports[service] = port
                    used.add(port)
                record = {"owner": self.owner, "ports": ports}
                registry["leases"][self.key] = record
                write_json(stream, registry)
            expected = self.config(record["ports"])
            private_dir(self.directory)
            config_path = self.directory / "config.json"
            if config_path.exists() or config_path.is_symlink():
                with private_file(config_path) as config:
                    if json.load(config) != expected:
                        raise Refusal("Foreign or modified runtime configuration")
            else:
                with private_file(config_path, create=True) as config:
                    write_json(config, expected)
            self.audit_state()
            for name in ("home", "tmp", "cache"):
                private_dir(self.directory / name)
            return expected

    def audit_state(self):
        allowed = {"config.json", "home", "tmp", "cache", *(f"{s}.lock" for s in SERVICES), "verify.lock", "install.lock"}
        for path in self.directory.iterdir():
            if path.name not in allowed or path.is_symlink():
                raise Refusal(f"Unexpected runtime state: {path.name}")
            if path.is_dir():
                private_dir(path)
            else:
                with private_file(path):
                    pass

    def check(self):
        audit_tree(self.root)
        private_dir(self.directory)
        self.audit_state()
        with self.reservations() as stream:
            registry, _ = self.registry(stream)
            record = registry["leases"].get(self.key)
            if record is None or record["owner"] != self.owner:
                raise Refusal("Run prepare: missing or foreign worktree reservation")
            with private_file(self.directory / "config.json") as config:
                actual = json.load(config)
            if actual != self.config(record["ports"]):
                raise Refusal("Foreign or modified runtime configuration")
        return actual

    def environment(self, config):
        node = shutil.which("node")
        if not node:
            raise Refusal(f"Activate Node {NODE_VERSION} first (nvm use)")
        node_dir = str(Path(node).resolve().parent)
        env = {"PATH": node_dir + ":/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin",
               "HOME": str(self.directory / "home"), "TMPDIR": str(self.directory / "tmp"),
               "XDG_CACHE_HOME": str(self.directory / "cache"), "LANG": "en_US.UTF-8",
               "TERM": "xterm-256color", "NODE_ENV": "development", "HOST": "127.0.0.1",
               "NPM_CONFIG_USERCONFIG": "/dev/null", "NPM_CONFIG_GLOBALCONFIG": "/dev/null",
               "NEXT_TELEMETRY_DISABLED": "1", "EXPO_NO_TELEMETRY": "1", "EXPO_NO_DOTENV": "1",
               "EXPO_OFFLINE": "1", "EXPO_NO_TYPESCRIPT_SETUP": "1", "CI": "1", "NEXT_PUBLIC_MAPBOX_TOKEN": ""}
        version = subprocess.check_output([node, "--version"], env=env, text=True).strip()
        if version != "v" + NODE_VERSION:
            raise Refusal(f"Node {NODE_VERSION} required; found {version}. Run nvm use.")
        api = f"http://127.0.0.1:{config['ports']['api']}"
        web = f"http://127.0.0.1:{config['ports']['web']}"
        env.update({key: "" for key in EMPTY_SECRETS})
        env.update(ECOGLOBE_API_BASE_URL=api, NEXT_PUBLIC_API_BASE_URL=api,
                   EXPO_PUBLIC_API_BASE_URL=api, ECOGLOBE_WEB_URL=web, CORS_ORIGIN=web)
        return env

    def command(self, service, config):
        port = str(config["ports"][service])
        if service in ("web", "admin"):
            return ["pnpm", "exec", "next", "dev", "--turbopack", "--hostname", "127.0.0.1", "--port", port]
        if service == "mobile":
            return ["pnpm", "exec", "expo", "start", "--localhost", "--port", port]
        return ["pnpm", "exec", "tsx", "src/index.ts"]

    def run(self, service):
        config = self.check()
        env = self.environment(config)
        with lock(self.directory / f"{service}.lock", blocking=False):
            if not available(config["ports"][service]):
                raise Refusal(f"Unmanaged listener on reserved {service} port; left untouched")
            env["PORT"] = str(config["ports"][service])
            return foreground(self.command(service, config), self.root / SERVICES[service], env)


def foreground(command, cwd, env):
    """Keep the child unreaped until group cleanup, so its group ID cannot recycle."""
    if not all(hasattr(os, name) for name in ("waitid", "WNOWAIT", "WEXITED", "P_PID")):
        raise Refusal("Foreground ownership requires POSIX waitid with WNOWAIT")
    child = None
    pending = []
    previous = {}

    def receive(signum, _frame):
        pending.append(signum)

    def exited():
        # WNOWAIT preserves the session leader identity, including after exit.
        return os.waitid(os.P_PID, child.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT) is not None

    def signal_group(signum):
        try:
            os.killpg(child.pid, signum)
        except ProcessLookupError:
            pass
        except PermissionError:
            # macOS can report EPERM for an empty group containing a zombie.
            if not exited():
                raise

    try:
        for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
            previous[sig] = signal.signal(sig, receive)
        child = subprocess.Popen(command, cwd=cwd, env=env, start_new_session=True)
        deadline = None
        while not exited():
            while pending:
                signal_group(pending.pop(0))
                if deadline is None:
                    deadline = time.monotonic() + 3
            if deadline is not None and time.monotonic() >= deadline:
                signal_group(signal.SIGKILL)
            time.sleep(0.05)
    finally:
        try:
            if child is not None:
                # No poll()/wait() before these signals: the leader stays unreaped.
                signal_group(signal.SIGTERM)
                deadline = time.monotonic() + 1
                while time.monotonic() < deadline:
                    time.sleep(0.05)
                signal_group(signal.SIGKILL)
                code = child.wait()
        finally:
            for sig, handler in previous.items():
                signal.signal(sig, handler)
    return code if code >= 0 else 128 - code


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    sub.add_parser("prepare").add_argument("--install", action="store_true")
    sub.add_parser("check")
    sub.add_parser("run").add_argument("service", choices=SERVICES)
    sub.add_parser("verify")
    args = parser.parse_args()
    try:
        runtime = Runtime(Path(__file__).absolute().parent.parent)
        if args.action == "prepare":
            config = runtime.prepare()
            env = runtime.environment(config)
            if args.install:
                with lock(runtime.directory / "install.lock", blocking=False):
                    code = foreground(["pnpm", "install", "--frozen-lockfile"], runtime.root, env)
                    if code:
                        return code
            print(json.dumps(config, indent=2))
        elif args.action == "check":
            config = runtime.check()
            runtime.environment(config)
            print(json.dumps(config, indent=2))
            print("Configuration isolation OK; SQL-backed workflows unverified; no live-service health claim.")
        elif args.action == "run":
            return runtime.run(args.service)
        else:
            config = runtime.check()
            env = runtime.environment(config)
            with lock(runtime.directory / "verify.lock", blocking=False):
                commands = [[sys.executable, str(runtime.root / "scripts/orca-runtime.test.py")],
                            ["pnpm", "--filter=@eco-globe/backend", "test"],
                            ["pnpm", "--filter=@eco-globe/backend", "type-check"]]
                for command in commands:
                    code = foreground(command, runtime.root, env)
                    if code:
                        return code
        return 0
    except (Refusal, OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
        print(f"orca-runtime: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
