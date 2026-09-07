# COVERAGE TRIAGE — remaining uncovered lines (Phase 4)

Generated 2026-09-07 · branch `opencode_test` · HEAD `1ed3162`
Regenerated with: `& .\.venv\Scripts\python.exe -m pytest -q --cov=fst_manager --cov=fst_keyboard --cov=fst_data_types --cov-report=term-missing`
(result matches the Phase 4 prompt snapshot exactly: **313 passed**, 468 uncovered lines —
`fst_manager` 274/1287 = 79 %, `fst_keyboard` 176/655 = 73 %, `fst_data_types` 18/275 = 93 %)
Every uncovered line below was checked individually against the run's `--cov-report=json` output.
`fst_overlay.py` is done (99 %, only blocking `contextMenuEvent`/`exec_` left) — not triaged here.

## Class definitions

- **A. testable now** — pure logic or mockable deps. Established patterns apply: mocked pynput
  controllers (`tests/conftest.py::mock_pynput_controllers`), `FakeFST`, `freezegun`;
  `msvcrt` can be monkeypatched (never call a live `msvcrt.getch()` in a test).
- **B. testable with more mocking** — Windows APIs / clipboard / threads / real file ops:
  the needed mock is named in the table.
- **C. deliberately not covered** — debug-print branches (only run when a `CONSTANTS.DEBUG*`
  flag is on), dead code, or abstract stubs. Justified per line in the tables.
  Note: several C lines are *by-products* of A-tests (they fall out when a test flips a
  debug flag); they are still classed C because they have no independent behavior.

Effort: **S** = minutes, **M** = needs stubs / async loop / several state cases.

## fst_manager.py (274 uncovered lines)

