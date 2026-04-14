# utils.py
import re
import datetime
from pathlib import PurePosixPath
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

def normalize_search_terms(raw_terms):
    if isinstance(raw_terms, str):
        raw_terms = raw_terms.split()
    return [term.lower() for term in raw_terms if term and term.strip()]

def _split_keywords(value):
    return [part for part in re.split(r"[^a-z0-9]+", value.lower()) if part]

def extract_title(text, fallback_stem):
    lines = text.splitlines()
    if lines:
        first = lines[0]
        if first.startswith("# "):
            return first[2:].strip()
        if first.startswith("#"):
            return first.lstrip("#").strip()
        if first.strip():
            return first.strip()
    return fallback_stem.replace("_", " ").title()

def get_search_path_parts(relative_path):
    path = PurePosixPath(relative_path.lower())
    parts = list(path.parts)
    filename_stem = path.stem
    return {
        "top_dir": parts[0] if len(parts) > 1 else "",
        "subdirs": parts[1:-1] if len(parts) > 2 else [],
        "filename_stem": filename_stem,
        "filename_keywords": _split_keywords(filename_stem),
    }

def classify_search_match(relative_path, text, raw_terms):
    terms = normalize_search_terms(raw_terms)
    if not terms:
        return {
            "top_dir_matches": 0,
            "subdir_matches": 0,
            "filename_matches": 0,
            "content_matches": 0,
            "score": 0,
            "sort_key": (0, 0, 0, 0),
            "line_num": None,
        }

    path_parts = get_search_path_parts(relative_path)
    top_dir = path_parts["top_dir"]
    subdirs = path_parts["subdirs"]
    filename_stem = path_parts["filename_stem"]
    filename_keywords = path_parts["filename_keywords"]
    text_lower = text.lower()

    top_dir_matches = 0
    subdir_matches = 0
    filename_matches = 0
    content_matches = 0
    content_positions = []

    for term in terms:
        if top_dir and term in top_dir:
            top_dir_matches += 1
            continue
        if any(term in subdir for subdir in subdirs):
            subdir_matches += 1
            continue
        if term in filename_stem or any(term in keyword for keyword in filename_keywords):
            filename_matches += 1
            continue
        if text_lower and term in text_lower:
            content_matches += 1
            content_positions.append(text_lower.find(term))
            continue
        return None

    line_num = None
    if content_positions:
        first_position = min(content_positions)
        line_num = text_lower[:first_position].count("\n")

    score = (
        top_dir_matches * 1000
        + subdir_matches * 100
        + filename_matches * 10
        + content_matches
    )

    return {
        "top_dir_matches": top_dir_matches,
        "subdir_matches": subdir_matches,
        "filename_matches": filename_matches,
        "content_matches": content_matches,
        "score": score,
        "sort_key": (
            top_dir_matches,
            subdir_matches,
            filename_matches,
            content_matches,
        ),
        "line_num": line_num,
    }

def find_files(terms):
    terms = normalize_search_terms(terms)
    results = []
    for f in MEM_HOME.rglob("*.md"):
        rel_name = f.relative_to(MEM_HOME).as_posix().lower()
        match = classify_search_match(rel_name, "", terms)
        if match is not None:
            results.append((match["sort_key"], f.stat().st_mtime, f))
    results.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return [f for _, _, f in results]
