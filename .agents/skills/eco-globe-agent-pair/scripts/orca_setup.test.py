#!/usr/bin/env python3
"""Setup preservation regressions: real Git worktrees, temporary files only."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('orca_setup', Path(__file__).with_name('orca_setup.py'))
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)


class SetupTests(unittest.TestCase):
    files = ('AGENTS.md', 'docs/tool.md')

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name).resolve()
        # No inherited Git configuration, hooks, or credentials enter fixtures.
        self.environment = patch.dict(os.environ, {
            'PATH': '/usr/bin:/bin', 'HOME': str(self.base),
            'GIT_CONFIG_NOSYSTEM': '1', 'GIT_CONFIG_GLOBAL': '/dev/null',
        }, clear=True)
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.source = self.base / 'source'
        self.source.mkdir()
        self.git(self.source, 'init', '-q')
        (self.source / 'docs').mkdir()
        for relative in self.files:
            (self.source / relative).write_text('baseline\n')
        self.write_manifest(self.source, {'name': 'fixture', 'scripts': {'test': 'original'}})
        self.git(self.source, 'add', '.')
        self.git(self.source, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
                 '-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture')
        self.target = self.base / 'worker'
        self.git(self.source, 'worktree', 'add', '--detach', str(self.target), 'HEAD')
        for relative in self.files:
            (self.source / relative).write_text('new collaboration tool\n')
        self.write_manifest(self.source, {'name': 'fixture', 'scripts': {
            'test': 'primary-only-change', 'orca:check': 'python3 scripts/orca-runtime.py check',
        }})

    def git(self, root, *args):
        return subprocess.check_output(['/usr/bin/git', '-C', str(root), *args], stderr=subprocess.DEVNULL)

    def write_manifest(self, root, value):
        (root / 'package.json').write_text(json.dumps(value, indent=2) + '\n')

    def snapshot(self, root):
        paths = (*self.files, 'package.json')
        return ({name: (root / name).read_bytes() if (root / name).is_file() else None for name in paths},
                self.git(root, 'status', '--porcelain=v1'), self.git(root, 'diff', '--cached', '--binary'))

    def overlay(self):
        setup.checkout_paths(self.source, self.target)
        copies = setup.plan_overlay(self.source, self.target, self.files)
        copies.append(setup.plan_manifest(self.source, self.target))
        setup.apply_overlay(copies)

    def assert_preserved_refusal(self):
        before_source, before_target = self.snapshot(self.source), self.snapshot(self.target)
        with self.assertRaises(ValueError):
            self.overlay()
        self.assertEqual(before_source, self.snapshot(self.source))
        self.assertEqual(before_target, self.snapshot(self.target))
        self.assertFalse(list(self.target.rglob('*.orca-setup-tmp')))

    def test_dirty_later_tool_preserves_entire_target(self):
        (self.target / self.files[-1]).write_text('worker-owned dirty edit\n')
        self.assert_preserved_refusal()

    def test_staged_edit_even_when_identical_to_source_is_preserved(self):
        relative = self.files[-1]
        (self.target / relative).write_bytes((self.source / relative).read_bytes())
        self.git(self.target, 'add', relative)
        self.assert_preserved_refusal()

    def test_staged_edit_with_working_file_restored_is_preserved(self):
        relative = self.files[-1]
        (self.target / relative).write_text('staged edit\n')
        self.git(self.target, 'add', relative)
        (self.target / relative).write_text('baseline\n')
        self.assert_preserved_refusal()

    def test_unstaged_deletion_preserved(self):
        (self.target / self.files[-1]).unlink()
        self.assert_preserved_refusal()

    def test_staged_deletion_preserved(self):
        self.git(self.target, 'rm', self.files[-1])
        self.assert_preserved_refusal()

    def test_staged_manifest_edit_preserved(self):
        self.write_manifest(self.target, {'name': 'staged-name', 'scripts': {'test': 'original'}})
        self.git(self.target, 'add', 'package.json')
        self.assert_preserved_refusal()

    def test_staged_manifest_deletion_preserved(self):
        self.git(self.target, 'rm', 'package.json')
        self.assert_preserved_refusal()

    def test_conflicting_dirty_manifest_preserved_before_tools_change(self):
        self.write_manifest(self.target, {'scripts': {'orca:check': 'worker command'}})
        self.assert_preserved_refusal()

    def test_unrelated_dirty_manifest_fields_survive_merge(self):
        self.write_manifest(self.target, {'name': 'worker-name', 'scripts': {'test': 'worker-test'}, 'custom': 7})
        self.overlay()
        value = json.loads((self.target / 'package.json').read_text())
        self.assertEqual(value['name'], 'worker-name')
        self.assertEqual(value['custom'], 7)
        self.assertEqual(value['scripts']['test'], 'worker-test')
        self.assertIn('orca:check', value['scripts'])

    def test_target_manifest_hardlink_cannot_write_primary(self):
        package = self.target / 'package.json'
        package.unlink()
        os.link(self.source / 'package.json', package)
        self.assert_preserved_refusal()

    def test_target_manifest_external_hardlink_refused(self):
        package = self.target / 'package.json'
        alias = self.base / 'target-manifest-alias'
        package.rename(alias)
        os.link(alias, package)
        self.assert_preserved_refusal()

    def test_source_manifest_hardlink_refused(self):
        os.link(self.source / 'package.json', self.base / 'manifest-alias')
        self.assert_preserved_refusal()

    def test_source_tool_hardlink_refused(self):
        os.link(self.source / self.files[-1], self.base / 'tool-alias')
        self.assert_preserved_refusal()

    def test_target_tool_hardlink_refused(self):
        relative = self.files[-1]
        (self.target / relative).unlink()
        alias = self.base / 'target-tool-alias'
        alias.write_text('baseline\n')
        os.link(alias, self.target / relative)
        self.assert_preserved_refusal()

    def test_source_manifest_symlink_refused(self):
        package = self.source / 'package.json'
        external = self.base / 'external-manifest'
        package.rename(external)
        package.symlink_to(external)
        self.assert_preserved_refusal()

    def test_target_manifest_symlink_refused(self):
        package = self.target / 'package.json'
        package.unlink()
        package.symlink_to(self.source / 'package.json')
        self.assert_preserved_refusal()

    def test_nonregular_manifest_refused(self):
        package = self.target / 'package.json'
        package.unlink()
        package.mkdir()
        self.assert_preserved_refusal()

    def test_foreign_untracked_tool_preserved(self):
        relative = 'foreign.md'
        (self.source / relative).write_text('source\n')
        (self.target / relative).write_text('foreign\n')
        with self.assertRaises(ValueError):
            setup.plan_overlay(self.source, self.target, (relative,))
        self.assertEqual((self.target / relative).read_text(), 'foreign\n')

    def test_idempotent_overlay_and_atomic_manifest_replace(self):
        before_source = self.snapshot(self.source)
        original_inode = (self.target / 'package.json').stat().st_ino
        self.overlay()
        self.assertNotEqual(original_inode, (self.target / 'package.json').stat().st_ino)
        first = self.snapshot(self.target)
        inodes = {p: (self.target / p).stat().st_ino for p in (*self.files, 'package.json')}
        self.overlay()
        self.assertEqual(first, self.snapshot(self.target))
        self.assertEqual(inodes, {p: (self.target / p).stat().st_ino for p in inodes})
        self.assertEqual(before_source, self.snapshot(self.source))
        for relative in self.files:
            self.assertEqual((self.target / relative).read_bytes(), (self.source / relative).read_bytes())
        value = json.loads((self.target / 'package.json').read_text())
        self.assertEqual(value['scripts']['test'], 'original')
        self.assertIn('orca:check', value['scripts'])
        self.assertFalse(list(self.target.rglob('*.orca-setup-tmp')))

    def test_primary_target_refused(self):
        with self.assertRaises(ValueError):
            setup.checkout_paths(self.source, self.source)

    def test_other_repository_refused(self):
        other = self.base / 'other'
        other.mkdir()
        self.git(other, 'init', '-q')
        with self.assertRaises(ValueError):
            setup.checkout_paths(self.source, other)


if __name__ == '__main__':
    unittest.main(verbosity=2)
