# TASK — approved-fix batch: #41 callback parity + #42 wheel-gating + #46 flaky crossover test

FIRST read `AGENTS.md`, `agents_repo.md`, this file, and TODO.md entries #41, #42,
#46 (the maintainer rulings are recorded in their status lines).
Repo root = the directory containing `agents_repo.md`.

## Goal
Land the three maintainer-approved fixes (260910 rulings) in ONE atomic change, each
verified against the current code before editing.

## Items

### 1. TODO #41 — `remove_all_toasts` plural/singular AttributeError (APPROVED)
- `fst_manager.py` ≈578 (`remove_all_toasts`, the control-function family) calls
  `self._fst.remove_all_callbacks()` (PLURAL); production `FST_Keyboard` only has
  the SINGULAR `remove_all_callback` (`fst_keyboard.py` ≈64, assigned at
  `free_snap_tap.py` ≈193).
- Fix: call the SINGULAR at the one production site. Update the two test
  references to the singular name: the FakeFST `remove_all_callbacks = MagicMock()`
  in `tests/conftest.py` ≈69 and the assertion in `tests/test_output_manager.py`
  ≈534.
- Add a drift-guard test that fails if the control function's attribute name ever
  drifts from the production `FST_Keyboard` attribute (e.g. drive the
  `remove_all_toasts()` control function against a stand-in FST exposing ONLY the
  singular attribute, and assert it works).

### 2. TODO #42 — multi-notch wheel gating (APPROVED: mask/shift semantics)
- `fst_keyboard.py` ≈456-460 (`mouse_win32_event_filter`, inner `is_press()`)
  returns True/False ONLY on EXACT equality with the single-notch `mouseData`
  constants 4287102976 (down, delta −120) / 7864320 (up, delta +120); any other
  wheel delta falls through to implicit None → release-phase-only.
- Maintainer ruling: the direction info sits on bits 16/17 of `mouseData`
  (log2(65536)=16, log2(131072)=17); the fix = a MASK/SHIFT so the direction is
  recognized regardless of the other bits. Approved observable semantics: a
  multi-notch wheel event produces the SAME phase as single-notch (magnitude is
  NOT aggregated).
- Implement the minimal correct bit test. BEFORE writing code or tests: verify
  your mask/shift against BOTH existing single-notch constants (a short node
  script is fine) and record the exact expression in your summary.
- Tests: in `tests/test_filter_behavior.py::TestMouseWin32Filter`, add
  multi-notch events — 2-notch up `mouseData=15728640` (delta +240) and 2-notch
  down `mouseData=4279238656` (delta −240) — asserting the press-phase outcome;
  the existing single-notch tests stay green.
- REPORT BACK (part of the ruling): grep the repo for other equality comparisons
  against packed multi-bit status words / single-bit-in-a-series checks
  (candidates: `mouseData`, `lParam`, packed vk values in `fst_keyboard.py` /
  `fst_manager.py`). If you find any, add a TODO.md entry (next free ID, #48) with
  the evidence — the maintainer implicitly approved fixing them. If none, say so
  in the summary.

### 3. TODO #46 — deterministic crossover test (PRE-APPROVED, test-only)
- `tests/test_output_manager.py::TestCrossover::test_crossover_not_taken_on_low_roll`
  races a fixed `await asyncio.sleep(0.02)` against the 5 ms scheduled sleep
  inside the coroutine.
- Fix: replace the fixed sleep with an event-driven bounded wait (poll the mock's
  `method_calls` until both calls are recorded, or `asyncio.wait_for` the
  scheduled task, bounded by a timeout). Do NOT change production
  `send_keys_for_tap_group`.
- Verify: 10 consecutive FULL `pytest -q` runs green (that is the acceptance).

## Definition of done
1. `& .\.venv\Scripts\python.exe -m pytest -q` green (434 + your new tests; report
   the exact count), 10 consecutive full runs without a flake on the #46 test.
2. `& .\.venv\Scripts\ruff.exe check --select F .` = 0 findings.
3. `git diff` scope = `fst_manager.py`, `fst_keyboard.py`, `tests/conftest.py`,
   `tests/test_output_manager.py`, `tests/test_filter_behavior.py`, `TODO.md`,
   `.opencode/handover_task_to_planner.md` ONLY.
4. TODO.md: append a status tail to #41, #42, #46 (LANDED + commit hash + the
   measured verification); a new #48 entry IF bit-comparison sites were found.
5. ONE commit (code + TODO.md + your summary file), message per the AGENTS.md
   style, before your final message.

## Approval boundary
- All three fixes are maintainer-approved (260910). Do not change observable
  behavior beyond the approved semantics above. If a fix turns out to require a
  behavior change beyond the ruling: STOP that item, record why in the summary,
  land the rest.
- Test-only + docs/TODO: pre-approved.
- NEVER run the live listeners (mock the pynput controllers — `tests/conftest.py`
  pattern).

## Protocol (you are the RAW agent — no worker prompt; this section is the protocol)
- You are the worker for this task. The planner verifies your summary against
  `git log` + the test baseline — it cannot see your steps.
- Checkpoint: after each item lands, run the gate and append its status tail to
  TODO.md (a dead session must lose at most one item).
- Write your EXECUTIVE SUMMARY to `.opencode/handover_task_to_planner.md`
  (overwrite it): what changed per item, measured verification (exact counts),
  commit hash, TODO entries touched, the #42 mask/shift expression, the #42
  report-back result, what you deliberately did NOT do.
- Your FINAL MESSAGE must be SHORT: a pointer to the summary file + the VERBATIM
  output of `node .opencode\ctxgauge\peek.mjs` as the last line. (The summary
  file is the single summary channel — do not repeat it.)
- Stop line: REM ≤ 15k or ≥ 85 % → make the handover current at a clean committed
  point and stop; a fresh session resumes from TODO.md + your summary.
