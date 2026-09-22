# TASK SPEC — #81: re-pin probe [97] + compact_memory smoke pin to the temp-fix behavior

Worker: `worker_Q3S_160K` (roster verified live at spec time 2026-09-22:
`worker_Q3S_160K` + `worker_gemma_Q4_128K` active; the mtp workers are
commented out).
HEAD at spec time: `faaf58b` — stay on the current checkout, do not
switch branches.

## Goal
The standard gate is one pin short (probe 240/241): check [97] and the
matching compact_memory smoke pin still assert the PRE-temp-fix
behavior of compact_memory's queued message. The maintainer's temp fix
`0f192e5` (2026-09-22) commented out the `promptAsync` call in
`queueMessage` (to kill the SELF-compaction queued-message race).
His ruling (2026-09-22): **re-pin the checks to the CURRENT behavior —
do NOT deactivate/skip the checks, do NOT restore the promptAsync.**

## Current state (measured at spec time, HEAD faaf58b)
- `node .opencode/plugin/probes/handover_probe.mjs` →
  `PROBE handover: FAILED — 1 check(s) failed` — ONLY [97] red:
  `FAIL [97] message (unit A): response = dispatch line + the queued
  note (byte-exact) + exactly ONE queued promptAsync carrying the text
  part` — actual response carries the dispatch line + the queued note
  and `prompt:[]` (no queued promptAsync). All other checks pass (240/241).
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` → exactly 1
  FAIL (the matching message pin), everything else green.

## Task
1. Read the CURRENT `queueMessage` implementation in
   `.opencode/plugin/compact_memory.ts` (post-`0f192e5`) — bounded
   read: the function + its emitted lines only. Observe what it emits
   now (dispatch/result line + queued-note line; NO promptAsync call).
2. Re-pin probe check [97] in `.opencode/plugin/probes/handover_probe.mjs`
   to assert the current behavior: dispatch line + the queued note
   (byte-exact, as today) AND no queued promptAsync (empty prompt
   array / no prompt entry). The check stays a real assertion (not a
   skipped/deactivated one). The probe self-annotates its total — the
   counted total should stay 241 and the header annotation must agree
   (refresh the annotation only if the check wording changes the
   counted total — expected: no change).
3. Re-pin the matching message pin in
   `.opencode/plugin/tests/compact_memory.smoke.mjs` the same way.

## Definition of done
- `node .opencode/plugin/probes/handover_probe.mjs` → 241/241 PASS
  (self-annotated total agrees with the header).
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` → all green.
- `./.venv/Scripts/python.exe -m pytest -q` → 459 passed + 1 warning
  (the known #10 coroutine warning).
- `./.venv/Scripts/ruff.exe check --select F .` → F=0.
- `TODO.md` entry #81 status → "LANDED (commit hash)" (keep the entry
  text; one-line close note).
- ONE commit: the two pin files + `TODO.md` +
  `handover_task_to_planner.md` (your executive summary, incl. the
  commit hash) — the worker commit routine.

## DO NOT TOUCH
- `.opencode/plugin/compact_memory.ts` — the maintainer's LIVE temp
  fix: pin AROUND it. Never restore the promptAsync or "properly
  fix" the message path (that is a separate maintainer call).
- `.opencode/plugin/auto_resume.ts` (out of scope for this task),
  `.opencode/maintainer/**`, `opencode.jsonc`, the FST product
  code/tests.

## Context discipline
- Find probe check [97] by grep/offset — do not read the whole probe
  file (it is long). The smoke file is short — read it in full.
- No live sessions, no DB writes.
