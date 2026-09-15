# Task: smoke-harness build (approved proposal)

**Worker:** worker_Q4_120K
**Source of truth:** `.opencode/proposals/approved/2026-09-15_smoke-harness-home.md`
— read it FULLY; it defines parts 1–5, the mapping table, and acceptance.

## Goal
Move the plugin/tool smoke tests from the scratchpad into the repo at
`.opencode/plugin/tests/` (same-name attribution + shared base), rewire the
hardcoded source paths, verify each smoke green from the repo.

## Definition of done (ALL must hold)
1. `.opencode/plugin/tests/` exists with a `README.md` (purpose / what goes here
   / what does NOT, ≤20 lines) in the SAME commit.
2. Every smoke from the proposal's mapping table exists in-repo under the
   candidate names (fold duplicates where the table allows). Sources:
   `C:/Users/Wasiejen/AppData/Local/Temp/opencode/` — READ-ONLY for you (do not
   delete or modify the source smoke files; smokes may still create their
   runtime fixture files there, as they already do).
3. Shared boilerplate (type-stripped import helper, sandbox setup,
   assert/fail-count pattern, repo-root resolution) lives in ONE base file
   (your pick: `_smoke_base.mjs` / `smoke_base.mjs`).
4. NO hardcoded absolute SOURCE paths in `plugin/tests/` — resolve the repo root
   from the file's own location. Import paths must be verified against the
   CURRENT tool locations: `.opencode/tools/{block_transfer,ctx_gauge,loop_log,
   session_info}.ts`, `.opencode/plugin/compact_memory.ts`,
   `.opencode/plugin/scripts/gauge.mjs` — e.g. `cm_v2_smoke.mjs` references the
   stale `.opencode/tools/compact_memory.ts`. Runtime sandbox paths (scratchpad)
   are allowed as-is (document them in the README).
5. Each smoke runs green from the repo: `node .opencode/plugin/tests/<file>` →
   exit 0 (Git-Bash; plain `node` = 24 with type-stripping).
6. Gates green: probe `node .opencode/plugin/probes/handover_probe.mjs` = 99/99;
   pytest = 459 passed + 1 known #10 warning; ruff F=0.
7. You do NOT touch the `proposals/` folder, `opencode.jsonc`,
   `.opencode/maintainer/**`, `.opencode/agent/prompts/**`, the live
   tool/plugin sources (read-only), or the live loop folder `.opencode/loop/`
   (smokes that touch loop dirs must use a sandbox — the loop_log smoke
   already does).
8. If a smoke cannot be made green WITHOUT changing the tool source itself:
   STOP, do not fix the tool — report the discrepancy in
   `handover_task_to_planner.md` and commit the rest.
9. Commit: the tests + README + a `TODO.md` close-note (append a one-line
   record pointing at the proposal + commit hash). Write
   `handover_task_to_planner.md` (exec summary, measured verification, commit
   hash, discrepancies, deliberately-not-done).

## Suggested procedure (suggestion, not protocol)
1. Read the approved proposal + the 8 scratchpad source files (headers first,
   full body when wiring each file).
2. Create `tests/` + README + base file.
3. Move + rename per the table; rewire paths; dedupe into the base.
4. Run each smoke; iterate until green.
5. Run the gates; commit; handover.
