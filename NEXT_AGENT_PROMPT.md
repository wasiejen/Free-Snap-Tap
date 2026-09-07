# NEXT AGENT PROMPT — class-2 coverage + Phase 3 preparation

You are continuing work on the Free Snap Tap repo, branch `opencode_test` (do NOT push).
FIRST read `AGENTS.md` (orientation, module map, sign convention `-`=pressed/`+`=released/
`^`=toggle, run/test commands, maintainer's recorded decisions) and `TODO.md`.

**House rule from the maintainer: when something is unclear, ASK EARLY — do not decide
unilaterally or spend a long time exploring an ambiguity.**

Current state (verified 2026-09-07, HEAD `01bd312`):
- Suite: **191 passed, 1 xfailed** (`tests/test_known_issues.py` — Key_Event eq/hash,
  still open by maintainer decision #1). Run: `& .\.venv\Scripts\python.exe -m pytest -q`
- Lint baseline: `& .\.venv\Scripts\ruff.exe check --select F .` → **6 findings**: the 5
  pre-existing ones (free_snap_tap 2×F541, fst_manager F401 Event, fst_overlay F401
  QSizePolicy + F841) **plus 1 in the maintainer's own `test_pynput_mouse.py:140`**
  (F841 unused `key_event_time`) — leave that file alone. No NEW findings allowed.
- Coverage of logic/building-block modules:
  `fst_data_types` 91%, `fst_save_file_handler` 100%, `vk_codes` 100%,
  `fst_manager` 72%, `fst_keyboard` 68%, `fst_tasks` 39%, total 72%
  (`pytest -q --cov=fst_data_types --cov=fst_manager --cov=fst_save_file_handler --cov=fst_keyboard --cov=fst_tasks --cov=vk_codes`).
- The maintainer's mouse commit `800fd9f` (mouse-to-mouse rebinds now play async via
  `execute_key_event` + `run_coroutine_threadsafe`, scroll vk 6/7 implemented with
  **inverted/traditional scroll direction** in `send_key_event`, unrecognized mouse events
  suppressed via `_mouse_listener.suppress_event()`) is done and unit-tested
  (`tests/test_filter_behavior.py::TestMouseToMouseRebind`, `::TestMouseWin32Filter`).
- All 15 `SPEC_FEATURES.md` §4 items are decided; decisions are final.
- The start-argument crashes, dead `load_config` create-call, dead `arg[0]` condition and
  the `-debug` elif fall-through from the discrepancy report are **fixed and tested**
  (commits `c331f1f`, `7b7b23c`). `Config_Manager.load_config` now creates the default
  file and loads it when the file is missing (no exception).

## Task A: class-2 coverage (5 areas, still pure unit scope)

No real input, no real time, no Windows APIs, no GUI windows. Mock everything the unit
under test touches. Add tests to existing files where a file for the unit already exists,
otherwise a new file — one file per unit under test:

1. **`Focus_Task` polling** (`fst_tasks.py`, ~39% → ~100%) — new `tests/test_focus_task.py`.
   Mock `fst_tasks.gw.getActiveWindow` (return `SimpleNamespace(title=...)`, or raise
   `AttributeError` for the "None" branch). Patch `asyncio.sleep` — **the fake must yield
   to the loop** (create a future + `loop.call_soon(future.set_result, None)` + await it);
   a `pass`-body fake never yields and the task never advances. Drive the loop with a
   counter that sets `task.stop` (bool attr — note `stop()` the method sets the same attr)
   after N ticks. Cover: focus-name found (case-sensitive **substring** via `str.find`)
   → `FOCUS_APP_NAME` set, `update_args_and_groups(focus_name)`, `display_focus_found`,
   `WIN32_FILTER_PAUSED=False`; name sanitization (`™` etc. stripped by the regex);
   own windows skipped (`FST Status Indicator`, `FST Crosshair`, `FST_Overlay`);
   no match → `FOCUS_APP_NAME=''`, `display_focus_not_found`, `WIN32_FILTER_PAUSED=True`
   (and the already-paused no-op branch); `ALWAYS_ACTIVE` default-active branch;
   `FOCUS_THREAD_PAUSED`/`MANUAL_PAUSED` gating (`pause()`/`restart()`); `stop()`.
2. **Listener lifecycle** (`fst_keyboard.py:90-105`) — append to `test_filter_behavior.py`.
   Monkeypatch `pynput.keyboard.Listener` / `pynput.mouse.Listener` **classes**;
   `init_listener()` must pass `win32_event_filter` bound to the instance methods;
   `start_listener()` (both started; inits when None); `stop_listener()` (both stopped).
3. **`CLI_menu`** (`fst_manager.py`, ~1814-1906) — new `tests/test_cli_menu.py`.
   Script `builtins.input` (iterator of choices); patch `fst_manager.system` (clear_cli),
   `fst_manager.startfile`, `fst_manager.msvcrt.kbhit`/`getch`; choice `'4'` → `exit()`
   → expect `SystemExit`; choices `0` (toggles `CONSTANTS.DEBUG4` — the autouse
   `restore_constants` fixture saves it), `1` (startfile), `2` (reload calls), `3`
   (`PRINT_VK_CODES=True`, break), `''` (break), invalid input (loop again).
   The print-only methods (`display_control_text`, `display_focus_found/
   not_found/names`, `display_default_active`, `update_group_display`) → capsys +
   MagicMock FST.
4. **Display functions** (`fst_keyboard.py`: `display_internal_repr_groups`,
   `open_config_file`, `reload_from_file`) — append to `test_filter_behavior.py`.
   capsys for the repr dump (populate the group dicts first); patch `fst_keyboard.startfile`
   for `open_config_file`; `reload_from_file` → monkeypatch the instance's
   `update_args_and_groups` + `cli_menu.update_group_display`, set
   `focus_manager.FOCUS_APP_NAME`.
5. **`Focus_Group_Manager` task methods** (~1525-1564) — new
   `tests/test_focus_group_manager.py`: `init_focus_task` (keys present → creates
   `Focus_Task`, `focus_active=True`; empty → no task), `pause_focus_task`,
   `start_focus_task` (**async test** — it calls `asyncio.get_running_loop()`; patch
   `gw` + `asyncio.sleep` as in item 1 so the spawned task can be stopped),
   `restart_focus_task`, `stop_focus_task`, `update_groups_from_config`.

Conventions (established in `tests/`):
- `kb_env` (real `FST_Keyboard`, mocked pynput **controllers**); `fake_fst`/`FakeFST`
  (conftest) for manager-level units — `FakeFST` has **no** `focus_manager`/`cli_menu`/
  `config_manager` attrs: attach SimpleNamespace/MagicMock per test as needed.
- `freezegun` for wall clock where relevant; `pytest.mark.asyncio` for async tests.
- The autouse `restore_constants` fixture saves `DEBUG*`, `FILE_NAME` and the three
  control combinations — mutating `CONSTANTS` in tests is safe.

## Task B: Phase 3 preparation (pytest-qt, offscreen)

Phase 3 per `AGENTS.md` = GUI tests for `fst_overlay.py` with `pytest-qt`. Verified
ready: `pytest-qt==4.5.0` + `PySide6==6.9.1` installed, `QT_QPA_PLATFORM=offscreen`
QApplication smoke confirmed working in `.venv`. The repo-root `test_overlay.py` is the
maintainer's **manual** wiring script (threading + 30 s sleep) — reference for how
`GUI_Manager`/`ToastBridge`/`ToastManager` connect, **not** a pytest pattern.

Do (bounded):
1. In `tests/conftest.py`: `os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")` at
   module top (before any PySide6 import happens).
2. A new `tests/test_gui_smoke.py` using `qtbot`: create the QApplication, build a
   trivial widget, show/raise it, process events, assert visible, close. This pins the
   offscreen environment.
3. One first real overlay test: `ToastBridge` signal → `ToastManager.add_toast` round
   trip offscreen (wire `bridge.signal_show_toast` to the toast manager like the root
   script does; assert a toast widget appears). Read `fst_overlay.py` first — build the
   `GUI_Manager` (or the toast manager alone, whichever the constructor allows) with a
   FakeFST-like stand-in. Do NOT run the real focus/GUI timers for real time — use
   `qtbot.wait(...)` or fixed small timeouts only.

Do NOT yet: full `fst_overlay.py` coverage (CrosshairOverlay drag/menu/dbl-click,
Tray_Icon, `GUI_Manager` polling loop) — that is Phase 3 proper, started only after the
user confirms Task A+B are done.

## Rules
- **Tests only — do NOT change source code.** If a test reveals genuinely wrong behavior,
  do not fix it: record it in your final report and leave the test out rather than
  asserting buggy behavior.
- Never run live pynput listeners or real time-based GUI loops.
- `FSTconfig.txt` and `FSTconfig_test.txt` are the maintainer's live files — never edit.
  If `tests/test_big_config.py` pin drifts (the maintainer is actively adding mouse
  rebinds to `FSTconfig_test.txt`; default-group rebinds count once per 53 focus names),
  re-pin with an explanatory comment **after asking the user** whether the file changed.
- Never commit `.coverage` or `FSTconfig_test.txt` (both gitignored).
- Do NOT edit README/WIKI/`SPEC_FEATURES.md`/`TODO.md`/`AGENTS.md` (the maintainer
  maintains AGENTS.md status lines himself).
- Git note: `fst_manager.py`/`fst_keyboard.py` are stored CRLF in the index (autocrlf);
  test files are LF. If you ever need to stage individual hunks, convert the patch to
  CRLF for `git apply --cached`.
- Commit per logical chunk on `opencode_test`; do NOT push.

## Definition of done
- `& .\.venv\Scripts\python.exe -m pytest -q` fully green (the single xfail stays the
  Key_Event one) including the new tests.
- `& .\.venv\Scripts\ruff.exe check --select F .` — same 6 findings, no new ones.
- Report: new coverage numbers per module (expect `fst_tasks` ~95%+, `fst_manager` and
  `fst_keyboard` up), what you covered, any code discrepancies or suspected bugs found
  (unfixed), what remains (should be only: the deferred Phase 3 overlay depth —
  CrosshairOverlay/Tray_Icon/GUI_Manager polling — plus small leftovers: remaining eval
  invocations (clipboard/files/toasts/mouse-vars), `is_repeat_active`, numpad debug
  actions, control-handler bodies).
- After the report: **start Phase 3 proper only if the user confirms.**
