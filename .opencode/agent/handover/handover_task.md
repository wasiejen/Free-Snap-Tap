# Task spec — TODO #95 sub-item (2): the mutating edit-fuzzy oldString (normalize-then-compare)

## Goal
The edit `oldString` exact-match failure is a very regular problem. R6 (sub-item 1,
LANDED `acb6323`) added the content-locator (`locateContent`), the payload journal,
and the observation-only edit-hint channel. This sub-item (2) makes that channel
**MUTATING**: when the exact raw `oldString` is absent (0 occurrences), normalize BOTH
sides, resolve a unique candidate, and mutate `oldString` to the file's exact bytes so
the edit succeeds without agent action. The CRLF/LF + trailing-whitespace drift class is
unbounded in length (a 40-line CRLF drift = 39 chars, beyond any proportional cap) —
normalization removes it exactly, so a proportional distance bar is REJECTED.

Design source: `research/fuzzy-numword/decision-record.md` §8 (read first — the R6
reasoning is there) + this spec. Verify line refs against the current source.

## Pinned design (agreed 2026-09-25 — his GO; normalize-then-compare CONFIRMED over the
proportional d)
The channel fires on `edit` ONLY, AFTER the escape/pair/fuzzy channels (it sees their
effective result), on the **0-raw-occurrence miss path**:

1. **Count the raw occurrences** of the effective `oldString` in the target file:
   - exactly 1 → SILENT (the edit will succeed; no line, no mutation, no after-hook hint).
   - >1 → `edit-ambiguous` (raw multiple — the edit tool will reject; the after-hook
     hint is stored). Unchanged from R6.
   - 0 → run the (2) matcher below.
2. **(2) matcher — normalize-then-compare:** get the candidate block starts — REUSE the
   R6 content-locator candidate generation (anchors = the `oldString`'s distinctive /
   longest non-dense lines; multi-line anchor = first + last; all-dense → bounded
   whole-file scan under the 256 KiB cap; factor `locateContent`'s candidate-start
   generation if it is not already a shared helper). For each candidate block, normalize
   BOTH sides — the query's lines and the file's lines — by: `\r\n`→`\n` (the `split(/\r?\n/)`
   already does this) + strip per-line trailing whitespace. d = the MAX Levenshtein over
   the scored line-pairs (the same scored-line rule as `locateContent`).
