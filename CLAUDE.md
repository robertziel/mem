# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

`mem` is a markdown-notes-as-cheatsheets system with **two stacks living in one repo**:

- **`mem/`** — Python 3.12 package: CLI (`python -m mem.main`), curses TUI, FastAPI server, and the seed exporter that bridges to the frontend.
- **`web/`** — One Expo / React Native codebase that ships to **three targets**: web (Metro + `react-native-web`, IndexedDB), iOS (`expo-sqlite`), Android (`expo-sqlite`). The UI is intentionally **read-only** — list / browse / view only.
- **`data/`** — The corpus. Markdown files in `data/<top_category>/<subcategory>/<keyword_dense_filename>.md`. This is the input to everything else.

The CLI writes to `MEM_HOME` if set; otherwise notes live under the in-repo `data/`. The web/native UIs do **not** depend on the FastAPI server — they read from a pre-exported seed.

## The seed pipeline (key non-obvious flow)

`data/*.md` → `mem.seed_export` → two outputs: `web/public/seed.json` (HTTP-fetched at runtime by the web build) and `web/assets/generated/seed.json` (bundled into iOS/Android binaries at build time).

`web/scripts/generate-seed.mjs` is wired into npm `pre*` hooks in `web/package.json` so `npm run dev|web|ios|android|build|test:e2e` all regenerate the seed first. The web build re-fetches the seed when `seed.meta.json#server_run_id` changes; native targets are frozen at build time.

When you change anything under `data/` and want the UI to see it, either run `npm run seed` from `web/` or just run any of the dev/build commands.

## Search lives in two places — keep them coherent

Both surfaces enforce **AND across whitespace-separated terms** with hierarchical scoring `top_dir > subdir > filename`. They diverge on purpose:

| | CLI (`mem/utils.py`) | Web/native (`web/app/search.ts`) |
|---|---|---|
| Tiers | dir / subdir / filename / **content** | dir / subdir / filename only |
| Partial match | — | prefix match + ≥4-char substring |
| Modes | flat list | empty → categories, exact path prefix → directory browser, else → flat search |

The web UI drops the content tier deliberately (common words like "let", "api" used to drag in unrelated notes). Don't re-introduce it without understanding why it was removed.

`web/App.tsx` is the state machine that picks between the three web modes based on the current query.

## Commands

### Python (run from repo root)

```bash
./install.sh                                  # Create mem-env conda env + wrapper
python -m mem.main <subcommand>               # Same as the `mem` wrapper
python -m unittest discover tests             # Run all Python tests (unittest, not pytest)
python -m unittest tests.test_search_ranking  # Single file
python -m unittest tests.test_search_ranking.ClassName.test_method  # Single test
```

### Web / native (run from repo root or `web/`; root scripts proxy via `--prefix web`)

```bash
npm run dev                # Expo web (auto-seeds first)
npm run ios | android      # Native sims (auto-seeds first)
npm run build              # Static export → web/dist/  (required before `mem server`)
npm run seed               # Regenerate seed.json from data/ without starting anything

npm test                   # Jest: search.ts + each component + every-seed-note smoke render
npm test -- search.test.ts # Single Jest file (path or pattern)
npm run test:e2e           # Playwright (Dockerized too — see below)
npm run test:maestro:ios   # Maestro on iOS sim
npm run test:maestro:android
```

Single Playwright spec: `npm --prefix web run test:e2e -- e2e/search.spec.ts`.

### Server / Docker

```bash
mem server                                                   # Serves web/dist/ + FastAPI; needs `npm run build` first
docker compose -f docker-compose.local.yml up --build       # Local server in a container (port 8040)
docker compose up test --build --abort-on-container-exit    # Full Playwright E2E in CI mode
```

## Data conventions (from AGENTS.md, enforced project-wide)

- `.md` only, lowercase `snake_case` filenames, **keyword-dense** (median 5 underscored tokens) — filenames are the primary search index.
- Every note starts with `### Heading` (h3, not h1/h2 — 100% of files follow this).
- Most notes end with `**Rule of thumb:**` line — this is the predictable landing spot for quick recall.
- One topic per file. Avoid generic names (`notes.md`, `reminder.md`).

When adding or moving notes, the seed regenerates on the next `npm run *` — no separate index to update.

## What is a "true cheatsheet"

The corpus exists to **trigger keyword recall during live calls** (Zoom / Google Meet) for someone who already understands the topic but blanks on terminology. Notes are reminders, not tutorials.

A note qualifies as a true cheatsheet when **all three** are true:

1. **Short and on-topic** — every line earns its place. No filler, no warm-up paragraphs, no "as we know..." prose.
2. **No bullshit** — no implementation tutorial, no full code blocks. Code shows *how*; cheatsheets remind *what*. Replace code with the comparison the code was illustrating.
3. **Structured around tables, comparisons, key differences** — markdown tables, side-by-side X-vs-Y matrices, when-to-use vs when-not-to-use pairs. The bar is **"does this table make the concept easier to imagine?"** — tables that let the reader scan rows/columns and *see* the structure of the problem space. Don't force a table where a clean ASCII diagram or one-line skeleton works better.

**Length is a tiebreaker, not the metric.** A 142-line file of clean comparison tables (e.g. [http_status_codes.md](data/computer_science/api_design/http_status_codes.md)) is a real cheatsheet. A 30-line wall of unstructured prose is not.

### Pass test (apply when adding or editing a note)

A file passes if **at least one** of these is true in its top 25 lines:

- A markdown table with ≥3 rows.
- A side-by-side "X vs Y" structure with ≥3 distinguishing dimensions.
- A "when to use / when not to use" pair.

If none, the file is prose or a tutorial — neither qualifies. Restructure it before merging.

### Anti-patterns to avoid

- **Long code blocks teaching implementation.** ~24% of the existing corpus does this and it's the largest quality problem. Convert to a "pattern → problem it solves → when to use" table.
- **Buried takeaway.** Don't put the comparison table at the bottom of 200 lines of prose. The scan-target (`Rule of thumb:` or the main table) belongs near the top.
- **Bullet lists with no contrast.** "Things that are bad: X, Y, Z" is a list, not a cheatsheet. Add a column: "X — caused by — fix is".
- **Over-explanation.** The reader knows the topic. Don't define jargon in-line; the buzzword itself is the recall trigger.

## Things to be careful about

- **Don't add a `mkdir` for `data/`** — it exists. Don't touch `data/medicine/` (empty placeholder for a future top-level category).
- **`mem server` requires a built `web/dist/`** — it errors out cleanly if missing. Run `npm run build` first.
- **Python tests use `unittest`, not pytest.** No pytest is installed.
- **The web app does not read the FastAPI endpoints** — it loads `seed.json` directly. CRUD endpoints exist in `mem/api.py` but the read-only frontend ignores them.
- **`MEM_HOME` overrides `data/`** for the CLI only. The seed exporter always reads from the `--source` path passed by `generate-seed.mjs` (= repo `data/`), independent of `MEM_HOME`.
