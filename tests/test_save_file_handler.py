import os
import shutil
from pathlib import Path

import pytest

import fst_save_file_handler as handler
from fst_save_file_handler import make_backup, restore_backup


def _make_backup_dir(root: Path, name: str, content: str) -> Path:
    backup_dir = root / name
    backup_dir.mkdir(parents=True)
    (backup_dir / 'config.txt').write_text(content)
    return backup_dir


def test_make_backup_returns_path_and_name(tmp_path):
    save = tmp_path / 'save'
    (save / 'sub').mkdir(parents=True)
    (save / 'sub' / 'file.txt').write_text('content')

    backup_path, backup_name = make_backup(str(save), str(tmp_path / 'backup'))

    assert backup_name.startswith('save-')
    assert (Path(backup_path) / 'sub' / 'file.txt').read_text() == 'content'


def test_make_backup_missing_save_dir_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        make_backup(str(tmp_path / 'nope'), str(tmp_path / 'backup'))


def test_make_backup_twice_in_same_second(tmp_path):
    save = tmp_path / 'save'
    save.mkdir()
    (save / 'f.txt').write_text('x')
    backup_root = tmp_path / 'backup'

    path1, name1 = make_backup(str(save), str(backup_root))
    path2, name2 = make_backup(str(save), str(backup_root))

    assert name1 != name2
    assert os.path.exists(path1)
    assert os.path.exists(path2)
    assert (Path(path1) / 'f.txt').read_text() == 'x'
    assert (Path(path2) / 'f.txt').read_text() == 'x'


def test_restore_returns_latest_backup(tmp_path):
    backup_root = tmp_path / 'backup'
    _make_backup_dir(backup_root, 'save-260905-010000', 'old')
    new = _make_backup_dir(backup_root, 'save-260905-020000', 'new')

    latest_path, latest_name = restore_backup(str(tmp_path / 'save'), str(backup_root))

    assert latest_name == 'save-260905-020000'
    assert Path(latest_path) == new
    assert (tmp_path / 'save' / 'config.txt').read_text() == 'new'


def test_restore_overwrites_existing_save(tmp_path):
    backup_root = tmp_path / 'backup'
    _make_backup_dir(backup_root, 'save-260101-000000', 'v2')
    save_dir = tmp_path / 'save'
    save_dir.mkdir()
    (save_dir / 'old.txt').write_text('old')

    restore_backup(str(save_dir), str(backup_root))

    assert not (save_dir / 'old.txt').exists()
    assert (save_dir / 'config.txt').read_text() == 'v2'


def test_restore_missing_backup_root_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        restore_backup(str(tmp_path / 'save'), str(tmp_path / 'backup'))


def test_restore_no_backups_raises(tmp_path):
    backup_root = tmp_path / 'backup'
    backup_root.mkdir()
    with pytest.raises(FileNotFoundError):
        restore_backup(str(tmp_path / 'save'), str(backup_root))


# --- F-A1 (review Item 7): restore_backup must be non-destructive ----------
# Swap order: rename live aside -> copy backup in -> drop tmp. A failure at
# any point leaves the live state untouched or renamed back. The failure-path
# and locked-rename pins below are RED against the old rmtree-first order.

_TMP_NAME = 'save-restoring-tmp'


def _live_save(tmp_path):
    save_dir = tmp_path / 'save'
    save_dir.mkdir()
    (save_dir / 'old.txt').write_text('OLD')
    return save_dir


def _two_file_backup(backup_root):
    bdir = _make_backup_dir(backup_root, 'save-260101-000000', 'v2')
    (bdir / 'second.txt').write_text('two')  # so the copy dies past the first file
    return bdir


def test_restore_midcopy_failure_keeps_live_intact(tmp_path, monkeypatch):
    backup_root = tmp_path / 'backup'
    _two_file_backup(backup_root)
    save_dir = _live_save(tmp_path)

    def flaky_copytree(src, dst, *args, **kwargs):
        os.makedirs(dst)
        shutil.copy2(os.path.join(src, 'config.txt'), os.path.join(dst, 'config.txt'))
        raise OSError(28, 'simulated mid-copy failure (disk full)')

    monkeypatch.setattr(handler.shutil, 'copytree', flaky_copytree)

    with pytest.raises(OSError, match='simulated'):
        handler.restore_backup(str(save_dir), str(backup_root))

    assert (save_dir / 'old.txt').read_text() == 'OLD'
    assert not (save_dir / 'config.txt').exists()
    assert not (tmp_path / _TMP_NAME).exists()


