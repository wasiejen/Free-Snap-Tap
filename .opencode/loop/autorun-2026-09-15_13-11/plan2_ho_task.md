# TASK — FST: let repeated keys through for REBINDS (approved proposal, branch `fst_work`)

Worker: `worker_Q4_120K`. Planner: plan2 (autorun-2026-09-15_13-11), iteration 2.

## Goal
Implement the approved proposal `.opencode/proposals/approved/2026-09-12_fst-rebind-repeat.md`
(read it FIRST — the full design + edge-case list live there). One-sentence goal:
a held REBIND key auto-repeats its target key; macro/toggle repeat-suppression stays
unchanged. The maintainer's item-1 comment in the proposal is the behavioral ruling
(1 action = 1 macro/toggle trigger; rebind repeats flow).

## Branch (IMPORTANT)
- Work on branch **`fst_work`** — the FST batch (unit A `4b93d37` + unit B `2891dab`,
  verified ancestors) is there; the current checkout is `opencode_test` with a CLEAN tree.
- Step 1: `git checkout fst_work` (HEAD = `6cbe4a8` at spec time).
- Step 2: MEASURE the baseline ON `fst_work` before touching code:
  `./.venv/Scripts/python.exe -m pytest -q` (record the pass count) and
  `./.venv/Scripts/ruff.exe check --select F .` (record the F count).
  If the baseline is RED: STOP and report — do not fix out-of-scope red.
- After your final green commit: `git checkout opencode_test` and leave the tree clean
  on it (the loop runs on `opencode_test`).

## Verified facts (planner, 2026-09-15 — do NOT re-derive)
- On `fst_work`: the repeat-detection loop over `self._all_trigger_events` sits ≈ line 631;
  the `STOP REPEATED KEYS FROM HERE` guard ≈ 699; the rebind-trigger guard
  `if not real_input_repeated and not to_be_suppressed:` ≈ 703; the tap-group
  "to allow repeated keys from hold" allowance ≈ 761–776. Identify the regions by these
  MARKERS/COMMENTS, not by raw line numbers (they may have shifted a few lines).
- The proposal's design paragraph + its 4 edge cases (rebind→`SUPPRESS_CODE`; key that is
  BOTH rebind and macro trigger; rebind key in a TAP GROUP — keep the
  `trigger_key_repeated` flag set, the proposal recommends it; press-state
  bookkeeping across repeats) are the WHAT. HOW is yours inside that.

## Definition of done
1. Baseline (measured in step 2) + NEW pinning tests all green on `fst_work`;
   ruff F count UNCHANGED vs baseline.
2. 3–5 new pinning tests in the keyboard-level test file (your choice of file;
   follow the mocked-`FakeFST` pattern, no live listeners) covering the 4 edge cases.
3. One commit on `fst_work` (code + tests + TODO.md note + your handover file):
   TODO.md — append a one-line record under the FST behavior section pointing at the
   proposal (no new ID needed; reference the proposal file).
4. `handover_task_to_planner.md`: executive summary, measured baseline + final gate
   numbers, commit hash, the edge-case → test mapping, anything deliberately not done.
5. Tree back on `opencode_test`, clean.

## DO-NOT-touch
- `fst_keyboard.py`: the `XXX 241016-1101` contradiction block (≈791–840, holding on
  the maintainer's live test) and the `XXX 241022-1341` block (302–303, RULING-KEEP).
- Anything under `.opencode/maintainer/`, `.opencode/agent/prompts/**`,
  `opencode.jsonc`. No behavior change outside "rebind key auto-repeats its target".

## Approval boundary
The proposal is in `approved/` = the observable behavior change is MAINTAINER-APPROVED.
If you hit a case the proposal does not cover, prefer the conservative choice
(keep current behavior) and note it in your handover — do not invent new behavior.
