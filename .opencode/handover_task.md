# TASK — P08: ConfigError surfacing (TODO #44 + the #1 family)

FIRST read `AGENTS.md`, `agents_repo.md`, and this file. The approved design is
`.opencode/proposals/approved/P08_configerror-design.md` — read it; this spec
restates it with VERIFIED current code facts (newer than the proposal).

## Goal
Config-origin failures (stale/absent focus group names, unresolvable key strings)
become a typed `ConfigError` that is raised at the origin and dies at a
user-facing boundary with a helpful "where in YOUR config" message — never an
uncaught crash, never a silent `None`. Approved incl. **degrade-to-defaults**
semantics (maintainer moved the design to approved/).

## Verified code facts (2026-09-10, iteration 5 — line numbers from current HEAD)
### Raise sites (config-origin failures, same failures now typed)
1. `fst_keyboard.py:386` `apply_focus_groups` —
   `self._focus_manager.multi_focus_dict[focus_name]` (only reached for
   `focus_name != ''`) → raise `ConfigError` with a reason telling the user the
   focus group was renamed/removed in the config.
2. `fst_keyboard.py:1021` `apply_start_args_by_focus_name` — same dict index,
   reached AFTER `self.update_focus_groups()` (`:1018`, full config reload that
   replaces the dict wholesale) — this is the #44 core: the reload happens BEFORE
   the lookup, so a config edit between focus matches makes the name stale.
3. `fst_keyboard.py:138-153` `convert_to_vk_code` — TWO failure modes:
   - out-of-range numeric string (e.g. `'300'`, `'256'`): int OK but not
     `0 <= n < 256` → falls through → **implicit `None`** → caller crash
     (`extract_data_from_key` :224 `vk_code <= 0` on None = TypeError — the #1
     crash);
   - unresolvable non-numeric string (e.g. `'zz'`): currently `print(error);
     raise KeyError` (bare, no arg) at :151-153.
   BOTH become `ConfigError` (reason = the key string does not resolve to a vk
   code). Valid paths unchanged: `vk_codes_dict` hit; numeric 0-255 → int.
   Call sites of `convert_to_vk_code`: `fst_keyboard.py:221` (extract_data_from_key,
   config parse), `:276` (tap-group parse), `:910` (`check_for_combination`,
   HOT PATH), `fst_manager.py:171` (`constraint_evaluation`, runtime — from
   `macro_task` :891 AND the hot path at :561/:655).

### Type-preservation interaction (verified — NOT in the proposal)
`initialize_groups_from_presorted_lines` wraps EACH parse block (aliases ≈:263-269,
tap groups :272-281, rebinds ≈:284ff, macros after) in
`try/except Exception: print(f"ERROR: {error} \n -> in <block>: {group}");
raise Exception(error)` — that strips the `ConfigError` type. Add
`except ConfigError: <same context print>; raise` BEFORE the generic
`except Exception` in each block so the type survives to the top-level catch
while keeping the useful "in <block>" context line.

### Already-safe paths (verified — NO change needed)
- `macro_task` (`fst_keyboard.py:886-901`): `except Exception:
  logger.exception` — a ConfigError from constraint evaluation during macro
  playback is caught + logged, the listener survives (separate asyncio task).
- `Focus_Task` (`fst_tasks.py:106-114`): `except Exception` → prints
  "reloading of groups files failed - not resumed, still paused" — degrades
  correctly as-is.

### Catch sites (the exception travels up and dies here, user-visible)
1. **Top-level startup** — `free_snap_tap.py:154-156` (`update_args_and_groups
   (startup=True)` is unguarded): `except ConfigError: print; sys.exit(1)`.
   (`free_snap_tap.py:134` passes `focus_name=''` — cannot raise — no change.)
2. **win32 hot path** — `_win32_event_filter` (`fst_keyboard.py:534`): an
   exception in this callback kills the pynput hook thread = SILENT listener
   death. Two sub-sites:
   - `check_for_combination` (:906-912) — guard the per-vk_code conversion:
     `except ConfigError` → printed warning (NOT per-keystroke spam — e.g. once
     per bad string) + treat the combination as NOT active (return False);
   - `control_toggle_pause` (:972-985 resume branch) is reached via
     `check_control_actions` :925 — guard at the CALLER side in the hot path:
     on ConfigError → printed error + **degrade to defaults**
     (`update_args_and_groups('')`) + the filter must end up RUNNING
     (`WIN32_FILTER_PAUSED=False`, `MANUAL_PAUSED=False` — otherwise the
     listener stays paused = degraded to nothing).
   Do NOT catch inside `control_toggle_pause` itself — the GUI wants to toast
   (see 4), so the catch lives at the boundary.
3. **CLI menu** — `display_menu` option '2' (`fst_manager.py:1884-1887`,
   "Reload everything from file" calls `apply_start_args_by_focus_name` +
   `apply_focus_groups` with `FOCUS_APP_NAME` directly, unguarded): guard →
   printed error + the menu loop CONTINUES (no break, next input still
   processed).
