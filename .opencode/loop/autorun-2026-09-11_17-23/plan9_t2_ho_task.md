# TASK — FST unit B: behavior batch items #7 + #8 + #9 + #4 (approved Recs 2-5)

FIRST read `AGENTS.md`, `agents_repo.md` (+ repo parts: commands, testgate), this file,
`TODO.md` entries #7 / #8 / #9 / #4 / #6, and the approved ruling
`.opencode/proposals/approved/2026-09-11_fst-behavior-batch-decisions.md`.

Branch: you should be on `fst_work` (unit A = commits `4b93d37` + `41c9b90` are
already on it; baseline there is **455 passed + 1 known #10 warning**, ruff F=0).
If you are not on `fst_work`: `git checkout fst_work` first. Commit on `fst_work`.

## Goal
Land the four remaining approved behavior rulings, each pinned with a test:
- #7 — empty-macro: BEHAVIOR WINS (keep the suppression; reword the comment; pin).
- #8 — `ap`/`ar` "all keys (incl simulated)" = UNION (real OR simulated);
  symmetric `vk_code > 0` guard on the real setter; pin the crossing semantics.
- #9 — harden the repeat-constraint excepts: `ValueError` covered.
- #4 — delete the dead "None result → pass" branch.
#6's `fst_keyboard.py` 302-303 block is RULING-KEEP — DO NOT TOUCH (see below).

## Verified current state (planner facts, measured on `fst_work` @ `41c9b90` — do not re-derive)
- **#7** `fst_keyboard.py`: `alias_fired = True` at **727** (set BEFORE the empty check),
  the stale comment at **737** reads
  `# if there is an empty key group ... just ignore it and do not supress the triggerkey`,
  empty check at **738** (`if len(key_sequence) == 0: pass`). Actual behavior: the trigger
  IS suppressed (downstream `_listener.suppress_event` via `alias_fired`) — already pinned by
  `test_empty_macro_sequence_no_playback` (tests/). So the comment is wrong; the behavior
  stays.
- **#8** `fst_manager.py` `Input_State_Manager`:
  - `set_real_key_press_state` **1618-1621**: writes `_real_key_press_states_dict` AND
    `_all_key_press_states_dict` last-write-wins — **NO** `vk_code > 0` guard.
  - `set_simulated_key_press_state` **1629-1632**: `if vk_code > 0:` guard, writes
    `_simulated_key_press_states_dict` + `_all_key_press_states_dict`.
  - `set_all_key_press_state` **1640-1642**: `if vk_code > 0:` guard, writes
    `_all_key_press_states_dict` only.
  - Result today: a release from EITHER side clears `all` even while the other side's press
    is still active → `ap` behaves as neither real-OR-simulated.
  - `ap`/`ar` constraint fns: `ap` **253-255** (`# press of all keys (incl simulated)`),
    `ar` **258-259** — read `get_all_key_press_state`.
- **#9** `fst_manager.py` repeat methods (all in the same scope, same `self._repeat_thread_dict`):
  - `stop_repeat` **305-314**: unpacks `repeat_task, _handle = …[alias_string]`,
    catches `(KeyError, AttributeError)`.
  - `toggle_repeat` **316-330**: same unpack, catches `(KeyError, AttributeError)`.
  - `is_repeat_active` **332-342**: same unpack, catches `(KeyError, AttributeError)`.
  - `reset_repeat` **344-353**: same unpack, catches `(KeyError, AttributeError)`.
  - `stop_all_repeat` **355-367**: unpacks in the `for` tuple, catches `AttributeError` only.
  - Entries are written ONLY as 2-tuples `[task, handle]` by `start_repeat` (290-303); a
    malformed (non-2-tuple) entry raises `ValueError` on unpack — uncaught today →
    propagates out of `constraint_evaluation`.
- **#4** `fst_manager.py` `check_constraint_fulfillment` **105-118**: `constraint_evaluation`
  normalizes `None → True` (≈**698**) before returning, so the
  `elif result is None: pass` branch (**115-116**) is unreachable — delete it.
  (The `else:` print at 117-118 for other non-bool/int results stays.)

## Changes
1. **#7** — reword the **737** comment so it matches the (kept) behavior: an empty key
   group does NOT start playback, but the trigger key IS still suppressed
   (`alias_fired` is set before the empty check). Fix the "supress" spelling in your
   rewording. Do NOT change the code path — behavior wins per the ruling.
2. **#8** — union semantics for `_all_key_press_states_dict`:
   - `set_real_key_press_state`: add the missing `if vk_code > 0:` guard (symmetric with
     the other two setters) and make the `_all_key_press_states_dict` write a UNION:
     `is_press or <current simulated state for vk_code>`.
   - `set_simulated_key_press_state`: same — the `_all_key_press_states_dict` write becomes
     `is_press or <current real state for vk_code>`.
   - Missing side-state reads default to `False` (use `.get(vk_code, False)` or the
     equivalent — your call).
   - `set_all_key_press_state` itself: leave it as-is. If you find call sites whose
     behavior contradicts the union semantics, DO NOT rework them — flag them in your summary.
   - Update the `ap`/`ar` doc comments (252/257) to state the union explicitly
     (e.g. "press of all keys: real OR simulated").
3. **#9** — add `ValueError` to the except tuples of the FOUR ruling-named methods:
   `toggle_repeat` (326), `is_repeat_active` (339), `reset_repeat` (349), and
   `stop_all_repeat` (364, which today catches `AttributeError` only — the hardening intent
   of the ruling covers this one). ADDITIONALLY apply the same one-line fix to
   `stop_repeat` (311): it unpacks the same dict with the same catch — leaving it alone
   would leave the exact same crash one call away. Flag this fifth site in your summary
   as the consistency addition beyond the ruling's letter.
4. **#4** — delete `fst_manager.py` **115-116** (`elif result is None:` + `pass`).
   `COVERAGE_TRIAGE.md` is agent-read-only — do NOT touch it (the A→C reclassification
   rides maintainer-side).

## Definition of done
- **#7**: reworded comment only (no code change) + a pinning test that an empty-macro
  trigger still suppresses the trigger key (keep/extend `test_empty_macro_sequence_no_playback`
  if it already pins this — then the comment-only change is fine, and say so).
- **#8**: crossing press/release on either side preserves the other side's `all` state
  (union) — pinned by a NEW test (e.g. real press + simulated press on same vk_code, release
  one side → `get_all_key_press_state` still True; release the other → False; and the
  `vk_code <= 0` guard symmetric — the real setter no longer writes the dicts for bad
  vk_codes).
- **#9**: a malformed (non-2-tuple) `_repeat_thread_dict` entry does not propagate
  `ValueError` out of any of the five methods — pinned by a NEW test covering at least
  `toggle_repeat`, `is_repeat_active`, `reset_repeat`, `stop_all_repeat`.
- **#4**: dead branch gone; suite green.
- Gates: pytest green — baseline **455 passed + 1 known #10 warning** plus your new tests;
  ruff `check --select F .` = 0 findings.
- Commit on `fst_work`: code + tests + `TODO.md` #7/#8/#9/#4 status lines updated to
  LANDED (entries stay, one-line status tail each) + `handover_task_to_planner.md`
  executive summary (measured verification, commit hash, #6-KEEP note, the stop_repeat
  fifth-site note, any flagged call sites).

## DO NOT touch
- **`#6` RULING-KEEP:** the `###XXX 241022-1341` block in
  `initialize_groups_from_presorted_lines` (`fst_keyboard.py` ≈310-325, marker line 317)
  — the maintainer keeps it until he tests more.
- The `XXX 241016-1101` contradiction-prevention block (fst_keyboard.py ≈821-840,
  marker line 821) — maintainer's LIVE test marker, TODO #11 HOLDING.
- Unit A's work: `surface_config_error` helper + its 3 routed sites — already landed and
  green; do not restructure.
- The NameError silent no-op branch in `constraint_evaluation` (unknown constraint names
  stay silent by design — SPEC_FEATURES.md §4 #2).
- `playground/`, `opencode.jsonc`, `AGENTS.md`, `proposals/`, the live prompts,
  `COVERAGE_TRIAGE.md`.
- No live listeners — mocked `kb_env` / `fake_fst` patterns only (tests/conftest.py).
  `opencode.jsonc` is never staged.

Worker: worker_Q4_120K. Approved observable-behavior changes (maintainer ruling in
`.opencode/proposals/approved/2026-09-11_fst-behavior-batch-decisions.md` Recs 2-5) —
no further approval needed.
