# Worker Summary — TODO #73: R7.1 dedup-collapse pre-check (realistic nested doubling)

STATUS: DONE — gate green, repro torn down. (Replaces the R7-verification
summary; this is the #73 correction, inside the R7 staging approval.)
Commit: dce82ad (the code + probe + smoke + this summary); the commit-hash
note itself rides a one-line follow-up bookkeeping commit.

## What changed
1. **Core** (`intercept_observer_core.ts`, after `matchNearPathSegments`,
   end of file): new PURE exported helper `collapseAdjacentDup(absPath)` —
   splits the ABSOLUTE path on backslash-or-slash, finds the FIRST adjacent
   identical FOLDER pair (case-insensitive via `normPathForm` per segment;
   empty segments never qualify), removes ONE copy, returns the collapsed
   absolute path in the input's separator form (backslash-preserving, so
   mutation targets keep real case); `null` when no pair. Existence gate
   only, applied by the caller (no file-vs-dir gate).
2. **Hook** (`intercept_observer.ts`): the dedup pre-check in `runFuzzyRead`
   (right after the existsSync fast-path, BEFORE root/rel/corpus) and in
   `runFuzzyWrite` (per-field, same position): `collapsed =
   collapseAdjacentDup(abs); if (collapsed !== null && existsSync(collapsed))`
   → mutate the arg to the collapsed path + `fuzzy-resolved` with evidence
   `fuzzy kind=dedup scope=<read|write> orig=<arg> -> <collapsed-abs> d=0`
   (NO gap field — structural, not a distance match); else fail-closed
   fall-through to the unchanged seg/char matchers. The M1 dispatch guard
   (L653-era: `writeOwned && tool !== "write"`) is UNTOUCHED — `runFuzzyWrite`
   is never called for `write`, so a doubled `write` stays ZERO lines
   (pinned at 212 + 221).
3. **Probe S21** (`handover_probe.mjs`): re-pinned 210/211 (evidence now
   `kind=dedup … d=0`, mutation targets unchanged); added the realistic
   nested fixture (`seg\rn\OpenCodeProjects\{Free-Snap-Tap\TODO.md,
   SiblingProj\whatever.md}` — the shape the seg channel REJECTS: parent
   dir in the corpus → best at seg-d 2 → target at seg-d 1 → gap 1 < 2);
   added pins 218 (read doubled-nested, resolved + mutated), 219 (edit
   doubled-nested, resolved + mutated), 220 (read doubled-nested, collapse
   target ABSENT → not mutated + fuzzy-rejected, NO kind=dedup/seg), 221
   (write doubled-nested → NOT mutated + ZERO lines — M1 extends to the
   dedup pre-check). S21 8→12; header annotation + EXPECTED OUTPUT updated
   to S21=12, 216→220 (annotation == machine count).
4. **Smoke 8g** (`intercept_observer.smoke.mjs`): re-pinned to
   `kind=dedup scope=write d=0` (mutation target unchanged). 37/37.

## MEASURED gate (all green)
- probe: `PROBE handover: 220/220 PASS` (annotation == machine count;
  expected 216→220 ✓)
- smoke: `INTERCEPT_OBSERVER_SMOKE: ALL PASS (37/37)`
- pytest: `459 passed, 1 warning`
- ruff `--select F`: `All checks passed!` (F=0)
- Baseline re-verified BEFORE any edit (216/216 + 37/37 + 459+1w + F=0 at
  HEAD d627403/24daf1e state) ✓
- Repro `r7_realistic_repro.mjs`: PRE — all 3 cases `fuzzy-rejected`
  (not mutated) ✓; POST — CASE 0 read + CASE 2 edit resolved (mutated to
  `Projects\OpenCodeProjects\Free-Snap-Tap\TODO.md`, lines carry
  `fuzzy kind=dedup scope=read|write … d=0`), CASE 1 read stays rejected
  (not mutated, char-form `fuzzy-rejected`, no kind=dedup) ✓. Repro file
  DELETED (torn down) ✓.

## Re-pins touched (exhaustive list)
- Probe S21 210 (read dd\dd\real-a.txt → kind=dedup scope=read d=0)
- Probe S21 211 (edit dd\dd\real-a.txt → kind=dedup scope=write d=0)
- Probe S21 header comment + EXPECTED OUTPUT annotation (S21=12, 220/220)
- Smoke 8g (edit sx\sx\real-a.txt → kind=dedup scope=write d=0)
- NO other existing pin changed (S1–S20 + S5 hygiene all green unchanged —
  if one had, a fixture would carry an adjacent identical pair; none did).

## Deviation from spec (note, not a bug)
The spec's literal re-pin strings (full byte-exact evidence equality)
cannot match the LOG field: every log field is cap-truncated at
MAX_FIELD_CHARS=160 (`flattenField`, the `...` marker) and the new evidence
carries TWO absolute paths (≈219–281 chars) → always truncated. The pins
therefore build the expected field via `ioCore.flattenField(<spec's
byte-exact format string>)` / `core.flattenField(…)` — the SAME pure helper
the hook's log path applies — so the pin still verifies the spec's
byte-exact format string (plus the deterministic cap truncation) and the
mutation target pins the collapse destination separately. If the planner
wants the decision-record spec text amended to match, that's a one-line
note (left to the planner — the spec file is not mine to edit).

## Deliberately NOT done
- No live acceptance run (spec DO-NOT-TOUCH — the live check rides the
  planner's one-shot restart).
- No change to `matchNearPathSegments`/`matchNearPath`/`segmentDistance`,
  the 9-verdict vocabulary (kind=dedup is an EVIDENCE flag; verdict stays
  `fuzzy-resolved`), the log 8-field layout, the corpus builder, the M1
  dispatch guard, or the pytest suite.
- No `TODO.md` entry: nothing unresolved. (The deviation note above rides
  this summary instead; if the planner wants it as a todo_inbox item, it
  was not appended — it is a spec-wording matter, already surfaced here.)
- Maintainer live files in the worktree (`.opencode/maintainer/**`,
  `opencode.jsonc`) left untouched and un-staged.
