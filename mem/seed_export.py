import argparse
import datetime
import json
import uuid
from pathlib import Path

from .config import repo_root
from .utils import extract_title, get_search_path_parts

SEED_VERSION = 1


def get_seed_source_dir(source_dir: str | Path | None = None) -> Path:
    if source_dir is not None:
        candidate = Path(source_dir).expanduser().resolve()
        if candidate.exists():
            return candidate
        raise FileNotFoundError(f"Seed source directory does not exist: {candidate}")

    if repo_root:
        candidate = (repo_root / "data").resolve()
        if candidate.exists():
            return candidate

    package_root_data = (Path(__file__).resolve().parent.parent / "data").resolve()
    if package_root_data.exists():
        return package_root_data

    raise FileNotFoundError("Could not find a seed source directory. Checked repo data/.")


def _format_mtime(epoch_seconds: float) -> str:
    return datetime.datetime.fromtimestamp(epoch_seconds).strftime("%Y-%m-%d")


def _generated_at() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")


def build_seed_snapshot(
    source_dir: str | Path | None = None,
    *,
    server_run_id: str | None = None,
) -> tuple[dict, dict]:
    source_root = get_seed_source_dir(source_dir)
    notes = []

    for note_path in sorted(source_root.rglob("*.md")):
        stat = note_path.stat()
        text = note_path.read_text(errors="ignore")
        relative_path = note_path.relative_to(source_root).as_posix()
        notes.append({
            "path": relative_path,
            "title": extract_title(text, note_path.stem),
            "mtime": _format_mtime(stat.st_mtime),
            "mtime_epoch": stat.st_mtime,
            "content": text,
            "path_parts": get_search_path_parts(relative_path),
            "preview_source": text,
        })

    payload = {"notes": notes}
    meta = {
        "seed_version": SEED_VERSION,
        "generated_at": _generated_at(),
        "note_count": len(notes),
        "server_run_id": server_run_id or uuid.uuid4().hex,
        "source_dir": source_root.as_posix(),
    }
    return payload, meta


def write_seed_assets(
    output_dir: str | Path,
    *,
    source_dir: str | Path | None = None,
    server_run_id: str | None = None,
) -> dict:
    output_root = Path(output_dir).expanduser().resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    payload, meta = build_seed_snapshot(source_dir=source_dir, server_run_id=server_run_id)
    (output_root / "seed.json").write_text(json.dumps(payload, indent=2) + "\n")
    (output_root / "seed.meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    return meta


def write_seed_assets_many(
    output_dirs: list[str | Path],
    *,
    source_dir: str | Path | None = None,
    server_run_id: str | None = None,
) -> dict:
    if not output_dirs:
        raise ValueError("At least one output directory is required")

    run_id = server_run_id or uuid.uuid4().hex
    meta = {}
    for output_dir in output_dirs:
        meta = write_seed_assets(output_dir, source_dir=source_dir, server_run_id=run_id)
    return meta


def main():
    parser = argparse.ArgumentParser(description="Export mem notes into static seed assets.")
    parser.add_argument(
        "-o",
        "--output",
        action="append",
        required=True,
        help="Directory to write seed.json and seed.meta.json into. Can be passed multiple times.",
    )
    parser.add_argument(
        "-s",
        "--source",
        help="Optional source notes directory. Defaults to repo data/ or MEM_HOME.",
    )
    parser.add_argument(
        "--server-run-id",
        help="Optional fixed server run id. Defaults to a fresh UUID.",
    )
    args = parser.parse_args()
    meta = write_seed_assets_many(args.output, source_dir=args.source, server_run_id=args.server_run_id)
    print(
        f"Exported {meta['note_count']} notes to {len(args.output)} directory(s) "
        f"with server_run_id={meta['server_run_id']}"
    )


if __name__ == "__main__":
    main()
