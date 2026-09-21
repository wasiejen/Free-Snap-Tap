# Worker handover (RUN 6) - Deep-Dive B: context overflow + error handling

STATUS: COMPLETE (recipe on disk at the path below; all DoD items met).

- Task spec: `.opencode/agent/handover/handover_task.md` (Phase 2, Deep-Dive B).
- Recipe file: `C:/Users/Wasiejen/AppData/Local/Temp/opencode/auto-resume-deepdive-B_6.md`
  (named with the `_6` suffix per the dispatch's "write EXACTLY here"; the spec's
  DoD names the non-suffixed file - flagged for the planner, not a scope miss).
- Mid-run checkpoint was committed as 16e3499 (sections 1-4 on disk); this run
  continued after the failed compaction attempt (maintainer switched to a
  higher-window model mid-session).

Method
- Static analysis only; the plugin repo was read-only (bounded targeted reads of
  every spec-named src/index.ts range + line-anchored greps; nothing executed).
- Map + Deep-Dive A read first; A's section 3 (timer), 4 (send path/watchdog),
  5 (ESC boundary) are referenced by pointer in the recipe, not re-derived.
- Test case names extracted by bounded greps per file (head-limited).
- Recipe written in batches (header+1..4, then 5, 6, 7, 8) via a small
  heredoc-created file + edit-tool appends, because the write tool failed on
  every payload this session (logged in agent_feedback).
- Fit assessment (recipe section 7) read `.opencode/plugin/compact_memory.ts`
  in full-ish (header, classifier/budget, callSummarize/resolveModel, execute).

Coverage (spec scope items 1-6)
1. Context tracking -> saturation (2536-2549, 1084*, 1093-1113, 2306-2345,
   2147-2194, 2428-2439, 119, 475-479): DONE - one discrepancy: the spec's
   line-1084 anchor for getUsableContextLimit is actually hasBusySubagents'
   closing brace; symbol verified at 1122-1159 (map agrees) - recipe section 8.
2. Error classification (231-263, 265-316, 318-352, 82, 468): DONE.
3. Arming + triggering (2568-2618, 2212-2256, 2257-2304, 1983-2017): DONE.
4. Error hygiene (509-528, 2611-2618): DONE.
5. State-machine fields (21-63): DONE - B-relevant subset quoted with the
   verified field lines.
6. Test case names (6 files): DONE - 12+24+15+19+10+24 names extracted; NOTE the
   files use bun-style test( with no it( (logged to knowledge inbox).
- DoD sections 1-8 all written, in order; every src/index.ts ref in the recipe
  was read or line-anchored-grepped in this session.

Notable findings (one line each)
- The wrapup/summarize budget is once per BUSY cycle, not per session:
  resetBusyFlags zeroes contextWrapupAttempts at 1288 (the map's "once per
  session" wording is imprecise; test name says "per busy cycle").
- Parent ctx-wrapup fires via an AWAITED session.command gated on the
  magic-context plugin being installed in host config; subagents use native
  session.summarize (opt-in, default OFF) with no such gate - our
  compact_memory.ts already does the summarize call but only on model request.
- Error arms and recovery sends are split cleanly: events/idle ARM
  (pendingRecovery triple), the 5s tick makes exactly ONE send
  (recoveryAttempts===0), the send path's deferred watchdog owns retries;
  session.error self-suppresses when busyCount()===0.
- silentDeadStream needs finish + ZERO text parts + >= 200 output tokens and
  re-polls live status before acting (busy/retry again = skip); its doc
  comment understates a walk-back behavior (recipe section 8).
- Our compaction trigger is model-initiated and fire-and-forget (await
  deadlocks the single llama-swap slot); the reference's is host-side,
  idle-boundary, awaited, and sends no model pair - B's chain is the missing
  model-independent safety net for our stack (recipe section 7).

Deliberately not done
- No TODO.md / todo_inbox.md entries (spec item 3: recipe is the deliverable,
  Phase 3 curates TODO seeds). No edits to the plugin repo or any DO-NOT-touch
  repo path. Run-5 recipe (auto-resume-deepdive-B_5.md) not read/reused/diffed.

Commit: this file + its checkpoint (16e3499) are the only repo changes; staged
by named path only.

Context gauge (VERBATIM, self-run at close-down):
SESSION=ses_f3ee0c5e6ffefmbmRW5fyAiJ2d CTX=113773 (71%) REM=46227
