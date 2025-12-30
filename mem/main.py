# mem.py
import argparse
from .config import MEM_HOME
from .utils import init_dir
from .note_manager import add_note, list_notes, search_notes, edit_note, rm_note, open_dir
from .gui import run_ui

def main():
    ap = argparse.ArgumentParser(description="Terminal Markdown memory index")
    sp = ap.add_subparsers(dest="cmd", required=True)
    sp.add_parser("init").set_defaults(func=lambda a: print(f"Initialized memory dir at {init_dir()}"))
    p_add = sp.add_parser("add")
    p_add.add_argument("title")
    p_add.add_argument("-b", "--body", default="")
    p_add.add_argument("-t", "--tags", default="")
    p_add.set_defaults(func=add_note)
    p_list = sp.add_parser("list")
    p_list.add_argument("-n", "--limit", type=int, default=30)
    p_list.set_defaults(func=list_notes)
    p_search = sp.add_parser("search")
    p_search.add_argument("query")
    p_search.add_argument("--preview", action="store_true")
    p_search.set_defaults(func=search_notes)
    p_edit = sp.add_parser("edit")
    p_edit.add_argument("keywords")
    p_edit.set_defaults(func=edit_note)
    p_rm = sp.add_parser("rm")
    p_rm.add_argument("keywords")
    p_rm.set_defaults(func=rm_note)
    sp.add_parser("open").set_defaults(func=open_dir)
    p_run = sp.add_parser("run", help="Interactive live search + preview UI")
    p_run.set_defaults(func=run_ui)
    args = ap.parse_args()
    MEM_HOME.mkdir(exist_ok=True)
    args.func(args)

if __name__ == "__main__":
    main()