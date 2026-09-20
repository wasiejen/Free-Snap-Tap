# Worker handover (RUN 6) — Deep-Dive B: context overflow + error handling

STATUS: IN PROGRESS (checkpoint before self-compaction; resume continues from here)

- Task spec: `.opencode/agent/handover/handover_task.md` (Phase 2, Deep-Dive B).
- Recipe file (scratchpad, written in batches as I go):
  `C:/Users/Wasiejen/AppData/Local/Temp/opencode/auto-resume-deepdive-B_6.md`
  (named with the `_6` suffix per the dispatch; the spec's DoD names the
  non-suffixed file — the dispatch's "write EXACTLY here" was followed).
- DONE so far (recipe sections, on disk): header/method + §1 problem map,
  §2 saturation chain, §3 error classification, §4 arm/tick/handoff.
  REMAINING: §5 error hygiene, §6 recipes, §7 fit assessment (compact_memory
  focus), §8 unverified/unclear. Then this file's final form (verbatim gauge
  line) + commit.
- All scope items 1-5 verified this run by targeted reads (plus grep for
  `contextWrapupAttempts` reset at 1288 — budget is once-per-BUSY-CYCLE,
  corrected from the spec/map wording "once per session"); item 6 (test
  case names) done via bounded greps — the test files use bun-style
  `test(`, no `it(`.
- One source anchor discrepancy found: spec line 1084 for
  `getUsableContextLimit` is actually the closing brace of
  `hasBusySubagents`; the symbol is 1122-1159 (map agrees) — to §8.
- DO-NOT-touch respected: plugin repo read-only (greps/reads only, nothing
  executed); our repo touched only via this handover file.
- Note: a prior B recipe exists on the scratchpad
  (`auto-resume-deepdive-B_5.md`, run 5) — NOT reused/derived from; this run
  is an independent re-extraction.

(commit this checkpoint, then self-compact; on resume: read
`agent_readme_post_compaction.md` first, then finish §5-§8 of the recipe,
finalize this file with the verbatim gauge line, commit per spec item 3.)
