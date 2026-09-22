# HANDOVER — configurable unit-2 threshold + output reserve (worker, ses_f35f82abdffeyz62ZF4NLW3qZy)

Status: DONE — single-file plugin change + test updates per the spec. Gate
fully green. ONE commit (see "Commit").

## What changed

`.opencode/plugin/auto_resume.ts` (unit 2 only — units 1/3/4,
compact_memory.ts, probe pins untouched):
- `SATURATION_THRESHOLD = 0.85` / `RESERVE_MIN_OUTPUT = 20000` → fail-open
  defaults `DEFAULT_SATURATION_THRESHOLD = 0.95` /
  `DEFAULT_OUTPUT_RESERVE = 20000`.
- New `saturationConfig()` — per-tick READ-ONLY parse of the SAME
  `compact_budget.json` budget file (reuses the `autoCompactEnabled`
  pattern): optional top-level `saturationThreshold` (number, 0 < t < 1) +
  `outputReserve` (number, >= 0); missing / unreadable / malformed / key
  absent / not-a-number / out-of-range → the default (fail-open). A live
  edit takes effect on the next tick.
- `getUsable(model)` → `getModelLimits(model)`: caches the STABLE
  `{context, output}` limits (`usableCache` → `limitsCache`); the usable
  window is computed per tick in `tick()`: `usable = context -
  min(reserve, output)`, guarded `usable > 0`.
- `tick()` fires when `ratio >= threshold` (the per-tick value) AND
  `autoCompactEnabled()`. `saturation=` / `trigger=` log-line formats
  unchanged.
- Header comments (the UNIT 2 block + the constants region) now describe
  the configurable keys + defaults (maintainer ruling 2026-09-22).

`.opencode/plugin/tests/auto_resume.smoke.mjs`:
- FIX (found + fixed, in scope): the load path was STALE — it still loaded
  `.opencode/plugin/deactivated/auto_resume.ts` (the plugin was reactivated
  into `.opencode/plugin/auto_resume.ts` by commit 380e326 without updating
  the test) → the smoke crashed with ERR_MODULE_NOT_FOUND before any check;
  the spec's "baseline 76/76" was unreachable on the current checkout. It
  now loads the live file.
- UNIT-2 fire/no-fire expectations + labels updated to the new 0.95 default
  (all token math node-computed; the existing 80000/50000/40000 values still
  discriminate at 0.95: 80000/84000 = 0.952 fires, 50000 = 0.595 no, 40000 =
  0.476 no).
- New "UNIT 2 (cont.) — configurable threshold + output reserve" section
  (13 checks): (a) no config → fail-open 0.95/20000 (79000 = 0.940 no fire —
  would fire at the old 0.85; 80000 = 0.952 fires); (b) per-tick LIVE EDIT of
  `saturationThreshold` 0.60 → an already-armed 0.655 session fires on the
  next tick, plus fires at 55000 (0.655) but not 40000 (0.476) at that value;
  (c) `outputReserve` 0 → usable 100000 (send text "96000 of 100000"), 82000
  = 0.820 no fire (0.976 at the default reserve WOULD); (d) out-of-range
  values (string threshold, negative reserve) → fail-open defaults (80000
  fires at usable 84000, 79000 no fire). The checks account for per-tick
  re-evaluation of lingering armed sessions (they fire once the new
  threshold crosses them — correct tick semantics, pinned explicitly).

`TODO.md` — entry #83's status line now records the paired
configurable-threshold part as LANDED (2026-09-22 worker; hash recorded by
the planner follow-up). #83 itself stays OPEN — its BACKSTOP part (revive
context_recovery) was not part of this task. INTERPRETATION NOTE: there is
NO dedicated TODO entry for the threshold change — #83 is the only entry
that references it ("Pairs with the configurable-threshold change"). If the
spec intended a different entry, correct me.

`todo_inbox.md` — appended the stale-load-path finding (found + fixed in
this commit; close/curate as you see fit).

## Verification (measured, in order)

- `node .opencode/plugin/tests/auto_resume.smoke.mjs` → **ALL PASS (89/89)**
  — the 76 baseline (post load-path fix) + 13 new checks. First run after
  implementation: 2 FAILs in the new section (my expectations ignored the
  per-tick re-evaluation of lingering sessions) — expectations corrected,
  re-run green (one iteration, no loop).
- All other plugin smokes green: block_transfer 22/22,
  block_transfer.sandbox 52/52, compact_memory 53/53, context_recovery ALL
  PASS, ctx_gauge 3/3, gauge_core ALL PASS, intercept_observer 39/39,
  loop_log 24/24, submit 20/20.
- `node .opencode/plugin/probes/handover_probe.mjs` → **PROBE handover:
  241/241 PASS** — no OTHER probe pin breaks; the auto_resume `surface= v=`
  hash changed 0bb5c46f → b1bfa7f3 (expected for a source change; both
  machine-computed sha256 of the HEAD file vs the new file).
- `./.venv/Scripts/python.exe -m pytest -q` → **459 passed, 1 warning**.
- `./.venv/Scripts/ruff.exe check --select F .` → **All checks passed (F=0)**.

## Commit

ONE commit on `opencode_test` (this checkout — no branch switch): plugin +
smoke + TODO.md + todo_inbox.md + this handover file. Per the spec the hash
is NOT self-written into this commit — the planner records it in the
follow-up bookkeeping (#81 precedent).

## Deliberately NOT done

- #83's backstop (revive context_recovery, `emergencyRecovery` flag) —
  maintainer call, out of this task's scope.
- The LIVE `.opencode/temp/compact_budget.json` — the smoke writes the
  SANDBOX copy only (its live-log guard check is green; live budget file
  never touched).
- `compact_memory.ts`, the probe's [97] pin, units 3/4 code paths,
  `.opencode/maintainer/`, `.opencode/agent/prompts/`, the live
  `opencode.jsonc` — all untouched.
- No NAP edits (worker role).

## Lessons
- Specs citing a smoke baseline should be verified runnable before
  delegation (380e326's reactivation silently broke this smoke's load
  path).
- When adding per-tick config to a tick-driven loop, compute the expected
  tick SEQUENCE with node first — every lingering armed session is
  re-evaluated at the new config on the next tick.
