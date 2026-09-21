# TASK — compact_memory cross model read: dual response-shape fix

Worker: `worker_Q3S_160K`. Branch: stay on the current checkout (`opencode_test`).

## Goal
The cross-session model read in `.opencode/plugin/compact_memory.ts` (`resolveModel`,
the single `client.session.messages({ path: { id } })` call at ~line 460) must accept
the LIVE in-process client response shape — an SDK `RequestResult` wrapper
`{ data: [ { info, parts } ... ] }` — in addition to the bare array.

## Evidence (planner-verified live, 2026-09-21, do NOT re-derive)
- Two live cross dispatches (post-restart, this looprun) both failed:
  `no resolvable model for <sid> ... the request was NOT sent` with the note
  `cross-session model read empty (no messages) — default compaction budget
  applied` — for sessions that DO have messages (verified in the DB).
- Root cause: the in-process client resolves SDK calls to a `RequestResult`
  wrapper, NOT a bare array. Measured precedent: `auto_resume.ts` lines 383-386
  unwraps `create()` as `res.data.id ?? res.id` (Unit 3 live spawn SUCCEEDED on
  that unwrap) — same client, same wrapper.
- SDK static type (`@opencode-ai/sdk/dist/gen/types.gen.d.ts`):
  `SessionMessagesResponses = { 200: Array<{ info: Message; parts: Part[] }> }`
  — the wrapper is at the result level: `{ data: [...] }`.
- `compactionFailure()` (compact_memory.ts ~356) ALREADY accepts
  `result.data === true` — the summarize path is shape-tolerant. ONLY the
  messages read (~460) is not. This is a one-site fix.

## Change (the WHAT — HOW is yours inside this boundary)
1. In `resolveModel`, normalize the messages result before the array logic:
   bare array → itself; object carrying an array in `.data` → that array;
   anything else → the existing "empty (no messages)" note path (UNCHANGED text).
2. Update the two header comments that document the read (line ~51 and ~432) to
   state the dual shape (bare array + `{ data }` wrapper).
3. Smoke `.opencode/plugin/tests/compact_memory.smoke.mjs`: the cross-read gate
   (section "cross-session model read", ~lines 277-360) currently fakes a bare
   array. ADD a case whose fake returns `{ data: [ { info: { modelID, providerID },
   parts: [] } ] }` and expect the SAME resolution (model + providerID, empty
   note). The existing bare-array pin stays as the regression pin.

## Definition of done
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` — ALL cases pass
  (existing + the new wrapper-shape case).
- Standard gate green: `pytest -q` (459 passed + 1 known warning),
  `ruff check --select F .` (F=0), `node .opencode/plugin/probes/handover_probe.mjs`
  (reported total == header annotation, no failures). Existing probe pins should
  still pass (contract unchanged); if a pin breaks because of the shape
  tolerance, re-pin minimally and say so.
- ONE commit (code + smoke + TODO/handover bookkeeping), message per the
  commit-routine conventions.

## DO-NOT-touch
- `.opencode/plugin/auto_resume.ts` (a separate task follows), `opencode.jsonc`,
  anything under `.opencode/maintainer/`, `.opencode/plugin/deactivated/**`,
  probe sections (except a minimal re-pin as above), the "empty (no messages)"
  note text.

## Context discipline
- Read ONLY: compact_memory.ts lines ~40-120 (header + classifier) and
  ~425-500 (resolveModel + config resolution), the smoke ~100-135 (fake-client
  factory) + ~270-360 (cross-read gate), and run the gates. No other files.
- No SDK re-research — the shapes above are measured facts.