| lines | function | class | why / mock needed | effort |
|---|---|---|---|---|
| 76 | `Output_Manager.mouse` (property) | A | pure getter | S |
| 91 | `get_random_delay` — `min>max` swap | A | call with min > max | S |
| 110 | `check_constraint_fulfillment` — DEBUG3 print | C | debug-print branch | — |
| 114–115 | `check_constraint_fulfillment` — int result → `temp_delays` | A | constraint returning int (e.g. `tr(-a)`) | S |
| 116–117 | `check_constraint_fulfillment` — `None` result → pass | A | constraint returning `None` (e.g. `check('x', 'abc')`) | S |
| 119 | `check_constraint_fulfillment` — invalid result → print | A | constraint returning str (e.g. `get_var('x')`) | S |
| 139 | `execute_key_event` — None-ke, no delays → `None_ke_with_delay=False` | A | vk_code ≤ 0, empty `delay_times` | S |
| 145 | `execute_key_event` — `delay_times[:2]` (len > 2) | A | pass 3 delays | S |
| 148 | `execute_key_event` — len 0 → pass | A | None-ke with no delays | S |
| 186, 189, 195, 198 | `get_key_time_template` — DEBUG2 prints (×4) | C | debug-print branch | — |
| 268–269 | `last()` — DEBUG prints | C | debug-print branch | — |
| 285 | `dc()` — DEBUG print | C | debug-print branch | — |
| 314 | `stop_repeat` — except DEBUG3 print | C | debug-print branch (except path itself covered) | — |
| 326 | `toggle_repeat` — restart branch (`start_repeat`) | A | `repeat_thread_dict` entry with done handle | S |
| 334–337, 339–340, 343 | `is_repeat_active` — active / done / missing | A | fake handles in `repeat_thread_dict` | S |
| 341–342 | `is_repeat_active` — except DEBUG3 print | C | debug-print branch | — |
| 352 | `reset_repeat` — except DEBUG3 print | C | debug-print branch | — |
| 364 | `stop_all_repeat` — DEBUG4 print | C | debug-print branch | — |
| 365–366 | `stop_all_repeat` — except `AttributeError` (+ DEBUG check) | A | dict entry whose handle lacks `.done()` | S |
| 367 | `stop_all_repeat` — except DEBUG3 print | C | debug-print branch | — |
| 379 | `release_all_keys` — DEBUG4 print | C | debug-print branch | — |
| 392 | `set()` — `value is True` → 1 | A | constraint `set('x', True)` | S |
| 394 | `set()` — `value is False` → 0 | A | constraint `set('x', False)` | S |
| 397 | `set()` — DEBUG4 print | C | debug-print branch | — |
| 407 | `is_set` — KeyError DEBUG3 print | C | debug-print branch | — |
| 413–415, 417 | `get()` — KeyError path (init to 0, DEBUG check, return 0) | A | `get('missing')` | S |
| 416 | `get()` — KeyError DEBUG3 print | C | debug-print branch | — |
| 437–439, 441 | `check()` — KeyError int path | A | `check('missing', 1)` | S |
| 440 | `check()` — KeyError DEBUG3 print | C | debug-print branch | — |
| 442–447, 449 | `check()` — list/tuple branch (hit + KeyError) | A | `check('x', [1,2])`, `check('missing', [1])` | S |
| 448 | `check()` — list/tuple DEBUG3 print | C | debug-print branch | — |
| 454 | `clear()` — DEBUG4 print | C | debug-print branch | — |
| 458, 462 | `clear_all_variables` constraint | A | see observation #5 (self-resolves to `Output_Manager` method) | S |
| 467–469 | `incr()` — KeyError path | A | `incr('missing')` | S |
| 473–478 | `decr()` — whole | A | `decr('x')`, `decr('missing')` | S |
| 481–482 | `cli()` — whole | A | `cli('text')` | S |
| 485–486 | `date()` | A | pure (deterministic with `freezegun`) | S |
| 489–490 | `date_time()` | A | pure (deterministic with `freezegun`) | S |
| 501–504, 506 | `make_backup` constraint | B | monkeypatch `fst_manager.mb` (real file copy) + `FakeFST.toast_callback` | S |
| 505 | `make_backup` — DEBUG4 print | C | debug-print branch | — |
| 509–512, 514 | `restore_backup` constraint | B | monkeypatch `fst_manager.rb` + toast callback | S |
| 513 | `restore_backup` — DEBUG4 print | C | debug-print branch | — |
| 517–518, 521–522, 525–526, 529–530 | `scroll_up` / `scroll_down` / `scroll_right` / `scroll_left` | B | mocked `mouse.Controller` | S |
| 533–534 | `mouse_move_abs` | B | mocked `mouse.Controller` | S |
| 537–538 | `mouse_move` | B | mocked `mouse.Controller` | S |
| 541–543 | `mouse_get_pos` | B | mocked controller + `pyperclip` mock | S |
| 546–549 | `mouse_save_to_var` | B | `pyperclip` mock (via `mouse_get_pos`) | S |
| 552–557, 559–563 | `mouse_move_to_var` — valid / invalid position / KeyError | B | mocked `mouse.Controller` | S |
| 571–572 | `show_timer` | A | `FakeFST.timer_callback` | S |
| 575–576 | `remove_toast` | A | `FakeFST.remove_callback` | S |
| 579–580 | `remove_all_toasts` | A | see suspected bug #1 (works with `FakeFST`) | S |
| 585–586 | `set_var` | A | pure | S |
| 589–594 | `get_var` — hit + KeyError paths | A | pure | S |
| 597–599 | `copy_to_clipboard` | B | `pyperclip` mock + toast callback | S |
| 602–604 | `paste` | B | `pyperclip` mock | S |
| 607–610 | `save_into_file` | A | `tmp_path` | S |
| 613 | `append_to_file` | A | `tmp_path` | S |
| 616–618 | `empty_file` | A | `tmp_path` | S |
| 621–624, 626–627 | `print_all_variables` — with vars + empty branch | A | pure | S |
| 630–631, 633–634 | `clear_console` — win branch + else branch | B | monkeypatch `system` (and `sys.platform` for the else branch) | S |
| 641 | `constraint_evaluation` — DEBUG4 "received" print | C | debug-print branch | — |
| 680 | `constraint_evaluation` — eval `NameError` DEBUG3 print | C | debug-print branch (NameError path itself covered) | — |
| 684 | `constraint_evaluation` — DEBUG4 "evaluated" print | C | debug-print branch | — |
| 692 | `constraint_evaluation` — eval result `None` → `True` | A | constraint `set('x', 1)` (returns None) | S |
| 707 | `send_key_event` — horizontal scroll (vk 7) | A | `send_key_event` with mouse vk 7 | S |
| 731 | `send_keys_for_tap_group.send_async` — crossover DEBUG print | C | debug-print branch | — |
| 738 | `send_keys_for_tap_group.send_async` — delay DEBUG print | C | debug-print branch | — |
| 750–751 | `send_keys_for_tap_group` — DEBUG prints | C | debug-print branch | — |
| 770–771 | `send_keys_for_tap_group` — except around `run_coroutine_threadsafe` | A | monkeypatch `asyncio.run_coroutine_threadsafe` to raise | S |
| 777 | `Output_Manager.clear_all_variables` | A | pure | S |
| 802 | `Config_Manager.file_name` setter | A | pure | S |
| 866 | `_clean_comments` — commented key containing `:` → append `:` | A | direct call with e.g. `a, #:x` | S |
| 891 | `Config_Manager.parse_line` | C | dead stub — no caller anywhere | — |
| 1002–1071 (48 executable lines) | `split_ignore_brackets2` (nested in `presort_lines`) | C | dead code — defined, never called (`split_ignore_brackets` is the one used) | — |
| 1192–1216 | `display_groups` — whole | A | real `Config_Manager` populated via `presort_lines`, `capsys` | S |
| 1296, 1300 | `Argument_Manager.sys_start_args` getter / setter | A | pure | S |
| 1335 | `apply_start_arguments` — `extract_delays` >2 truncate | A | `-tapdelay=1,2,3` | S |
| 1356 | `apply_start_arguments` — DEBUG print | C | debug-print branch | — |
| 1362 | `apply_start_arguments` — `-debug_numpad` | A | restore `CONSTANTS.DEBUG_NUMPAD` afterwards | S |
| 1370 | `apply_start_arguments` — `-file=` DEBUG print | C | debug-print branch | — |
| 1392 | `apply_start_arguments` — `-aliasdelay=` invalid print | A | `-aliasdelay=abc` | S |
| 1400 | `apply_start_arguments` — `-macrodelay=` invalid print | A | `-macrodelay=abc` | S |
| 1421–1422 | `apply_start_arguments` — `-focusapp=` print + `sys.exit(1)` | A | `pytest.raises(SystemExit)` | S |
| 1426–1427 | `apply_start_arguments` — `-status_indicator` | A | pure | S |
| 1429–1431 | `apply_start_arguments` — `-status_indicator=` | A | pure | S |
| 1444 | `apply_start_arguments` — `-always_active` | A | pure | S |
| 1446 | `apply_start_arguments` — `-tray_icon` | A | pure | S |
| 1448 | `apply_start_arguments` — `-hide_cmd_window` | A | pure | S |
| 1503 | `Focus_Group_Manager.default_start_arguments` setter | A | pure | S |
| 1512 | `Focus_Group_Manager.default_group_lines` setter | A | pure | S |
| 1630–1632 | `get_all_key_press_state` — KeyError path | A | pure | S |
| 1690 | `set_toggle_state_to_curr_ke` — DEBUG4 print | C | debug-print branch | — |
| 1694–1698 | `stop_all_repeating_keys` — whole | A | fake `output_manager.repeat_thread_dict` with active handles | S |
| 1768, 1776, 1789 | `release_all_currently_pressed_simulated_keys` / `release_all_modifier_keys` — DEBUG2 prints | C | debug-print branch | — |
| 1847 | `CLI_menu.clear_cli` — debug-branch print | C | debug-print branch (the `system('cls||clear')` path is covered) | — |
| 1930 | `flush_the_input_buffer` — `msvcrt.getch()` | A | monkeypatch `msvcrt.kbhit` → True and `msvcrt.getch` → char (never live) | S |

