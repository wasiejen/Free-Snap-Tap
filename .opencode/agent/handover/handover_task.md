# TASK SPEC — plan7: #63 compact_memory smoke fix (dump-hook sandbox gap)

Worker: `worker_Q4_140K`
Branch: stay on the current checkout (`opencode_test`).

## Goal
`node .opencode/plugin/tests/compact_memory.smoke.mjs` is GREEN (exit 0, all
checks pass), with the smoke adapted to the pre-compaction dump hook — without
changing the plugin behavior (the hook stays; the smoke adapts).

## Verified facts (planner-measured at spec time, HEAD 0e7bd8b — do NOT re-derive)
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` at clean HEAD → exactly
  **4 FAILs**:
  (1) "response IS the dispatch line (never a success claim)"
  (2) "explicit pair: dispatch line names the override model"
  (3) "message arg: 'resume unit-3\n' + the exact dispatch line"
  (4) "fail: the response is STILL the dispatch line + cross note (never a success claim, never a failure)"
  All other checks PASS.
- **Root cause (measured):** the pre-compaction dump hook
  (commit 4512fe6, the TODO #152 build) fires on EVERY dispatch
  (`.opencode/plugin/compact_memory.ts` ~543: `preCompactionDump(root, sessionID, count)`)
  and runs `<root>/.opencode/agent/scripts/db/dump_session.cjs`. On dump
  FAILURE it appends `\nWARNING: pre-compaction dump failed for <sid> (<error>)`
  to the tool response (compact_memory.ts 543-544, appended at 592/624); on dump
  SUCCESS it appends nothing. The smoke's fresh sandbox
  (scratchpad subdir, `_smoke_base.mjs` `freshSandbox`) has NO
  `.opencode/agent/scripts/db/dump_session.cjs` → spawn fails MODULE_NOT_FOUND
  → the WARNING line breaks the 4 byte-exact response comparisons.
- **The probe already solves this — mirror it:** `handover_probe.mjs`
  lines 1983-2015 — the S13 preamble places a stub script (`QC_FAKE_DUMP`,
  lines 1997-2012) at `<SANDBOX>/.opencode/agent/scripts/db/dump_session.cjs`
  BEFORE any dispatch, so the S13 byte-exact checks 87/90/97 stay green
  (comment at 1991-1996 explains exactly this). Read those probe lines as the
  reference shape; the stub can be byte-identical to `QC_FAKE_DUMP` (it is a
  CJS script that takes `<sid> --out <rel>` and writes the marker file under
  `archive/sessions/`).

## What to change (the scope)
1. `.opencode/plugin/tests/compact_memory.smoke.mjs` — add the stub dump
   script placement right after the sandbox setup (before the first
   `withClient(...).exec`), mirroring the probe preamble. The stub must make
   EVERY dump in the smoke SUCCEED (so no WARNING is ever appended).
2. Add ONE new `chk` in the "self summarize success" section: after the
   dispatch + drain, `compaction_dumps/ses_sm_self_c0.md` exists under
   `path.join(SANDBOX, ".opencode", "archive", "sessions")` — pins that the
   hook fires on the tool path (not just the direct `preCompactionDump`
   calls the probe makes).
3. Update the smoke's header comment (lines 1-16) with ONE line: the sandbox
   carries a stub `dump_session.cjs` so the dump-hook (4512fe6) succeeds
   silently (mirrors the probe S13 preamble).
4. DO NOT touch: `.opencode/plugin/compact_memory.ts` (behavior is pinned by
   probe S13/S14 — the smoke adapts to the hook, never the reverse); the probe
   file; `_smoke_base.mjs` (if you find you need to change it, STOP and flag it
   in the handover instead); everything under `.opencode/agent/prompts/**`
   (edit-deny) and `.opencode/maintainer/**`.

## Definition of done (measured)
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` → exit 0, ALL checks
  PASS (the 4 former failures + the new one). Report the new total check count
  in the handover (old total = the count printed by the last `finish()` at HEAD;
  new = old + 1).
- Every OTHER smoke in `.opencode/plugin/tests/` still green (run each
  `*.smoke.mjs` in the folder).
- Standard gates UNCHANGED at HEAD baseline:
  - `node .opencode/plugin/probes/handover_probe.mjs` → 106/106 PASS
  - `pytest -q` → 459 passed + 1 warning (the known #10 coroutine warning)
  - `ruff check --select F .` → 0 findings
- `git status` clean after your commit (code + TODO.md close-note + handover in
  one commit per the commit routine).

## TODO.md bookkeeping
- Close-note on #63 (one line: fixed by smoke stub, commit hash) — leave the
  "DECISION NEEDED (optional)" paragraph in place (the smoke-in-standard-gate
  question stays open for the maintainer; it relates to #58).
- `todo_inbox.md`: append any out-of-scope findings (dated + role-tagged).

## Definition of NOT done (out of scope)
- No plugin behavior changes. No probe changes. No gate-definition changes
  (that is #58, maintainer-owned). No refactoring of the stub beyond what the
  byte-exact assertions require.
