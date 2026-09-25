# Worker summary — TODO #95 sub-item (2): the mutating edit-fuzzy oldString (IN PROGRESS — compact checkpoint)

## What's done (committed 15761d8)
- `intercept_observer_core.ts`: `normEditBytes`, `resolveEditOldString` (+ `EditResolution`),
  `EDIT_FUZZY_MAX_D = 1`, the `fuzzy-edit` verdict (VERDICTS = 12), shared
  `prepContentQuery` / `contentCandidateStarts` factored out of `locateContent`
  (locateContent behavior unchanged — verified by the S26 locator pins).
- `intercept_observer.ts`: `runEditFuzzy` supersedes `runEditHint` (1-raw silent + >1
  edit-ambiguous unchanged; 0-raw → the (2) matcher: exactly-one d=0 or d≤1 →
  MUTATE `output.args.oldString` to the file's exact unique bytes + the
  `fuzzy-edit orig=<40> len=<n> d=<0|1> value=<40>` line, NO after-hook hint;
  else fail-closed → the R6 hint verdict as today, the no-candidate line gains
  ` best-d=<n>` when candidates exist). The journal's edit `old` = the ORIGINAL
  pre-mutation oldString (captured in `onToolBefore` before the channel, passed
  to `appendJournal(tool, sid, args, editOldOriginal)`).
- `intercept_observer.smoke.mjs`: VERDICTS 12 + core-surface pin, (10e) re-pinned
  (d=1 → mutation), (10h) re-pinned (mutate → no enrichment; c10g fail-closed →
  enrichment), (10i) re-pinned (journal `old` = original), new (11) section
  (11a CRLF d=0, 11b trailing-ws d=0, 11c typo d=1, 11d near-miss best-d=3,
  11e ambiguous two-d≤1, 11f directive-b long truncation + full journal).
  **Smoke green 55/55** (was 48/48).

## What's left (resume from here)
1. **Probe** `.opencode/plugin/probes/handover_probe.mjs`:
   - S26 re-pins: 271 (now `fuzzy-edit` line byte-exact
     `fuzzy-edit orig=alpha 20260915 betaa len=20 d=1 value=alpha 20260915 beta` +
     `h1.oldString` mutated to `alpha 20260915 beta`), 275 (re-point the
     after-hook at a FAIL-closed call — c273 no-candidate: enrichment
     `Error: oldString not found\nhint reason=no-anchor-line`), 276 (re-point at
     c273: journal `old` = `alpha 20260915 beta` original, `new` = `z`, filePath
     = he.txt; the line check becomes the no-candidate one; the write-payload cp
     check stays).
   - NEW S27 section (8 checks, numbered 277-284, `let n27 = 277`), inserted
     after check 276 / before the S5 hygiene section; reuse the S26 io* vars
     (ioBefore/ioAfter/ioReadLines/ioCore/ioJEditLog/ioJPayload/ioStampRe,
     sandbox ioSandboxProj/ioHintDir). Suggested checks: 277 CRLF-drift d=0
     mutate (line + mutation + exact-unique substring), 278 trailing-ws d=0,
     279 single-typo d=1, 280 fail-closed near-miss `best-d=3` (not mutated),
     281 ambiguous two-d≤1 (`hint cands=1 1,2 1`, not mutated), 282 directive (b)
     long oldString truncated line + journal full original, 283 after-hook
     (mutate call → no enrichment; fail call → enrichment consumed once),
     284 the fuzzy-edit line shape byte-exact (a dedicated check on one of the
     mutate calls). ALL fixture strings were MACHINE-VERIFIED in
     `$TMP/opencode/f2_verify.mjs` + `f2_verify2.mjs` (scratchpad) — the exact
     evidence strings are in the smoke (11) section, copy from there.
   - Header: add the S27 TOC block (after the S26 TOC, lines ~684-719) + update
     the EXPECTED OUTPUT line (`S26=20 S27=8 hygiene=6`) — MACHINE-COMPUTE the
     section sum (node one-liner), do not retype. New total 287.
   - Note: S26 275/276 re-points change no hygiene tally (observer hooks don't
     write the watchdog plugin.log).
2. **Docs** (part of this commit track): copy the design into
   `.opencode/agent/research/fuzzy-numword/spec_sub2_edit_fuzzy_oldstring.md`
   (from `.opencode/agent/handover/handover_task.md`) + a decision-record
   `§8.2 LANDED addendum` (mirror the §8.1 style; gates: probe total, smoke
   55/55, pytest + ruff).
3. **Final gate**: `./.venv/Scripts/python.exe -m pytest -q` (459+1w),
   `./.venv/Scripts/ruff.exe check --select F .` (F=0), the probe (new total).
4. **TODO.md** #95 status: sub-item (2) LANDED (commit hash in the FINAL
   handover — the planner records it; note the 15761d8 code commit here).
5. Final `handover_task_to_planner.md` rewrite (executive summary, measured
   gate, commits, TODO entries, what was NOT done: no auto-retry, R2/R8/R3
   untouched, journal git-ignored, maintainer files never staged).
6. Friction check via `submit(feedback=...)` before the handoff.

## Baselines (measured 2026-09-25)
- Smoke 55/55 (green). Probe 279/279 (pre-S27; grows to 287 with S27).
  pytest 459 passed + 1 warning, ruff F=0 (pre-change — re-verify at the gate).
- NEVER stage: `.opencode/maintainer/priority.md`, `opencode.jsonc`,
  `.opencode/agent/prompts/repo/repo_opencode.md`, the loop_log files.
- Task spec: `.opencode/agent/handover/handover_task.md` (the pinned design).
- Design source: `research/fuzzy-numword/decision-record.md` §8 + §8.1 (the
  LANDED addendum style to mirror).
