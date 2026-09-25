# Worker summary — TODO #95 sub-item (2): the mutating edit-fuzzy oldString (FINAL — LANDED)

## Executive summary
The (2) MUTATING edit-fuzzy `oldString` channel (normalize-then-compare) is
complete: on the 0-raw-occurrence miss path, exactly-one candidate at d=0 or
d≤1 → `oldString` is MUTATED to the file's exact unique bytes (the `fuzzy-edit`
verdict, VERDICTS = 12, NO after-hook hint — the edit succeeds without agent
action); else FAIL-CLOSED (the R6 hint verdict as today, carrying the best-
candidate d — directive a; the after-hook hint stored). Directive (b): the
feedback line is truncated (`truncEdit40` — first 40 chars + `...`), the FULL
payload stays in the R6 journal; the journal's edit `old` = the ORIGINAL,
pre-mutation `oldString` (captured in `onToolBefore` before the channel).
NO auto-retry (the §8 recovery discipline) — a single mutation.

## What changed
- `intercept_observer_core.ts` (commit 15761d8): `normEditBytes`,
  `resolveEditOldString` (+ the `EditResolution` type), `EDIT_FUZZY_MAX_D = 1`,
  the `fuzzy-edit` verdict (`VERDICTS` = 12), shared `prepContentQuery` /
  `contentCandidateStarts` factored out of `locateContent` (locateContent
  behavior unchanged — verified by the S26 locator pins).
- `intercept_observer.ts` (commit 15761d8): `runEditFuzzy` supersedes
  `runEditHint` for the 0-raw case (1-raw silent + >1 `edit-ambiguous`
  UNCHANGED); the mutated `oldString` is an exact UNIQUE file substring
  (machine-checked); `appendJournal` gained the 4th param `editOldOriginal`
  (the journal's edit `old` = the original pre-mutation `oldString`);
  `truncEdit40` (directive b).
- `intercept_observer.smoke.mjs` (commit 15761d8): VERDICTS 12 + core-surface
  pin, (10e)/(10h)/(10i) re-pinned (mutation + no enrichment + journal
  original), new (11) section (11a CRLF d=0, 11b trailing-ws d=0, 11c typo
  d=1, 11d near-miss best-d=3, 11e ambiguous two-d≤1, 11f directive-b long
  truncation + full journal).
- `handover_probe.mjs` (this commit): check 171 re-pinned (VERDICTS 12);
  S26 re-pins 271 (absent `oldString`, single d=1 → now MUTATES: the byte-
  exact `fuzzy-edit` line + `h1.oldString` mutated to the file's exact
  bytes), 275 (after-hook re-pointed at the FAIL-closed c273 no-candidate —
  c271 stores no hint; enrichment `hint reason=no-anchor-line`), 276 (DoD
  re-pointed at c273 — the journal's edit `old` = the ORIGINAL `oldString`;
  the write-payload `cp` check stays). NEW S27 section (8 checks, 277-284,
  after 276 / before the S5 hygiene): CRLF-drift d=0 mutate (exact-unique
  substring), trailing-ws d=0, single-typo d=1, fail-closed near-miss
  (best d=3 — the fail line carries `best-d=3`), ambiguous two-d≤1 (`hint
  cands=1 1,2 1`, not mutated), directive (b) (truncated line + FULL
  original in the journal), after-hook (mutate → no enrichment; fail →
  enrichment consumed once), the mandatory `fuzzy-edit` line shape
  byte-exact (8 fields). Header: S26 TOC re-pins + the S27 TOC block + the
  EXPECTED OUTPUT line (section sum MACHINE-COMPUTED via node: 279 + 8 =
  287).
- `research/fuzzy-numword/spec_sub2_edit_fuzzy_oldstring.md` (this commit):
  the pinned design (verbatim copy of the task spec).
- `research/fuzzy-numword/decision-record.md` (this commit): §8.2 LANDED
  addendum (mirrors the §8.1 style).
- `TODO.md` (this commit): #95 status → sub-item (2) LANDED (code commit
  15761d8 recorded; the probe/docs commit hash = this worker's final commit
  — no self-reference in the file itself).

## Measured gate (2026-09-25)
- `node .opencode/plugin/probes/handover_probe.mjs` → **287/287 PASS**
  (baseline 279 + S27's 8; header self-annotation machine-updated).
- `node .opencode/plugin/tests/intercept_observer.smoke.mjs` → 55/55 ALL PASS
  (from 48/48).
- `./.venv/Scripts/python.exe -m pytest -q` → 459 passed, 1 warning.
- `./.venv/Scripts/ruff.exe check --select F .` → F=0.

## Commits
- `15761d8` — code + smoke (the (2) channel; landed before this session's
  resume).
- (this commit) — probe S27 + the S26 re-pins + check 171 + the header
  self-annotation + the docs + TODO #95 status + this handover.

## TODO entries
- #95: status block appended (sub-item (2) LANDED; code commit 15761d8;
  next = sub-item (3) R3). No new entries appended to todo_inbox.md.

## Deliberately NOT done
- NO auto-retry (the single-mutation discipline) — untouched.
- R2 write-scope, R8 sandbox redirect (#97), the read-scope fuzzy,
  `ctx_watchdog.ts`, `AGENTS.md`, `.opencode/maintainer/`, `opencode.jsonc`
  — untouched.
- The journal files stay git-ignored (probe 270 + 64 verify the rule).
- `opencode.jsonc`, `.opencode/maintainer/priority.md`,
  `.opencode/agent/prompts/repo/repo_opencode.md` — never staged; the
  loop_log was NOT committed.
- 272 / 273 / 274 UNCHANGED (no mutation — not exactly-one / no candidate);
  268 (the exact-1 silent path) unchanged.
