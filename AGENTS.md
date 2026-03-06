# AGENTS.md

This file defines working rules for coding agents in this repository.

## Scope
- Applies to the entire repo rooted at `/Users/robertz/projects/mem`.

## Project Overview
- `mem/` contains the Python CLI implementation.
- `data/` contains markdown memo files (primary knowledge base).
- `README.md` documents install and usage.

## Environment
- Python version target: 3.12 (`environment.yml`).
- Default notes directory is `data/` when running inside this git repo.
- If `MEM_HOME` is set, CLI reads/writes notes there instead.

## Safe Workflow
- Prefer minimal, targeted edits.
- Do not delete or rename existing files unless explicitly requested.
- If changing behavior, keep CLI UX backward compatible unless asked otherwise.
- Run quick verification commands after changes.

## Memo File Rules
- All memo files must be `.md`.
- Filenames must include clear search keywords.
- Use lowercase snake_case filenames.
- Prefer concise, focused notes (one topic per file).
- Keep content scannable:
  - short heading
  - key points
  - rule-of-thumb or gotcha when useful

## Naming Guidance (Memos)
- Good: `concurrency_threads_workers_processes.md`
- Good: `testing_unit_functional_integration_contract_e2e_rails_controller.md`
- Avoid generic names like `notes.md` or `reminder.md`.

## Useful Commands
- List notes: `python -m mem.main list -n 30`
- Search notes: `python -m mem.main search "query" --preview`
- Add note: `python -m mem.main add "Title" -t "tag1,tag2" -b "Body"`

## Validation Checklist
- New/edited memo filename includes topic keywords.
- Markdown renders cleanly and is easy to skim.
- Search by expected keywords returns the memo.
