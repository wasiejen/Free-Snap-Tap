# HANDOVER — auto_resume #79: msgPairs dual-shape unwrap (Unit 4 action routing)

Status: DONE — all gates green, committed (single commit).

## What changed
`.opencode/plugin/auto_resume.ts`:
- `msgPairs` (Unit 4, the single messages-RPC site, line 597): normalizes the
  dual response shape BEFORE the array check — a bare array stays; a non-null
  object with an array `data` property → uses `data`; anything else → `[]`.
  The normalization is the precedent copied from `resolveModel` in
  `.opencode/plugin/compact_memory.ts` (line 467, the dual-shape fix of
  280b8d0); only adaptation: TS casts (the function parameter is `unknown`
  here, the precedent's client is `any`).
- Comment block above `MsgPair`: one added line documenting the dual shape
  (in-process client → RequestResult `{ data: [...] }`; the bare array is
  the older/faked shape) in the file's comment style.
- Effect: `userHasMarker` + `lastAssistantAction` (both route through
  `msgPairs`) now see the live list → Unit 4 routing recognizes action
  lines again (no more spurious recovery prompts after a valid
  `action: restart` on planner-scoped sessions).

`.opencode/plugin/tests/auto_resume.smoke.mjs` (Unit 4 section — same
dual-shape pinning approach as 4b1a965 / 280b8d0):
- New scripted entry `ses_u4_wrap`: the fake client's `messages()` returns
  the WRAPPER shape `{ data: [...] }` (user msg carries `<|autonom|>`, last
  assistant msg carries `action: stop`), fired in batch A between
  `ses_u4_plain` and `ses_u4_throw`.
- The batch-A `okA` gate now ALSO requires the `route= stop sid=ses_u4_wrap`
  log line (pre-fix: scope=none → no route line → gate fails, so the case
  pins the fix).
- New chk: wrapper shape unwrapped → `route= stop`, NO send.
- `ses_u4_wrap` added to the final `smokeSids` live-log invariance list.
- All existing bare-array cases KEPT untouched; the wrapper case adds NO
  send — the batch send-total pin (3 CONTINUE + 2 RESTART) still holds.

## Measured verification (repo root, branch `opencode_test`)
- `node .opencode/plugin/tests/auto_resume.smoke.mjs` → **ALL PASS (63/63)**
  (62 existing + 1 new wrapper check; no existing pin broke, no re-pins).
- `./.venv/Scripts/python.exe -m pytest -q` → **459 passed, 1 warning** (the
  known warning).
- `./.venv/Scripts/ruff.exe check --select F .` → **All checks passed! (F=0)**.
- `node .opencode/plugin/probes/handover_probe.mjs` → **PROBE handover:
  241/241 PASS** — agrees with the header annotation. No re-pins needed;
  no existing probe pin broke.

## Commit
Single commit covering code + smoke + this handover + the loop-log lines
(see `git log -1`); message per the commit-routine conventions.

## TODO entries
None appended (no findings outside the task scope). The task's own entry
#79 is for the planner's close note at review — this role does not
curate `TODO.md`.

## Deliberately not done
- `compact_memory.ts` untouched (read-only precedent per DO-NOT-touch) —
  the normalization lives in `auto_resume.ts`'s `msgPairs` only (the spec's
  boundary: the single messages-RPC site is line 597).
- `opencode.jsonc`, `.opencode/maintainer/**`, the live
  `.opencode/temp/**`, the auto_resume Unit 2/3 code blocks (incl. the
  UNIT B toggle from d4ef76e), and the probe sections — untouched.
- The pre-existing uncommitted change to
  `.opencode/maintainer/ideas/ideas.md` (maintainer's) is NOT in my commit.

Lessons: the dual-shape unwrap pattern is now canonical in two spots
(resolveModel, compact_memory.ts; msgPairs, auto_resume.ts) — future SDK
list-RPC consumers should normalize at the call site the same way.
