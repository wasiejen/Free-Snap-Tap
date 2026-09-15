# Task — speaking nudge readout (plan5, iteration 5)

## Goal
Maintainer inbox `nudge_gauge_unclarity.md`: agents misread the minimal gauge
readout `(NN%/NNNK)` — the `NNNK` looks like "used K" while it is actually
REMAINING K (and the unknown-window form `(NNNK)` really IS used K — the two
forms are inconsistent in what the K number means). Make the readout SPEAKING
so the meaning cannot be misread.

## Verified facts (planner, plan5 — do not re-derive)
- Function: `.opencode/plugin/ctx_watchdog.ts` `minimalReadout(g)` at
  lines 481-493. Current: known window → `(NN%/NNNK)` (NNNK = REM in K);
  unknown window → `(NNNK)` (NNNK = USED ctx in K); non-ok read → undefined
  (append nothing — unchanged).
- Consumers (both ride the ONE function, so both change at once):
  consumer 1 = the trailer appended to tool output IN PLACE;
  consumer 3 = the `.opencode/temp/ctx.log` line `<dt> <model> <tool?> <readout>`.
- Header doc blocks describing the old format: the v2.8 header block
  (≈ lines 142-148) and the function's own comment (≈ lines 481-483) —
  update both to the new format (byte-exact doc consistency).
- Probe byte-exact pins to re-pin (IDs unchanged, APPEND-only discipline,
  total stays 106): checks 54/55 (`tool body\n(35%/78K)`, `x\n(46K)`, the two
  ctx.log lines), 65/66 (ctx.log line WITH/without the tool name), plus the
  header-map comment lines ≈152-156, ≈173-175, ≈1239 and the RO_ROW comments
  ≈1203-1204. Grep the probe for `%/` and `K\)` to find every occurrence.
- The S5 nudge RUNG lines (checks 46-53) use the FULL formatGauge readout
  (`CTX=… (p%) REM=…`) — already speaking; DO NOT change them.
- The smoke tests (`plugin/tests/*.smoke.mjs`) do NOT pin the minimal form
  (verified: zero hits) — no smoke change needed; run them anyway for green.
- Baselines (measured plan5, must hold after): probe 106/106 PASS;
  `./.venv/Scripts/python.exe -m pytest -q` → 459 passed + 1 warning;
  `./.venv/Scripts/ruff.exe check --select F .` → F=0.

## Design (planner decision — implement it)
1. New formats (same numbers, same formulas, same triggers):
   - known window: `(NN% used, NNNK left)` — e.g. `(35% used, 78K left)`
   - unknown window: `(NNNK used)` — e.g. `(46K used)` (K = USED ctx, made
     explicit — the old `(46K)` form said nothing)
   - pct = `Math.floor((ctx * 100) / w)`, remK = `Math.max(0, Math.round((w - ctx) / 1000))`,
     usedK = `Math.round(ctx / 1000)` — formulas unchanged.
2. Re-pin every probe byte-exact expectation from step 3's grep (checks
   54/55/65/66 + header comments). Fixture values: `ses_ro_k` ctx 42_012,
   window 120_000 → `(35% used, 78K left)`; `ses_ro_u` ctx 45_678, no window
   → `(46K used)`.
3. SECONDARY (one-line, same file): the probe header's per-section annotation
   (the `S1=3 S2=4 … → "PROBE handover: N/N PASS"` comment) does not sum to
   the self-counted total (the hygiene checks 40-43/45/64 are not in the
   section list; old baseline was therefore 94 executed vs the stale "94/94"
   annotation). Add a `hygiene=5` term (or equivalent) so the annotation sums
   to the self-counted total (106 for the current check set). Verify with a
   machine sum, not by eye.

## Definition of done (measured, report all)
- `node .opencode/plugin/probes/handover_probe.mjs` → `PROBE handover: 106/106 PASS`.
- pytest 459 passed + 1 warning; ruff F=0.
- `git diff --stat` scope = exactly: `ctx_watchdog.ts`, `handover_probe.mjs`,
  the two handover files.
- `grep -n "%/" .opencode/plugin/ctx_watchdog.ts .opencode/plugin/probes/handover_probe.mjs`
  is clean (no old-form byte-exact strings left, header comments included).

## DO-NOT-TOUCH
- Maintainer live files: `opencode.jsonc`, `priority.md`, anything under
  `.opencode/maintainer/` (ideas.md + my_todos.md currently carry his
  uncommitted live edits — NOT part of this task).
- The full formatGauge readout (`gauge.mjs`), the nudge rung lines, the
  `peek.mjs` / `ctx_gauge` tool, FST product code, `tests/`, the prompt set
  (worker edit-deny anyway), `fst_work2` branch.
- `git add -A` — stage ONLY the named files.

## Verification commands (from the repo root)
- `node .opencode/plugin/probes/handover_probe.mjs`
- `./.venv/Scripts/python.exe -m pytest -q`
- `./.venv/Scripts/ruff.exe check --select F .`
