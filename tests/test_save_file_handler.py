import os
from pathlib import Path

import pytest

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
