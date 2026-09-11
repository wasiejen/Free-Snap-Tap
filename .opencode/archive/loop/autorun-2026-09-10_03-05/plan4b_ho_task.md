# TASK — plugin v2.8 Part 2 (the build): continuation of the stopped-at-line run

FIRST read `AGENTS.md`, `agents_repo.md`, and this file.

**Part 1 is DONE** — the re-scoped v2.8 design of record is committed in
`66c0ac9` (`.opencode/proposals/approved/260910_plugin-compaction-detection.md`
carries the "Planner status (2026-09-11, iteration 4)" block). Do not touch it
again.

**Your job is EXACTLY the "Exact remainder" section of
`.opencode/handover/handover_task_to_planner.md`** (the previous worker's
summary — read it fully; every design decision there is LOCKED, no
re-design): the `.opencode/.gitignore` `temp` append, the v2.8 build in
`.opencode/plugin/handover_v2.4.ts` (header block, restructured
`onToolAfter`, readout append, deferred delivery, single-file ctx log at
`.opencode/temp/ctx.log`), the probe S9 extension + S8 tick() additions +
S5 tally update in `.opencode/plugin/probes/handover_probe.mjs`, the
verification suite, and the commit plan. The SDK type facts (hook shapes,
`session.status()` signature) are pinned in that summary — trust them over
re-deriving.

**Definition of done:** the summary's remainder items 2–5, verbatim:
probe ALL PASS exit 0 (record the new total; 63 expected if the plan
lands); `& .\.venv\Scripts\python.exe -m pytest -q` = 448 passed + 1 known
#10 warning; `& .\.venv\Scripts\ruff.exe check --select F .` = 0;
`git status` clean WITH `.opencode/temp/ctx.log` present (git-ignored);
grep-verify no synchronous `promptAsync` inside `tool.execute.after`; ONE
build commit (plugin + probe + gitignore) + your summary file;
`opencode.jsonc` never staged.

**Context discipline (important — the previous run died at the line on this
very task):** this is a detail-heavy build; read in chunks, gauge
(`node .opencode\plugin\scripts\peek.mjs`) between units and after the
commit; stop line `REM ≤ 15k` or `≥ 85 %` — if you hit it, commit the green
state, write the summary with the exact remainder, stop. Findings you
cannot fix in scope → APPEND to `todo_inbox.md` (never `TODO.md`).
