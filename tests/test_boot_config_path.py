"""#461 - the default config resolves next to the exe/script, never the CWD.

Live bug (maintainer report 2026-11-23): the default config path is the bare
name 'FSTconfig.txt', so open() resolved it against the process CWD. A boot
route without a working folder (startup shortcut -> CWD C:\\Windows\\System32)
missed the user's config and FST started deactivated; create_new_group_file
could even write an empty config into the foreign directory. Fix: the entry
point anchors the default name to get_app_directory() - PyInstaller-frozen,
Nuitka-onefile and dev-run safe. The '-file' override semantics stay
UNCHANGED: the given string enters the config manager exactly as given
(test_file_argument_sets_config_file_name in test_argument_manager.py is the
pre-existing passthrough pin; test_override_string_stays_verbatim repeats it
against the new anchor so an over-eager fix cannot re-anchor overrides too).
"""
import os
from types import SimpleNamespace

import fst_manager
from fst_manager import (Argument_Manager, Config_Manager,
                         default_config_path, get_app_directory)

# the body _write_out_new_file writes for a fresh config - known-parsable
MINIMAL_CONFIG = "# Tap Groups\na, d\nw, s\n"


def _fake_pyinstaller(monkeypatch, exe_path):
    """Steer get_app_directory down the frozen branch without freezing the
    test process."""
    monkeypatch.setattr(fst_manager.sys, 'frozen', True, raising=False)
    monkeypatch.setattr(fst_manager.sys, 'executable', str(exe_path))


def _clear_build_anchors(monkeypatch):
    """Neutralize the frozen and the Nuitka-onefile anchors so the
    module-file fallback is reached."""
    monkeypatch.delattr(fst_manager.sys, 'frozen', raising=False)
    monkeypatch.delenv('NUITKA_ONEFILE_DIRECTORY', raising=False)
    monkeypatch.delenv('NUITKA_ONEFILE_BINARY', raising=False)


def _foreign_cwd(tmp_path, monkeypatch):
    """A stand-in for the boot-shortcut CWD (System32 in the live report)."""
    foreign = tmp_path / 'foreign_cwd'
    foreign.mkdir()
    monkeypatch.chdir(foreign)
    return foreign


class TestGetAppDirectory:
    def test_pyinstaller_frozen_resolves_to_exe_dir_not_cwd(self, tmp_path,
                                                            monkeypatch):
        exe_dir = tmp_path / 'FST install'
        exe_dir.mkdir()
        _fake_pyinstaller(monkeypatch, exe_dir / 'free_snap_tap.exe')
        _foreign_cwd(tmp_path, monkeypatch)
        assert get_app_directory() == str(exe_dir)

    def test_nuitka_onefile_env_anchor_beats_the_extract_dir(self, tmp_path,
                                                             monkeypatch):
        # Nuitka 4.x (the installed build, built_nuitka.bat route): the
        # onefile bootstrap exports NUITKA_ONEFILE_DIRECTORY - the
        # DIRECTORY of the original exe (OnefileBootstrap.c:1377) - and
        # __main__.__file__ / module __file__ point into the temp-extract
        # dir, so the env anchor must win
        _clear_build_anchors(monkeypatch)
        real_dir = tmp_path / 'progra~1'
        real_dir.mkdir()
        extract_dir = tmp_path / 'tmp' / 'onefile_123'
        extract_dir.mkdir(parents=True)
        monkeypatch.setenv('NUITKA_ONEFILE_DIRECTORY', str(real_dir))
        monkeypatch.setattr(fst_manager, '__file__',
                            str(extract_dir / 'fst_manager.py'))
        _foreign_cwd(tmp_path, monkeypatch)
        assert get_app_directory() == str(real_dir)

    def test_legacy_onefile_binary_env_is_still_honoured(self, tmp_path,
                                                         monkeypatch):
        # the legacy NUITKA_ONEFILE_BINARY spelling (full exe path) keeps a
        # twin branch - the branch is pinned here, its Nuitka-version history
        # is not asserted
        _clear_build_anchors(monkeypatch)
        real_dir = tmp_path / 'progra~1'
        real_dir.mkdir()
        monkeypatch.setenv('NUITKA_ONEFILE_BINARY',
                           str(real_dir / 'free_snap_tap_nuitka.exe'))
        _foreign_cwd(tmp_path, monkeypatch)
        assert get_app_directory() == str(real_dir)

    def test_dev_run_resolves_to_script_dir(self, tmp_path, monkeypatch):
        _clear_build_anchors(monkeypatch)
        repo = tmp_path / 'repo'
        repo.mkdir()
        monkeypatch.setattr(fst_manager, '__file__',
                            str(repo / 'fst_manager.py'))
        _foreign_cwd(tmp_path, monkeypatch)
        assert get_app_directory() == str(repo)

    def test_under_the_test_runner_the_anchor_is_the_repo_not_a_venv_path(
            self, tmp_path, monkeypatch):
        # the review P1-3 regression: the fallback is this MODULE's file,
        # never __main__ (under pytest __main__ is the pytest package in
        # the venv - anchoring there made the kb_env fixtures load from
        # the venv and auto-create a config inside site-packages)
        _clear_build_anchors(monkeypatch)
        foreign = _foreign_cwd(tmp_path, monkeypatch)
        assert get_app_directory() == os.path.dirname(
            os.path.abspath(fst_manager.__file__))
        assert list(foreign.iterdir()) == []


