# mem

`mem` is a lightweight CLI for capturing Markdown notes as plain files on disk, installed into an isolated conda env (no sudo).

## Install

From the repo root:

```bash
chmod +x install.sh
./install.sh
source ~/.bashrc  # or ~/.zshrc
which mem
mem --help  # verify
```

Creates `mem-env` conda env and wrapper in `~/.local/bin` (Linux) or `~/bin` (macOS). Add to PATH if needed.

## Setup

Set notes dir:

```bash
export MEM_HOME="$HOME/mem-notes"
mkdir -p "$MEM_HOME"
```

Add to `~/.bashrc` or `~/.zshrc` for persistence.

Set editor (default: nano/vi):

```bash
export EDITOR=nvim  # or vim, code, etc.
```

## Usage

Run `mem --help` for commands/flags.

Init:

```bash
mem init
```

Add note:

```bash
mem add "Title" -t "tag1,tag2" -b "Body text..."
```

List:

```bash
mem list -n 30
```

Search:

```bash
mem search "query" --preview
```

Edit/Remove:

```bash
mem edit "keywords"
mem rm "keywords"
```

Open dir:

```bash
mem open
```

Interactive UI:

```bash
mem run  # search/preview/edit
```

Web UI:

```bash
mem server           # start on default port 3030
mem server -p 8000   # start on custom port
```

Build the web bundle first:

```bash
cd web
npm install
npm run build
```

The Expo scripts now generate fresh seed assets automatically before `start`, `web`, `ios`, `android`, `build`, and `test:e2e`, so the bundled mobile/web snapshot stays aligned with the repo `data/` corpus.

Then `mem server` serves a read-only browser UI that seeds a local database from the repo `data/` corpus on each start. The frontend now runs as one Expo / React Native app across web and mobile:

- Web seeds IndexedDB from `seed.json` / `seed.meta.json`
- iOS / Android seed SQLite from bundled assets
- The v1 shared app supports list, search, and view only

The existing FastAPI note endpoints still exist, but the new frontend does not depend on them.

## Docker (local server)

Run the installer-based local server:

```bash
docker compose -f docker-compose.local.yml up --build
```

This builds a container that runs `./install.sh`, installs the `mem` wrapper, and starts `mem server` on [http://localhost:8040](http://localhost:8040).

## Docker (integration tests)

Run the full Playwright E2E test suite:

```bash
docker compose up test --build --abort-on-container-exit
```

This spins up only the static web export plus the Playwright runner and exercises the read-only local-seeded interface with no note CRUD/search API dependency.

## How Search Works

All interfaces (CLI, TUI, API, Web) share the same core algorithm in `mem/utils.py`.

### Algorithm

1. **Discovery**: `MEM_HOME.rglob("*.md")` — scans all `.md` files recursively
2. **Term matching**: Every search term must match somewhere (AND logic) or the file is excluded
3. **Hierarchical scoring**: Each term is matched against the path in priority order:

```
Path:  ruby/concurrency/gil_gvl_global_vm_lock.md
       ^^^^            ^^^^^^^^^^^
       top_dir         filename
            ^^^^^^^^^^^
            subdirectory
```

| Match tier | Weight | Example: searching "ruby gil" |
|---|---|---|
| Top-level directory | ×1000 | `ruby/` matches "ruby" → 1000 pts |
| Subdirectory | ×100 | `concurrency/` checked but "gil" not there |
| Filename | ×10 | `gil_gvl_...` matches "gil" → 10 pts |
| Content (full text) | ×1 | Substring search inside file body |

**Score: 1010** — file ranks high because "ruby" hit the directory and "gil" hit the filename.

A term stops at the first tier it matches (directory match won't also count as content match).

### Sorting

Results ranked by: `(top_dir_matches, subdir_matches, filename_matches, content_matches)` descending, then by modification time descending. Maximum 50 results.

### Interface differences

| | CLI `mem search` | CLI `mem edit/rm` | TUI `mem run` | Web UI |
|---|---|---|---|---|
| Searches | Filenames → grep fallback | Filenames only | Filenames + content | Filenames + content |
| Limit | Unlimited | Must match 1 | 50 | 50 |
| Storage | Filesystem | Filesystem | Filesystem | Browser-local database seeded on startup |
| Debounce | — | — | Real-time | Deferred local query |

### Key source files

- `mem/utils.py` — `classify_search_match()`, `find_files()`, scoring logic
- `mem/service.py` — `search_notes()`, `list_notes()`, title extraction
- `mem/seed_export.py` — exports `seed.json` and `seed.meta.json`
- `mem/gui.py` — TUI with real-time search
- `mem/note_manager.py` — CLI commands (filename search + grep fallback)
- `web/app/search.ts` — shared local ranking logic for web/mobile

## Files

- `mem/`: Main Python package (CLI, API, service layer)
- `web/`: Expo / React Native Web client and bundled seed assets
- `install.sh`: Installer
- `uninstall.sh`: Uninstaller

## Uninstall

```bash
chmod +x uninstall.sh
./uninstall.sh
```

Removes wrapper and `mem-env`.

## Troubleshooting

- `mem not found`: Add bin dir to PATH.
- Conda issues: Ensure `conda` installed; recreate env with `conda create -n mem-env python=3.12`.
- No notes dir: Set/export `MEM_HOME`.
- Wrong editor: Set `EDITOR`.
- UI broken: Enlarge terminal, check UTF-8 locale.