## fst_keyboard.py (176 uncovered lines)

| lines | function | class | why / mock needed | effort |
|---|---|---|---|---|
| 121 | `FST_Keyboard.output_manager` (property) | A | pure getter | S |
| 136 | `FST_Keyboard.key_group_by_alias` (property) | A | pure getter | S |
| 144–146, 148, 150 | `convert_to_vk_code` — numeric vk strings ("8" → 8) | A | pure; see suspected bug #2 for "300" | S |
| 151–153 | `convert_to_vk_code` — `ValueError` → print + `KeyError` | A | `convert_to_vk_code('zz')` | S |
| 180 | `extract_data_from_key` — DEBUG print | C | debug-print branch | — |
| 189 | `extract_data_from_key` — bare-int delay constraint (`w\|50`) | A | config line with numeric delay | S |
| 213–214 | `extract_data_from_key` — `!` modifier (release) | A | key string `!w` | S |
| 267–269 | alias extraction — except: print + raise | A | alias referencing an undefined alias | S |
| 279–281 | tap-group extraction — except: print + raise | A | tap group with unknown key | S |
| 302–303 | rebind extraction — Key trigger + Key_Event replacement → convert to Key | A | rebind `w : +e` | S |
| 338–340 | rebind extraction — except: print + raise | A | malformed rebind line | S |
| 374 | `initialize_groups_from_presorted_lines` — `DEBUG3` → display | C | debug branch (display function itself is covered) | — |
| 384–386, 388–390 | `apply_focus_groups` — focus + default branches | A | stub `focus_manager`/`config_manager` (already used in `test_filter_behavior.py` `kb_env`) | M |
| 393 | `update_focus_groups` | A | stub managers | S |
| 396–398, 400, 403–404 | `update_args_and_groups` | A | stub managers | M |
| 407 | `set_loop` | A | pure | S |
| 482–484 | `get_coordinates` (nested in `mouse_win32_event_filter`) | C | dead code — defined, never called | — |
| 519–520, 522–526 | `keyboard_win32_event_filter` — nested helpers | A | pure | S |
| 528–532 | `keyboard_win32_event_filter` — body | A | call with fake `msg`/`data`; delegates to already-tested `_win32_event_filter` | S |
| 582 | `_win32_event_filter` — DEBUG4 IN print | C | debug-print branch | — |
| 587 | `_win32_event_filter` — `PRINT_VK_CODES` print | C | debug-print branch | — |
| 603 | `_win32_event_filter` — repeated-trigger DEBUG3 print | C | debug-print branch | — |
| 624 | `_win32_event_filter` — `DEBUG_NUMPAD` gate | C | debug branch (function itself is class A, see below) | — |
| 644–645 | `_win32_event_filter` — rebind `KeyError` except (+ DEBUG check) | A | trigger group in `_rebind_triggers` but absent from `_rebinds_dict` | S |
| 646–647 | rebind `KeyError` except — DEBUG prints | C | debug-print branch | — |
| 658 | `_win32_event_filter` — rebind replacement constraint not fulfilled → suppress | A | rebind to a key whose constraint fails (e.g. `tr(...)`) | S |
| 667, 682, 687 | `_win32_event_filter` — DEBUG4 prints (rebind / toggle arrived / toggle suppressed) | C | debug-print branch | — |
| 706 | `_win32_event_filter` — macro DEBUG `key_sequence` print | C | debug-print branch | — |
| 709 | `_win32_event_filter` — macro playback, empty key group (`pass`) | A | macro with an empty sequence | S |
| 716 | `_win32_event_filter` — macro DEBUG "playing" print | C | debug-print branch | — |
| 719 | `_win32_event_filter` — `EXEC_ONLY_ONE_TRIGGERED_MACRO` `break` | A | two macro triggers that fire on the same event | M |
| 727, 733 | `_win32_event_filter` — tap-group DEBUG prints | C | debug-print branch | — |
| 735 | `_win32_event_filter` — tap loop: `key_replaced` reset | A | rebind whose replacement key is inside a tap group | M |
| 746 | `_win32_event_filter` — tap loop: 2nd `break` (active key == vk, repeated trigger) | A | repeated press of an active tap-group key | M |
| 754–755 | `_win32_event_filter` — mouse→mouse rebind except (`run_coroutine_threadsafe`) | A | monkeypatch `asyncio.run_coroutine_threadsafe` to raise | S |
| 768, 770–775, 777–778, 780, 782–784, 787–789, 793–794, 797–798, 800, 802–803 | `_win32_event_filter` — `is_simulated` block: tap-group contradiction logic + contradiction-prevention checks | A | `_win32_event_filter(..., is_simulated=True)` with: sim key in tap group (active / inactive / `active_key is None`), sim key outside tap groups (toggle key + pressed-state case) | M |
| 795, 799, 804 | `is_simulated` block — DEBUG2 prints | C | debug-print branch (fall out if a test flips `CONSTANTS.DEBUG2`) | — |
| 819, 821 | `_win32_event_filter` — DEBUG3/4 suppression prints | C | debug-print branch | — |
| 834–835, 837 | `_win32_event_filter` — simulated send: `set_key_times` (SIMULATED + ALL) + `set_simulated_key_press_state` | A | same `is_simulated=True` tests with vk_code > 0 | S |
| 840 | `_win32_event_filter` — DEBUG4 OUT print | C | debug-print branch | — |
| 852, 854–858 | `start_macro_playback` | A | running asyncio loop + mocked `output_manager.check_constraint_fulfillment`/`execute_key_event` | M |
| 876 | `interrupt_macro_by_name` — DEBUG print | C | debug-print branch | — |
| 888 | `macro_task` — DEBUG2 print | C | debug-print branch | — |
| 901 | `macro_task` — except `logger.exception` | A | `execute_key_event` raising | S |
| 935–949 | `check_debug_numpad_actions` — whole | A | set real press states for `alt` + `num1`…`num8`, call directly, restore `CONSTANTS`; in production only reachable via `DEBUG_NUMPAD` (line 624) | S |
| 952–955, 957–960 | `control_return_to_menu` | A | stub `_mouse_listener`/`_listener` + arg flags | S |
| 956 | `control_return_to_menu` — DEBUG3 print | C | debug-print branch | — |
| 963–968 | `control_exit_program` — whole | A | stub listeners | S |
| 973–982, 984–985, 988, 990–993 | `control_toggle_pause` — resume + pause branches | A | stub `cli_menu`/`config_manager`; `WIN32_FILTER_PAUSED` both ways | M |
| 1010 | `reset_macro_sequence_by_name` — DEBUG4 print | C | debug-print branch | — |
| 1014 | `reset_macro_sequence_by_name` — DEBUG print | C | debug-print branch | — |
| 1017–1018, 1020–1021, 1023, 1024 | `apply_start_args_by_focus_name` | A | stub `focus_manager`/`arg_manager` | M |
| 1027 | `set_sys_start_arguments` | A | pure | S |
| 1030–1031 | `release_all_currently_pressed_simulated_keys` | A | stub managers | S |

