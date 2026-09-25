# Worker handover — TODO #97 (R8 redirect + escape return-info) — worker-17

**STATE: COMPLETE (both units green; code-only checkpoint commits + this final handover).**
Session ses_f271155b4ffeIWwbQEekkRQRA6. Branch: `opencode_test` (verified at start; never switched).

## Commits (code only, per verified unit)
- **Unit 1** `07bdd56` "R8 (#97) unit 1 complete: redirect pins + fallback/note fixes" —
  core resolver + plugin wiring + smoke R8 section (12a–12i) + probe S28 (12 checks) +
  the three Unit-1 bug fixes (config-unreadable fallback root, `observeSandbox`
  extra-roots recompute, smoke 12i sibling-ambiguity target).
- **Unit 2** `0d9b8e6` "R8 (#97) unit 2: escape return-info (after-hook feedback note + journal pre-escape)" —
  `runEscapeContent` callID + per-field feedback note (truncated first form + count +
  intercept.log/journal pointers); `appendJournal` trailing `pre-escape=<JSON>` field
  (only when non-empty — existing payload pins byte-identical); `onToolAfter` delivers
  noteCache notes for ANY tool, also on SUCCESS, hint first then notes (joined `\n`),
  consumed once; smoke section 13 (13a–13d).

## Per-unit change list
**Unit 1 (R8 redirect)** — allowed roots resolved ONCE at factory init from
`opencode.jsonc` (`permission.external_directory` "allow" keys `/**`-stripped +
`references.*.path` + workspace root; deduped via `normSandboxPath`; unreadable →
fallback [workspace root, `SCRATCHPAD_ROOT`]; never throws). Pure `resolveRedirect`
in core (case (i) span==root → root as configured; case (ii) direct sibling → root +
"/" + basename case-preserved; 0 or ≥2 matches after dedupe → null fail-closed).
`REDIRECT_PATH_FIELDS` (read/write/edit filePath + block_transfer srcFile/dstFile —
parallel table, `WRITE_PATH_FIELDS` untouched). `runRedirect` after the fuzzy
channels: mutates `output.args`, logs `kind=redirect tool=<t> arg=<field>
orig=<full> value=<full>` (reuses the pinned `pair-resolved` verdict — the 12-token
VERDICTS vocabulary is pinned), out-of-sandbox note recomputed on effective args
when fired, feedback note stored per callID. M1 note (code comment only): write
redirects target already-allowed paths — no new overwrite hazard class.

**Unit 2 (escape return-info)** — on a `kind=escape` mutation: `storeNote(callID,
"escape-resolved: <n> escape form(s) in <field> (first: <raw40> len=<L> -> <value>);
full pre-mutation forms: .opencode/temp/intercept.log (kind=escape) +
.opencode/temp/journal_<write|edit>.log")` (one note per mutated field,
content/oldString/newString order). Pre-escape CONTENT fields captured in
`onToolBefore` BEFORE mutation; per-field raw hit forms computed after;
`appendJournal(..., escapeForms?)` appends the trailing `pre-escape` field only when
non-empty. `onToolAfter`: failed-edit hint logic UNCHANGED (edit only), then
noteCache notes delivered for ANY tool (also on success), hint first then notes,
consumed once, best-effort. Scope: sentinel-carrying escape forms only — the plain
`[l:r]` pair channel and the R1/R2 fuzzy channels are untouched (ADDITIONS only).

## Measured gate (green at EACH unit)
Unit 1: smoke 63/63, probe 303/303, pytest 459 passed + 1 warning, ruff F=0.
Unit 2 (final): smoke **67/67**, probe **303/303**, pytest **459 passed + 1 warning**,
ruff **All checks passed (F=0)**. Baseline (pre-#97): probe 291/291, smoke 55/55,
pytest 459, ruff F=0.

## Smoke pin inventory (added)
- R8 (Unit 1, section 12, 8 pins): 12a pure resolver (dedupe / two-roots null /
  no-mapping null); 12b read-sibling redirect (arg mutated + kind=redirect byte-exact
  + no out-of-sandbox); 12c write-sibling (exactly one new line); 12d span==SCRATCHPAD
  root case-variant; 12e nested non-sibling (no mutation, no line); 12f config-read
  second factory (crafted opencode.jsonc: `/**` twin dedupe + references root);
  12g sibling-of-two-roots fail-closed (no mutation + note fires); 12h single-root
  config sibling (mutated + byte-exact); 12i span==root case-variant + references
  sibling.
- Escape return-info (Unit 2, section 13, 4 pins): 13a escape write (content
  resolved + after-hook note byte-exact truncated first form + journal trailing
  pre-escape field); 13b escape edit old+new (both resolved + failed-edit HINT fires
  FIRST then the two notes oldString/newString + journal pre-escape carries both
  forms); 13c no-escape call → NO note (output byte-identical); 13d note consumed
  once (second after call untouched).
- Probe S28 (Unit 1, 12 checks 285–296): 7 pure resolver + 5 e2e.

## TODO entries
- None appended to `todo_inbox.md` by this worker (no out-of-scope findings).
- TODO.md #97: left for the planner to mark LANDED (per spec, the planner records the
  hashes in its bookkeeping commit). Worker code commits: `07bdd56`, `0d9b8e6`.

## Deliberately NOT done / decisions (for planner sign-off)
- **Probe section label**: spec said "S18-adjacent section (established pattern)" —
  I placed it as `S28` AFTER S27 / before S5 hygiene (the established append pattern
  of S26/S27; inserting physically next to S18 would shift S19–S27's check-number
  counters). Flagging in case the planner meant a literal S18-adjacent block.
- **Redirect line verdict**: reuses `pair-resolved` (the `kind=escape`/`kind=dedup`
  precedent — the 12-token VERDICTS vocabulary is pinned by smoke/probe, so no new
  token).
- **Redirect feedback note text** = the `kind=redirect` evidence string (unpinned by
  spec; paths kept in full — not a dense payload).
- **13b failed-edit hint token** = `d-too-high best-d=11` (the code's fail-closed
  reason for a 0-occurrence edit whose best-candidate d is above the threshold —
  deterministic; the pin encodes the spec's DoD "hint behavior unchanged" via the
  existing (10h) pin, and 13b pins the hint-FIRST ordering + both notes).

## NOT touched (per DO-NOT-touch)
opencode.jsonc, compact_memory.ts (only imported), auto_resume/compact_memory/
context_recovery/block_transfer/loop_log, FST code, maintainer files (left dirty as
found), R1/R2/R6 logic (ADDITIONS only — no restructuring of existing channels).
