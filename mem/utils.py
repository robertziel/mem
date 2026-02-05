# utils.py
import re
import datetime
from .config import MEM_HOME

def init_dir():
    MEM_HOME.mkdir(parents=True, exist_ok=True)
    return MEM_HOME

def slugify(s):
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    return s or "note"

def timestamp():
    return datetime.datetime.utcnow().strftime("%Y%m%d")

def find_files(terms):
    terms = [t.lower() for t in terms]
    results = []
    for f in MEM_HOME.rglob("*.md"):
        rel_name = f.relative_to(MEM_HOME).as_posix().lower()
        if all(t in rel_name for t in terms):
            results.append(f)
    return results
