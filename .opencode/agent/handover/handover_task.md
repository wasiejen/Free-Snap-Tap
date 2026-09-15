# TASK — FST: let repeated keys through for REBINDS (approved proposal, branch `fst_work2`)

Worker: `worker_Q4_120K`. Planner: plan2 (autorun-2026-09-15_13-11), iteration 2
(relaunch after a failed first attempt — see "Failed first attempt" below).

## Goal
Implement the approved proposal `.opencode/proposals/approved/2026-09-12_fst-rebind-repeat.md`
(read it FIRST — the full design + edge-case list live there). One-sentence goal:
a held REBIND key auto-repeats its target key; macro/toggle repeat-suppression stays
unchanged. The maintainer's item-1 comment in the proposal is the behavioral ruling
(1 action = 1 macro/toggle trigger; rebind repeats flow).

## Failed first attempt (READ BEFORE CODING)
A previous worker (session ses_f5aefe9e..., killed mid-task when its model was
unloaded from the provider) implemented a first version, emergency-committed by the
maintainer as `44dbc36` on the OLD branch `fst_work` (that branch is STALE — 348 files
behind; do NOT build on it). The maintainer observed a LIVE REGRESSION: the tap
function no longer behaved as before. The previous diff (inspect with
`git show 44dbc36 -- fst_keyboard.py`):
1. repeat-detection: skip `to_be_suppressed` when the repeated trigger matches a
   rebind trigger (`self._rebind_triggers`, via `tg.get_trigger()`).
2. tap-group section: when `key_replaced is True` (a rebind replacement key consumed
   by a tap group), it set `to_be_suppressed = True` on the CURRENT event — suspect:
   the current event there IS the replacement key, so suppressing it likely breaks
   rebinds inside tap groups (planner's read; verify against the actual flow).
Treat that as the KNOWN-BAD reference: your implementation must not reproduce the
tap regression. The tap-group edge case is the RISK AREA — get it right and pin it.

## Branch (IMPORTANT)
- Work on a NEW branch **`fst_work2`** created from `opencode_test` (current checkout,
  clean tree, HEAD = bdd7031; the FST batch units A `4b93d37` + B `2891dab` are
  already ancestors of `opencode_test`).
- Step 1: `git checkout -b fst_work2` (only if it does not exist yet — check first).
- Step 2: MEASURE the baseline ON `fst_work2` before touching code:
  `./.venv/Scripts/python.exe -m pytest -q` (record the pass count) and
  `./.venv/Scripts/ruff.exe check --select F .` (record the F count).
  If the baseline is RED: STOP and report — do not fix out-of-scope red.
- After your final green commit: `git checkout opencode_test` and leave the tree
  clean on it (the loop runs on `opencode_test`). Do NOT touch the old `fst_work`
  branch in any way.

## Verified facts (planner, 2026-09-15 — do NOT re-derive)
- On `opencode_test`: the repeat-detection loop over `self._all_trigger_events` sits
  ≈ line 631; the `STOP REPEATED KEYS FROM HERE` guard ≈ 699; the rebind-trigger guard
  `if not real_input_repeated and not to_be_suppressed:` ≈ 703; the tap-group
  "to allow repeated keys from hold" allowance ≈ 761–776; the D1-A decision comment
  block ≈ 821-825. Identify the regions by these MARKERS/COMMENTS, not by raw line
  numbers.
- The proposal's design paragraph + its 4 edge cases (rebind→`SUPPRESS_CODE`; key that
  is BOTH rebind and macro trigger; rebind key in a TAP GROUP; press-state
  bookkeeping across repeats) are the WHAT. HOW is yours inside that.
- The `XXX 241016-1101` block stays untouched (decision comment lives below it —
  do not edit it).

## Definition of done
1. Baseline (measured in step 2) + NEW pinning tests all green on `fst_work2`;
   ruff F count UNCHANGED vs baseline.
2. 3–5 new pinning tests in the keyboard-level test file (your choice of file;
   follow the mocked pattern, no live listeners) covering the 4 edge cases — the
   tap-group case MUST pin both: the source key behavior AND the replacement key
   flowing through (the exact area the first attempt broke).
3. One commit on `fst_work2` (code + tests + TODO.md note + your handover file).
4. `handover_task_to_planner.md`: executive summary, measured baseline + final gate
   numbers, commit hash, the edge-case → test mapping, how your tap-group handling
   differs from the first attempt (and why the regression is avoided), anything
   deliberately not done.
5. Tree back on `opencode_test`, clean.

## DO-NOT-touch
- `fst_keyboard.py`: the `XXX 241016-1101` block incl. its decision comment, and the
  `XXX 241022-1341` block (RULING-KEEP).
- The old `fst_work` branch, anything under `.opencode/maintainer/`,
  `.opencode/agent/prompts/**`, `opencode.jsonc`. No behavior change outside
  "rebind key auto-repeats its target".

## Approval boundary
The proposal is in `approved/` = the observable behavior change is MAINTAINER-APPROVED.
If you hit a case the proposal does not cover, prefer the conservative choice
(keep current behavior) and note it in your handover — do not invent new behavior.
