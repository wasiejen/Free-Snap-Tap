# todo_inbox.md — raw findings inbox

Drop zone for **worker** / **explorer** findings that are not confidently
fixable in-scope or are out of scope. Loose format: dated, role-tagged blocks,
**no numbering**, append only — no curation, no renumbering here.

- **Who writes:** worker/explorer — this is their APPEND target, NOT `TODO.md`.
- **Who curates:** the planner — curates into `TODO.md`, assigns the stable ID
  at curation time, then trims this inbox.
- Entry shape: `## <YYYY-MM-DD> — <role>` + problem/evidence + files + why it
  matters.

## 2026-09-10 — planner curation (iter 3)
- Worker block (2026-09-10) curated: the two `repo_map.md` findings → `TODO.md`
  **#50** (repo-map refresh; maintainer-owned file). The 02-03 loop.log item was
  already ruled in the NAP iter-2 block (separate prompt-only task; both file
  copies in `maintainer/done/`) — no further action.

## 2026-09-10 — worker (date-convention sweep)
- (curated iter 4, 2026-09-11) Process note, no repo file to fix: future sweep
  specs use a broader name-scan regex / lookaround (the `\b26\d{4}\b` DoD regex
  misses M-prefixed names). Recorded in the NAP iter-3 deviation block; not a
  TODO entry.
