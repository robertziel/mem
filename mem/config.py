# config.py
import os
import subprocess
import shutil
from pathlib import Path

def get_repo_root():
    try:
        root = subprocess.check_output(["git", "rev-parse", "--show-toplevel"]).decode("utf-8").strip()
        return Path(root)
    except Exception:
        return None

MEM_HOME_ENV = os.environ.get("MEM_HOME")
repo_root = get_repo_root()
if MEM_HOME_ENV:
    MEM_HOME = Path(MEM_HOME_ENV).expanduser()
elif repo_root:
    MEM_HOME = repo_root / "data"
else:
    raise ValueError("No MEM_HOME environment variable set and not in a git repository.")

EDITOR = os.environ.get("EDITOR") or shutil.which("nano") or shutil.which("vi") or "vi"