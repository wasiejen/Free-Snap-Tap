# Worker summary — Audit 3a: test-suite smell check (tests/ only, findings only)

## Findings (written to `TODO.md` immediately after verification, per DoD-2)
- **#42 — Multi-notch scroll-wheel events (delta ≠ ±120) are untested across all
  layers.** Production pins the wheel phase on single-notch EQUALITY:
  `fst_keyboard.py` `is_press()` (≈456-460) returns True/False only for
  `mouseData == 4287102976` (down, delta −120) / `7864320` (up, +120); any other
  delta (240, 360, …) → implicit `None` → falsy `is_keydown` into
  `_win32_event_filter` (≈505-510). The suite pins exactly those two constants
  (`tests/test_filter_behavior.py:402-410`, constants echoed verbatim from
  production source); repo-wide grep found NO other wheel `mouseData` in
  `tests/`. Output-side `scroll_up/down/right/left(n)` IS tested with arbitrary
  magnitudes (`test_output_manager.py` `test_scroll_constraints` ≈594-601) —
  but that never reaches the filter with multi-notch payloads. Concrete test
  constants computed + verified: 2-notch up `15728640`, 2-notch down
  `4279238656`. MAINTAINER CALL if the fix changes gating semantics.
- **#43 — `kb_env` fixture + `build()`/`down()` helpers copy-pasted with DRIFT
  across 6 files**, three shape-classes: (A) SimpleNamespace yield + arg flags,
  no `_mouse_listener` (filter_behavior 27-41, extraction_filter_edges 26-40);
  (B) raw yield + arg flags + `_mouse_listener` (filter_simulated 23-38);
  (C) raw yield + `_mouse_listener`, NO arg flags (control_actions 17-29,
  macro_playback_kbd 18-30, facade_wiring 15-27). A `WIN32_FILTER_PAUSED`-state
  divergence already exists silently across variants; fixes apply 6×. Test-
  refactoring class (pre-approved); each file migrated deliberately.

## Leads disposition (verified, not re-derived)
- (a) plural-mock hiding (#41): `tests/conftest.py:69` + `test_output_manager.py:534`
  EXACTLY as stated in #41 (both use the plural `remove_all_callbacks`; production
  `fst_keyboard.py:64` + `free_snap_tap.py:193` are singular; `fst_manager.py:578`
  calls the plural). #41 evidence accurate — left untouched, no duplicate.
- (b) multi-notch scroll: CONFIRMED as a real gap → NEW entry #42.
- (c) `test_extraction_filter_edges.py` ≈61-64 pins the implicit-None
  `convert_to_vk_code` ('300' → None, comment "suspected bug #2") — matches #1's
  evidence; left untouched, no duplicate.

## Hot-path coverage map (grepped `tests/` + symbol locations only in prod)
All 7 targets exercised by tests: `keyboard_win32_event_filter`
(filter_simulated 58-80 + the mocked entry elsewhere); `mouse_win32_event_filter`
(filter_behavior `TestMouseWin32Filter` + `TestMouseToMouseRebind`);
`initialize_groups_from_presorted_lines` (3 files via the `build()` helper);
`apply_focus_groups` / `update_args_and_groups` (facade_wiring + focus_task);
`constraint_evaluation` (output_manager, ~60 call sites); `execute_key_event`
(output_manager `TestExecuteKeyEventDelays` + macro_playback_kbd error path).
Only systemic coverage defect found on hot path: wheel-delta magnitude (#42).

## Files fully read (2 of the two >400-line files in two passes each, per spec)
conftest.py · test_output_manager.py · test_filter_behavior.py ·
test_extraction_filter_edges.py · test_filter_simulated.py ·
test_control_actions.py · test_macro_playback_kbd.py · test_facade_wiring.py
(+ `pytest.ini`, 2 lines). Prod: grep/symbol + three ≤40-line windows only
(`fst_keyboard.py` 423-462/463-502/503-542, `fst_manager.py` 703-742).
NOT fully read (budget — see Deviations): argument_manager, big_config,
cli_menu, config_parse, console_helpers, crosshair, data_types,
focus_group_manager, focus_task, gui_manager, gui_smoke, input_state_manager,
macro_repeat_task, save_file_handler, status_overlay, tray_icon.

## Verification (measured, verbatim)
- `& .\.venv\Scripts\python.exe -m pytest -q` → `434 passed, 1 warning in 1.98s` (baseline 434/434 ✓)
- `& .\.venv\Scripts\ruff.exe check --select F .` → `All checks passed!`

## Not TODO-ified (and why)
- Broad `pytest.raises(Exception)` without `match=` in edges/filter files — style
  (passes and asserts correct behavior), not a concrete defect.
- Output_manager's local `convert()` (test_output_manager.py:28-32) + conftest's
  `convert_to_vk_code` both duplicate production vk resolution — the CONFT one's
  "same semantics" copy is #1's companion (drift risk if #1's fix lands); the
  test-local `convert()` is harmless test isolation. Not promoted beyond #1/#43.
- `conftest.mock_pynput_controllers` (≈59-92) duplicates the 4-line controller
  mock repeated inside each local `om_env`/`kb_env` — covered conceptually by
  #43; low signal for a standalone entry.
- `test_release_delegates_to_managers` (facade_wiring ≈101-103) asserts
  `output_manager.variables == {}` after `release_all_currently_pressed_…` —
  low-confidence observation (possible surprising coupling) that needs a
  production read to verify; NOT a concrete defect per rule 6, not chased
  (budget).
- The two `pytest.skip('… not present')` guards (big_config:14, config_parse:99) —
  intentional, config is repo-pinned (`FSTconfig_test.txt` present → suite ran
  with 0 skips).
- GUI cluster (gui_manager/gui_smoke/status_overlay/crosshair/tray_icon) not fully
  read — offscreen GUI is not among the 7 hot-path targets; the suite-wide smell
  sweep (xfail/skip/TODO/XXX/FIXME/HACK/workaround/legacy/deprecated/noqa across
  ALL of `tests/`) found nothing there beyond the already-covered hits.
- Zero `xfail` anywhere in the suite (consistent with the repo convention); no
  `skip` beyond the two guarded ones.

## Deviations (every rule bent/broken — honesty > appearance)
1. Spec's line counts stale (output_manager 577 → measured 704; filter_behavior
   473 → 572); read them in two passes anyway (352+352 / 350+224) — compliant.
2. 16 of 24 test files were not read end-to-end: hit the 85 %-approach budget
   with REM ~20.9k (measured mid-audit, CTX 99086/82%) and cut new reads;
   mitigation = suite-wide smell sweep + hot-path gap grep (findings #42/#43 are
   from the fully-read set; the sweep surfaced no unverified smells in the
   remainder). A follow-up pass over the 16 files is cheap insurance — flagged.
3. `TODO.md` re-read before commit done as a TARGETED grep (`^## 4[23]\.` →
   541/582 + line excerpts) instead of a 620-line full read — equivalent
   evidence, budget rule.
4. Zero code edits (findings only) — no rule bent there.

## Commit
`TODO.md` (#42 + #43) + this summary committed together (no push).
Commit subject: "Audit 3a: test-suite smell check — TODO #42/#43 (findings only)".
HASH below: `<REPLACED by bash post-commit>`.

## Final gauge (verbatim, ACTUAL output — rule-compliant: run it, don't fabricate)
SESSION=ses_f760da9a9ffeUToytZixByvkPk CTX=105887 (88%) REM=14113