3. **Mutation bar (hierarchical — the #72/M1 strict discipline, NO auto-retry):**
   - exactly ONE candidate at **d=0** → MUTATE `oldString` to the file's EXACT bytes for
     that block.
   - else exactly ONE candidate at **d≤1** (i.e. d=1) → MUTATE `oldString` to the file's
     EXACT bytes for that block.
   - else → FAIL-CLOSED (no mutation): the R6 hint verdict (`edit-hint` /
     `edit-ambiguous` / `no-candidate`) fires and the after-hook hint is stored (the
     edit fails as today).
4. **The mutated `oldString`** must be an exact, UNIQUE substring of the file (the edit
   tool's raw `indexOf` then succeeds); it covers the candidate block's lines with the
   file's own line terminators. The exact slice is the worker's call — the probe verifies
   (1) `fileText.indexOf(mutated) !== -1` and (2) uniqueness (the edit would find exactly
   one occurrence).
5. **NO auto-retry** beyond the single mutation (the §8 recovery discipline). The R6
   journal stays the recovery fallback.

## The two directives (folded into this spec, 2026-09-25)
(a) **Every attempt is logged** — resolutions AND failed resolutions. The log line carries
    the best-candidate d (a near-miss d<10 is visible; there is NO d bar on logging).
(b) **The return feedback does NOT carry the full `oldString`** (context saving): a
    truncated identifier — first ~40 chars + length + d + target. The FULL payload stays in
    the R6 journal. The journal's edit `old` field = the **ORIGINAL, pre-mutation**
    `oldString` (the recovery fallback captures what the model asked for, NOT what the
    interceptor mutated to).

## Mandatory log line (kind=fuzzy-edit, his return-info ruling)
- MUTATED: verdict `fuzzy-edit` (NEW — appended to `VERDICTS`, 12 total); evidence
  (field 6) `fuzzy-edit orig=<first ~40 chars> len=<n> d=<0|1> value=<first ~40 chars of
  the target>`; context `edit oldString`. `oldString` is mutated to the file's exact bytes;
  NO after-hook hint is stored (the edit succeeds).
- FAIL-CLOSED: the R6 verdict (`edit-hint` / `edit-ambiguous` / `no-candidate`) fires as
  today, CARRYING the best-candidate d (directive a — the `no-candidate` line gains the
  best-d when candidates exist); the after-hook hint is stored.

## Re-pins (S26 — the R6 hint checks that now resolve to mutations)
- 271 (absent `oldString`, single candidate d=1 → was `edit-hint`): now MUTATES →
  `fuzzy-edit` line + `output.args.oldString` mutated to the file's exact bytes.
- 275 (after-hook enrichment, referenced callID c271): c271 is now a mutation (no hint
  stored) → re-point at a FAIL-closed call that stores a hint (the no-candidate or
  ambiguous case).
- 276 (DoD machine check, "the controlled FAILED edit 271"): re-point at a fail-closed
  call; the journal-payload `cp` check stays (the journal now records the ORIGINAL
  `oldString`).
- 272 (raw multiple → `edit-ambiguous`) and 274 (fuzzy ambiguous, two candidates same d)
  are UNCHANGED (no mutation — not exactly-one). 273 (no-candidate, anchor absent) is
  UNCHANGED (no candidate → no best-d).

## New checks (S27 section)
- CRLF-drift: `oldString` LF, file CRLF (same content, 0 raw) → d=0 → MUTATE to the
  file's CRLF bytes → `fuzzy-edit` line d=0 + the mutated `oldString` is an exact unique
  file substring.
- Trailing-whitespace drift: `oldString` line has trailing ws, file line does not (or
  vice versa) → d=0 → MUTATE.
- Single-typo: `oldString` 1 char wrong, exactly one candidate at d=1 → MUTATE →
  `fuzzy-edit` d=1.
- Fail-closed near-miss: best d e.g. 3 → NOT mutated → the fail line carries `d=3`
  (directive a).
- Ambiguous (two candidates at d≤1) → NOT mutated → `edit-ambiguous`.
- The mandatory `fuzzy-edit` line shape (byte-exact: kind + orig trunc + len + d + value
  trunc).
- Directive (b): the feedback line is truncated (first ~40 chars + length + d + target); a
  long `oldString` → the line does NOT carry the full `oldString`; the journal DOES (the
  journal edit `old` = the full original `oldString`).
- Silent path (exact-1 raw occurrence) → no line, no mutation, no hint (keep 268).
- After-hook: mutate → no enrichment (no hint stored); fail → enrichment (hint stored).

## DoD
- A controlled CRLF-drift edit and a controlled single-typo edit both resolve WITHOUT
  agent action (the mutation + the `fuzzy-edit` log line; machine-checked the mutated
  `oldString` is an exact unique file substring).
- A controlled fail-closed case (near-miss d>1 / ambiguous / no-candidate) does NOT
  mutate (the fail line carries the best-candidate d; the after-hook enrichment fires).
- Directive (a): every attempt (resolve + fail) is logged with the best-candidate d.
  Directive (b): the feedback is truncated, the full payload is in the journal.
- The journal's edit `old` field = the ORIGINAL (pre-mutation) `oldString`.
- Probe green at the new self-annotation total (S27 added + the S26 re-pins);
  intercept_observer smoke green (re-pinned + new checks); standard gate green (pytest +
  ruff).

## Approval boundary
- PRE-APPROVED (his GO, 2026-09-25): the normalize-then-compare MUTATING design + the two
  directives. This is a mutating channel (observable behavior change) — his confirmation
  covers it.
- DO-NOT-TOUCH: auto-retry (the mutation is a SINGLE mutation, no retry), the R2
  write-scope surfaces, R8 (sandbox redirect — the #97 sub-item, separate), the read-scope
  fuzzy, `ctx_watchdog.ts`, `AGENTS.md`, `.opencode/maintainer/`, `opencode.jsonc`; the
  journal files stay git-ignored.

## Scope
- `.opencode/plugin/intercept_observer_core.ts` — `normEditBytes`, `resolveEditOldString`
  (+ the `EditResolution` type), the new `fuzzy-edit` verdict (`VERDICTS` → 12), the
  candidate-generation reuse from `locateContent`, `EDIT_FUZZY_MAX_D = 1`.
- `.opencode/plugin/intercept_observer.ts` — `runEditFuzzy` (the mutating channel; it
  supersedes the R6 `runEditHint` hint path for the 0-occurrence case — the 1-occurrence
  silent and >1 `edit-ambiguous` cases stay), the pipeline integration, the journal's
  edit `old` = the original `oldString` (capture it before the mutation and pass it to the
  journal — the journal currently reads `output.args` post-mutation).
- `.opencode/plugin/tests/intercept_observer.smoke.mjs` — re-pins + new checks.
- `.opencode/plugin/probes/handover_probe.mjs` — S27 section (new) + the S26 re-pins
  (271 / 275 / 276) + the header self-annotation total.
- `.opencode/agent/research/fuzzy-numword/` — a copy of this design as
  `spec_sub2_edit_fuzzy_oldstring.md` (the worker creates it) + a decision-record §8.2
  addendum (the landed design; the planner finalizes the wording).

## Worker
`worker_Q3S_170K`.
