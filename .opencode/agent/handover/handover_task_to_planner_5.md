# Handover — Phase 2 Deep-Dive B: context overflow + error handling

Run: 2026-09-21, session ses_f3f37009fffeCnn66XPd6edH0L (worker, single run;
A/B comparison phase over). Spec: `.opencode/agent/handover/handover_task.md`.
Recipe (the deliverable; NOT pasted here):
`C:/Users/Wasiejen/AppData/Local/Temp/opencode/auto-resume-deepdive-B_5.md`
(8 sections in spec order; written in 6 append batches).

## Method
Static analysis of the READ-ONLY plugin repo (never executed, no bun/npm/node):
bounded direct reads of the spec's exact `src/index.ts` ranges (21-63,
80-121, 421-492, 509-538, 231-352, 1084-1161, 1983-2017, 2147-2194,
2196-2211, 2212-2345, 2421-2448, 2519-2554, 2568-2618) + one line-anchored grep
for the B-relevant `SessionWatch` field consumers + the Phase-1 test case-name
loop (bounded, head -8/file) re-run with `test(` added (the Phase-1
`(describe|it)` regex missed the vitest `test(` alias — recipe §8.6).
Shared machinery from Deep-Dive A (§3/§4/§5) referenced, not re-derived,
incl. ONE pointer (no re-derivation) at recipe §4's watchdog handoff.
Reference to `repo_overview.md` parts: not needed (no repo-side test runs, no
live listeners — pure file reads + git commit).

## Coverage (scope items 1-6)
1. Context tracking → saturation — DONE: 2536-2549 read; `getUsableContextLimit`
   read at 1122-1159 (spec's "1084-1084" is a line-ref discrepancy — line 1084
   is `hasBusySubagents`' closing brace; trusted the symbol per spec rule,
   noted in recipe §8.1); 1093-1113, 2306-2345, 2147-2194, 2428-2439, 119,
   475-479 all read + verified.
2. Error classification — DONE: 231-263, 265-316, 318-352, 82, 468 all read;
   exact field checks in recipe §3 (default pattern/name lists quoted).
3. Arm + triggering — DONE: 2568-2618 (ESC latch, streaming-fail arm, early
   break + counter reset), 2212-2256, 2257-2304, 1983-2017 (with
   `recoveryAttempts === 0` condition); watchdog handoff = one pointer to
   Deep-Dive A §4 (no re-derivation). One adjacent read 2196-2211 resolved the
   in-scope gate refs (revealed the explicit `!w.isSubagent` gate making the
   parent block parent-only — recipe §8.7).
4. Error hygiene — DONE: 509-528 (`log()` app.log-only, debug-only 5s dedup,
   200-entry evicting cap), 2611-2618 (early break + counter reset); recipe §5.
5. State-machine fields — DONE: 21-63 read; the B-relevant subset
   (`lastTokenTotal`, `contextWrapupAttempts`, `pendingRecovery{,Reason,At}`,
   `recoveryAttempts`, `watchdogRetryGuard`, `doneClaimNoTodosAttempts`) with
   consumers verified by grep (incl. `resetBusyFlags` 1288 resetting
   `contextWrapupAttempts` — the once-per-busy-cycle budget mechanism).
6. Test files — DONE (case names only, per spec): all 6 named files;
   `index.watchdog/state-machine/session-watch` skipped (Deep-Dive A covered).
   Note: the head-8 window dropped later cases of the two largest files —
   full-name details preserved in recipe §6/§8.6, nothing content-essential
   lost.

Deliverables 1-3: recipe file written (scratchpad, 8 sections in order), this
handover, and the commit below. NO `TODO.md`/`todo_inbox.md` entries (per spec).

## Notable findings (one line each)
1. The once-per-busy-cycle wrapup budget is `contextWrapupAttempts < 1` reset
   in `resetBusyFlags` (1288) — not a lifetime cap; matches the test
   "at most one parent wrapup per busy cycle".
2. Spec "1084-1084 getUsableContextLimit" discrepancy: the symbol is at
   1122-1159 (map-verified); line 1084 is the close of `hasBusySubagents`.
   Every other spec range matched its symbol.
3. Our `compact_memory.ts` (the fit-assessment focus) is the STRONGER
   model-pair resolver (self extra.model / cross messages-RPC / explicit
   override, resolve-not-throw), while the reference's parent trigger needs a
   third-party "magic-context" host plugin absent on our host — the portable
   core of B is: token-tracking detection + usable-window cache + threshold +
   fail-safe no-intervention, wired to our existing `summarize` dispatch
   (recipe §7).
4. The tick's `recoveryAttempts === 0` gate (1991-1993) is the contract that
   hands the counter to the Deep-Dive A §4 watchdog chain exactly once; a
   thrown first send resets it to 0 so the timer re-initiates fresh (2015).
5. `getLastSilentDeadStream` sums `msg.tokens?.output + info.tokens?.output`
   (342-343) — a latent double-count if the host sets both; flagged
   unverified (§8.2).

## Context gauge (verbatim, self-gauge, read-only)
SESSION=ses_f3f37009fffeCnn66XPd6edH0L CTX=88305 (55%) REM=71695

## Commit
Staged NAMED path only (never `git add -A`): this handover file; commit subject
names the run: `Document auto-resume Phase 2 Deep-Dive B recipe (handover)`
(see git log; hash in the commit line). Recipe file lives in the scratchpad
(per spec, outside the repo).
