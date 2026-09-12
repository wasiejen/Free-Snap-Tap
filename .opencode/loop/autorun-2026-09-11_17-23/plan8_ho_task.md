# TASK — FST unit A: vk-error surfacing at every resolution site (TODO #1, approved Rec 1)

FIRST read `AGENTS.md`, `agents_repo.md` (+ repo parts: commands, testgate), this file,
`TODO.md` entry #1, and the approved design
`.opencode/proposals/implemented/P08_configerror-design.md`.

Branch: work on `fst_work` (`git checkout fst_work` first; it is current with
`opencode_test`). Commit on `fst_work`.

## Goal
Unknown / unresolvable key strings must surface as a USER-VISIBLE error at every
vk-resolution site — never console-only. The constraint fail-closed path must REUSE
the same surfacing as the other sites. Fail-closed semantics (the constraint evaluates
unfulfilled, the listener survives) are preserved.

## Verified current state (planner facts, measured 2026-09-12 — do not re-derive)
- `FST_Keyboard.convert_to_vk_code` (fst_keyboard.py:140-155) already RAISES
  ConfigError in both failure branches (out-of-range numeric, unknown non-numeric).
- Group-init sites (alias ≈269, tap ≈284, rebind ≈346, macro ≈380 in
  `initialize_groups_from_presorted_lines`) catch ConfigError → print + re-raise;
  boundary catches exist and are done — CLI top level (free_snap_tap.py:159 print),
  GUI toasts (fst_overlay.py:212/218/601/620), CLI-menu reload
  (fst_manager.py:1893 print + continue). DO NOT rework these.
- `check_for_combination` (fst_keyboard.py:926-938) catches ConfigError, deduped
  print warning (`self._warned_config_errors`), returns False; listener survives.
- THE GAP — the two constraint fail-closed guards in
  `Output_Manager.constraint_evaluation` are console-only:
  - short-eval branch fst_manager.py:648-658 (`except Exception: print(error); return False`)
  - eval branch fst_manager.py:676-679 (`except ConfigError: print(error); return False`)
  In GUI mode (no visible console) the user sees nothing.
- Surfacing primitive: `FST_Keyboard.toast_callback` (fst_keyboard.py:63) — None in
  headless, `bridge.trigger_toast` in GUI (wired at free_snap_tap.py:195). P08
  error-toast style used by the GUI handlers:
  `toast_callback(str(error), 5, 12, "rgba(200, 40, 40, 200)", "white")`.
- Pinned today: `tests/test_config_error.py` — `TestConstraintEvalConfigError`
  (eval branch, capsys print assert), `TestCheckForCombinationConfigError`
  (deduped print). `tests/conftest.py` `fake_fst` / `kb_env` give a
  `toast_callback` MagicMock (GUI-mode stand-in).

## Changes
1. ONE shared ConfigError surfacing helper on `FST_Keyboard`
   (e.g. `surface_config_error(error)`, name/placement your call): if
   `self.toast_callback` is set → call it with the P08 error-toast style and a
   `[FST] `-prefixed message; else `print(f"[FST] {error}")`.
2. Route BOTH constraint guards through the helper before `return False`
   (fail-closed unchanged). In the short-eval `except Exception` handler, route
   only `ConfigError` instances through the helper; keep the plain print for any
   other unexpected exception (defensive).
3. Route `check_for_combination`'s warning (fst_keyboard.py:932-936) through the
   same helper, KEEPING the `_warned_config_errors` dedup (surface at most once per
   bad string).
4. Audit: grep every `convert_to_vk_code` call site and every
   `except ConfigError` site in `fst_keyboard.py` / `fst_manager.py`; any remaining
   catch that only console-prints a vk-resolution error → route through the helper.
   List in your summary any site you judged out of scope and why.

## Definition of done
- Unknown key in a constraint (BOTH branches) → user-visible error (GUI: toast via
  the helper; headless: print) and the constraint returns False (fail-closed).
- `check_for_combination` with an unresolvable string → surfaced via the helper,
  deduped, returns False.
- Tests updated/new in `tests/test_config_error.py` (or a sibling): (a) GUI-mode —
  the constraint path calls `toast_callback` once with the ConfigError message
  (both branches); (b) headless — `toast_callback = None` → the print fallback
  fires (replaces the old capsys-only pin); (c) check_for_combination dedup still
  holds with the helper (second occurrence surfaces nothing).
- Gates: pytest green — baseline **451 passed + 1 known #10 warning** plus your new
  tests; ruff `check --select F .` = 0 findings.
- Commit on `fst_work`: code + tests + the `TODO.md` #1 status line updated (the
  entry stays — its residual is closed by this build; mark it accordingly) +
  `handover_task_to_planner.md` executive summary.

## DO NOT touch
- The `###XXX 241022-1341` block in `initialize_groups_from_presorted_lines`
  (mixed-Key rebind conversion — maintainer keeps it until he tests more).
- The `XXX 241016-1101` contradiction-prevention block (fst_keyboard.py ≈791 —
  maintainer's LIVE test marker, TODO #11 HOLDING).
- The NameError silent no-op branch in `constraint_evaluation` (unknown constraint
  NAMES stay silent by design — SPEC_FEATURES.md §4 #2).
- `playground/`, `opencode.jsonc`, `AGENTS.md`, `proposals/`, the live prompts,
  `COVERAGE_TRIAGE.md`.
- No live listeners — mocked `kb_env` / `fake_fst` patterns only
  (tests/conftest.py). `opencode.jsonc` is never staged.

Worker: worker_Q4_120K. This is an approved observable-behavior change (maintainer
ruling in `.opencode/proposals/approved/2026-09-11_fst-behavior-batch-decisions.md`
Rec 1) — no further approval needed.
