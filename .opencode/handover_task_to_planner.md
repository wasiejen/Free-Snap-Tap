# Worker summary — Audit 3b: focus-dict + control-combination hot windows + 3a residual skim

## Findings (TODO.md — written to disk immediately after verification)
- **NEW #44 — Stale/unknown focus name → uncaught KeyError** in
  `apply_focus_groups` (`fst_keyboard.py:386`) / `apply_start_args_by_focus_name`
  (`:1021`): both index `multi_focus_dict[focus_name]` unguarded, and the latter
  reloads the config (`:1018` → dict replaced wholesale, `fst_manager.py:1560-1563`)
  BEFORE the lookup. Uncaught propagation paths verified: win32 hot path
  (`check_control_actions` 925 → `control_toggle_pause` 975-976 — no try/except in
  `_win32_event_filter`), GUI (`fst_overlay.py:210-214` / `:590-591`), CLI menu
  option 2 (`fst_manager.py:1875-1876`). Only `Focus_Task` catches it
  (`fst_tasks.py:106-109`, tested at `test_focus_task.py:214-226`). MAINTAINER CALL
  for the fallback semantics (default groups vs. surfaced error per #1's design).
- **EXTENDED #1 (not a new entry — overlap rule):** `check_for_combination`
  (`fst_keyboard.py:906-912`, hot path `:627`) is a new implicit-None
  consumer site: an unresolvable combo string → `None` vk silently inserted into
  `_real_key_press_states_dict` AND `_all_key_press_states_dict`
  (`fst_manager.py:1604-1609` — `set_real_key_press_state` writes `_all` unguarded).
  Latent today: all four combo keys (alt/end/delete/page_down) verified resolvable
  in `vk_codes_dict`.

## Production windows covered (targeted reads, all spec windows + adjacency)
fst_keyboard.py: 375-434 · 505-536 · 543-670 (incl. hot windows ≈626, ≈915-930) ·
958-1032 (incl. ≈976-985 + `apply_start_args_by_focus_name`) | fst_manager.py:
1453-1572 (Focus_Group_Manager) · 1250-1320 (CONTROLS_ENABLED 1257/1306) ·
1320-1456 (`apply_start_arguments`, 1373 `-nocontrols`) · 1604-1643 (state getters) ·
1860-1917 (menu reload 1875-1876 + control-text gating 1898-1912) | fst_tasks.py
60-145 (`FOCUS_APP_NAME` assignments 102/124 + the only try/except caller).
Adjacency verified: CONSTANTS combo defs (41-43) + `free_snap_tap.py` STOPPED loop
(115) + `convert` call-site grep (no other guarded lookups anywhere: grep `in ...
multi_focus_dict` / `.get(` on the dict found nothing in prod).

## Test skim (the 16 files 3a budget-skipped)
FULL READ (5, chosen windows-first): test_focus_task (264) · test_focus_group_manager
(182) · test_argument_manager (250) · test_input_state_manager (191) ·
test_cli_menu (183). Result: clean — no pinned-suspicious behavior, no stale
comments, no coverage holes vs. windows (1)/(2) beyond what #43/#42/#41/#1/#9
already record (`reset_states_dicts` resets `_all` too — 1792-1796 verified;
`-hide_cmd_window` prefix `[:16]` correct + pinned at test:236).
STRUCTURAL COVERAGE (remaining 11: big_config, config_parse, console_helpers,
crosshair, data_types, gui_manager, gui_smoke, macro_repeat_task,
save_file_handler, status_overlay, tray_icon): full def/class map per file +
smell sweep (`TODO|FIXME|XXX|HACK|workaround|deprecated|legacy|noqa` in all
`tests/*` = ZERO hits) + windows-symbol greps (`FOCUS_APP_NAME`,
`control_toggle_pause`, `CONTROLS_ENABLED`, `multi_focus_dict`) + helper-dup
check (`def kb_env|build|down|up|hold_keys|mock_control_handlers` in test files =
EXACTLY the six #43 files — no duplication from the skim remainder). Their window-
adjacent tests assert only mock-delegation wiring (e.g. `test_cli_menu.py:75-76`),
confirming the #44 gap: no test exercises an absent focus name anywhere.

## Not TODO-ified (and why)
- `check_for_combination` empty-list vacuous truth (returns True for `[]`) — the
  three CONSTANTS combos are non-empty today and never reassigned empty: unreachable
  = #6-class dead-path, not a concrete defect.
- `control_exit_program`'s commented-out `exit()` (fst_keyboard.py:969-970) — program
  exit IS reached via the `STOPPED` flag (free_snap_tap.py:115 loop) and menu option 4
  (`fst_manager.py:1892` `exit()`, pinned by `test_cli_menu.py:110-116`); name/behavior
  consistent; the commented line is maintainer live-test state (same class as #11's
  XXX pin — not a clear defect).
- `-crossover` out-of-range message says `0<prob<=100` but code accepts 0
  (`0 <= probability <= 100`, fst_manager.py:1409) — message-only; `=0` behavior is
  pinned by test_argument_manager.py:78-79; cosmetic.
- GUI Toggle Pause reachable while CONTROLS_ENABLED=False (fst_overlay 210-214/590-591) —
  plausibly intentional (GUI as the ALT+DEL alternative); semantics call, not a defect.
- `reset_global_variable_changes` deliberately does not reset
  WIN32_FILTER_PAUSED/MANUAL_PAUSED/STOPPED/PRINT_VK_CODES (runtime state; pattern
  documented by the 1285-1286 comment); start-arg flags are re-applied per focus change.
- Performance (rule 6, not TODO): full `load_config()` file read on every
  `update_focus_groups()` call (per focus change AND every resume), plus combo vk
  conversion re-parsing each string entry per key event.
- `Focus_Group_Manager.default_start_arguments`/`default_group_lines` property
  comments claim "Return a copy to prevent external modification" but return the live
  list (fst_manager.py:1497/1506) — no production caller mutates them (only list
  concatenation at fst_keyboard.py:389/1024); comment-only hazard.

## Deviations (every rule bent — honesty > appearance)
1. Skimmed 16 files: 5 full reads, 11 structurally-covered only — the 85% stop line
   hit mid-run (measured CTX 102091 (85%) after the full reads); full-read targets were
   windows-first. Mitigation: zero-hit smell sweep + exact def-map + windows-symbol
   greps over all 16 (documented above); no unverified smell survived the sweep.
2. TODO re-read before commit done as the TARGETED `rg "^## 1\. |^## 4[234]\." TODO.md`
   (DoD-2 permits) — #1/#42/#43/#44 headers confirmed on disk.
3. Zero code edits (findings only — edit allow-list respected: `TODO.md` only).
4. Self-correction inside #44: initial overlay refs (`587-605`) replaced by
   grep-verified `210-214`/`590-591` before commit.

## Verification (measured, verbatim)
- `& .\.venv\Scripts\python.exe -m pytest -q` → `434 passed, 1 warning in 2.14s`
  (baseline 434/434 ✓ — warning = known awaited-coro logger path, test_extraction_filter_edges)
- `& .\.venv\Scripts\ruff.exe check --select F .` → `All checks passed!` (0 findings ✓)
- `rg "^## 1\. |^## 4[234]\." TODO.md` → `## 1.` / `## 42.` / `## 43.` / `## 44.` headers present

## Commit
`TODO.md` (new #44 + #1 evidence extension) + this summary in one commit (no push).
Subject: "Audit 3b: focus-dict + combos hot windows + 3a skim — TODO #44, extend #1 (findings only)".
HASH: `<filled in the follow-up commit — see git log, top commit = this run>`

## Final gauge (verbatim — actually run)
SESSION=ses_f75f08a56ffe4ji6i08BcpsWwm CTX=102091 (85%) REM=17909
