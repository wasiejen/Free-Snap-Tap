# TASK — #47 docs: §3 features (RESUME — write from the verified notes, NO re-verification)

FIRST read `AGENTS.md`, `agents_repo.md`, this file, and — CRITICALLY — the
`.opencode/handover_task_to_planner.md` from the PREVIOUS (partial) #47 run, whose
`## Verified §3 facts` block (lines ≈16-123) holds every §3 feature already
code-verified against the current code (2026-09-10). Read that block BEFORE you
overwrite the summary file.

## Goal
Finish TODO #47: document the §3 "Implemented but NOT documented" features in
README.md / WIKI.md at the same quality bar as the landed §2 + §4 rework.

## IMPORTANT — this is a RESUME, do not re-verify
The prior run (chunk 1, commit `b40a1a7`) already landed the WIKI multi-focus-names +
multiline `:` continuation docs. Everything else in §3 was code-verified and the
per-feature notes are in the summary's `## Verified §3 facts` block. Your job is to
WRITE the docs from those notes — do NOT re-read/re-verify the production code for
each feature (that is what made the first run stop early). Trust the notes; they cite
current line refs. If a note looks internally contradictory, write the confirmed
behavior and flag it in your summary.

## What to write (from the verified notes)
WIKI (per-feature how-to detail, following the existing WIKI structure/notation):
- Invocations section: variables (`set`/`is_set`/`get`/`check`/`incr`/`decr`/`clear`/
  `clear_all_variables`), text variables (`set_var`/`get_var`), `print_all_variables`;
  typing `type`/`write` (+ `release_modifier`); toasts `show_message`/`show_timer`/
  `remove_toast`/`remove_all_toasts`; mouse `scroll_up/down/right/left`,
  `mouse_move_abs`, `mouse_move`, `mouse_get_pos`, `mouse_save_to_var`,
  `mouse_move_to_var`; mouse button keys (vk 1-5) + scroll keys (6-7); clipboard
  `copy_to_clipboard`/`paste`; file `save_into_file`/`append_to_file`/`empty_file`;
  misc `cli`/`date`/`date_time`/`get_time`/`make_backup`/`restore_backup`/
  `clear_console`/`is_repeat_active`.
- Numpad debug combos (ALT+NUM1..NUM8) — only with `-debug_numpad`.
- vk-0 key strings: extend the existing WIKI [None / empty '' key event] section to
  also cover `_`, `reset`, `delay`, `NONE`, `None`.
README (top-level list / tables, following its existing structure):
- The extra start arguments: `-delay`, `-exec_one_macro`, `-debug_numpad`,
  `-always_active`, `-tray_icon`, `-hide_cmd_window`, `-save_dir=`, `-backup_root_dir=`,
  and the deprecated `-focusapp=` (prints a warning + `sys.exit(1)`).

## The four flags — document as-is (they are confirmed behavior, not defects to fix)
1. Headless toast crash: `show_message`/`show_timer`/`remove_toast`/`remove_all_toasts`
   call callbacks that are `None` outside GUI mode → `TypeError`. Document the toasts
   as "requires GUI mode (status indicator / tray icon)". Do NOT harden the code
   (a maintainer call, out of scope here).
2. `remove_toast`/`remove_all_toasts` accept an `immediately` parameter that is ignored —
   document the signature as-is.
3. ALT+NUM6 numpad combo is UNASSIGNED (there is no branch for it) — document NUM1..NUM8
   with NUM6 noted as unassigned/reserved.
4. `check(name, value)` with a value that is neither int nor list/tuple returns None →
   normalized to True — document it.

## Definition of done
1. All §3 features documented in README/WIKI (the chunk-1 items already landed; do not
   duplicate them).
2. `& .\.venv\Scripts\python.exe -m pytest -q` green (436 passed, 1 known warning).
3. `& .\.venv\Scripts\ruff.exe check --select F .` = 0 findings.
4. `git diff` scope = `README.md`, `WIKI.md`, `TODO.md`,
   `.opencode/handover_task_to_planner.md` ONLY (docs-only).
5. TODO.md: append the LANDED status tail to #47 (what was added this run + the measured
   gate). Do NOT re-open the chunk-1 tail.
6. ONE commit (docs + TODO.md + your summary), message per the AGENTS.md style,
   before your final message.

## Approval boundary
- Docs-only — pre-approved, NOT a maintainer call. No observable behavior change. Do
  not touch `fst_manager.py` / `fst_keyboard.py` / `free_snap_tap.py` / `vk_codes.py`
  (read-only). If a behavior is genuinely ambiguous, document only what the notes
  confirm and note the rest as an open question in your summary.

## Protocol (you are the RAW agent — no worker prompt; this section is the protocol)
- You are the worker for this task. The planner verifies your summary against
  `git log` + the test baseline.
- Read the prior `## Verified §3 facts` block in `.opencode/handover_task_to_planner.md`
  FIRST, then write, then overwrite that file with your FINAL executive summary.
- Write your EXECUTIVE SUMMARY to `.opencode/handover_task_to_planner.md` (overwrite it):
  what was added where, the measured gate (exact pass count), the commit hash, TODO
  entries touched, any open questions, what you deliberately did NOT do.
- Your FINAL MESSAGE must be SHORT: a pointer to the summary file + the VERBATIM output
  of `node .opencode\ctxgauge\peek.mjs` as the last line.
- Stop line: REM ≤ 15k or ≥ 85 % → checkpoint at a clean committed point and stop; a
  fresh session resumes from TODO.md + your summary.

Environment reminders (from agents_repo.md): use `& .\.venv\Scripts\python.exe` /
`& .\.venv\Scripts\ruff.exe` (bare `python` is wrong); shell is PowerShell 7.6; sign
convention is `-key` pressed / `+key` released / `^key` toggle.

Begin.
