import datetime
from pathlib import Path
from .config import MEM_HOME
from .utils import slugify, timestamp


def _safe_path(relative_path: str) -> Path:
    resolved = (MEM_HOME / relative_path).resolve()
    if not str(resolved).startswith(str(MEM_HOME.resolve())):
        raise ValueError("Path traversal not allowed")
    return resolved


def _extract_title(text: str, fallback_stem: str) -> str:
    lines = text.splitlines()
    if lines:
        first = lines[0]
        if first.startswith("# "):
            return first[2:].strip()
        elif first.startswith("#"):
            return first.lstrip("#").strip()
        elif first.strip():
            return first.strip()
    return fallback_stem.replace("_", " ").title()


def list_notes(limit: int = 50) -> list[dict]:
    files = sorted(MEM_HOME.rglob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    results = []
    for f in files[:limit]:
        stat = f.stat()
        text = f.read_text(errors="ignore")
        title = _extract_title(text, f.stem)
        rel = f.relative_to(MEM_HOME).as_posix()
        mtime = datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d")
        results.append({
            "path": rel,
            "title": title,
            "mtime": mtime,
            "mtime_epoch": stat.st_mtime,
        })
    return results


def search_notes(query: str) -> list[dict]:
    terms = [t.lower() for t in query.strip().split() if t.strip()]
    if not terms:
        return list_notes(50)

    results = []
    for f in MEM_HOME.rglob("*.md"):
        try:
            stat = f.stat()
            mtime = stat.st_mtime
            text = f.read_text(errors="ignore")
            if not text.strip():
                continue
            text_lower = text.lower()
            rel_path = f.relative_to(MEM_HOME).as_posix()
            name_lower = rel_path.lower()

            match_filename = all(t in name_lower for t in terms)
            match_content = not match_filename and all(t in text_lower for t in terms)

            if not match_filename and not match_content:
                continue

            lines = text.splitlines()
            title = _extract_title(text, f.stem)

            # Find match line for content matches
            line_num = None
            if match_content:
                positions = [text_lower.find(t) for t in terms]
                pos_list = [p for p in positions if p >= 0]
                if pos_list:
                    min_pos = min(pos_list)
                    line_num = text_lower[:min_pos].count("\n")

            score = 2 if match_filename else 1

            # Preview: lines around match
            start = line_num if line_num is not None else 0
            preview_lines = lines[start: start + 4]
            preview = "\n".join(preview_lines)

            mtime_str = datetime.datetime.fromtimestamp(mtime).strftime("%Y-%m-%d")
            results.append({
                "path": rel_path,
                "title": title,
                "score": score,
                "preview": preview,
                "mtime": mtime_str,
                "mtime_epoch": mtime,
            })
        except Exception:
            continue

    results.sort(key=lambda x: (-x["score"], -x["mtime_epoch"]))
    return results[:50]


def get_note(relative_path: str) -> dict:
    path = _safe_path(relative_path)
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"Note not found: {relative_path}")
    text = path.read_text(errors="ignore")
    title = _extract_title(text, path.stem)
    stat = path.stat()
    mtime = datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d")
    return {
        "path": relative_path,
        "title": title,
        "content": text,
        "mtime": mtime,
        "mtime_epoch": stat.st_mtime,
    }


def create_note(title: str, tags: str = "", body: str = "") -> dict:
    MEM_HOME.mkdir(exist_ok=True, parents=True)
    slug = slugify(title)
    date = timestamp()
    tag_part = tags.replace(",", "_").strip() if tags else ""
    fname = f"{slug}_{tag_part}_{date}.md" if tag_part else f"{slug}_{date}.md"
    path = MEM_HOME / fname
    if path.exists():
        raise FileExistsError(f"Note already exists: {fname}")
    content = f"# {title}\n\nTags: {tags}\n\n{body}\n"
    path.write_text(content)
    return {"path": fname, "filename": fname}


def update_note(relative_path: str, content: str) -> dict:
    path = _safe_path(relative_path)
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"Note not found: {relative_path}")
    path.write_text(content)
    stat = path.stat()
    mtime = datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d")
    return {"path": relative_path, "mtime": mtime}


def delete_note(relative_path: str) -> dict:
    path = _safe_path(relative_path)
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"Note not found: {relative_path}")
    path.unlink()
    return {"path": relative_path, "deleted": True}