## fst_data_types.py (18 uncovered lines)

| lines | function | class | why / mock needed | effort |
|---|---|---|---|---|
| 42, 47, 51, 55 | `Input_Event` abstract bodies (`__hash__`, `get_key_events`, `_get_sign`, `__eq__` — 4 × `pass`) | C | abstract stubs — unreachable by design | — |
| 124 | `Key_Event.repr_wo_constraints` — `key_string` branch | A | `Key_Event(..., key_string='a')` | S |
| 144 | `Key.is_toggle` (property) | A | pure | S |
| 160 | `Key.__repr__` — `key_string is None` branch | A | `Key(vk)` without key_string | S |
| 181 | `Key_Group.key_events` setter | A | pure | S |
| 190 | `Key_Group.add_key_event` | A | pure | S |
| 223 | `Rebind.alias` (getter) | A | pure | S |
| 236 | `Rebind.trigger_group` setter | A | pure | S |
| 245 | `Rebind.replacement` setter | A | pure | S |
| 248 | `Rebind.get_trigger` | A | pure | S |
| 254 | `Rebind.__hash__` | A | pure | S |
| 288 | `Macro.sequence_counter` (property) | A | pure | S |
| 312 | `Macro.get_trigger` | A | pure | S |
| 357 | `Tap_Group.alias` (getter) | A | pure | S |
| 361 | `Tap_Group.alias` setter | A | pure | S |