4. **GUI** — four thin overlay handlers, each `except ConfigError: toast the
   message` (no re-raise): StatusOverlay `toggle_pause` (`fst_overlay.py:210-211`)
   + `reload_from_file` (`:207-208`); TrayIcon toggle (`:591`) +
   `reload_from_file` (`:606-607`). Toast mechanism: `self._fst.toast_callback`
   (`fst_keyboard.py:61` init, set to `bridge.trigger_toast` in GUI mode —
   `free_snap_tap.py:190`; pattern cf. `Output_Manager.show_message`,
   `fst_manager.py:565-566`). Overlay handlers only run in GUI mode, so the
   callback is set there. In tests, stub it on the test double if absent.

### `ConfigError` definition
`fst_data_types.py` (pure data model, no I/O — correct home; `fst_keyboard.py`
and `fst_manager.py` already import from it, no circular import):
`class ConfigError(Exception)` storing `.reason` + `.context`;
`str()` = `FST config error: <reason> (<context>)`.

### Old-behavior test pins that MUST be updated
- `tests/test_extraction_filter_edges.py:31-34`
  `test_out_of_range_numeric_string_falls_to_implicit_none`
  (`convert_to_vk_code('300') is None`) → now raises ConfigError (rename the
  test to match the new behavior).
- `tests/test_extraction_filter_edges.py:36-39`
  `test_unknown_non_numeric_key_raises_key_error` (`'zz'` → KeyError) → now
  raises ConfigError.
- `tests/conftest.py:28-29` — the FakeFST `convert_to_vk_code` helper ("same
  semantics as FST_Keyboard.convert_to_vk_code") → mirror the new semantics.
- `TestConfigExceptionPaths` (:59-73) still passes via `pytest.raises(Exception)`;
  optionally tighten the tap/rebind ones to expect ConfigError (type survives
  after your parse-block change). The alias test (`match='Alias'`) is a
  DIFFERENT failure (alias KeyError, :245) — leave it.

## Scope (non-exhaustive)
- `fst_data_types.py` (ConfigError), `fst_keyboard.py` (raise sites +
  parse-block type preservation + `check_for_combination` guard + hot-path
  degrade), `fst_manager.py` (CLI menu option 2 guard), `fst_overlay.py`
  (4 GUI handler guards), `free_snap_tap.py` (startup guard).
- `tests/`: update the 2 old pins + conftest helper; NEW tests at least for:
  (a) `apply_focus_groups('absent')` / `apply_start_args_by_focus_name('absent')`
  raise ConfigError with the reason; (b) HOT PATH SURVIVAL — stale
  `FOCUS_APP_NAME` + firing the TOGGLE_ON_OFF combination → no exception escapes
  the filter, a SUBSEQUENT key event is still processed (listener alive), message
  printed, groups degraded to defaults, filter running/unpaused; (c) CLI menu
  option 2 prints + loop continues; (d) each GUI handler toasts + does not raise
  (stub `side_effect=ConfigError` on the fst double); (e) `check_for_combination`
  with an unresolvable vk string returns False + warns, does not raise.
- `TODO.md`: append a status tail to entry 44 (LANDED + commit hash; the
  degrade-to-defaults semantics were approved via the P08 approval — if you
  believe a maintainer re-review is still wanted, say so in the summary instead
  of closing).
- `.opencode/handover_task_to_planner.md`: your EXECUTIVE SUMMARY.
- Meta files (`agents_repo.md`, prompt files) READ-ONLY — flag in the summary.

## Definition of done
1. `ConfigError` in `fst_data_types.py` with `.reason`/`.context` + the `str()`
   format above; all raise sites raise it (both focus-name sites, both
   `convert_to_vk_code` failure modes).
2. No implicit `None` and no bare `raise KeyError` left in
   `convert_to_vk_code`; valid paths byte-identical in behavior.
3. Parse blocks preserve the ConfigError type (except-before-exception) while
   keeping their context prints.
4. All five boundary classes from the Catch-sites section behave as specified —
   the invariants are: listener survives EVERY config-origin failure and, where
   the design degrades, degrades to default groups AND keeps running; the CLI
   menu loop continues; GUI toasts instead of raising; startup prints + exits.
5. Old-behavior pins updated (2 tests + conftest helper); new tests for paths
   (a)-(e) land and pass.
6. Gate green: `& .\.venv\Scripts\python.exe -m pytest -q` = 436 + your new
   tests (report the exact count; 1 known #10 warning);
   `& .\.venv\Scripts\ruff.exe check --select F .` = 0 findings.
7. ONE commit: production + tests + TODO tail + summary. NEVER stage
   `opencode.jsonc` (modified by design — leave it).
8. Final gauge line verbatim from `node .opencode\ctxgauge\peek.mjs` at the end
   of the summary.

## Protocol
- venv-only python/ruff (bare `python` = 3.14 without repo deps); pwsh for the
  gate, git-bash only for true unix pipes.
- Verify each line number against the live code before editing (the facts above
  are from HEAD, but the file moves under you if you edit the same file
  repeatedly — re-grep the symbol).
- The hot-path survival test (b) is the heart of the task — use the existing
  `kb_env` fixtures (`tests/kb_helpers.py`), never live listeners.
- Stop line: `REM ≤ 15k` or usage `≥ 85 %` → stop at a clean committed point,
  finish the summary. Check the gauge between chunks.
- NEVER parallel-edit the same file (sequential edits only).
- If you find a config-origin failure site beyond the ones listed, report it in
  the summary (with evidence) — do not silently expand scope.
