import os
import shutil
import time
from datetime import datetime

# Windows open-handle quirk: renaming the live save dir can transiently fail
# (ERROR_SHARING_VIOLATION) while a game holds a handle inside it, so the
# renames of the restore swap are retried a bounded number of times.
_RENAME_ATTEMPTS = 3
_RENAME_RETRY_DELAY = 0.05

# BASE_DIR = os.path.abspath(".")
# save_dir = os.path.join(BASE_DIR, "save")
# backup_root_dir = os.path.join(BASE_DIR, "backup")

# def set_save_dir(path: str) -> None:
#     """Set the save directory to a custom path."""
#     global save_dir
#     save_dir = path
    
# def set_backup_root_dir(path: str) -> None:
#     """Set the backup root directory to a custom path."""
#     global backup_root_dir
#     backup_root_dir = path

def _timestamp_name() -> str:
    # Format: save-YYMMDD-HHMMSS
    return datetime.now().strftime("save-%y%m%d-%H%M%S")


def make_backup(save_dir, backup_root_dir) -> tuple:
    """Copy ./save to ./backup/save-YYMMDD-HHMMSS and return (backup_path, backup_name)."""
    if not os.path.isdir(save_dir):
        raise FileNotFoundError(f"'save' folder not found at {save_dir}")

    os.makedirs(backup_root_dir, exist_ok=True)

    # two saves within the same second would collide, so append a counter until the name is free
    base_name = _timestamp_name()
    backup_name = base_name
    backup_path = os.path.join(backup_root_dir, backup_name)
    counter = 1
    while os.path.exists(backup_path):
        backup_name = f"{base_name}-{counter}"
        backup_path = os.path.join(backup_root_dir, backup_name)
        counter += 1

    # copytree requires that destination does not exist
    shutil.copytree(save_dir, backup_path)  # copies directory recursively
    return backup_path, backup_name


def _rename_with_retry(src: str, dst: str) -> None:
    """os.rename with bounded retry, to bounce over transient Windows locks."""
    last_err = None
    for attempt in range(_RENAME_ATTEMPTS):
        try:
            os.rename(src, dst)
            return
        except OSError as err:
            last_err = err
            if attempt < _RENAME_ATTEMPTS - 1:
                time.sleep(_RENAME_RETRY_DELAY)
    raise last_err


def restore_backup(save_dir,backup_root_dir) -> tuple:
    """Restore the most recent backup into ./save (overwriting current save). Returns (latest_path, latest_name)."""
    if not os.path.isdir(backup_root_dir):
        raise FileNotFoundError(f"'backup' folder not found at {backup_root_dir}")

    # List only subdirectories whose names start with 'save-'
    candidates = [
        d for d in os.listdir(backup_root_dir)
        if d.startswith("save-")
        and os.path.isdir(os.path.join(backup_root_dir, d))
    ]
    if not candidates:
        raise FileNotFoundError("No backups found in 'backup' folder")

    # Latest backup: lexicographically max, because name includes timestamp
    latest_name = max(candidates)
    latest_path = os.path.join(backup_root_dir, latest_name)

    # Atomic swap (review Item 7): rename the live dir aside, copy the backup
    # in, then drop the tmp. A failure at any point leaves the live state
    # untouched or renamed back, so a failed restore never loses both states.
    tmp_dir = os.fspath(save_dir) + '-restoring-tmp'

    if os.path.exists(tmp_dir):
        # residue of an interrupted restore: when the live dir also exists the
        # residue could be a saved state, so refuse instead of deleting it
        if os.path.exists(save_dir):
            raise RuntimeError(
                f"restore aborted: live save dir {save_dir} and interrupted-restore "
                f"residue {tmp_dir} both exist; remove the residue or rename it back manually"
            )
        _rename_with_retry(tmp_dir, save_dir)

    renamed = False
    if os.path.exists(save_dir):
        _rename_with_retry(save_dir, tmp_dir)
        renamed = True

    try:
        shutil.copytree(latest_path, save_dir)
    except BaseException as copy_err:  # Ctrl-C too: the old live state comes back
        if not renamed:
            raise
        shutil.rmtree(save_dir, ignore_errors=True)  # drop the partial copy
        try:
            _rename_with_retry(tmp_dir, save_dir)
        except OSError:
            raise RuntimeError(
                f"restore failed ({copy_err}) and the live state could not be "
                f"renamed back; it is preserved at {tmp_dir}"
            ) from copy_err
        raise

    if renamed:
        # junk cleanup; a locked residue is refused loudly by the next run
        shutil.rmtree(tmp_dir, ignore_errors=True)
    return latest_path, latest_name


