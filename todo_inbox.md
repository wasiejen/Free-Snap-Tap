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
- The sweep DoD scan regex `\b26\d{4}\b` cannot structurally match M-prefixed
  dense names (`M26…` maintainer-inbox files — no word boundary before `26`).
  This sweep was covered by also running a broader `26\d{4}` (no `\b`) pass
  (0 hits), and the only M-prefixed file in scope was renamed anyway — but
  future sweep specs should use the broader regex (or a lookaround) for name
  scans. Evidence: spec DoD 2 vs `M260910-1346_…` (now `M2026-09-10_13-46_…`).
  File: process/spec note, no repo file to fix.
