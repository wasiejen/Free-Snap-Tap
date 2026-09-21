# Handover — opencode-auto-resume Phase 2, Deep-Dive B: context overflow + error handling

Worker: worker_Q4_140K, session ses_f3ea32083ffefmGD9PrdzCnTYr (2026-09-21).

## Deliverable
Recipe file (scratchpad): C:/Users/Wasiejen/AppData/Local/Temp/opencode/auto-resume-deepdive-B_7_1.md
Note: the spec named auto-resume-deepdive-B.md; the launch instruction said to write EXACTLY the
_7_1 path, so the file is at the _7_1 path. 8 sections in spec order, all line refs
src/index.ts-verified by bounded read or line-anchored grep (one map-vs-spec discrepancy noted in
its section 8: spec "1084-1084 getUsableContextLimit" resolves to 1122-1159).

## Method
- Read map (planner-verified) + Deep-Dive A sections 3/4/5 first; referenced A for shared machinery
  (timer split, send path/watchdog chain, ESC boundary) — no re-derivation.
- Bounded reads of the spec's six scope areas (interface 10-124, 231-355, 460-534, 1084-1163,
  1244-1313, 1983-2017, 2147-2196, 2212-2346, 2428-2441, 2536-2549, 2568-2622) + symbol greps
  (getUsableContextLimit/isMagicContextInstalled/streamingFailure*/resetBusyFlags call sites).
- Test case names only, head -8 per file, with describe|it|test (6 files, scope item 6).
- Read our .opencode/plugin/compact_memory.ts in full for the fit assessment.
- Recipe written in batches (initial write + 5 edit appends); plugin repo never executed, never written.

## Coverage (scope items 1-6)
1. Context tracking -> saturation: DONE (all named ranges read: 2536-2549, 1093-1113, 1122-1159,
   2306-2345, 2147-2194, 2428-2439, 119, 475-478; the spec's 1084-1084 resolves to 1122-1159).
2. Error classification: DONE (231-257, 265-309, 318-347, 82, 450-453, 468-469).
3. Arming + triggering: DONE (2568-2618, 2212-2256, 2257-2304, 1983-2017; watchdog handoff
   referenced via Deep-Dive A section 4, one pointer).
4. Error hygiene: DONE (509-528, 2611-2618).
5. State-machine fields: DONE (21-63 read; B-relevant subset tabled: lastTokenTotal 45,
   contextWrapupAttempts 46, doneClaimNoTodosAttempts 52, pendingRecovery* 58-60,
   recoveryAttempts 61, watchdogRetryGuard 62; plus defaults 568-569 and resetBusyFlags 1288).
6. Test files: DONE — case names only for the 6 named files; the 3 shared files skipped per spec.

## Notable findings
1. The wrapup budget is once per BUSY WORK CYCLE, not per session lifetime: contextWrapupAttempts
   is reset in resetBusyFlags (1288), called on the busy transition (2120) and command.executed (2629).
2. The silent-dead-stream idle handler carries a race guard: it re-polls the live status map and
   skips if the session is busy/retry again (2269-2281) — detection and action are decoupled.
3. session.error on no-busy state does NO action: early break at busyCount() === 0 (2611), only
   logging plus a reset of pendingTools/pendingCommands (2615-2618) — the core of spurious-noise suppression.
4. The subagent saturation path is deliberately opt-in (subagentNativeCompactionEnabled default false)
   and uses native session.summarize with NO body — the parent path instead needs the host-side
   magic-context command and refuses native compaction to avoid double-compression (2306-2311).
5. Fit: our compact_memory has NO saturation detection and a NO-AWAIT dispatch (single llama-swap
   slot deadlock) — adapting B requires idle-boundary detection feeding a no-await summarize dispatch
   with async success verification, plus a per-cycle budget complementing the per-quant-class cap.

## Context gauge (verbatim)
SESSION=ses_f3ea32083ffefmGD9PrdzCnTYr CTX=88235 (68%) REM=39765
