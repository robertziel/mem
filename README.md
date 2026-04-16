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

Web / iOS / Android UI:

```bash
mem server           # start the web UI on default port 3030
mem server -p 8000   # start on custom port
```

Build the web bundle first:

```bash
cd web
npm install
npm run build
```

The Expo scripts auto-generate fresh seed assets before `start`, `web`,
`ios`, `android`, `build`, and `test:e2e`, so the bundled snapshot stays
aligned with the repo `data/` corpus.

One Expo / React Native codebase ships the UI across three targets:

| Target | Run | Storage | Seed source |
|---|---|---|---|
| Web (Metro + `react-native-web`) | `npm run dev` | IndexedDB | HTTP `/seed.json` + `/seed.meta.json` (re-fetched when `server_run_id` changes) |
| iOS | `npm run ios` (simulator or USB device) | `expo-sqlite` | JSON bundled into `.app` at build time |
| Android | `npm run android` | `expo-sqlite` | JSON bundled into the APK at build time |

The interface is **read-only**: list, browse, and view only. No create /
edit / delete (the existing FastAPI note endpoints still exist, but this
frontend does not depend on them).

### UX — three display modes

The search pill at the bottom drives the whole list pane. Its value
determines which of three modes renders:

1. **Empty query → Category picker.** Top-level directories from the
   corpus (e.g. `ruby`, `frontend`, `devops`, …) with note counts, sorted
   by count desc. Tapping a category fills the search with its name and
   enters mode 2.
2. **Exact path prefix → Directory browser.** When every whitespace-
   separated term matches a segment of an existing path (case-insensitive,
   full-segment), the list shows the two groups inside that directory:
   - _Folders_: immediate child subdirs with counts.
   - _Notes_: files that live directly at that path.
   Tapping a subdir appends its name to the query and drills one level
   deeper (`ruby` → `ruby metaprogramming` → `ruby metaprogramming prepend`).
3. **Anything else → Flat search.** Ranked note rows with the matched
   keywords highlighted in yellow across title / path / preview. Above
   the rows, a horizontal, scrollable **filter chip bar** lets the
   user narrow the results one directory at a time. Taps collapse
   into the selected path as breadcrumb chips; the bar auto-drills
   through single-child chains so the user always sees "choices that
   actually split the result set".

Mode transitions are instant; the derived search call is debounced 500 ms
so rapid typing doesn't thrash.

### Search algorithm (shared with the CLI)

Same hierarchical path scoring as `mem search`, plus two tiers to make
short partial queries useful without flooding the list:

| Term match | Where | Notes |
|---|---|---|
| Exact keyword | top_dir / subdir / filename token | Highest priority. |
| Keyword prefix (any length) | same, but `startsWith(term)` | Lets `rub` find `ruby`. Does NOT match mid-keyword substrings (so `let` won't match `singleton` or `delete`). |
| Substring (length ≥ 4) | top_dir / subdir / filename stem | Only for terms ≥ 4 chars so short common words stay precise. |
| Content | — | Never. Content is not searched; it would dilute ranking. |

Term-matches are AND'd: every term must hit somewhere in the path or the
note is rejected. Results are sorted by
`(top_dir_matches, subdir_matches, filename_matches, 0)` descending, then
by modification time. Capped at 50.

Core file: **`web/app/search.ts`**. Public helpers:

- `listNotesFromSeed(notes, limit)` — recent-first list for fallback.
- `listCategoriesFromSeed(notes)` — top-level dirs with counts.
- `browseDirectoryFromSeed(notes, terms)` — `{path, subdirs, notes}` when
  the query exactly matches an existing path prefix; `null` otherwise.
- `searchNotesFromSeed(notes, query)` — flat ranked search.
- `stripLastQuerySegment(query)` — drops the trailing path segment; used
  by the Back button.
- `normalizeSearchTerms(query)` — whitespace-split + lowercase.

### Mobile UX

- **Fixed bottom bar** with the search pill + Clean + Back buttons. On
  iOS the bar is lifted above the software keyboard using a
  `useKeyboardInset` hook + `useSafeAreaInsets` (see
  `web/app/hooks/useKeyboardInset.ts`), so the search input never sits
  behind the keys.
- **Clean**: clears the query, returns to the top-level Category picker,
  and refocuses the input.
- **Back (`‹`)**: hidden at the root. Otherwise walks up one directory
  level (`stripLastQuerySegment`) or returns from a note detail to the
  list pane, whichever applies.
- **Type-to-search (web)**: pressing any printable key anywhere on the
  page routes directly into the search input, even if it was not
  focused.

### Testing

Four layers, all runnable from the repo root (node 22.18+ via `.nvmrc`):

```bash
npm test              # Jest — unit + component + all-notes-smoke
npm run test:e2e      # Playwright — browser flows (Dockerized too)
npm run test:maestro:ios       # Maestro — iOS simulator
npm run test:maestro:android   # Maestro — Android emulator
```

Jest covers `search.ts`, each UI component, and an every-seed-note smoke
render. Playwright covers CategoryList → DirectoryBrowser → flat search
→ Back/Clean flows and iterates every visible row for runtime-error
detection. Maestro mirrors the same flows on real devices.

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

## How the CLI Search Works

The Python side (`mem/utils.py`) implements a hierarchical path +
content search used by `mem search`, `mem edit`, `mem rm`, and the
curses TUI (`mem run`).

### Algorithm

1. **Discovery**: `MEM_HOME.rglob("*.md")` — scans every `.md` file recursively.
2. **Term matching**: every term must match somewhere (AND logic) or the note is excluded.
3. **Hierarchical scoring**: each term is matched against the path in
   priority order:

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
| Content (full text) | ×1 | Substring search inside the file body |

**Score: 1010** — "ruby" hit the directory and "gil" hit the filename.

A term stops at the first tier it matches (a directory hit won't also
count as a content hit).

### Sorting

Results ranked by
`(top_dir_matches, subdir_matches, filename_matches, content_matches)`
descending, then by modification time descending. Capped at 50.

### Interface differences

| | CLI `mem search` | CLI `mem edit/rm` | TUI `mem run` | Web / iOS / Android app |
|---|---|---|---|---|
| What's searched | Filenames → grep fallback | Filenames only | Filenames + content | **Path only** (prefix + ≥4-char substring) — no content fallback |
| Modes | Single flat list | Single flat list | Single flat list | Categories → Directory browser → Flat search, chosen from the query |
| Storage | Filesystem | Filesystem | Filesystem | IndexedDB (web) / SQLite (native), seeded on startup |
| Debounce | — | — | Real-time | 500 ms |

The web/mobile app intentionally drops the content tier so common words
(e.g. "let", "api") no longer drag unrelated notes into the results.
Prefix matching (`rub` → `ruby`) keeps partial queries useful. See
`web/app/search.ts` for the full divergence — both surfaces still
honor the same `top_dir > subdir > filename` priority.

### Key source files

- `mem/utils.py` — `classify_search_match()`, `find_files()`, scoring logic
- `mem/service.py` — `search_notes()`, `list_notes()`, title extraction
- `mem/seed_export.py` — exports `seed.json` and `seed.meta.json`
- `mem/gui.py` — TUI with real-time search
- `mem/note_manager.py` — CLI commands (filename search + grep fallback)
- `web/app/search.ts` — web/mobile ranking, categories, directory browsing
- `web/App.tsx` — UI state machine (mode selection, Back/Clean wiring)

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
