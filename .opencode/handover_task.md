# TASK — v2.2.2 proof turn: worker-side `ctx:` quote + plugin.log segment tally (2026-09-09)

EVIDENCE-ONLY, read-only turn: no code edits, no commits (nothing to commit; the planner
updates the plan state). Two proofs + one measurement.

## 1. Worker-side proof (v2.2 protocol)

Your own system prompt should carry an injected line of the form
`ctx: CTX=<n> (<p>%) REM=<m>` (injected by `.opencode/plugin/handover.ts` v2.2.2 — the
maintainer's "inject for ALL sessions" decision, TODO.md #18; the readout is a tagged-
template `input.$` call).
ACTION: locate that item in your own system block and QUOTE IT VERBATIM in your summary.
If it is absent, report `ctx: item ABSENT` — that is the finding, not a failure to retry.

## 2. plugin.log segment tally

File: `.opencode/plugin.log` — retained (append-only) across opencode starts.
- First: total line count of the file (PowerShell, e.g. `(Get-Content .opencode\plugin.log
  | Measure-Object -Line).Count` — beware CRLF/blank-line nuance; report the count you used).
- The segment base = **1269** lines (recorded in the planner's NAP footer at the last NAP
  write, before this opencode start). Segment = lines 1270..EOF. If the file has fewer than
  1270 lines, read the whole file and say so.
- Tally, for the segment ONLY:
  a) every `kind:"gauge"` line: COUNT + the RAW lines (they are the v2.2.1 failure evidence
     logger; expected ZERO for a v2.2.2 ok+injected readout — any present line carries a
     `reason` value from the vocabulary `shell-missing | timeout | no-ctx-output |
     system-not-array`).
  b) the log is JSON-ish one event per line. Get the event-name string: it sits under a key
     shaped `name":"..."` per line (read a few sample lines to confirm the exact shape —
     do NOT guess the whole grammar from memory). Tally every event-name value that appears
     in the segment, with counts, largest first. ALSO compute separately how many lines
     carry each of the three NOW-EXPECTED-SILENT types `file.watcher.updated`,
     `file.edited`, `session.idle` (v1.3 skip set, TODO.md #29.3 — expect 0 each in the
     segment).
- Baseline context (planner's, from TODO.md #27 data): old-profile cycle grew the log
  ≈ 0.9 KB/s with the three noise types as the biggest chunk; v1.3 should cut ~79% of the
  event lines. Judge the ratio from YOUR tally against the baseline line, don't re-derive
  the baseline.

## Pass / return

Return the standard EXECUTIVE SUMMARY with, in order:
1. the verbatim `ctx:` item (or the ABSENT finding),
2. segment line count + the raw `kind:"gauge"` lines (or the count 0),
3. the event-name tally (largest first) + the three-silent-types check,
4. the two open judgment flags this session asks to confirm or rule out, EACH a 2-liner in
   the summary: (i) does the segment profile match the v1.3 expectation (≈79 % event-line
   cut), or do any previously-expected-SKIP-LESS lines persist / unexpected NEW lines show up,
   and what should change for them to skip them in handover.ts next?; (ii) the v2.2.2 proof —
   if the segment is clean and both agents (this one, planner's observed 28557/23%) carry
   the `ctx:` item, then the proof start is satisfied and only the git close of the cycle
   remains.