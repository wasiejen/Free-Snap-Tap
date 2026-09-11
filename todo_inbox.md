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

## 2026-09-11 — worker (T3, compact_memory)
- Stale probe header vs code: `handover_probe.mjs` line ~28 (the "WHY THAT
  COMMAND" block) states "`.opencode/package.json` has no "type" field and must
  not gain one — that would change the plugin's module context", but
  `.opencode/package.json` currently carries `"type": "module"` (plus a
  `@opencode-ai/plugin` dependency). Either the header predates the package.json
  addition and is stale, or the constraint was relaxed — needs a ruling / header
  correction. Files: `.opencode/plugin/probes/handover_probe.mjs`,
  `.opencode/package.json`. Why it matters: the header is the probe's
  documented contract; an agent "fixing" the file to match it would remove the
  `"type"` field and change the module context.
