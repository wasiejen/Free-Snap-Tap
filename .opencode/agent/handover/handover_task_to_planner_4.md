# Handover — Deep-Dive B run #4 (context overflow + error handling)

Worker session ses_f3f6c39a4ffe34mNRWa65h9zdL (model
llama-swap/Qwen3.8-27B-Q4-170K), 2026-09-20.
**Recipe deliverable:**
`C:/Users/Wasiejen/AppData/Local/Temp/opencode/auto-resume-deepdive-B_4.md`
(8 sections in spec order; all src/index.ts refs verified this
session by bounded reads or line-anchored greps).
NOTE: direct run instructions named the _4-suffixed paths
(recipe + this handover); the spec DoD text names the
unsuffixed files — flagged for consolidation inside
recipe §8 item 2.

## Method
Static analysis only; plugin repo never executed. 9 targeted
bounded reads (<1200 lines total) covering every spec
scope range + symbol greps + one case-name pass over the six
in-scope test files. Phase-1 method deviation worth noting:
the describe|it head-based regex under-counts because these
suites use `test(` — adding `\btest\(` surfaced e.g.
streaming-failure from 1 → 30 lines (§8 item 8). Map
discrepancy resolved per trust-the-symbol rule:
getUsableContextLimit is at 1122, not the spec's "1084"
(spec range was stale; map had it right — §8 item 1).

## Coverage (spec scope items 1-6)
1. Context tracking→saturation ranges: DONE
   (2536-2549, 1093-1113, 1122-1159*(symbol-corrected)*,
   2306-2345, 2147-2194, 2428-2439, 119, 475-478 read
   verbatim).
2. Error classification: DONE (231-257, 265-309,
   318-347 full bodies read; default tables 85-98;
   option parse 451-454 by grep).
3. Arming+triggering: DONE (2568-2618, 2212-2304
   incl. shared outer gate structure, 1983-2017 read
   verbatim; watchdog chain referenced to A §4 only,
   no re-derivation).
4. Error hygiene: DONE (509-528 log(), 2611-2617
   early-break/counter-reset read verbatim).
5. State-machine fields B-subset: DONE
   (interface 21-63 read: all seven named fields'
   line positions confirmed; factory defaults
   568-583 confirmed by grep).
6. Test files: DONE for case NAMES of the six in-scope
   files (~120 names); assertions NOT read
   (Phase-1 boundary retained and stated in recipe
   §8 item 8). Shared A-covered files skipped per
   spec.

## Notable findings (one line each)
1. Subagents NEVER enter the parent idle recovery block
   (all three checks inside `if (!w.isSubagent)`
   from 2196) — subagents get ONLY opt-in native
   summarize + the tick/orphan machinery, no
   streaming-fail or dead-stream prompt recovery on
   idle.
2. `getLastSilentDeadStream` doc comment claims
   "only the newest assistant is evaluated" but an
   assistant WITHOUT a finish reason lets the walk
   continue backward (line 331) — code/comment
   mismatch flagged (§8 item 3).
3. Token floor lives at the CALLER
   (`>= silentDeadStreamMinTokens`, 2267), not in
   the pure detector — deliberate separation of
   shape-tolerance vs threshold policy (test
   pins exact-threshold arm, so ≥ semantics
   verified indirectly).
4. Neither compaction dispatch carries a model
   argument (host decides); our compact_memory must
   send explicit providerID+modelID pairs — key
   integration difference for porting R-B1/R-B2
   (§7 comparison table).
5. The biggest gap B closes for us: our compaction
   trigger fires INSIDE the session running out
   (least headroom/discipline there); the
   reference triggers externally at idle boundaries
   — recommended as first add-on (§7 item
   1), safe under our NO-AWAIT ruling only if
   dispatched at idle (static assumption, §8 item
   7).

## Context gauge (verbatim readout via ctx_gauge)
SESSION=ses_f3f6c39a4ffe34mNRWa65h9zdL CTX=92530 (54%) REM=77470

(≈+few-k tokens since that call; read-only thereafter.)
Commit follows per spec DoD 3: this handover file
staged by NAME ONLY; no TODO/todo_inbox entries
created (Phase 3 curates seeds); recipe stays in
the scratchpad outside git.