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
- (curated 2026-09-11, iter-2) → `TODO.md` **#51** (stale probe header vs
  package.json "type" field — maintainer call).

## 2026-09-12 — worker (T5 re-verify)
- (curated 2026-09-12, iter-6) Stale plugin "byte-identical" comment →
  comment-only fix in `context_recovery.ts` (the stale claim corrected; the
  runtime directive string is UNCHANGED, probe-pinned by check 78) + the
  looprunner-line keep/remove decision surfaced at
  `proposals/2026-09-12_recovery-directive-looprunner-line.md` (maintainer
  call; recommendation: keep). No TODO.md entry.
- (curated 2026-09-12, iter-6) Spec delta (the re-verify spec assumed
  `args` is a zod object; committed reality: a PLAIN object of NAME → zod
  schema — opencode tool() convention) → process note, no TODO entry: the
  probe is aligned to the committed reality (`Object.keys(cmTool.args ?? {})`
  + per-value `safeParse` guard); the fact is recorded in the NAP iter-6
  block (spec-discipline lesson: verify the committed shape before prescribing
  the probe access in a spec).

## 2026-09-12 — worker-10 (T1, block_transfer sandbox)
- MOVE mode with `dstFile` missing: the block is CUT from the source BEFORE
  the `'dstFile' is required for MOVE mode.` check runs (the check sits in
  the later MOVE section, after the src write), so the block is silently
  LOST from the source file. Pre-existing (not introduced by T1). I did NOT
  hoist the check because that changes observable behavior for allowed
  paths (T1 approval boundary: allowed-path semantics must stay
  byte-identical — the planner decides). Fix would be: move the
  `!args.dstFile` check to the top of the anchor-extraction section, before
  any write. File: `.opencode/tools/block_transfer.ts`. Recorded as an open
  item in the worker summary.
