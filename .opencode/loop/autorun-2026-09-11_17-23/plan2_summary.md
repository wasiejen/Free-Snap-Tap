# plan2 summary — iteration 2 (2026-09-11, ses_f6eb9cab5ffebLGhxdSs8jBrGI)

## What happened
- Resumed at the committed T1+rename spec; the first worker launch died
  at the server (`context_length_exceeded`), the retry was cancelled —
  maintainer message: a prior worker run looped into the context window
  (hung on npm type-def verification, zero work done) and ordered REDUCED
  TASK SCOPE.
- The maintainer had committed first prototypes (`d69794d`): the
  `compact_memory` tool (working export/arg/call shape — npm
  verification moot), the `context_recovery.ts` emergency plugin, and
  `agent_readme_post_compaction.md` (verbatim vs the approved proposal).
  Re-decomposed the build: T1 rename / T2 ctx.log tool-name / T3 tool
  completion / T4 prompt rule / T5 recovery hook.

## Landed + verified this iteration (all gates measured by the planner)
- **T1** `6ea76ed` — plugin rename `handover_v2.4.ts` → `ctx_watchdog.ts`
  + probe/gauge refs (grep-clean; probe 63/63).
- **T2** `6fca6bb` (+ `dd41f36` loop-log) — ctx.log normal lines gain the
  tool-name field, shape `<stamp>[ <model>][ <tool>] <readout>`
  (probe 65/65).
- **T3** `ccfedfc` — tool completion: persisted ≤2/session budget
  (`.opencode/temp/compact_budget.json`, success-only, shared-by-file
  with the future T5 hook), the tool's own COMPACT line, hand-over
  refusal note, never-throws; adjacent fix: the prototype's directive
  path separators were JS escapes (`\s`/`\a`) silently stripping the
  pointer. Probe **74/74**, pytest 451 + 1 #10 warning, ruff F=0.
- Docs: loop-log example tokens fixed to the maintainer's committed
  `-->START`/`DONE<---` (planner-owned file).
- Curation: worker flag → TODO **#51** (stale probe header vs
  `package.json` `"type": "module"` — maintainer call).

## Production tails (need the maintainer's next process restart)
- New ctx.log lines (tool name) + the compact_memory tool + the
  recovery plugin all take effect only after a restart — in-process
  staleness (live ctx.log still shows the old format).
- Cycle-2 acceptance (real sub-agent overflow → informed compaction OR
  budget clean-fail → loop.log `-WARNING`) is untested until then.

## Next (iteration 3)
1. **T4** — standing trigger rule in the 3 acting role prompts (one
   short block each, design text in the approved proposal L3;
   looprunner prompt untouched). Small — planner-direct candidate.
2. **T5** — complete `context_recovery.ts` per the approved L4/L5
   (default export so it loads; shared budget FILE with the tool;
   informed keep; activation flag default-OFF from config; over-budget
   clean fail). Spec needs fresh reads of the hook surface.
3. Standing maintainer calls: the 2 proposals at the `proposals/` root
   (FST behavior batch; contradiction block) + #51.