def test_restore_bounce_locked_preserves_data_in_tmp(tmp_path, monkeypatch):
    backup_root = tmp_path / 'backup'
    _two_file_backup(backup_root)
    save_dir = _live_save(tmp_path)

    def flaky_copytree(src, dst, *args, **kwargs):
        os.makedirs(dst)
        raise OSError(28, 'simulated mid-copy failure')

    real_rename = os.rename

    def locked_bounce(src, dst, *args, **kwargs):
        if os.fspath(dst) == os.fspath(save_dir):
            raise PermissionError(32, 'simulated open handle on bounce-back')
        return real_rename(src, dst, *args, **kwargs)

    monkeypatch.setattr(handler.shutil, 'copytree', flaky_copytree)
    monkeypatch.setattr(handler.os, 'rename', locked_bounce)
    monkeypatch.setattr(handler.time, 'sleep', lambda s: None)

    with pytest.raises(RuntimeError, match='restoring-tmp'):
        handler.restore_backup(str(save_dir), str(backup_root))

    tmp_dir = tmp_path / _TMP_NAME
    assert (tmp_dir / 'old.txt').read_text() == 'OLD'
    assert not (save_dir / 'old.txt').exists()


def test_restore_success_leaves_no_tmp_residue(tmp_path):
    backup_root = tmp_path / 'backup'
    _make_backup_dir(backup_root, 'save-260101-000000', 'v2')
    save_dir = _live_save(tmp_path)

    restore_backup(str(save_dir), str(backup_root))

    assert (save_dir / 'config.txt').read_text() == 'v2'
    assert not (save_dir / 'old.txt').exists()
    assert not (tmp_path / _TMP_NAME).exists()


def test_restore_recovers_stale_tmp_when_save_missing(tmp_path):
    backup_root = tmp_path / 'backup'
    _make_backup_dir(backup_root, 'save-260101-000000', 'v2')
    tmp_dir = tmp_path / _TMP_NAME
    tmp_dir.mkdir()
    (tmp_dir / 'old.txt').write_text('OLD')

    restore_backup(str(tmp_path / 'save'), str(backup_root))

    save_dir = tmp_path / 'save'
    assert (save_dir / 'config.txt').read_text() == 'v2'
    assert not tmp_dir.exists()


def test_restore_ambiguous_stale_tmp_refuses(tmp_path):
    backup_root = tmp_path / 'backup'
    _make_backup_dir(backup_root, 'save-260101-000000', 'v2')
    save_dir = _live_save(tmp_path)
    tmp_dir = tmp_path / _TMP_NAME
    tmp_dir.mkdir()
    (tmp_dir / 'residue.txt').write_text('R')

    with pytest.raises(RuntimeError, match='residue'):
        restore_backup(str(save_dir), str(backup_root))

    assert (save_dir / 'old.txt').read_text() == 'OLD'
    assert (tmp_dir / 'residue.txt').read_text() == 'R'


def test_restore_rename_retry_then_succeeds(tmp_path, monkeypatch):
    backup_root = tmp_path / 'backup'
    _make_backup_dir(backup_root, 'save-260101-000000', 'v2')
    save_dir = _live_save(tmp_path)

    real_rename = os.rename
    renames = []

    def flaky_rename(src, dst, *args, **kwargs):
        renames.append((os.fspath(src), os.fspath(dst)))
        if len(renames) <= 2:
            raise PermissionError(32, 'simulated open handle')
        return real_rename(src, dst, *args, **kwargs)

    sleeps = []
    monkeypatch.setattr(handler.os, 'rename', flaky_rename)
    monkeypatch.setattr(handler.time, 'sleep', sleeps.append)

    restore_backup(str(save_dir), str(backup_root))

    assert (save_dir / 'config.txt').read_text() == 'v2'
    assert not (save_dir / 'old.txt').exists()
    assert not (tmp_path / _TMP_NAME).exists()
    assert len(renames) == 3
    assert len(sleeps) == 2 and len(sleeps) < handler._RENAME_ATTEMPTS


def test_restore_rename_retry_exhausted_live_untouched(tmp_path, monkeypatch):
    backup_root = tmp_path / 'backup'
    _make_backup_dir(backup_root, 'save-260101-000000', 'v2')
    save_dir = _live_save(tmp_path)

    renames = []

    def locked_rename(src, dst, *args, **kwargs):
        renames.append((os.fspath(src), os.fspath(dst)))
        raise PermissionError(32, 'simulated permanent open handle')

    sleeps = []
    monkeypatch.setattr(handler.os, 'rename', locked_rename)
    monkeypatch.setattr(handler.time, 'sleep', sleeps.append)

    with pytest.raises(PermissionError):
        restore_backup(str(save_dir), str(backup_root))

    assert (save_dir / 'old.txt').read_text() == 'OLD'
    assert not (tmp_path / _TMP_NAME).exists()
    assert len(renames) == handler._RENAME_ATTEMPTS
    assert len(sleeps) == handler._RENAME_ATTEMPTS - 1
