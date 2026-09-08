# TODO — maintainer's open items

## 1. General vk resolution: unknown keys must surface to the user (tabled 2026-09-06)

Wherever a key string is resolved to a vk_code (`convert_to_vk_code` and all its call
sites), an unknown key should raise an error and be **directly communicated to the
user** — it is important feedback, and many paths today fail silently or only print
to console. Needs a **general** solution covering every vk-resolution site, not
per-call-site fixes.

Related: state-shorthand constraints now fail-closed on unknown keys (2026-09-06,
`fst_manager.py` `constraint_evaluation`) but still only print — fold into the general
solution. Unknown constraint *names* are silent no-ops by design (see
`SPEC_FEATURES.md` §4 #2 decision).

## 2. Fix the 6 ruff `F` findings — cosmetic only, no behavior change (2026-09-07)

`ruff check --select F .` baseline has 6 findings; fix them (remove unused imports/vars,
clean up the f-strings) — none may change program behavior. Keep the suite green after.
List: free_snap_tap 2×F541 (f-strings), fst_manager F401 (`threading.Event` import),
fst_overlay F401 (`QSizePolicy`) + F841 (`cube_distance_down`), playground/pynput_mouse_probe F841.

## 3. Rework README and WIKI to the current state of the code (2026-09-06)

Full gap matrix + decisions made 2026-09-06 in `SPEC_FEATURES.md` sections 2–4.
Known doc fixes include: WIKI "played in its own thread" → asyncio tasks (§4 #5),
`|(name)` per-type semantics (§4 #6), `dc()` sign has no effect (§4 #9), README/WIKI
V1.1.3 → V1.2.0 references, "Python 3.6" vs 3.12 venv, typos (§4 #12), replacement-side
key reinterpretation in Key rebinds + quoted key strings inside `p(...)` (§4 #14),
eaten-rebind suppression semantics + `a|(p("shift")) : b` pass-through pattern (§4 #14).

## 4. Dead code: `fst_manager.py` 116–117 ("None result → pass") unreachable (2026-09-07)

`check_constraint_fulfillment`'s "None → pass" branch (line 117) can never run:
`constraint_evaluation` normalizes `None` → `True` (line 692) before returning. Triage
(`COVERAGE_TRIAGE.md`) classified it as class A — reclassification to C is your call, the
plan file is agent-read-only. Line 117 stays uncovered in every run.

## 5. Lint baseline 6 → 8 at `ca61a26`, restored at `0025a57` (2026-09-08)

Two new F401s (unused `SimpleNamespace`) in `test_control_actions.py` /
`test_facade_wiring.py` (+1 in the then-untracked `test_macro_playback_kbd.py`) broke the
6-finding baseline; `0025a57` removed the three imports — baseline restored.

## 6. Dead code: `fst_keyboard.py` 302–303 (mixed-Key rebind conversion) unreachable (2026-09-08)

In `initialize_groups_from_presorted_lines`, `convert_key_string_group` only ever appends
`Key_Event`s (bare keys expand to press/release events), so `new_trigger_group[0]` is never
a `Key`; the block at line 295 is entered only via a `Key` replacement — which makes line
301 `False`, so 302–303 (`replacement_key = Key(...)`) can never execute. Proven at
`fffea8b` (rebinds `w : e` and `w : +e` both leave 302–303 uncovered). Triage listed them as
class A ("mixed Key rebind `w : +e`") — same misclassification as entry #4. Also: triage's
numeric example `"8" → 8` is wrong — `"8"` resolves via the dict to 56; the numeric branch
needs a string absent from `vk_codes_dict` (e.g. `"255"`).

## 7. Empty macro: comment/behavior mismatch at `fst_keyboard.py` 707 (2026-09-08)

The comment says an empty key group is ignored and does "not supress the triggerkey", but
`alias_fired = True` (line 697) is set before the empty check, so the trigger key IS
suppressed (`_listener.suppress_event`, verified by `test_empty_macro_sequence_no_playback`).
Either the comment or the behavior is stale — your call.

## 8. `ap`/`ar` "all keys (incl simulated)" state is not a union — last-write-wins shared dict (2026-09-08)

`ap(...)` is documented as "press of all keys (incl simulated)" (`fst_manager.py` 253–256),
but `set_real_key_press_state` (1611–1614) and `set_simulated_key_press_state` (1622–1625)
both write the shared `_all_key_press_states_dict` last-write-wins — a release from either
side clears the `all` state even if the other side's press is still active, so `ap` may not
behave as "real OR simulated". Found during the interrupted Phase-5 run (it explains the
1630–1632 KeyError coverage gap; the run noted it only as a test-design remark). Also
asymmetric: `set_real_key_press_state` lacks the `vk_code > 0` guard the other two setters
have. Confirm intended semantics (or fix).

## 9. Repeat-constraint excepts too narrow for malformed `repeat_thread_dict` entries (2026-09-08)

`toggle_repeat` (327), `is_repeat_active` (340), `reset_repeat` (350) catch
`(KeyError, AttributeError)`, `stop_all_repeat` (365) only `AttributeError` — but unpacking
an entry that is not a 2-tuple raises `ValueError`, which is uncaught and would propagate
out of `constraint_evaluation`. Noted during the interrupted Phase-5 run while writing the
coverage test for 365–366. Low severity: entries are only written by `start_repeat` (301)
as 2-tuples `[task, handle]`. Decide whether to harden the excepts or leave as-is.

## 10. `fst_overlay.py` 549: deprecated `QMouseEvent.globalPos()` (2026-09-08)

Every `pytest -q` run emits the `DeprecationWarning: 'QMouseEvent.globalPos() const'` from
`fst_overlay.py:549` (12-warning baseline noted in the Phase-5 run). Replace with the Qt6
API (`event.position()` / `globalPosition()`) — cosmetic, no behavior change; same spirit
as `TODO.md` #2.

## 11. General contradiction prevention still disabled (XXX 241016-1101, `fst_keyboard.py` 791) (2026-09-08)

`###XXX 241016-1101 general contradiction prevention disabled to test` — the 793–803
contradiction block of `_win32_event_filter` no longer suppresses (`to_be_suppressed` is
not set), and the Phase-5 tests (`tests/test_filter_simulated.py`) now pin that
non-suppression. Clarify + document as final decision: if it stays off, reword the
XXX/"to test" comment so it reads as an intentional decision; if it was meant to be
reenabled, that is the call.

## 260908-0951 copied from NAP - to be sorted in and dedubled:
1. **Triage misclassification: `fst_manager.py` lines 116–117 (`check_constraint_fulfillment`,
   class A "None result → pass") are unreachable.** `constraint_evaluation` maps `None` →
   `True` (`fst_manager.py:691`) before returning, and no other branch returns `None` — the
   `pass` body (line 117) can never execute. It is dead code (class C), not testable-A. The
   triage's 2098/2217 (94.6 %) ceiling is therefore 2097/2217 ≈ 94.6 % — same rounded
   number, but line 117 will remain uncovered in every run. Recorded in the `2007698`
   commit message at discovery; `COVERAGE_TRIAGE.md` is read-only here, reclassifying 117 to
   C is the maintainer's call — ask him, don't edit the plan file.
2. **Lint baseline regressed 6 → 8 at `ca61a26`** (DoD says "exactly 6"): 2×F401
   (`SimpleNamespace` unused) in `test_control_actions.py` / `test_facade_wiring.py`, plus a
   3rd in the untracked WIP file. Fix = delete the three import lines (Next steps 1-2) —
   restores the 6-finding baseline.
3. **C-class lines covered as by-products** (as the triage anticipated): `fst_keyboard`
   795/799/804 (via a `DEBUG2` flip in `d94af46`) and `fst_manager` 341 (via a `DEBUG3` flip
   in `99b5e37`). They were C but no longer miss — expected remaining C: `fst_manager` 85,
   `fst_keyboard` 26, `fst_data_types` 4, plus `fst_overlay` 589 (offscreen-by-design `exec_`).
   Expected state confirmed by the `fffea8b` coverage run.
4. **Found 2026-09-08 (`fffea8b`): `fst_keyboard` 302–303 are unreachable dead code** —
   triage classed them A (recipe `w : +e`): `convert_key_string_group` only ever appends
   `Key_Event`s, so line 297 (`not isinstance(new_trigger_group[0], Key)`) is always true and
   the line-295 block is entered only via a `Key` replacement — which makes line 301 false,
   so 302–303 can never run. `TODO.md` #6. Also found: the empty-macro comment at 707
   contradicts the behavior (`alias_fired` suppresses the trigger anyway) — `TODO.md` #7.
