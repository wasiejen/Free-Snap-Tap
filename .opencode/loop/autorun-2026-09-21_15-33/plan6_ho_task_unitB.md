# TASK — auto_resume UNIT B: the auto-compact toggle (budget-file gated)

Worker: `worker_Q3S_160K`. Branch: stay on the current checkout (`opencode_test`).

## Goal
Gate Unit 2's 0.85 self-compact trigger behind an OPTIONAL top-level
`"autoCompact"` flag in `.opencode/temp/compact_budget.json` (maintainer
priority.md #1, first bullet). Absent / `true` → current behavior unchanged;
`false` → the trigger is suppressed with an evidence line.

## Design (the WHAT — HOW is yours inside this boundary)
1. In `.opencode/plugin/auto_resume.ts`, add a small reader (per tick, inside
   the Unit 2 block of `tick()` — lines ~635-651; the file is small, a per-tick
   read is fine): file path = `join(logDir, "compact_budget.json")` (logDir is
   already the temp dir where auto_resume.log lands). Lenient parse:
   - file missing / unreadable / JSON parse failure → ON (status quo)
   - key absent → ON
   - key present → `Boolean(value)`
2. In the Unit 2 tick loop, KEEP the ratio computation and the `saturation=`
   log line exactly as they are (below-threshold). When `ratio >=
   SATURATION_THRESHOLD` (line ~643-647) AND the toggle is OFF: log
   `skip= autoCompact-off sid=<sid> ratio=<3-decimals>` and do NOT call
   `sendSelfCompact` and do NOT consume the `w.attempts` budget (the
   once-per-busy-cycle budget stays for a later ON state). Toggle ON →
   current path unchanged (`trigger=` + queued promptAsync).
3. Update the Unit 2 header comment block (lines ~33-42) to document the
   toggle (one short paragraph; the file's existing comment style).

## Smoke (`.opencode/plugin/tests/auto_resume.smoke.mjs`)
The smoke already sandboxes under `proj/.opencode/temp/` (factory
`{ directory: proj }`; the trigger-file pattern at ~lines 281-285 is the
precedent). NEVER write the LIVE `.opencode/temp/compact_budget.json` (it
carries real budget state). ADD four cases to the Unit 2 section:
1. no budget file / key absent + ratio >= 0.85 → trigger fires (regression —
   the existing firing cases already cover this; one explicit no-file case).
2. `autoCompact: false` + ratio >= 0.85 → ZERO promptAsync calls, the
   `skip= autoCompact-off` line present, the `saturation=`/ratio still
   observable.
3. `autoCompact: true` + ratio >= 0.85 → trigger fires.
4. malformed file content + ratio >= 0.85 → trigger fires (fail-open).

## Definition of done
- `node .opencode/plugin/tests/auto_resume.smoke.mjs` — ALL PASS (existing +
  the 4 new cases).
- Standard gate green: `./.venv/Scripts/python.exe -m pytest -q`
  (459 passed + 1 known warning), `./.venv/Scripts/ruff.exe check --select F .`
  (F=0), `node .opencode/plugin/probes/handover_probe.mjs`
  (241/241 — reported total == header annotation).
- ONE commit (code + smoke + handover bookkeeping), message per the
  commit-routine conventions.

## DO-NOT-touch
- `.opencode/plugin/compact_memory.ts` (just fixed in the previous task —
  read-only reference only), `opencode.jsonc`, `.opencode/maintainer/**`,
  the LIVE `.opencode/temp/compact_budget.json`, auto_resume Unit 3/4 code
  blocks, probe sections (re-pin ONLY if an existing pin breaks — say so).

## Context discipline
- Read ONLY: auto_resume.ts lines ~1-160 (header + constants + log setup),
  ~320-370 (selfCompactText + sendSelfCompact), ~620-670 (tick), and the
  smoke ~150-270 (Unit 2 section + fake client). Run the gates. Nothing else.