## Recommended order for Phase 5 (top blocks by value/effort)

1. **`keyboard_win32_event_filter` body** (fst_keyboard) — closes 519, 520, 522–526, 528–532
   (**12 lines**). The real-key entry point; one fake `msg`/`data` call each for
   WM_KEYDOWN/WM_KEYUP/SYSKEY* reaches all of it. Effort S.
2. **`is_simulated` contradiction block** (fst_keyboard `_win32_event_filter`) — closes 768,
   770–775, 777–778, 780, 782–784, 787–789, 793–794, 797–798, 800, 802–803, 834–835, 837
   (**26 lines**). The anti-contradiction logic for simulated events — highest-risk uncovered
   area; the `_win32_event_filter` test harness from `test_filter_behavior.py` already exists.
   Effort M. (Enabling `CONSTANTS.DEBUG2` in one case also takes 795, 799, 804.)
3. **Constraint-function suite** (fst_manager `constraint_evaluation` closures) — closes 392,
   394, 413–415, 417, 437–439, 441–447, 449, 458, 462, 467–469, 473–478, 481–482, 485–486,
   489–490, 571–572, 575–576, 579–580, 585–586, 589–594, 607–610, 613, 616–618, 621–624,
   626–627 (**62 lines**; the excluded 440/448 are C-class debug prints). One table-driven
   test file through `constraint_evaluation` with `FakeFST`; `tmp_path` for file functions.
   Effort S/M.
