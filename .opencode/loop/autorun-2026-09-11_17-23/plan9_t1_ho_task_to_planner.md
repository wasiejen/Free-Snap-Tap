# Worker summary — FST unit A (TODO #1): vk-error surfacing at every resolution site

Task commit: `4b93d37` (branch `fst_work`). Bookkeeping (this file + TODO.md + loop log)
rides a separate commit — see hash in the loop log DONE line.

## What changed
- **One shared surfacing helper** on `FST_Keyboard`: `surface_config_error(self, error)`
  (fst_keyboard.py, right after `convert_to_vk_code`). GUI mode (`self.toast_callback`
  set) → P08 error toast `toast_callback(f"[FST] {error}", 5, 12, "rgba(200, 40, 40, 200)",
  "white")`; headless (`toast_callback is None`) → `print(f"[FST] {error}")`.
- **Routed through it** (fail-closed `return False` + dedup preserved):
  - `Output_Manager.constraint_evaluation` short-eval guard (fst_manager.py): only
    `ConfigError` → helper; other unexpected exceptions keep a plain `print(error)`
    (defensive).
  - `Output_Manager.constraint_evaluation` eval guard (fst_manager.py): `except ConfigError`
    → helper.
  - `check_for_combination` (fst_keyboard.py): the deduped warning → helper
    (`_warned_config_errors` dedup kept — surfaces at most once per bad string).
  - **Audit site** `check_control_actions` resume catch (fst_keyboard.py): `control_toggle_pause`
    → `apply_focus_groups` → `convert_to_vk_code` can raise a vk-resolution ConfigError and this
    catch only console-printed; routed through the helper (recovery logic — reload + reset flags
    — unchanged). See "Out of scope / judgments" below.

## Measured verification (gate, run on `fst_work`)
- `& .\.venv\Scripts\python.exe -m pytest -q` → **455 passed, 1 warning** (baseline 451 + 4
  net-new tests; the 1 warning is the known #10 coroutine-never-awaited warning, unchanged).
- `& .\.venv\Scripts\ruff.exe check --select F .` → **0 findings** ("All checks passed!").

### New/changed tests (tests/test_config_error.py)
- `TestConstraintEvalConfigError` rewritten: both branches (eval `p("zz")` + short-eval `!zz`)
  × both modes — GUI (toast_callback called once with the ConfigError text, nothing on console)
  and headless (`toast_callback=None` → print fallback; replaces the old capsys-only pin).
- `TestCheckForCombinationConfigError.test_unresolvable_string_gui_toasts_and_dedups` added
  (GUI toast + dedup: second occurrence surfaces nothing); the existing headless+dedup test kept.
- `tests/conftest.py` `FakeFST` gains a `surface_config_error` that **delegates to the real**
  `FST_Keyboard.surface_config_error(self, error)` (so the guard's surfacing path is exercised,
  not a copy). One existing test (`test_output_manager.py::TestStateEval::test_unknown_key_state_
  constraint_fails`) needed no change beyond the conftest delegate.

## TODO.md
- Entry #1 status updated in place (per spec the entry stays): marked LANDED on `fst_work`
  (iter-9, unit A, commit 4b93d37); the console-only residual is closed by this build. Unknown
  constraint *names* remain silent no-ops by design (SPEC_FEATURES.md §4 #2) — still out of scope.

## Deliberately NOT done (out of scope / binding DO-NOT-touch)
- **Group-init boundary catches** (fst_keyboard.py alias/tap/rebind/macro, the `except
  ConfigError → print + raise` sites): left as-is per spec (boundaries already done; the re-raise
  travels to the CLI/GUI top-level which is the real user-visible surface).
- **CLI-menu reload** (fst_manager.py:1893 print+continue), **CLI top level** (free_snap_tap.py:159
  print), **GUI toasts** (fst_overlay.py): left as-is (already user-visible boundaries).
- **`###XXX 241022-1341`** mixed-Key rebind block and **`XXX 241016-1101`** contradiction block:
  untouched. **NameError silent no-op** in `constraint_evaluation`: untouched (silent by design).
- **Judgment call on the audit:** the `check_control_actions` resume catch (fst_keyboard.py) is
  the one extra site I routed beyond the two named guards. It catches a ConfigError from
  `control_toggle_pause` (a stale-focus-name path that can ALSO carry a vk-resolution ConfigError
  via the group reload) and only console-printed. Per Change 4's audit ("any remaining catch that
  only console-prints a vk-resolution error → route through the helper") I routed it. It is safe:
  headless behavior is byte-identical (print vs print), GUI adds a toast, and
  `TestHotPathSurvival` still passes. If the planner considers it a pure focus-group (P08) concern
  rather than a vk-resolution site, it can be reverted — it is the single line at that catch.

## Discrepancy flag (not my file)
`fst_work` was 2 bookkeeping commits behind `opencode_test` (the planner-8 spec/loop-log commits);
the spec said it was "current with opencode_test" (code was identical). I brought the up-to-date
loop log forward onto `fst_work` (clean superset — planner-8/planner-9 lines) so the run log is
current where the worker lines land. `opencode.jsonc` was never staged.
