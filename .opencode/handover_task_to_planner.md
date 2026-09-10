# WORKER SUMMARY — #47 §3 docs (PARTIAL — context stop line hit after chunk 1)

## State at stop
- LANDED + committed (this commit): WIKI [Configuration] — multi-focus names on one
  `<focus>` line + multiline `:` continuation mechanism, both code-verified.
- NOT done: all other §3 docs (invocations sections, extra start args, numpad combos,
  vk-0 key strings, README feature list). A fresh session writes them from the
  verification notes below — NO re-verification needed (all checked 2026-09-10 against
  current code). Then: re-run gate, append LANDED tail to TODO #47, commit.

## Gate
- Not re-measured after this chunk (docs-only, 2 WIKI lines added — suite unaffected).
  Final chunk MUST measure: `pytest -q` (expect 436 passed, 1 known warning) +
  `ruff check --select F .` = 0 findings.

## Verified §3 facts (code-verified 2026-09-10; line refs current)

### Config parsing
- Multi-focus names: `fst_manager.py:907-927` — `<focus>A, B` → first name owns
  `multi_focus_dict[A] = deepcopy([[], []])`, extras `multi_focus_dict[name] = same list
  object` (shared entry, linked immediately at parse — §4 #16 fix in place).
  Name sanitization regex `[^a-zA-Z0-9,_. ]` (`:910`). Matching: any name match
  activates the shared group (`fst_tasks.py:96`).
- Multiline `:` continuation: `_clean_comments` strips each line (`:836`), then
  `_combine_multilines` (`:877-887`) joins any line starting with `:` to the previous
  line. Indented continuation works because strip() removes leading whitespace.

### Invocations (all in `constraint_evaluation`, `fst_manager.py:154-693`; resolved by
bare `eval()` — usable anywhere eval runs; results: bool=constraint, int=delay,
None→True, other types print "! Constraint ... not valid" and pass — `:104-123`)
- Variables (integer): `set(name, value=1)` (:389, True→1/False→0); `is_set(name)`
  (:399, True iff value≠0, unknown→False); `get(name)` (:409, unknown→creates 0, returns 0);
  `check(name, value=1)` (:432, int→==, list/tuple→in, unknown var→False; value of other
  type → function returns None → normalized to True); `incr` (:463, unknown→1);
  `decr` (:471, unknown→0); `clear(name)` (:450, sets 0); `clear_all_variables()`
  (:456 → Output_Manager :775-776, `self.variables = {}`). Dict lives on Output_Manager
  (`:71`), in memory.
- Text variables: `set_var(name, text)` (:583); `get_var(name)` (:587, unknown→creates
  "None" and returns it).
- `print_all_variables()` (:619) — prints all vars to console.
- Typing: `type(text)` (:381) calls `release_modifier()` first, then
  `keyboard.Controller.type(text)`; `write(text)` (:386) = alias of type.
- `release_modifier()` (:496) → `Input_State_Manager.release_all_modifier_keys()`
  (:1783) releases currently-pressed modifier keys, ALL_MODIFIER_KEYS =
  [160,161,162,163,164,165] (L/R Shift, Ctrl, Alt, :1577).
