# WORKER SUMMARY — approved-fix batch #41 + #42 + #46 (260910 rulings)

## What changed (one atomic change set)
- **#41** `fst_manager.py:578`: `remove_all_toasts` control function now calls the
  SINGULAR `self._fst.remove_all_callback()` (the production `FST_Keyboard`
  attribute, `fst_keyboard.py:64`). Test refs updated to the singular:
  `tests/conftest.py` FakeFST attribute + `tests/test_output_manager.py`
  assertion. New drift-guard `test_remove_all_toasts_drift_guard`: drives
  `remove_all_toasts()` against a stand-in exposing ONLY the singular attribute —
  name drift raises AttributeError, which `constraint_evaluation` does NOT
  swallow (its eval only catches NameError, `fst_manager.py:676`).
- **#42** `fst_keyboard.py:456-460`: wheel `is_press()` branch replaced.
  Exact expression: `bool((data.mouseData >> 16) & 0x8000)` → True = down/press,
  False = up/release. Node-verified BEFORE editing against BOTH single-notch
  constants (7864320 → False, 4287102976 → True) and BOTH 2-notch spec
  constants (15728640 → False, 4279238656 → True; also confirmed
  `240<<16 = 15728640`, `(65536-240)<<16 = 4279238656`).
  Bit-note clarification of the ruling: bits 16/17 are NOT set in any wheel
  constant — the delta word occupies bits 16-31 and the distinguishing bit is
  bit 31 (the sign of the delta word); the approved "mask or shift, direction
  regardless of other bits" semantics are exactly what the expression
  implements (low word = key state, ignored). Multi-notch produces the SAME
  phase as single-notch; magnitude NOT aggregated (approved observable
  semantics). Non-matching deltas that previously fell through to implicit
  None are now explicit False (falsy → same release phase; no observable
  change). New test `test_multi_notch_scroll_keeps_single_notch_phase`
  (`tests/test_filter_behavior.py::TestMouseWin32Filter`); single-notch tests
  unchanged and green.
- **#46** `tests/test_output_manager.py::TestCrossover`: the fixed
  `await asyncio.sleep(0.02)` replaced with event-driven bounded wait
  `wait_for_calls` (polls the mock's `method_calls` until exactly the expected
  calls are recorded; 100 × 10 ms bound; AssertionError showing actual calls on
  timeout). Applied to BOTH async crossover tests — the named
  `test_crossover_not_taken_on_low_roll` and its sibling
  `test_crossover_presses_new_key_first` (same race; the #46 scope names the
  whole TestCrossover class). Production `send_keys_for_tap_group` untouched.

## Measured verification
- `& .\.venv\Scripts\python.exe -m pytest -q` = **436 passed**, 1 warning
  (baseline 434 + 2 new tests; the warning is the known #10 coroutine one).
- **10 consecutive FULL `pytest -q` runs green** (the #46 acceptance) — 0 flakes.
- `& .\.venv\Scripts\ruff.exe check --select F .` = 0 findings.
- `git diff` scope = `fst_manager.py`, `fst_keyboard.py`, `tests/conftest.py`,
  `tests/test_output_manager.py`, `tests/test_filter_behavior.py`, `TODO.md`,
  this file ONLY (pre-existing maintainer dirt in
  `.opencode/handover_maintainer.md` NOT touched, NOT committed).

## #42 report-back (ruling requirement)
Packed-word equality / single-bit-in-a-series sites FOUND → new TODO #48:
1. `fst_keyboard.py:471-473` — X-button `mouseData == 65536/131072` exact
   equality: low word holds key state (shift/ctrl), so with a modifier held the
   X-button event resolves no vk and is suppressed without processing (same
   defect class as the pre-fix wheel check).
2. `fst_keyboard.py:49` — mouse `is_simulated_key_event` = `flags == 1` on the
   packed LLKHF word: an injected event with any other LLKHF bit (e.g.
   LLKHF_LOWER_IL_INJECTED 0x20) is misclassified as real input.
Correct patterns (no action): keyboard `flags & 0x10` (`fst_keyboard.py:520`);
control combos are string-list membership, not packed words. Secondary
(maintainer's playground probe, not production):
`playground/pynput_mouse_probe.py:101, 109-125` carries the same patterns.

## TODO entries touched
- #41, #42, #46: status tails appended (LANDED + verification).
- #48: NEW entry (evidence/outcome/acceptance/scope; implicitly approved per
  the #42 ruling).
- Header numbering updated (#47 → #48 used).

## Commit structure (deviation, flagged)
DoD 4 (commit hash in the status tails/summary) vs DoD 5 (ONE commit) are
mutually exclusive — a commit cannot carry its own hash. Per the AGENTS.md
commit-routine split: the code + tests + TODO/summary land as the main commit,
and the hash backfill into the tails/summary rides a second bookkeeping-only
commit. Main commit hash: <MAIN> (bookkeeping commit: <BOOK>).

## Deliberately NOT done
- #48 fixes NOT implemented (report-back only — the ruling approves fixing them
  but the spec scoped this task to the report; delegation-ready per #48).
- `playground/pynput_mouse_probe.py` untouched (maintainer's live probes;
  excluded from package/tests by convention).
- No live/listener probes run; all pynput controllers mocked.
