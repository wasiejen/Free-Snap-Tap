# WORKER SUMMARY — FST unit B (TODO #7 + #8 + #9 + #4, approved Recs 2-5)

Worker: worker_Q4_120K (session ses_f6c8f4f25ffea8Cc028npg2wRV), branch `fst_work`,
iter-9 unit B (continuing the unit-9 lines from unit A).

## What changed (task commit `2891dab`)

- **#7** `fst_keyboard.py:737` — comment-only reword: an empty key group does NOT start
  playback but the trigger key IS still suppressed (`alias_fired` is set before the empty
  check); "supress" spelling fixed. Code path untouched — behavior wins per the ruling.
  The pinning test already existed: `test_empty_macro_sequence_no_playback`
  (`tests/test_extraction_filter_edges.py:93`) asserts BOTH `played == []` AND
  `suppress_event.call_count == 1` — so per the spec's DoD the comment-only change
  suffices; no new test added for #7.
- **#8** `fst_manager.py` `Input_State_Manager` — union semantics for
  `_all_key_press_states_dict`:
  - `set_real_key_press_state`: added the missing `if vk_code > 0:` guard (symmetric
    with the other two setters) and the `all`-dict write is now
    `is_press or self._simulated_key_press_states_dict.get(vk_code, False)`.
  - `set_simulated_key_press_state`: the `all`-dict write is now
    `is_press or self._real_key_press_states_dict.get(vk_code, False)`.
  - `set_all_key_press_state` left as-is per the spec.
  - `ap`/`ar` doc comments now state the union explicitly ("union: real OR simulated").
- **#9** `fst_manager.py` repeat methods — `ValueError` added to the except tuples:
  `stop_repeat`, `toggle_repeat`, `is_repeat_active`, `reset_repeat` (now
  `(KeyError, AttributeError, ValueError)`), and `stop_all_repeat` (now
  `(AttributeError, ValueError)` — KeyError cannot occur there: it iterates
  `dict.items()`, no key lookup).
- **#4** `fst_manager.py` `check_constraint_fulfillment` — the dead
  `elif result is None: pass` branch deleted (`constraint_evaluation` normalizes
  `None → True` before returning). The `else:` print for other non-bool/int results stays.

New pinning tests (4):
- `tests/test_input_state_manager.py::TestPressStateDicts`:
  `test_all_state_is_union_of_real_and_simulated`,
  `test_crossing_release_from_real_side_keeps_simulated_all_state`,
  `test_set_real_only_positive_vk` (the real setter no longer writes either dict for
  `vk_code <= 0`).
- `tests/test_output_manager.py::TestInvocations::test_malformed_repeat_entry_does_not_raise`
  (1- and 3-element `repeat_thread_dict` entries — `ValueError` on unpack — must not
  propagate out of ANY of the five methods: `stop_repeat` / `is_repeat_active` /
  `reset_repeat` / `toggle_repeat` / `stop_all_repeat`).

## Measured verification (verbatim)

Baseline on `fst_work` @ `41c9b90` BEFORE any edit:
```
455 passed, 1 warning in 1.90s
All checks passed!
```
RED check: `git stash push -- fst_manager.py` (code fixes reverted, new tests kept) →
all 4 new tests FAIL (the #9 test shows the uncaught `ValueError` at `fst_manager.py:307`
propagating out of `constraint_evaluation`); `git stash pop` → back to fixed state.
AFTER all changes (gate, twice — once before the red-check, once after the pop):
```
459 passed, 1 warning in 1.93s
All checks passed!
```
The 1 warning is the known #10 warning (RuntimeWarning "coroutine
'Output_Manager.execute_key_event' was never awaited" in
`test_mouse_rebind_schedule_error_is_logged`) — unchanged, not introduced.
459 = 455 baseline + 4 new tests.

Commit: `2891dab` (task) on `fst_work`. Bookkeeping commit = this file + TODO.md
#7/#8/#9/#4 LANDED lines + the updated unit-B `handover_task.md` (the committed copy
was still the stale T5 re-verify spec — now the committed spec matches what ran) + the
worker-9 loop-log lines.

## #6 RULING-KEEP note

The `###XXX 241022-1341` block in `initialize_groups_from_presorted_lines`
(`fst_keyboard.py` ≈310-325) was NOT touched, per the maintainer ruling
("keep this until I can test a bit more"). The `XXX 241016-1101` block (≈821-840,
TODO #11 HOLDING) and unit A's `surface_config_error` work are likewise untouched.
`COVERAGE_TRIAGE.md` untouched (A→C reclassification rides maintainer-side).

## stop_repeat fifth-site note (beyond the ruling's letter)

The ruling named four methods (`toggle_repeat`, `is_repeat_active`, `reset_repeat`,
`stop_all_repeat`). `stop_repeat` unpacks the same `_repeat_thread_dict` with the same
`(KeyError, AttributeError)` catch — leaving it alone would leave the identical crash
one call away, and `start_repeat`/`toggle_repeat` both call `stop_repeat` first. The
same one-line `ValueError` addition was applied there as a consistency addition —
flagged here per the spec.

## Flagged call sites / out-of-scope judgments

- **#8 call-site audit (spec item 2):** the ONLY production call site of
  `set_real_key_press_state` is `fst_keyboard.py:641` (every real key event — a real
  event always has `vk_code > 0`, so the new guard changes nothing on the hot path)
  plus the getter's own KeyError branch (`fst_manager.py:1616` — a non-positive vk
  simply no longer gets inserted, the getter still returns `False`).
  `set_all_key_press_state` is called only from its getter branch + tests. NO call
  site contradicts the union semantics — nothing flagged.
- **None-vk symmetry note:** with the guard, a `None`/non-int vk passed to
  `set_real_key_press_state` now raises `TypeError` at `vk_code > 0` — exactly the
  same behavior the `simulated` setter already had pre-change (symmetric per the
  ruling's letter). In practice unreachable: unit A (commit 4b93d37) made
  `convert_to_vk_code` raise `ConfigError` for unresolvable keys, so no production
  path hands a `None` vk to these setters anymore.
- **Adjacent comment fix (pre-approved, behavior-neutral):** the `ar` doc comment
  typo "relese" → "release" was fixed while updating it for the union wording.
- **`stop_all_repeat` except tuple** is `(AttributeError, ValueError)` — `KeyError`
  deliberately NOT added (no key lookup in that loop; staying faithful to the
  ruling's "add ValueError" intent).

## Deliberately NOT done

- No code change for #7 (behavior wins — comment only, pinned by the pre-existing test).
- `set_all_key_press_state` left as-is (spec).
- No rework of any call site (none contradicted the union — see audit above).
- DO-NOT-touch list respected in full: #6 block, `XXX 241016-1101` block, unit A
  helper + its 3 routed sites, the `NameError` silent no-op branch in
  `constraint_evaluation`, `playground/`, `opencode.jsonc` (never staged),
  `AGENTS.md`, `proposals/`, `COVERAGE_TRIAGE.md`. No live listeners — mocked
  `kb_env`/`fake_fst` patterns only.

## TODO.md

Entries #7, #8, #9, #4: status tails updated IN PROGRESS → LANDED (commit 2891dab),
entries otherwise kept. No new entries, no `todo_inbox.md` items — nothing found that
is out of scope and unfixed.
