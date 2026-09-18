# DRAFT P6 — looprun measurement (operational telemetry, not an eval harness)

## What we actually need to measure, and why
Four concrete decisions are currently unmeasurable — each named with the decision it
unlocks:

1. **Calibrate the P2 triage thresholds (10 / 6 calls).** They are starting values; the
   only way to make them local facts is to see real "calls remaining vs. calls actually
   taken after compaction" from measured runs.
2. **Before/after deltas for prompt changes** (P4 digest, the rework plan, P2 triage).
   D10/Part 5 of the knowledge guide: optimization without measurement is confabulation.
   The metric set: per session — tool-call count, context at start/end, compaction count,
   wall time; per looprun — iterations, workers launched, restarts vs. resumes, warnings.
3. **Decide P5 (resume-by-default vs. restart) empirically.** The question is "is a slow
   half-prefill restart + 6–8 rebuild reads slower than a degraded long session +
   compaction cycles?" — only answerable with per-session wall time + compaction count +
   warning rate for resumed vs. fresh planner sessions.
4. **Detect the serial-slot time cost regressions.** Serial execution means every
   round-trip is a wall; a prompt change that quietly adds calls per iteration costs
   real time with no other symptom. The counters make it visible.

What we do NOT need (explicitly): no LLM-as-judge, no task suite, no accuracy eval —
this is operational telemetry on OUR loop, not a quality benchmark. Accuracy claims
stay in the normal worker-verification path.

## How we get the numbers (minimal — the sources already exist)
| metric | source |
|---|---|
| tool-call count / session | opencode session DB (the same DB `scripts/db/dump_session.cjs` already reads — count parts of tool type) |
| wall time / session | DB first/last part timestamps |
| context start/end | loop_log.md DONE<--- lines already carry the verbatim gauge readout |
| compactions | COMPACT lines in `.opencode/temp/ctx.log` (existing, written by compact_memory) |
| iterations / workers / restarts / resumes / warnings | loop_log.md lines (-->START / -RETURN- / -WARNING / --INFO--) |

Implementation: ONE script `.opencode/agent/scripts/db/loop_stats.cjs <looprun-folder>`
(same collection as dump_session.cjs — README + INVENTORY.md entries): parses the
looprun's loop_log.md + ctx.log, queries the session DB for the listed session ids,
prints a per-looprun Markdown table (and writes `_loop_stats.md` into the loop folder
on demand). ~100 lines of JS, read-only on the DB, no new infrastructure.

Cadence: on demand (maintainer) or at loop close (planner runs it, appends the table to
the run's plan summary — the `_overall_summary` skill can pick it up).

## Cost of the measurement itself
One script (pre-approved class: no observable behavior change, repo-internal) + one
read-only DB pass per looprun. Negligible against what it gates.

## Verification
Run it on the current/next looprun; the table's start/end CTX and warning counts must
reconcile with the loop_log lines (structural check). First use is also the first
before-baseline for P2/P4/rework.
