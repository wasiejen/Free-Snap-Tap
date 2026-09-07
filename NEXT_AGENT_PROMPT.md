# NEXT AGENT PROMPT — Phase 3: GUI tests for `fst_overlay.py` (pytest-qt, offscreen)

You are continuing work on the Free Snap Tap repo, branch `opencode_test` (do NOT push).
FIRST read `AGENTS.md` (orientation, module map, sign convention `-`=pressed/`+`=released/
`^`=toggle, run/test commands, maintainer's recorded decisions) and `TODO.md`.

**House rule from the maintainer: when something is unclear, ASK EARLY — do not decide
unilaterally or spend a long time exploring an ambiguity.**

Current state (verified 2026-09-07, HEAD `8479a87`):
- Suite: **251 passed, 0 xfailed** — the old Key_Event eq/hash xfail was resolved by
  strict repr-based eq. Run: `& .\.venv\Scripts\python.exe -m pytest -q`
- Lint baseline: `& .\.venv\Scripts\ruff.exe check --select F .` → **6 findings** (free_snap_tap
  2×F541, fst_manager F401 `Event`, fst_overlay F401 `QSizePolicy` + F841
  `cube_distance_down`, test_pynput_mouse F841 — leave that maintainer file alone).
  No NEW findings allowed.
- Coverage: `fst_tasks` 100%, `fst_save_file_handler` 100%, `vk_codes` 100%,
  `fst_data_types` 93%, `fst_manager` 79%, `fst_keyboard` 73%, **`fst_overlay` 34%**,
  total 72% (`pytest -q --cov=fst_data_types --cov=fst_manager --cov=fst_save_file_handler --cov=fst_keyboard --cov=fst_tasks --cov=vk_codes --cov=fst_overlay`).
- Phase 3 prep is done and verified: `pytest-qt==4.5.0` + `PySide6==6.9.1` installed,
  `QT_QPA_PLATFORM=offscreen` is set at the top of `tests/conftest.py` (do NOT
  re-add it), `tests/test_gui_smoke.py` pins the offscreen environment and covers the
  `ToastBridge` show/remove round trip (wiring pattern for the rest).
- The repo-root `test_overlay.py` is the maintainer's **manual** wiring script
  (threading + 30 s sleep) — reference for how `GUI_Manager`/`ToastBridge` connect,
  **not** a pytest pattern.
- Source changes made since the previous prompt (all committed and tested — write new
  tests against THIS state):
  - Data types now have **strict repr-based `__eq__` matching `__hash__`**
    (`Key_Event`, `Key`, `Key_Group`, `Rebind`, `Macro`, `Tap_Group`). The loose
    vk/press comparison in the filter hot path is now explicit (`is_trigger_activated`,
    repeated-trigger suppression). Compare key events in tests by `(vk_code, is_press)`
    or via repr.
  - `Focus_Task.stop()` works again (attribute renamed `self._stop`).
  - `ToastManager._handle_destruction` is guarded (try/except RuntimeError) against an
    already-deleted C++ side — regression-tested in `test_gui_smoke.py`.

## Task: cover `fst_overlay.py` (~34% → ~90%) with pytest-qt

Offscreen GUI scope only. Mock every non-Qt dependency; one file per unit under test
(extend `tests/test_gui_smoke.py` where that unit is already there, else a new file).
Class map (line numbers of `__init__`): `GUI_Manager` 103, `Tray_Icon` 276,
`CrosshairOverlay` 350, `StatusOverlay` 446, `ToastWidget` 649, `ToastManager` 747,
`ToastBridge` 826.

1. **ToastManager / ToastWidget depth** (extend `test_gui_smoke.py`):
   - `add_toast` dedup: same ID → the existing toast is removed before the new one
     appears (`active_toasts` holds exactly one under the ID).
   - `ToastWidget` countdown: drive `toast.handle_tick()` **directly** (no real
     waiting) — assert the `remaining_seconds` countdown text, and that a tick to
     `<= 0` stops the timer + `deleteLater` (process destruction via `qtbot.wait(...)`).
   - `remove_toast` non-immediate: red "DELETE" label + the 1 s re-armed timer branch.
   - `remove_all_toasts`, `check_empty` hide/show cycle, `ToastWidget.__eq__`
     (id + duration), remaining bridge signals (`signal_show_timer` → `add_timer`,
     `signal_remove_all_toasts` → `remove_all_toasts`).
2. **StatusOverlay** (`tests/test_status_overlay.py`): construct with a stand-in fst
   (`arg_manager.STATUS_INDICATOR_SIZE` etc. — see `GUI_Manager` below); `update_color`
   (color_name + QColor), `toggle_status_indicator` (flips the arg flag),
   `hide_indicator`/`show_indicator`, `mouseDoubleClickEvent` → `fst.open_config_file`
   (call the event handler with a constructed `QMouseEvent`, or `qtbot.mouseDoubleClick`),
   left-button drag: `mousePressEvent` → `_drag_offset` set, `mouseMoveEvent` moves the
   widget and re-positions `parent().toast_manager`, screen-change counter decrement,
   `mouseReleaseEvent` final recenter branch, menu actions (`toggle_pause`/
   `return_to_menu`/`open_config_file`/`reload_from_file` hit the mocked fst methods).
   Do NOT call `contextMenuEvent` (its `exec_` is blocking) — test the action slots
   directly.
3. **Tray_Icon** (`tests/test_tray_icon.py`): construct (offscreen:
   `QSystemTrayIcon.isSystemTrayAvailable()` is False — never `show()`); `update_color`
   (known color switches icon, unknown keeps it), `on_activated(Trigger)` emits
   `signal_toggle_console`; for the menu: get the `QAction`s from `tray_icon.menu()`
   and call `.trigger()` on each — assert the matching signal fired; never `exec_`.
4. **CrosshairOverlay** (`tests/test_crosshair.py`): `show_crosshair`/`hide_crosshair`
   (visible state + `crosshair_size`/`thickness` attrs), `update_position` honoring
   `CROSSHAIR_DELTA_X/Y` (stand-in with and without the attrs — source uses
   `getattr(..., 0)`), `paintEvent` called directly with a `QPaintEvent` (offscreen
   paint is fine — assert no exception).
5. **GUI_Manager** (`tests/test_gui_manager.py`): construct with the stand-in (see
   below) — it builds all four children, so this doubles as an integration check;
   `perform_periodic_update` **called directly** (never start `update_timer`):
   indicator show/hide on `STATUS_INDICATOR` change, crosshair show/hide on
   `CROSSHAIR_ENABLED` change, color logic — red (manual/win32 paused) / blue
   (ALWAYS_ACTIVE + empty `FOCUS_APP_NAME`) / green (running) — with tray+overlay color
   sync; signal wiring (tray signals → manager methods; `signal_toggle_crosshair` from
   BOTH tray and overlay → `toggle_crosshair`); `toggle_pause`/`return_to_menu`
   delegation; `exit_program` (mock `app.quit`, expect `SystemExit` from `sys.exit(0)`).
6. **Console helpers** (small): `customMessageHandler` (the `QWindowsWindow::setGeometry`
   suppression branch), `switch_console_visibility`/`set_console_visibility` with
   `monkeypatch`ed `fst_overlay.kernel32`/`user32` (no real console).

Stand-in for a full `GUI_Manager`: `SimpleNamespace` with
`arg_manager = SimpleNamespace(MANUAL_PAUSED=..., WIN32_FILTER_PAUSED=...,
CROSSHAIR_ENABLED=..., STATUS_INDICATOR=..., ALWAYS_ACTIVE=...,
STATUS_INDICATOR_SIZE=10)` and `focus_manager = SimpleNamespace(FOCUS_APP_NAME='')`;
attach `MagicMock`s per test for `open_config_file`/`control_toggle_pause`/etc.

Conventions (established in `tests/`):
- `qtbot` for the QApplication + widget lifecycle; `qtbot.wait(...)` only in small fixed
  doses (≤100 ms); call `QTimer`-driven slots directly instead of waiting real time.
- No `GUI_Manager.start()` (it enters `app.exec()`), no live listeners, no threads +
  `time.sleep` like the root script.
- The autouse `restore_constants` fixture covers `CONSTANTS`; the offscreen env comes
  from `tests/conftest.py`.

## Rules
- **Tests only — do NOT change source code.** If a test reveals genuinely wrong
  behavior, do not fix it: record it in your final report and leave the test out rather
  than asserting buggy behavior.
- `FSTconfig.txt` and `FSTconfig_test.txt` are the maintainer's live files — never edit.
- Never commit `.coverage` or `FSTconfig_test.txt` (both gitignored).
- Do NOT edit README/WIKI/`SPEC_FEATURES.md`/`TODO.md`/`AGENTS.md` (the maintainer
  maintains AGENTS.md status lines himself).
- Git note: source files are stored CRLF in the index (autocrlf); test files are LF.
- Commit per logical chunk on `opencode_test`; do NOT push.

## Definition of done
- `& .\.venv\Scripts\python.exe -m pytest -q` fully green including the new tests.
- `& .\.venv\Scripts\ruff.exe check --select F .` — same 6 findings, no new ones.
- Report: new coverage numbers per module (expect `fst_overlay` ~85–90%; legitimate
  leftovers: `GUI_Manager.start` — needs a mocked `app.exec()` decision — plus whatever
  you list), what you covered, any code discrepancies or suspected bugs found (unfixed),
  and what remains (should then only be: the remaining `fst_manager`/`fst_keyboard`
  hotpath leftovers — eval invocations clipboard/files/toasts/mouse-vars,
  `is_repeat_active`, numpad debug actions, control-handler bodies — for a Phase 4
  coverage triage).
- **Phase 4 (coverage report / optional Windows CI) starts only after the user
  confirms Phase 3 is done.**
