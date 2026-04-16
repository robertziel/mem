# mem — Expo React Native app

Read-only browser + iOS + Android UI for the `mem` Markdown note corpus.

The same TypeScript code runs on all three targets via
[Expo](https://expo.dev) + `react-native-web`. The corpus is seeded into
the device once and then every interaction (list, search, browse note)
runs offline against that local database.

## Quick start

Node 22.18+ is required (see `../.nvmrc`).

```bash
npm install            # once
npm run dev            # web (Metro @ http://localhost:3030)
npm run ios            # Xcode / iOS simulator or USB device
npm run android        # Android Studio / emulator or USB device
```

Every `run` / `dev` / `build` task is preceded by `npm run seed`, which
shells out to Python `mem.seed_export` and writes fresh
`seed.json` + `seed.meta.json` into both `public/` (web) and
`assets/generated/` (bundled into the native app at build time).

## How the UI behaves

The search pill in the bottom bar drives the list pane. Three modes:

| Query | List pane shows | Source |
|---|---|---|
| empty | `CategoryList` — top-level directory tiles with note counts | `listCategoriesFromSeed` |
| exact path prefix (`ruby`, `ruby metaprogramming`, …) | `DirectoryBrowser` — child subdirs + files directly in that dir | `browseDirectoryFromSeed` |
| anything else | Flat search — ranked note rows with keyword highlight | `searchNotesFromSeed` |

The query is **debounced 500 ms** before either call fires. The input
itself is synchronous so typing stays snappy.

Navigation:

- **Tap a category** → fills the query with that dir name and enters
  directory mode.
- **Tap a subdir** → appends its name to the query, drills one level
  deeper.
- **Tap a note** → opens the detail view (markdown + keyword chips).
- **Filter chips** (flat-search mode only) → a horizontal, scrollable
  row above the results. `All` clears any filter. Option chips (e.g.
  `frontend (5)`) narrow to notes under that directory. Breadcrumb
  chips (e.g. `frontend ›`) pop back to that depth. If only one
  option remains at the current depth the bar auto-drills deeper,
  possibly across several levels in one tap. Editing the query resets
  the filter.
- **Clear query** → inline `✕` inside the search pill clears the query
  and returns to the CategoryList root. (The standalone Clean button
  was removed; the inline glyph handles it.)
- **Back (`‹`)** → hidden at root. From detail view it returns to the
  list. Otherwise it strips the last segment of the query
  (`stripLastQuerySegment`) so the user walks one level up.
- **Type anywhere on web** → any printable key routes into the search
  pill even if it was not focused.
- On iOS the bottom bar lifts above the software keyboard
  (`useKeyboardInset` + `useSafeAreaInsets`).

## Project layout

```
web/
├── App.tsx                    ← root: state machine, mode selection, toolbar
├── app/
│   ├── components/
│   │   ├── CategoryList.tsx       (empty-query mode)
│   │   ├── DirectoryBrowser.tsx   (exact-path mode)
│   │   ├── NoteList.tsx           (flat-search mode)
│   │   ├── NoteKeywords.tsx       (chips in detail pane)
│   │   └── MarkdownRenderer.tsx   (native + web variants)
│   ├── hooks/
│   │   ├── useDebouncedValue.ts
│   │   └── useKeyboardInset.ts
│   ├── repository/
│   │   ├── noteRepository.web.ts   (IndexedDB)
│   │   └── noteRepository.native.ts (SQLite)
│   ├── search.ts              ← pure logic: list, categories, browse, search, strip
│   └── types.ts
├── __tests__/                 ← Jest (unit + component + whole-corpus smoke)
├── e2e/                       ← Playwright specs
└── maestro/                   ← YAML flows for iOS + Android
```

## Repository layer

Both backends implement the same `NoteRepository` interface from
`app/types.ts`:

```ts
initialize(): Promise<SeedMeta>
listNotes(limit): Promise<NoteSummary[]>
listCategories(): Promise<Category[]>
browseDirectory(terms): Promise<DirectoryView | null>
searchNotes(query): Promise<SearchResult[]>
getNote(path): Promise<SeedNote | null>
```

- **Web** (`noteRepository.web.ts`) fetches `/seed.json` + `/seed.meta.json`
  and stashes them in IndexedDB (`mem-local-notes` DB). Re-imports if
  `server_run_id` changes.
- **Native** (`noteRepository.native.ts`) reads the JSON bundled into
  `assets/generated/` via `require()`, then replaces the `notes` + `meta`
  tables in a single SQLite transaction on every launch.

## Testing (4 layers)

```bash
npm test                       # Jest — runs all projects
npm run test:e2e               # Playwright — browser flows
npm run test:maestro:ios       # Maestro — iOS simulator
npm run test:maestro:android   # Maestro — Android emulator
```

- **Jest** (`__tests__/`): unit tests for every pure helper in
  `app/search.ts` (including immutable regressions for prefix search,
  categories, directory browser, back navigation), component tests
  for each UI piece, and an `all-notes-smoke.test.tsx` that renders
  every seeded note.
- **Playwright** (`e2e/`): end-to-end browser flows covering each mode
  transition, Clean + Back behavior, type-to-search, and a visit-every-
  visible-row runtime-error check.
- **Maestro** (`maestro/`): YAML flows that reproduce the same flows on
  a real iOS / Android device. Requires booted simulator/emulator or
  USB device.

## Release build

```bash
# Web static export for `mem server`
npm run build                  # → dist/

# iOS on device (USB or simulator)
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 \
  npx expo run:ios --configuration Release --device "iPhone"

# Android
npx expo run:android --variant release
```

The embedded JS bundle in the Release binary removes the need for a
running Metro packager; the device works entirely offline.
