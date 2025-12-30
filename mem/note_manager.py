# note_manager.py
import sys
import subprocess
import datetime
from .config import MEM_HOME, EDITOR
from .utils import slugify, timestamp, find_files

def add_note(args):
    MEM_HOME.mkdir(exist_ok=True, parents=True)
    slug = slugify(args.title)
    date = timestamp()
    tags = args.tags.replace(",", "_") if args.tags else ""
    fname = f"{slug}_{tags}_{date}.md" if tags else f"{slug}_{date}.md"
    path = MEM_HOME / fname
    if path.exists():
        print("Note already exists:", path)
        sys.exit(1)
    body = args.body or ""
    content = f"# {args.title}\n\nTags: {args.tags}\n\n{body}\n"
    with open(path, "w") as f:
        f.write(content)
    print("Created:", path)

def list_notes(args):
    files = sorted(MEM_HOME.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    for f in files[: args.limit]:
        mtime = datetime.datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d")
        print(f"{f.name:60} · {mtime}")

def search_notes(args):
    terms = args.query.strip().split()
    results = find_files(terms)
    if not results:
        print("No filename matches, searching inside files...\n")
        grep_cmd = ["grep", "-iHn", "--color=always", *terms, str(MEM_HOME)]
        subprocess.call(grep_cmd)
        return
    for f in results:
        print(f"- {f.name}")
        if args.preview:
            lines = f.read_text(errors="ignore").splitlines()
            snippet = "\n".join(lines[:10])
            print(" " + snippet.replace("\n", "\n ") + "\n")

def edit_note(args):
    terms = args.keywords.strip().split()
    matches = find_files(terms)
    if not matches:
        print("No file found for", terms)
        sys.exit(1)
    if len(matches) > 1:
        print("Multiple matches:")
        for f in matches:
            print(" ", f.name)
        sys.exit(1)
    subprocess.call([EDITOR, str(matches[0])])

def rm_note(args):
    terms = args.keywords.strip().split()
    matches = find_files(terms)
    if not matches:
        print("No file found for", terms)
        sys.exit(1)
    for f in matches:
        ans = input(f"Delete {f.name}? [y/N] ")
        if ans.lower().startswith("y"):
            f.unlink()
            print("Deleted", f)

def open_dir(_args):
    opener = shutil.which("xdg-open") or "open"
    subprocess.call([opener, str(MEM_HOME)])