class TestDefaultConfigPath:
    def test_default_name_anchors_to_app_dir_under_foreign_cwd(self, tmp_path,
                                                               monkeypatch):
        exe_dir = tmp_path / 'progra~1'
        exe_dir.mkdir()
        _fake_pyinstaller(monkeypatch, exe_dir / 'free_snap_tap.exe')
        _foreign_cwd(tmp_path, monkeypatch)
        assert default_config_path() == os.path.join(str(exe_dir),
                                                     'FSTconfig.txt')

    def test_maintainer_switch_name_anchors_too(self, tmp_path, monkeypatch):
        # the commented free_snap_tap.py switch line passes an alternate
        # name; it must land next to the app dir just like the default
        exe_dir = tmp_path / 'progra~1'
        exe_dir.mkdir()
        _fake_pyinstaller(monkeypatch, exe_dir / 'free_snap_tap.exe')
        _foreign_cwd(tmp_path, monkeypatch)
        assert default_config_path('FSTconfig_test.txt') == os.path.join(
            str(exe_dir), 'FSTconfig_test.txt')


class TestEntryWiring:
    # the #461 WIRING pin (review P2-4): the module-level assignment in
    # free_snap_tap.py (what every exe/dev boot runs) is pinned end-to-end -
    # reverting CONSTANTS.FILE_NAME to a bare relative name fails this

    def test_importing_the_entry_module_leaves_an_anchored_absolute_name(self):
        import importlib
        importlib.import_module('free_snap_tap')  # cached import = the wiring
        file_name = fst_manager.CONSTANTS.FILE_NAME
        assert os.path.isabs(file_name)
        assert os.path.dirname(file_name) == os.path.dirname(
            os.path.abspath(fst_manager.__file__))
        assert os.path.basename(file_name) == 'FSTconfig.txt'


class TestConfigOpenUnderForeignCwd:
    # the #461 acceptance pins: a foreign-CWD run opens the exe-dir config

    def test_run_opens_exe_dir_config_and_records_found(self, tmp_path,
                                                        monkeypatch):
        exe_dir = tmp_path / 'progra~1'
        exe_dir.mkdir()
        config = exe_dir / 'FSTconfig.txt'
        config.write_text(MINIMAL_CONFIG, encoding='utf-8')
        _fake_pyinstaller(monkeypatch, exe_dir / 'free_snap_tap.exe')
        foreign = _foreign_cwd(tmp_path, monkeypatch)
        cm = Config_Manager(default_config_path())
        cm.load_config()
        assert cm.file_name == str(config)
        assert cm.config_file_found is True
        # nothing was created in the foreign CWD (the old System32 hole)
        assert list(foreign.iterdir()) == []

    def test_missing_config_lands_next_to_exe_not_cwd(self, tmp_path,
                                                      monkeypatch):
        exe_dir = tmp_path / 'progra~1'
        exe_dir.mkdir()
        _fake_pyinstaller(monkeypatch, exe_dir / 'free_snap_tap.exe')
        foreign = _foreign_cwd(tmp_path, monkeypatch)
        cm = Config_Manager(default_config_path())
        cm.load_config()
        assert (exe_dir / 'FSTconfig.txt').is_file()
        assert list(foreign.iterdir()) == []
        # the honest #460 signal: the loader did NOT find a config
        assert cm.config_file_found is False

    def test_override_string_stays_verbatim(self, fake_fst):
        # '-file' semantics UNCHANGED (task spec): the override enters the
        # config manager exactly as given - no app-dir anchoring - a
        # relative override keeps resolving the way open() always resolved
        # it (against the CWD)
        fake_fst.config_manager = SimpleNamespace(file_name='')
        Argument_Manager(fake_fst).apply_start_arguments(['-file=my.cfg'])
        assert fake_fst.config_manager.file_name == 'my.cfg'
