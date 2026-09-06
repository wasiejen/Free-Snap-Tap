import os
import shutil
from datetime import datetime

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

    # Remove existing save folder (if any), then restore from latest backup
    if os.path.exists(save_dir):
        shutil.rmtree(save_dir)  # remove existing tree safely before restore[web:21][web:25]

    shutil.copytree(latest_path, save_dir)  # restore backup into save[web:16][web:21]
    return latest_path, latest_name