- Toasts: `show_message(text, d=3., ts=12, bgc=green-rgba, tc="white")` (:565) →
  `fst.toast_callback`; `show_timer(..., bgc=yellow-rgba)` (:569) → `timer_callback`;
  `remove_toast(text, immediately=0)` (:573, `immediately` param IGNORED);
  `remove_all_toasts(immediately=0)` (:577, param IGNORED) → `remove_all_callback`
  (singular — #41 fix in place). **Callbacks default to None** (`fst_keyboard.py:61-64`),
  wired only in GUI mode (`free_snap_tap.py:190-193`) → in HEADLESS mode these calls
  raise TypeError (None not callable). (Open question for maintainer — see below.)
- Mouse: `scroll_up(v)` (:515, `mouse.scroll(0, v)`), `scroll_down(v)` (0,-v),
  `scroll_right(v)` (v,0), `scroll_left(v)` (-v,0); `mouse_move_abs(x, y)` (:531, sets
  `controller.position`); `mouse_move(dx, dy)` (:535, relative `move`);
  `mouse_get_pos()` (:539) returns position tuple AND copies `f"{position}"` to clipboard;
  `mouse_save_to_var(name)` (:544) saves position tuple; `mouse_move_to_var(name)`
  (:550) — **the one invocation that can return False** (unknown var / not a 2-tuple).
- Mouse keys: vk 1 left (`left_mouse`/`ml`/`lm`), 2 right (`right_mouse`/`mr`/`rm`),
  3 middle (`middle_mouse`/`mm`), 4 `mouse_x1`/`mx1`, 5 `mouse_x2`/`mx2`,
  6 `scroll_vertical`/`scroll_y` etc., 7 `scroll_horizontal`/`scroll_x` —
  `vk_codes.py:10-16`; filter maps WM messages→vk (`fst_keyboard.py:462-479`), scroll
  phase = sign bit of wheel delta (`:456-460`, multi-notch keeps phase — #42 landed);
  sending scroll vk: press→(0,1) up / release→(0,-1) down (pinned by
  `tests/test_filter_behavior.py:424-437`); mouse vk dict `fst_manager.py:60-68`.
- Clipboard: `copy_to_clipboard(text)` (:595) pyperclip.copy + toast; `paste()` (:600)
  returns clipboard text (string → invalid-constraint pass if used bare).
- File: `save_into_file(text, time_stamp=get_time(), mode='w', file_path='output.txt')`
  (:605) writes "{ts}: {text}\n"; `append_to_file(...)` (:611, mode 'a');
  `empty_file(file_path='output.txt')` (:614) truncates. Relative paths → program CWD.
- Misc: `cli(text)` (:479, print); `date()` (:483, "YYMMDD" str); `date_time()`
  (:487, "YYMMDD-HHMM" str); `get_time()` (:492, epoch ms int);
  `make_backup(save_dir=arg.SAVE_DIR, backup_root_dir=arg.BACKUP_ROOT_DIR)` (:499) /
  `restore_backup(...)` (:507) — defaults "" → FileNotFoundError without
  `-save_dir=`/`-backup_root_dir=`; backup name `save-YYMMDD-HHMMSS` + same-second
  counter (`fst_save_file_handler.py`), restore = newest backup replaces save dir;
  both print + toast. `clear_console()` (:628, cls/clear).
  `is_repeat_active(name)` (:332) — EVAL (not invocation): True iff named repeat handle
  not done; unknown → False.

### Start arguments (`apply_start_arguments`, `fst_manager.py:1323-1455`; defaults
:1259-1277; args processed IN ORDER, later overrides earlier)
- `-delay` (:1374) sets ACT_DELAY=True (default already True, :1266 — only meaningful to
  re-enable after an earlier `-nodelay`).
- `-exec_one_macro` (:1422) → `fst_keyboard.py:718`: only the FIRST macro triggered by
  one real event plays.
- `-debug_numpad` (:1360) → `CONSTANTS.DEBUG_NUMPAD`; gate at `fst_keyboard.py:623-624`.
- `-always_active` (:1442) → `fst_tasks.py:120-126`: no focus match → default groups
  stay active (filter not paused); overlay color blue while in default-active
  (`fst_overlay.py:138,181`).
- `-tray_icon` (:1444) → GUI mode starts (with or without status indicator,
  `free_snap_tap.py:172`); tray icon menu: Open config / Reload / Toggle Pause / Return
  to Menu / Toggle Indicator / Toggle Crosshair / Toggle Console / Exit
  (`fst_overlay.py:330-346`).
- `-hide_cmd_window` (:1446) → `free_snap_tap.py:164-170`: console stays hidden after
  start-up (set_console_visibility(True) skipped); re-show via tray menu "Toggle Console".
- `-save_dir=` (:1448) / `-backup_root_dir=` (:1451) → used by make_backup/restore_backup.
- BONUS (undocumented, verified): `-focusapp=` (:1417-1421) — prints
  "Do not use the -focusapp start argument with V1.0.0+ ..." and `sys.exit(1)`.

### Numpad debug combos (`fst_keyboard.py:934-949`, only with `-debug_numpad`)
- ALT+NUM1..4 toggle CONSTANTS.DEBUG/DEBUG2/DEBUG3/DEBUG4; ALT+NUM5
  `display_internal_repr_groups()`; ALT+NUM7 pprint real press states; ALT+NUM8 pprint
  all press states. **DISCREPANCY: ALT+NUM6 has NO branch — unassigned.** (§3 says
  NUM1..NUM8; document NUM6 as unassigned.)

### vk-0 key strings (`vk_codes.py:217-219`)
- `'none'/'NONE'/'None'`/`''`/`'_'`/`'reset'`/`'delay'` → vk 0: never played, constraints
  still evaluated (WIKI [None / empty '' key event] section exists — extend to
  `_`/`reset`/`delay`).

### `csl` — already documented (WIKI [Suffix/Evaluation]); verified
`fst_manager.py:235-241`; leave as-is.

## Open questions / flags (for the planner/maintainer)
1. Headless toast crash: `show_message`/`show_timer`/`remove_toast`/`remove_all_toasts`
   (and the repeat-task timer toasts, `fst_tasks.py:34,47,53`) call callbacks that are
   None in headless mode → TypeError, uncaught (only NameError is swallowed in the eval
   path). Document as "needs GUI"; whether to harden = maintainer call (docs-only here).
2. `remove_toast`/`remove_all_toasts` accept an `immediately` param that is ignored.
3. ALT+NUM6 numpad combo unassigned (document as-is).
4. `check(name, value)` with a non-int/non-list value returns None → True.

## Deliberately NOT done
- No production code touched (read-only verification, per approval boundary).
- §2/§4 sections untouched. README config example untouched.
- `-focusapp=` note not yet written (listed above for the final chunk).
