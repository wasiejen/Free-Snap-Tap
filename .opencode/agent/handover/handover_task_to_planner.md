# Worker handover — plan18 / #100: remove the numword escape channel

**Status: DONE — gate green, all DoD items met.**
worker-18 `worker_Q3S_245K_slow`, session ses_f24f0a902ffe4WVaIf7ceNLMWb,
2026-09-26.

## What changed (commit bc374b2, 7 files)
1. **Core** (`intercept_observer_core.ts`): removed `ESCAPE_RE`, `EscapeHit`,
   `resolveEscapeSafe`, `resolveEscapes` (the whole L445-506 block) —
   pure deletion, nothing else in core touched.
2. **Plugin** (`intercept_observer.ts`): removed `runEscapeContent` + its
   doc block, the `onToolBefore` escape wiring (pre-escape capture +
   `escapeForms` computation), the `escapeForms` param of `appendJournal` +
   its `pre-escape=<JSON>` suffix, the `kind=escape` observation lines, the
   `resolveEscapes` import, and every stale escape comment (header (3a)
   exception, verdict vocabulary, R8/pipeline/edit/after-hook/journal
   comments). The R8 redirect channel, pair/fuzzy channels, R6 journal
   (5-field line unchanged), noteCache/storeNote/onToolAfter delivery and
   the `truncEdit40` helper all remain (truncEdit40 is still used by the
   edit-fuzzy channel).
3. **Tests**:
   - smoke: removed the (8h) pair of escape pins + the 4 pins (13a-13d).
     REPURPOSED the 13-style note-delivery pins to the R8 redirect note —
     new (13a) R8 read-sibling redirect → after-hook delivers the byte-exact
     redirect note in the tool result (also on success), (13b) no-note call
     leaves output byte-identical, (13c) note consumed once.
   - probe: removed S24 entirely (checks 240-245, `n24` counter, the index
     entry); section-sum annotation updated 303 → 297 (recomputed via
     script, not by eye).
4. **Knowledge**: `git mv` research/fuzzy-numword/primer.md →
   knowledge/fuzzy-numword/primer.md (rename preserved, 89 % similarity);
   escape bullet annotated `REMOVED 2026-09-25, #100`, the "except the
   escape, below" pointer dropped, the stale "decision-record.md NEXT TO
   THIS FILE" pointer fixed to name the research area; new subfolder
   `README.md` (17 lines: purpose / what goes here / what does NOT /
   provenance rule) + one line in the `knowledge/README.md` Files index.
   All in the SAME commit (spec requirement). NOT added to AGENTS.md
   (maintainer ruling).

## Measured verification (post-change, standard gate)
- **intercept smoke: 64/64 PASS** (baseline 67/67; −6 escape pins, +3
  repurposed note pins).
- **probe: 297/297 PASS** (baseline 303; −6 S24 pins; the self-annotation
  `PROBE handover: 297/297 PASS` agrees with the header section-sum line).
- **pytest: 459 passed, 1 warning** (baseline 459+1w — unchanged).
- **ruff `check --select F .`: All checks passed** (F=0, baseline F=0).
- **Grep-clean** across `.opencode/plugin` (*.ts, *.mjs): `ESCAPE_RE`,
  `runEscapeContent`, `kind=escape`, `pre-escape=`, `resolveEscape` →
  zero hits.
- `numwords.json` untouched; pair/fuzzy pins unchanged and green; the
  R8 redirect note is delivered (smoke (13a) green).

## Commits
- `bc374b2` — the whole task (code + tests + knowledge, 7 files,
  84 insertions / 493 deletions). The commit was amended ONCE after
  creation: the primer annotations + README + index line landed in the
  index after `git mv`, and the spec requires them in the SAME commit as
  the primer move — the final hash above is the one to reference.

## TODO entries
- #100 **Status → LANDED** in `TODO.md` (rides this final commit, with the
  measured numbers + commit hash). No new TODO entries needed — nothing
  was found that is out of scope / unfixable. (R3, #95 sub-item 3, remains
  open as before — untouched by this task.)

## Deliberately NOT done
- No plugin registration change (`opencode.jsonc` is the maintainer's
  domain — nothing registered).
- No behavior change beyond the escape removal: the note mechanism,
  R6 journal line shape, R1/R2/R6/R7/R8 channels, auto_resume /
  compact_memory / context_recovery / block_transfer, FST code,
  `.opencode/maintainer/**` all untouched.
- The primer's escape section was annotated, not deleted (historical
  record per the spec).
- `TODO.md` #100 was status-updated, not curator-closed (planner curation).

## Lessons
- For 100+-line block removals, prefer `block_transfer` DELETE/CUT with
  short unique line-prefix anchors over `edit` with a giant oldString —
  exact-literal reproduction from memory is a transcription risk
  (hit once on the S24 probe block; fell back to anchors).

## Context gauge (verbatim)
SESSION=ses_f24f0a902ffe4WVaIf7ceNLMWb CTX=120123 (49%) REM=124877 | 1 compaction left