4. **`Output_Manager` tail** (fst_manager) — closes 76, 91, 114–119 (5 lines), 139, 145, 148,
   692, 707, 770–771, 777 (**15 lines**): int/None/invalid constraint results,
   delay-length edge cases, horizontal scroll, tap-group async except, `clear_all_variables`.
   Effort S.
5. **`fst_data_types` properties/setters** — closes 124, 144, 160, 181, 190, 223, 236, 245,
   248, 254, 288, 312, 357, 361 (**14 lines**). Pure; leaves the module at 100 % minus the
   4 abstract stubs. Effort S.
6. **Control actions** (fst_keyboard) — closes 952–955, 957–960, 963–968, 973–982, 984–985,
   988, 990–993, 1030–1031 (**33 lines**): `control_return_to_menu`, `control_exit_program`,
   `control_toggle_pause` (both branches), `release_all_currently_pressed_simulated_keys`.
   Stub listeners only. Effort S/M.
7. **Mouse/clipboard/backup constraint functions** (fst_manager, all **class B, 50 lines**) —
   closes 501–504, 506, 509–512, 514, 517–518, 521–522, 525–526, 529–530, 533–534, 537–538,
   541–543, 546–549, 552–557, 559–563, 597–599, 602–604, 630–631, 633–634. Mocks named per
   row in the table. Effort M.
8. **Macro/repeat machinery** — closes fst_keyboard 852, 854–858, 901 (**7 lines**) +
   fst_manager 326, 334–337, 339–340, 343, 365–366, 1694–1698 (**15 lines**) = **22 lines**:
   `start_macro_playback` with a running loop, `is_repeat_active`, `toggle_repeat` restart,
   `stop_all_repeating_keys`. Effort S/M.
9. **Facade wiring** (fst_keyboard) — closes 384–386, 388–390, 393, 396–398, 400, 403–404,
   407, 1017–1018, 1020–1021, 1023, 1024, 1027, 121, 136 (**23 lines**): `apply_focus_groups`,
   `update_focus_groups`, `update_args_and_groups`, `apply_start_args_by_focus_name`,
   `set_loop`, two property getters. Needs the `kb_env`-style real instance with stub managers.
   Effort M.
10. **Start-args remainder + small data holders** — closes fst_manager 1335, 1362, 1392, 1400,
    1421–1422, 1426–1427, 1429–1431, 1444, 1446, 1448, 1296, 1300, 1503, 1512, 1630–1632, 802
    (**22 lines**). Pure arg-parsing and getter/setter lines. Effort S.

Remaining after these ten (all S, mostly one-liners): `display_groups` 1192–1216 (22),
`check_debug_numpad_actions` 935–949 (15), `convert_to_vk_code` numeric branch 144–153 (8),
config exception paths 267–269, 279–281, 338–340 (9), mixed Key rebind 302–303 (2),
`extract_data_from_key` 189, 213–214 (3), rebind `KeyError` 644–645 + constraint-fail 658 +
macro/tap branches 709, 719, 735, 746, 754–755 (9), `_clean_comments` 866 (1),
`flush_the_input_buffer` 1930 (1) — **70 lines**. (Plus the 3 C-class lines 795, 799, 804
that fall out of item 2 with `DEBUG2` on.)

