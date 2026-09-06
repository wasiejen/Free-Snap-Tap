# SPEC_FEATURES.md — documented vs implemented gap matrix

> **Derived from README/WIKI; verify against code — code is ground truth.**
> Sources cross-checked: `README.md` and `WIKI.md` (both document V1.1.3), against the
> current code (headers say V1.2.0, `last updated: 250724`). Line numbers are as of
> 2026-09-06 and drift as the code changes — re-verify with grep before relying on them.
> Doc problems found while cross-checking are listed in section 4 (per handoff:
> README/WIKI are the maintainer's, not edited by this pass).

## 1. Documented features → where implemented

### Tap Groups (README #1; WIKI `[Tap_Groups]`)
- Parse/classify (incl. optional `(*name*)` prefix): `fst_manager.py:1097-1103` (`presort_lines`).
- Live `Tap_Group` objects built from `tap_groups_hr`: `fst_keyboard.py:272-281`.
- Snap-tap state machine (last-pressed wins, release falls back): `fst_data_types.py:344-398`
  (`update_tap_states` 366-372, `get_key_to_send` 383-398).
- Idealized output (release old / press new, with delay): `fst_manager.py:700-755`
  (`send_keys_for_tap_group`).
- Live evaluation + suppression of the real event: `fst_keyboard.py:717-742`.
- Default delay 2-10 ms / start args `-tapdelay=` / `-nodelay`: `fst_manager.py:1250-1258`,
  `1352-1355`, `1376-1379`.
- Anti-tap-group interference for simulated keys (active-key-only press / other-key-only
  release): `fst_keyboard.py:755-777`.

### Rebinds (README #2; WIKI `[Rebinds]`)
- Parse (trigger : single replacement; multi-key replacement rejected with hint):
  `fst_manager.py:1105-1116`.
- Build, incl. `Key : Key` → two `Key_Event : Key_Event` rebinds and the
  "one Key present → both treated as Keys" rule: `fst_keyboard.py:285-340`
  (`extract_data_from_key` 175-236).
- Trigger match (trigger ke + real-key state constraints + suffix constraints):
  `fst_keyboard.py:542-562` (`is_trigger_activated`).
- Replacement / suppression on match: `fst_keyboard.py:631-656`; the replacement key event is
  sent and the original suppressed at `fst_keyboard.py:744-747`.
- `suppress` / `+suppress`: `SUPPRESS_CODE` `fst_keyboard.py:42`, check `647-648`;
  `'suppress' → -999` in `vk_codes.py:226`.
- "Played immediately, given delays ignored": true — only
  `check_constraint_fulfillment` (no `get_also_delays`) + sync `send_key_event`
  (`fst_manager.py:685-697`), `fst_keyboard.py:651, 746`.
- Named rebinds parsed but alias not stored (`Rebind.alias` stays `''`) — matches the WIKI
  note "(no functionality to it yet)".

### Macros (README #3; WIKI `[Macros]`)
- Parse (single key group): `fst_manager.py:1128-1134`.
- Build (trigger converted with `is_trigger_group=True`, so a `Key` trigger fires only on
  its press): `fst_keyboard.py:343-371`, `238-259`.
- Trigger + firing: `fst_keyboard.py:690-715`; trigger suppression: `749-751`.
- Per-key delays (static / random min-max): suffix ints `fst_keyboard.py:177-193`;
  execution `fst_manager.py:123-149` (`execute_key_event`); default macro delay args
  `-macrodelay=` / `-aliasdelay=` `fst_manager.py:1356-1363`.
- Self-interrupt on retrigger: `start_macro_playback` → `interrupt_macro_by_name`,
  `fst_keyboard.py:836-843`, `855-865`.
- Playback loop (constraints checked per key at start, async with delay): `macro_task`
  `fst_keyboard.py:868-883`.

### Macro Sequences (README #4; WIKI `[Macros/Macro_Sequences]`)
- Parse (`::` + repeated `:` groups, default names `SEQ_n`): `fst_manager.py:1120-1127`;
  multiline continuation (`: c` on indented lines) joined by `_combine_multilines`
  `fst_manager.py:859-869`.
- Cycling + auto-reset after the last group: `fst_data_types.py:294-304`
  (`_get_key_group`, wrap at 300-301); counter accessors 309-312.
- Reset via invocation `|(name)` / `|reset('name')`: `fst_manager.py:656-660`, `369-371`
  (`reset`), applied in `reset_macro_sequence_by_name` `fst_keyboard.py:981-999`;
  sequences tracked in `_macros_alias_dict` / `_macro_sequence_alias_list`
  `fst_keyboard.py:357-358, 381`.

### Delays (README #5; WIKI `[Delays in general]`, `[Suffix/Delays]`)
- `ke|100` (static) / `ke|10|5` (random 5-10): parsed `fst_keyboard.py:177-193`;
  `get_random_delay` swaps min/max `fst_manager.py:86-89`; 1-element lists are duplicated
  (`execute_key_event` 137-138), 2-element used as-is 139-140.
- Delay suppression via `-nodelay`: `fst_manager.py:1376-1379`.

### Focus Apps (README #6/#7; WIKI `[Configuration]`)
- `<focus>` sections, default section before first `<focus>`: `_parse_lines_for_focus_manager`
  `fst_manager.py:874-942`; applied: `update_args_and_groups` / `apply_focus_groups`
  `fst_keyboard.py:395-404`, `383-390`, `1001-1009`.
- Active window polling (substring match via `find`, case-sensitive): `Focus_Task.run`
  `fst_tasks.py:70-163` (match at 109); manager `fst_manager.py:1417-1523`.

### Aliases (README #8; WIKI `[Aliases]`)
- Parse (`<name> key_group` → `alias_hr`): `fst_manager.py:1092-1093`, name extraction
  `919-925`.
- Build: `fst_keyboard.py:263-269`; insertion at position of use
  `convert_key_string_group` `238-259` (241-245).

### Repetition of Aliases (README #9; WIKI `[Repetiton of Aliases]`)
- `toggle_repeat` / `start_repeat` / `stop_repeat` / `reset_repeat`: `fst_manager.py:314-351`,
  `288-301`, `342-351`; task `Macro_Repeat_Task` `fst_tasks.py:15-55`;
  "played immediately on start" = first `start_macro_playback_repeat` before the first wait
  (`fst_tasks.py:36-43`).

### Constraints & Evaluations (README #10; WIKI `[Suffix/Evaluation]`, `[Prefixes]`)
- Suffix parsing (`|...` split; `(eval)` → string constraint; number → int delay):
  `fst_keyboard.py:177-193`.
- Evaluation engine: `constraint_evaluation` `fst_manager.py:152-683`;
  fulfillment loop: `check_constraint_fulfillment` `98-121`;
  trigger-side use: `fst_keyboard.py:556-562, 651`.
- Time/state functions: `tr` 199-203, `ts` 205-209, `ta` 211-215, `cs` 218-230,
  `csl` 233-239, `p` 242-244, `r` 247-248, `ap` 251-253, `ar` 256-257, `last` 260-270,
  `dc` 273-286.
- Python expressions via bare `eval()`: `fst_manager.py:670`.
- Prefixes `-`/`+`/`!` (press/release) and `^` (toggle): `extract_data_from_key`
  `fst_keyboard.py:199-236`; toggle runtime `fst_keyboard.py:671-688`,
  `fst_manager.py:1639-1643`.

### Invocations (README #11; WIKI `[Suffix/Function_Invocation]`, `[General key control]`)
- Named macro/sequence invocation `|(name)`: sequence reset branch `fst_manager.py:656-660`,
  macro-interrupt branch `662-666`.
- Repeat invocations: section above; `stop_all_repeat` `353-365`;
  `release_all_keys` `373-377` → `release_all_currently_pressed_simulated_keys`
  `fst_manager.py:1717-1741` / `fst_keyboard.py:1014-1016`.
- `None` / empty ke (key_strings `None`/`''`/`_`/`reset`/`delay` → vk 0, never played,
  constraints still evaluated): `vk_codes.py:217-219`, `fst_manager.py:123-136`.

### Status Indicator & Crosshair (README #12/#13; WIKI `[Status Indicator]`, `[Crosshair]`)
- Start args `-status_indicator[=size]`, `-crosshair[=dx,dy]`: `fst_manager.py:1387-1401`.
- GUI only starts when enabled at startup (or `-tray_icon`): `free_snap_tap.py:172-203`;
  overlay widgets `fst_overlay.py` (`GUI_Manager` 107-167, `CrosshairOverlay` 350+,
  mouse drag/menu/dbl-click handlers 533-588); tray icon `264+`.

### Controls (WIKI `[Controls]`)
- ALT+DELETE toggle pause / ALT+END stop / ALT+PAGE_DOWN menu: `CONSTANTS` combinations
  `fst_manager.py:41-43` (overridden at startup `free_snap_tap.py:72-74`);
  detection `check_control_actions` `fst_keyboard.py:899-911`; handlers `936-979`.
  Resuming reloads groups from file (`957-961`). `-nocontrols`: `fst_manager.py:1348-1349`.

### Configuration in a single text file (README #7; WIKI `[Configuration]`, `[Start Arguments]`)
- `<arg>` lines (default + per-focus): `fst_manager.py:912-917`; applied `1307-1415`.
- `-file=` custom config: `fst_manager.py:1342-1346`.

## 2. Documented but NOT implemented

- **Tap-group keys in key_event notation** — WIKI `[Tap_Groups]` (line 81):
  "key_event notation `-a, -d` will be interpreted as Keys 'a,d' instead".
  Not true: tap-group init converts each raw string with `convert_to_vk_code`
  (`fst_keyboard.py:274-277`), so `-a` / `a|10` raise `KeyError` at group init. Tap groups
  accept plain key strings only.
- **Per-key delays in Tap Groups** — README #5: "supported for Tap_Groups in general and
  ... on a per key basis". Tap-group keys go through `convert_to_vk_code` directly, so
  `a|10` in a tap group crashes init. Only the global `-tapdelay=`/`-nodelay` args affect
  tap groups. (WIKI itself only documents delays for macros.)
- **`|(name)` interrupting a *playing* macro sequence** — WIKI line 130: "on usage of
  `|(*name of the macro*)` the currently played key sequence will be interrupted and the
  sequence counter will be resetted". Code: for sequences, the invocation only resets the
  counter (`fst_manager.py:656-660` → `reset_macro_sequence_by_name` 981-999, interrupt call
  commented out at 986); it does not cancel the in-flight playback task.
- **Status indicator "can only be used as default argument, not in a focus group"** —
  WIKI line 47. Per-focus `<arg>-status_indicator` is parsed and applied like any other arg
  (`fst_manager.py:912-917`, `1390-1392`), and the overlay polls the current value every
  tick (`fst_overlay.py:153-165`). What is actually default-only: the GUI loop itself only
  starts if it is enabled (or tray icon enabled) at startup (`free_snap_tap.py:172-203`).
- **Crosshair "only works if Status Indicator is used"** — WIKI line 55. The GUI loop also
  starts with `-tray_icon` alone (`free_snap_tap.py:172`), and the tray menu can toggle the
  crosshair (`fst_overlay.py:339-340`).

## 3. Implemented but NOT documented (README/WIKI silent)

- **Multiple focus names on one `<focus>` line** (`<focus>A, B`), shared group dict entry:
  `fst_manager.py:821-831` (parse), `891-908` (dict sharing).
- **Variable system** in eval: `set`/`is_set`/`get`/`check`/`incr`/`decr`/`clear`/
  `clear_all_variables` (`fst_manager.py:387-459, 461-475, 554-559`), text variables
  `set_var`/`get_var` (581-591), `print_all_variables` (617-624).
- **Typing invocations** `type`/`write` (`fst_manager.py:379-385`).
- **Toast invocations** `show_message`/`show_timer`/`remove_toast`/`remove_all_toasts`
  (563-577).
- **Mouse invocations** `scroll_up`/`scroll_down`/`scroll_right`/`scroll_left` (513-527),
  `mouse_move_abs` (529-531), `mouse_move` (533-535), `mouse_get_pos` (537-540),
  `mouse_save_to_var` (542-546), `mouse_move_to_var` (548-560); mouse buttons as rebind/macro
  keys (vk 1-5, scroll 6-7) `fst_manager.py:60-66`, `fst_keyboard.py:423-514`.
- **Clipboard** `copy_to_clipboard`/`paste` (593-601).
- **File invocations** `save_into_file`/`append_to_file`/`empty_file` (603-615).
- **Misc invocations** `cli` (477-479), `date`/`date_time` (481-487), `get_time` (490-492),
  `release_modifier` (494-495), `make_backup`/`restore_backup` as in-config invocations
  (497-511), `clear_console` (626-631), `is_repeat_active` (330-340).
- **Extra start arguments** (all parsed in `apply_start_arguments`): `-delay` (1350-1351),
  `-exec_one_macro` (1385-1386), `-debug_numpad` (1336-1337), `-always_active` (1402-1403),
  `-tray_icon` (1404-1405), `-hide_cmd_window` (1406-1407), `-save_dir=` (1408-1410),
  `-backup_root_dir=` (1411-1413).
- **Numpad debug combos** ALT+NUM1..NUM8 (`fst_keyboard.py:919-934`).
- **Key strings** `reset`/`delay`/`_`/`''`/`None` → vk 0 (`vk_codes.py:217-219`).
- **Multiline sequence continuation lines** (indented `: group`) — README shows it in an
  example (line 175) but never explains the mechanism (`fst_manager.py:859-869`).
- **`csl`** is documented (WIKI line 187) — listed here for completeness only: implemented
  `fst_manager.py:233-239`.

## 4. Discrepancies / unclear behavior — flagged for the maintainer

1. **Toggle key inside a macro playback group is broken.** `macro_task` calls
   `self.output_manager.get_next_toggle_state_key_event(...)` (`fst_keyboard.py:881`) but
   that method only exists on `Input_State_Manager` (`fst_manager.py:1639`). A `^key` in a
   macro's *played* group raises `AttributeError`, caught at `fst_keyboard.py:885-886` —
   the macro aborts silently (log only). The rebind path uses `state_manager` correctly
   (`fst_keyboard.py:676`). **VERIFY** by running a macro with a toggle key.
2. **First-ever `|(macro_name)` invocation of a single macro raises `NameError`.**
   Unknown names fall through to bare `eval()` (`fst_manager.py:669-670`); a single macro
   that never played has no entry in `macro_thread_dict`, so `|(that_macro)` is evaluated as
   a Python name → `NameError`, not caught in the filter path. Only sequence names
   (checked first) and already-started macros are safe. **VERIFY.**
3. **`ta()` (all-events timing) always returns 0.** `set_key_times` maps the `'all'` list to
   `self._time_simulated` instead of `self._time_all` (`fst_keyboard.py` filter writes all
   times at 616/820 → `Input_State_Manager.set_key_times` `fst_manager.py:1770-1776`), so
   `_time_all` stays empty and `ta()`/the `ALL` timing dict never fill. WIKI documents
   `ta("ke")` as working. **VERIFY.**
4. **`Key_Group.get_vk_codes` has a typo** (`key.vk_codes` → `AttributeError` if called,
   `fst_data_types.py:180-181`); currently dead code — only `Tap_Group.get_vk_codes`
   (`fst_data_types.py:374-375`) is used.
5. **WIKI says macros are "played in its own thread"** (line 114) — they are asyncio tasks
   now (`macro_task`, `fst_keyboard.py:868-883`; repeat tasks in `fst_tasks.py`). Doc stale,
   behavior (interruptible, non-blocking) is kept.
6. **`|(name)` semantics differ between macros and sequences** — a macro name interrupts
   playback (`662-666`) but does not reset anything; a sequence name resets the counter
   (`656-660`) but does not interrupt. WIKI line 128/130 attributes both effects to the same
   invocation. See also #1 in section 2.
7. **`|reset('name')` on a non-sequence macro name** only prints
   "No Macro Sequence ... reset failed" (`fst_keyboard.py:996-997`) and returns `True`; the
   macro itself is not interrupted (contrast with `|(name)` which interrupts started macros).
8. **State shorthand constraints (`-ke`/`+ke`/`!ke` as a suffix) use the *all* (real+
   simulated) press state** (`get_all_key_press_state`, `fst_manager.py:645-652`), while
   trigger-state checks use the *real* state (`fst_keyboard.py:552-554`). Also, an unknown
   key string in such a constraint is caught, printed, and treated as *passing*
   (`fst_manager.py:653-654` + `check_constraint_fulfillment` 113-114) — a typo silently
   disables the constraint. **VERIFY** intended scope.
9. **`dc()`'s key-string sign is ignored** — `dc("-ke")` and `dc("+ke")` return the same
   value (the `is_press` of the argument is discarded, `fst_manager.py:279`); what matters is
   the phase of the *current* event. WIKI line 185 is ambiguous here. **VERIFY.**
10. **`p()` sensitivity to the current event**: real press state is updated *before* trigger
    evaluation (`fst_keyboard.py:607`), so `+ke|(p('ke'))` is always False and `-ke|(p('ke'))`
    always True. The sign in `p('-ke')` vs `p('+ke')` is discarded (`fst_manager.py:243`).
    WIKI line 194 does not document this. **VERIFY.**
11. **Invocation placement**: WIKI says invocations work "as suffix in replacement key of
    rebinds or played key groups of macros", but trigger/constraint invocations work too
    (`check_constraint_fulfillment` evaluates them at trigger check, `fst_keyboard.py:556-562`)
    — with left-to-right short-circuit: an invocation after a False eval never runs. **VERIFY**
    which placement is intended as supported.
12. **README doc problems** (not edited, per handoff): title line 1 mixes "Macros (Aliases)"
    while the code treats them separately; "Python 3.6 or higher" (line 219) vs Python 3.12
    venv; "repetition will interrupt inself" (WIKI line 216) and heading "Repetiton" (WIKI
    line 213) typos; README line 150 comment claims the original key is *not* suppressed
    after `|(!)` — which matches the code for rebinds (no match → no suppression) but the
    comment's reasoning ("evaluations in sequence") is not what the code does; README 47 /
    WIKI 4 link to the online Wiki as V1.1.3 while code is V1.2.0.
13. **`None` ke delay**: WIKI line 259 says a `None`/empty ke "will have a default delay
    (###XXX still up for debate)" — code: no default delay for a `None` ke without explicit
    delay (`fst_manager.py:123-136`); manual delays are honored. Matches the "up for debate"
    note.
14. **`suppress` of the *original* event when a rebind replacement's constraints fail** —
    e.g. `a : -b|(p(shift))` without shift held: the rebind *was* matched (`is_trigger_activated`
    already passed on trigger constraints); the replacement check fails → `to_be_suppressed`
    is set (`fst_keyboard.py:651-656`) → the **original** key is suppressed and nothing is
    sent. This "matched but silently eaten" case is undocumented. **VERIFY** intended behavior.
15. **Focus matching is case-sensitive substring** (`str.find`, `fst_tasks.py:109`) — WIKI
    says "part or the full name" but not case behavior; `<focus>` name sanitization strips
    most special chars (`fst_manager.py:902`) while window titles are sanitized separately
    (`fst_tasks.py:90`) — a mismatch there (e.g. a `™` in a game title) silently disables
    that focus group. **VERIFY.**

## 5. VERIFY — semantics NOT yet covered by tests (code as of this commit)

Each item states what the code appears to do; mark for a behavioral test in Phase 2.

### Eval functions

- **`tr("ke")`** (`fst_manager.py:199-203`, template 172-197) — returns int ms.
  Press-string `tr("-ke")` → `time_released[vk]` = idle time before this press
  (ms since last release); release-string `tr("+ke")` → `time_pressed[vk]` = hold duration.
  Returns 0 if the key has no previous event of the required phase. `ts()`/`ta()` are the
  simulated/all variants (`205-215`) — but see section 4 #3 (`ta` never fills).
  `VERIFY`: return values + press vs release sensitivity.
- **`last("ke")`** (`260-270`) — ms since the last *press* of `ke` (real time list by
  default); `last("+ke")` → ms since last *release*. Returns 0 on no prior event.
  "Now" = `int(time()*1000) - FST_Keyboard.TIME_DIFF` (267) → depends on wall clock;
  test with `freezegun`. `VERIFY`.
- **`p("key")`** (`242-244`) — bool: current *real* press state from
  `get_real_key_press_state` (`1564-1569`, unknown key → auto-set False, returns False).
  Sign of the argument is ignored. Evaluated after the current event already updated the
  state (`fst_keyboard.py:607`) — see section 4 #10. `VERIFY`: return value + sensitivity.
- **`dc("ke")`** (`273-286`) — int ms. With no argument uses the triggering ke's vk code
  (`276-277`); returns `time_released[vk] + time_pressed[vk]` = interval between the same
  phase events (press→press or release→release); returns **9999** sentinel when the key has
  no previous events (285-286 — note this is not 0). `VERIFY`.
- **`ap("key")`** (`251-253`) — bool from `get_all_key_press_state` (real OR simulated
  pressed, `1586-1591`). `ar("key")` (`256-257`) = `not ap`. `VERIFY`.
- **`cs("key")`** (`218-230`) — int ms break-time: `x = tr(key_string)`; if `x > 500` →
  fixed 100 ms; else polynomial `velocity = -0.001*x² + 0.97*x + 12`,
  `breaktime = round(velocity*100/250)`. Sensitive to the evaluated event's phase via `tr`.
  `csl()` (`233-239`) is the linear variant (x>500 → 100, else `round(x*100/500)`).
  `VERIFY`: both formulas.

### Constraint mechanics

- **`|` chaining** — `check_constraint_fulfillment` (`98-121`): evaluated left→right,
  short-circuits on first False (no later eval/invocation runs); int results are collected
  as delays (not truth values); `None` passes; other types print "! Constraint ... not
  valid" and pass. Float→int coercion and negative→0 clamping happen in `constraint_evaluation`
  (674-679). `VERIFY`: order, short-circuit, int-as-delay.
- **`!` / state shorthand / suppress** — `''` and `!` → False (640-642); a bare `-ke`/`+ke`/`!ke`
  constraint → all-press-state check (645-652, unknown key silently passes — see 4 #8);
  `suppress` rebind target → `SUPPRESS_CODE` (`fst_keyboard.py:42`, `647-648`) → original
  event suppressed, nothing sent; any failed trigger constraint → original event *not*
  suppressed (`fst_keyboard.py:651-656` only applies to replacement checks). `VERIFY`.
- **Invocations** — `|(name)`: sequence name → `reset_macro_sequence_by_name`
  (`656-660` → `fst_keyboard.py:981-999`, only resets counter when > 0); started macro name
  → `interrupt_macro_by_name` (`662-666` → cancel task only if not done); unknown name →
  bare `eval` (NameError — see 4 #2). `|(toggle_repeat('<alias>', ms))`: no entry or done
  entry → starts `Macro_Repeat_Task` via `asyncio.run_coroutine_threadsafe(..., self._fst.loop)`
  (`314-328`, `288-301`); running entry → `cancel_playback()` + `handle.cancel()`.
  `|(stop_repeat('<alias>'))` same cancel path (`303-312`, unknown alias → silent True).
  `|(release_all_keys())` → `release_all_currently_pressed_simulated_keys`
  (`373-377` → `1717-1741`: releases pressed simulated keys, releases toggles, resets state
  dicts). All invocations return True. `VERIFY`: start/stop/toggle lifecycle, unknown-name
  behavior.
- **Sequence cycling + reset/interrupt** — `Macro._get_key_group`
  (`fst_data_types.py:294-304`): counter advances per trigger; wraps to 0 after the last
  group (auto-reset); `reset_sequence_counter()` (`309-310`) back to group 0; single-sequence
  macros always return group 0. Interrupt of a playing task = `handle.cancel()`
  (`fst_keyboard.py:855-865`). `VERIFY`: cycle order incl. wrap, reset mid-sequence,
  cancel stops remaining keys.
- **Crossover anti-cheat** — `send_keys_for_tap_group` (`fst_manager.py:700-755`): only on
  tap-group key *switch*; fires when `randint(0, 100) > 100 - ACT_CROSSOVER_PROPABILITY_IN_PERCENT`
  (line 709, i.e. the configured percent chance) and `ACT_CROSSOVER`; when crossed: press
  new key first, wait `randint(ACT_MIN_DELAY_IN_MS, ACT_MAX_DELAY_IN_MS)` ms, release old;
  otherwise release old then press new (same delay wait when delay/crossover active).
  Args: `-crossover` / `-crossover=N` (`1364-1375`); `-nodelay` disables both (1376-1379).
  `VERIFY`: both branches, probability gate, no crossover when no key switch.
