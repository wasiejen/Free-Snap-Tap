# WORKER SUMMARY — #47 §3 docs (FINAL — all §3 docs landed)

## What was added (this resume run, written from the prior run's verified notes — NO re-verification)
WIKI.md:
- New `####` sections under [Suffix/Function_Invocation] (after [General key control]):
  - [Function results in general] — the bool=int=None-other result semantics of the
    suffix evaluation (verified notes, `constraint_evaluation`).
  - [Variable system] — integer vars `set`/`is_set`/`get`/`check`/`incr`/`decr`/`clear`/
    `clear_all_variables`, text vars `set_var`/`get_var`, `print_all_variables` — incl.
    the confirmed `check(name, value)` flag (non-int/non-list value → passes True) and
    the in-memory-only note.
  - [Typing] — `type`/`write` (releases modifiers first) + `release_modifier`.
  - [Toasts] — `show_message`/`show_timer`/`remove_toast`/`remove_all_toasts`, documented
    as **requires GUI mode** (headless → error) per flag 1; `immediately` param documented
    as accepted-but-ignored (as-is) per flag 2.
  - [Mouse control] — `scroll_up/down/right/left`, `mouse_move_abs`, `mouse_move`,
    `mouse_get_pos` (also copies to clipboard), `mouse_save_to_var`, `mouse_move_to_var`
    (the one that can evaluate to False).
  - [Mouse keys] — vk 1-7 key strings (left/right/middle mouse + x1/x2 aliases,
    scroll_vertical/scroll_horizontal), wheel-delta phase (multi-notch keeps first notch
    phase), vertical scroll press=one notch up / release=one notch down.
  - [Clipboard] — `copy_to_clipboard` (toast confirm) / `paste`.
  - [File operations] — `save_into_file`/`append_to_file`/`empty_file` (+ relative path
    → program CWD).
  - [Misc] — `cli`/`date`/`date_time`/`get_time`/`make_backup`/`restore_backup`
    (incl. the FileNotFoundError-without-args flag and the GUI toast part)/`clear_console`/
    `is_repeat_active` (labeled evaluation, not invocation).
- New `### [Numpad debug combos]` under Controls — ALT+NUM1..NUM8, only with
  `-debug_numpad`; ALT+NUM6 documented as unassigned/reserved per flag 3.
- [None / empty '' key event for invocations] extended — the vk-0 key strings
  `none`/`NONE`/`_`/`reset`/`delay` (never played, suffixes still evaluated).
- [Start Arguments] — order-of-processing note + `-delay`, `-exec_one_macro`,
  `-debug_numpad`, `-always_active` (incl. blue default-active indicator), `-tray_icon`
  (tray menu items), `-hide_cmd_window`, `-save_dir=`, `-backup_root_dir=`, deprecated
  `-focusapp=` (warning + exit 1).

README.md:
- Feature list item 14 [Extra Start Arguments] — compact top-level list of the same
  extra args + the deprecated `-focusapp=` note.

Chunk 1 (WIKI multi-focus names + multiline `:` continuation, commit `b40a1a7`) NOT
touched — no duplication.

## Measured gate
- `& .\.venv\Scripts\python.exe -m pytest -q` = **436 passed, 1 warning** (the known
  `coroutine ... never awaited` RuntimeWarning in `test_extraction_filter_edges.py`) —
  exact match to the expected baseline.
- `& .\.venv\Scripts\ruff.exe check --select F .` = **0 findings** ("All checks passed!").
- `git diff` scope = README.md, WIKI.md, TODO.md, `.opencode/handover_task_to_planner.md`
  only (docs-only; the pre-existing `.opencode/handover_maintainer.md` modification was
  NOT touched and NOT included in the commit).

## TODO entries touched
- #47 — appended a LANDED status tail (what was added + measured gate); chunk-1 PARTIAL
  tail left untouched. Entry left OPEN for planner curation (no closure performed — the
  spec asked only for the tail).

## Open questions / flags
1. Headless toast crash (toasts need GUI mode) — documented as-is; hardening the code
   remains a maintainer call (out of scope, nothing changed).
2. `remove_toast`/`remove_all_toasts` `immediately` param ignored — documented as-is.
3. ALT+NUM6 unassigned — documented as reserved.
4. `check(name, value)` non-int/non-list value → True — documented.
5. (new, minor) The verified notes did not confirm whether text variables (`set_var`/
   `get_var`) share the same storage dict as the integer variables — I deliberately
   omitted any namespace claim from the docs rather than guess. If the planner wants it
   documented, one line of code check settles it.
6. Horizontal scroll sending direction (press = right? left?) was not in the verified
   notes — documented only the vertical behavior (press=up, release=down), which IS
   pinned by tests.

## Deliberately NOT done
- No production code touched (`fst_manager.py` / `fst_keyboard.py` / `free_snap_tap.py` /
  `vk_codes.py` read-only per the approval boundary).
- §2/§4 sections, README config example, WIKI version header untouched.
- No TODO entry closure/move to todo_records.md (planner curation).
- `.opencode/handover_maintainer.md` (pre-existing working-copy change, not mine) left
  in the working tree, uncommitted.