## Totals per class — the ceiling

| class | fst_manager | fst_keyboard | fst_data_types | total | share of 468 |
|---|---|---|---|---|---|
| A (testable now) | 138 | 147 | 14 | **299** | 63.9 % |
| B (more mocking) | 50 | 0 | 0 | **50** | 10.7 % |
| C (deliberately not covered) | 86 | 29 | 4 | **119** | 25.4 % |
| **uncovered** | **274** | **176** | **18** | **468** | 100 % |

C breakdown: 63 debug-print lines (only reachable with a `CONSTANTS.DEBUG*` flag — several
fall out for free from A-tests), 52 dead-code lines (`split_ignore_brackets2` 48,
`get_coordinates` 3, `parse_line` 1), 4 abstract stubs.

If all of A + B were covered: 1749 + 349 = 2098/2217 statements = **94.6 %** for the three
modules (currently 1749/2217 = 79.0 %). Realistic Phase-5 outcome (top-10 blocks + the
remainder, i.e. all of A + B) lands at that ceiling; reaching 100 % would require deleting
the dead code / covering debug prints, which is a maintainer decision, not a test decision.

## Suspected bugs / observations (recorded only — NOT fixed)

1. **`remove_all_toasts()` constraint will crash a real `FST_Keyboard`** —
   `fst_manager.py:579` calls `self._fst.remove_all_callbacks()`, but no production object
   provides that name: `FST_Keyboard.__init__` sets `remove_all_callback` (singular attribute,
   `fst_keyboard.py:64`) and `free_snap_tap.py:193` assigns the same singular attribute.
   The `AttributeError` is *not* caught by the `except NameError` in
   `constraint_evaluation` → it would propagate into the win32 filter hot path. Tests never
   see it because `tests/conftest.py:69` (`FakeFST`) happens to define
   `remove_all_callbacks = MagicMock()`. Suggested fix (for the maintainer): call
   `self._fst.remove_all_callback()` or set the plural attribute in `FST_Keyboard`.
2. **`convert_to_vk_code` returns `None` for out-of-range numeric key strings** —
   `fst_keyboard.py:144–153`: for `key="300"`, `0 <= 300 < 256` is False and the function
   falls off the end → implicit `None` return. The caller
   (`extract_data_from_key`, `fst_keyboard.py:224` `if vk_code <= 0:`) then raises
   `TypeError: '<=' not supported between 'NoneType'` instead of a clean `KeyError` —
   a config typo like `300` produces a confusing crash.
3. **Dead code**: `get_coordinates` (`fst_keyboard.py:481–484`, defined inside
   `mouse_win32_event_filter`, never called) and `split_ignore_brackets2`
   (`fst_manager.py:996–1071`, defined inside `presort_lines`, never called —
   `split_ignore_brackets` is the one in use). Together 51 lines of the C class.
4. **Dead stub**: `Config_Manager.parse_line` (`fst_manager.py:890–891`) — empty `pass`,
   no caller.
5. **Fragile coincidence**: the nested `clear_all_variables` constraint
   (`fst_manager.py:457–458`) calls `self.clear_all_variables()`, which resolves to
   `Output_Manager.clear_all_variables` (line 777) — it works because `self` is the same
   object, but a rename of the method would silently break the constraint.

## Process notes

- The 468-line accounting above was checked line-by-line against the run's
  `--cov-report=json` output (each missing line appears in exactly one table row).
- `coverage.json` / `.coverage` artifacts from these runs are local only — `.gitignore`
  already ignores `.coverage` but **not** `coverage.json`; ask the maintainer before adding
  a `.gitignore` entry.
- No source, test, README/WIKI/`SPEC_FEATURES.md`/`TODO.md`/`AGENTS.md` changes in this
  phase; `FSTconfig.txt` / `FSTconfig_test.txt` untouched.
