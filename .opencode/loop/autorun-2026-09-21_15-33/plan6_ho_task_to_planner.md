# HANDOVER — compact_memory cross model read: dual response-shape fix

Status: DONE — all gates green, committed (single commit).

## What changed
`.opencode/plugin/compact_memory.ts` (one-site fix, in `resolveModel`):
- The messages RPC result is now normalized BEFORE the array logic:
  bare array → itself; object carrying an array in `.data` (the live in-process
  client's SDK `RequestResult` wrapper) → that array; anything else → the
  existing "empty (no messages)" note path (text UNCHANGED).
- The two header comments documenting the read (~line 51, ~line 432) now state
  the dual shape (bare array + `{ data }` wrapper).

`.opencode/plugin/tests/compact_memory.smoke.mjs`:
- NEW case in the cross-read gate: fake returns `{ data: [ { info: { modelID,
  providerID }, parts: [] } ] }` → SAME resolution as the bare array (model +
  providerID, empty note, IQ3 cap 1, one budget increment). The existing
  bare-array pin stays as the regression pin.

## Measured verification (repo root, branch `opencode_test`)
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` → **ALL PASS (53/53)**
  (52 existing + 1 new wrapper case).
- `./.venv/Scripts/python.exe -m pytest -q` → **459 passed, 1 warning** (the
  known warning).
- `./.venv/Scripts/ruff.exe check --select F .` → **All checks passed! (F=0)**.
- `node .opencode/plugin/probes/handover_probe.mjs` → **PROBE handover:
  241/241 PASS** — agrees with the header annotation (section-sum line,
  probe line 655). No re-pins were needed; no existing probe pin broke.

## Commit
Single commit covering code + smoke + this handover (message per the commit
routine): see `git log -1` — subject: `compact_memory cross model read: accept the RequestResult { data } wrapper`
(+ body line naming the smoke case).

## TODO entries
None appended (no findings outside the task scope).

## Deliberately not done
- `.opencode/plugin/auto_resume.ts` untouched (separate task follows, per
  DO-NOT-touch).
- No re-pins of probe sections (none broke).
- The untracked `.opencode/archive/sessions/compaction_dumps/ses_f3b16aa46ffe07iI4CSrScxeWK_c0.md`
  and the live `.opencode/maintainer/ideas/ideas.md` modification are NOT in my
  commit — neither was authored by this task.
- The "empty (no messages)" note text unchanged, per spec.
