#!/usr/bin/env python3
"""Overlay only Eco Globe collaboration files into a clean linked worker."""
import json, os, re, shutil, stat, subprocess, sys
from pathlib import Path
sys.dont_write_bytecode = True
PAIR = '.agents/skills/eco-globe-agent-pair'
FILES = ('AGENTS.md', 'CLAUDE.md', '.gitignore', '.nvmrc', 'docs/ORCA_DEVELOPMENT.md', f'{PAIR}/SKILL.md', f'{PAIR}/scripts/orca_setup.py', f'{PAIR}/scripts/orca_setup.test.py', '.claude/agents/frontend-dev.md', '.claude/agents/backend-review.md', 'scripts/orca-runtime.py', 'scripts/orca-runtime.test.py', 'scripts/orca-sql.py', 'scripts/orca-sql.test.py', 'scripts/orca-sql-smoke.mjs')
def git(root, *args):
    return subprocess.check_output(['git', *args], cwd=root, stderr=subprocess.DEVNULL)


def checkout_paths(source, target):
    source, target = source.resolve(strict=True), target.resolve(strict=True)
    if source == target or not (target / '.git').is_file() or (target / '.git').is_symlink():
        raise ValueError('Setup requires a separate Git worktree, never the primary checkout.')
    for root in (source, target):
        if Path(git(root, 'rev-parse', '--show-toplevel').decode().strip()).resolve() != root:
            raise ValueError('Setup paths must be checkout roots.')
    common = lambda root: git(root, 'rev-parse', '--path-format=absolute', '--git-common-dir').strip()
    if common(source) != common(target):
        raise ValueError('Source and target must belong to the same repository.')
    if common(target) == git(target, 'rev-parse', '--absolute-git-dir').strip():
        raise ValueError('Primary checkout is forbidden.')
    return source, target


def regular_file(path, allow_missing=False):
    if path.resolve() != path or path.is_symlink():
        raise ValueError(f'Linked file: {path.name}')
    try:
        info = path.stat()
    except FileNotFoundError:
        if allow_missing:
            return False
        raise ValueError(f'Missing file: {path.name}') from None
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
        raise ValueError(f'Expected single-link regular file: {path.name}')
    return True


def reject_staged(target, relative):
    # Check independently of disk contents: staged edits may match the overlay,
    # and staged deletions have disappeared from the index entirely.
    if git(target, 'diff', '--cached', 'HEAD', '--', relative):
        raise ValueError(f'Staged target changes: {relative}')


def plan_overlay(source, target, files):
    copies = []
    for relative in files:
        src, dst = source / relative, target / relative
        regular_file(src)
        exists = regular_file(dst, allow_missing=True)
        reject_staged(target, relative)
        content = src.read_bytes()
        if not exists:
            if git(target, 'ls-tree', '--name-only', 'HEAD', '--', relative):
                raise ValueError(f'Deleted tracked target tool: {relative}')
        elif dst.read_bytes() != content:
            try:
                baseline = git(target, 'show', f'HEAD:{relative}')
            except subprocess.CalledProcessError:
                raise ValueError(f'Foreign target tool: {relative}') from None
            if baseline != dst.read_bytes():
                raise ValueError(f'Modified target tool: {relative}')
        copies.append((relative, dst, content))
    return copies


def plan_manifest(source, target):
    package = target / 'package.json'
    regular_file(source / 'package.json')
    regular_file(package)
    reject_staged(target, 'package.json')
    manifest = json.loads(package.read_text())
    additions = json.loads((source / 'package.json').read_text())['scripts']
    additions = {k:v for k,v in additions.items() if k.startswith('orca:') or k.endswith(':orca')}
    for key, value in additions.items():
        if key in manifest.get('scripts', {}) and manifest['scripts'][key] != value:
            raise ValueError('Conflicting worker script: '+key)
    manifest.setdefault('scripts', {}).update(additions)
    return ('package.json', package, (json.dumps(manifest, indent=2)+'\n').encode())


def apply_overlay(copies):
    for relative, dst, content in copies:
        dst.parent.mkdir(parents=True, exist_ok=True)
        exists = regular_file(dst, allow_missing=True)
        if exists and dst.read_bytes() == content:
            continue
        temporary = dst.with_name(dst.name + '.orca-setup-tmp')
        # Exclusive creation preserves foreign temporary files, including links.
        with temporary.open('xb') as output:
            try:
                output.write(content)
                output.flush()
                os.fsync(output.fileno())
                temporary.replace(dst)
            finally:
                if temporary.exists():
                    temporary.unlink()


def select_node(source):
    version = (source / '.nvmrc').read_text().strip().removeprefix('v')
    if not re.fullmatch(r'22\.\d+\.\d+', version):
        raise ValueError('Expected an exact Node 22 version in .nvmrc.')
    home = Path.home()
    current = shutil.which('node')
    candidates = ([Path(current)] if current else []) + [
        home / '.nvm/versions/node' / f'v{version}' / 'bin/node',
        home / 'Library/Application Support/Herd/config/nvm/versions/node' / f'v{version}' / 'bin/node',
    ]
    safe = {key: os.environ[key] for key in ('PATH', 'TMPDIR', 'LANG') if key in os.environ}
    for node in candidates:
        if not node.is_file():
            continue
        result = subprocess.run([str(node), '--version'], env=safe, capture_output=True, text=True, timeout=10)
        if result.returncode == 0 and result.stdout.strip() == f'v{version}':
            os.environ['PATH'] = str(node.parent) + os.pathsep + os.environ.get('PATH', '')
            return
    raise ValueError(f'Install Node {version} using nvm or Herd, then rerun setup.')


def main():
    os.umask(0o077)
    source, target = checkout_paths(Path(os.environ['ORCA_ROOT_PATH']), Path(os.environ['ORCA_WORKTREE_PATH']))
    if Path(__file__).resolve() != source / PAIR / 'scripts/orca_setup.py':
        raise ValueError('Invoke the current primary hook using ORCA_ROOT_PATH.')
    copies = plan_overlay(source, target, FILES)
    copies.append(plan_manifest(source, target))
    select_node(source)
    apply_overlay(copies)
    subprocess.run([sys.executable, str(target/'scripts/orca-runtime.py'), 'prepare', '--install'], cwd=target, check=True)
    print('Eco Globe worker prepared; provision its dedicated SQL database explicitly for SQL-backed checks.')

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        sys.exit('Eco Globe setup failed: '+(str(error) if isinstance(error,ValueError) else type(error).__name__))
