# agent_readme_todo.md — the TODO system

Read when writing, curating, or referencing TODO entries or IDs.

## Entry contract
AGENTS.md §TODO.md-entry-contract: every entry is self-contained enough to be
delegated by unique ID — title / problem + evidence, desired outcome,
acceptance criteria, suggested scope, status.

## Who writes where
- **Worker / explorer — APPEND to `todo_inbox.md`** (repo root). Loose format:
  dated + role-tagged blocks, **no numbering**, no curation, no renumbering.
  This is the APPEND target for their findings — NOT `TODO.md`.
- **Planner — curates** `todo_inbox.md` → `TODO.md`: assigns the stable ID at
  curation time, enriches the entry to the contract, then trims the inbox.
- Bare-ID handoffs reference **curated** IDs only.

## Curation rules (planner)
- Close/condense solved or stale entries with a one-line record; the full text
  of a closed entry moves to `todo_records.md`.
- IDs are unique and NEVER reused; the next ID is recorded in the `TODO.md`
  header line.
- Never delete open/unresolved content; when a fix lands, flag the entry it
  closed.

## Files
- `TODO.md` — curated open items + one-line records of fixed issues.
- `todo_inbox.md` — raw drop zone (worker/explorer append only).
- `todo_records.md` — full text of closed entries.
