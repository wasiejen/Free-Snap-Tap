# Task Spec — TODO #73: R7 dedup-collapse pre-check (realistic nested doubling)

STATUS: READY TO LAUNCH 2026-09-17, direct session
ses_f510a05ceffeE6SnMBlvti40DE. R7 (ee19a84) landed + verified (probe
216/216 + smoke 37/37). This is the #73 CORRECTION to R7 (inside the R7
staging approval, decision-record §5): make the realistic nested doubling
resolve. Stay on the current checkout (opencode_test). Design source:
TODO.md #73 (self-contained).

## Goal
Add a STRUCTURAL "dedup-collapse" pre-check to the read + write fuzzy
dispatch: if the arg's ABSOLUTE path contains an adjacent identical folder
pair (case-insensitive), collapse one copy; if the collapsed path EXISTS,
resolve to it (a `kind=dedup` evidence line) BEFORE the corpus matchers; else
fail-closed and fall through (the existing seg/char matchers, unchanged). This
catches the realistic nested doubling (`OpenCodeProjects/OpenCodeProjects/…`)
that the R7 segment channel REJECTS (the corpus contains the target's parent
DIR at seg-d=2 → the target at seg-d=1 → gap 1 < FUZZY_MIN_GAP=2).

## Verified facts (measured at spec time 09-17, HEAD 24daf1e — build on these)
- Baseline: probe **216/216**, smoke **37/37**, pytest **459+1w**, ruff
  **F=0**. Re-verify by RUNNING before any edit (mismatch → STOP + report).
- Repro (scratchpad `r7_realistic_repro.mjs`): all 3 cases `fuzzy-rejected`
  (NOT mutated) today. After the fix: CASE 0 read `…/OpenCodeProjects/
  OpenCodeProjects/Free-Snap-Tap/TODO.md` (collapsed target EXISTS) + CASE 2
  edit (same path) MUST resolve; CASE 1 read `…/OpenCodeProjects/
  OpenCodeProjects/TODO.md` (collapsed target ABSENT) MUST stay rejected.
- Root cause (measured): detect the doubling on the ABSOLUTE path, NOT the rel
  path — `nearestExistingDir` absorbs one doubled folder into the root, so the
  rel path has no adjacent identical pair.
- Core (intercept_observer_core.ts, 784 lines): `matchNearPathSegments` ends
  at L784 (last export); add the new helper AFTER it. Reuse `normPathForm`
  (L555) for normalization; split segments on `/` or `\`.
- Hook (intercept_observer.ts, 682 lines): `runFuzzyRead` L297 (existsSync
  fast-path L304, root/rel/corpus L305-308, seg matcher L315-326);
  `runFuzzyWrite` L464 (per field: existsSync fast-path L474, root/rel/corpus
  L475-478, seg matcher L484-496). The M1 guard is L653 (`writeOwned && tool
  !== "write"` → runFuzzyWrite is never called for `write`).
- Existing doubled-segment pins RE-PIN (their collapse target EXISTS in the
  fixture → the dedup fires first): probe S21 210 (L4358, read `dd\dd\
  real-a.txt`, target fixture L4352) + 211 (L4379, edit) → evidence changes
  `kind=seg … d=1 gap=2` → `kind=dedup … d=0` (mutation target UNCHANGED).
  Smoke 8g (L279-297, edit `sx\sx\real-a.txt`, fixture L284) → same re-pin.
  All other S21 pins (212-217) are UNCHANGED (212 write=zero lines; 213/215/
  216/217 are pure `matchNearPathSegments` calls; 214 has no adjacent pair).

## What to build
1. CORE: add a PURE exported helper `collapseAdjacentDup(absPath: string):
   string | null` — split the absolute path into segments (backslash-or-
   slash), find the FIRST adjacent identical pair (case-insensitive), remove
   ONE copy → return the collapsed absolute path; return `null` if no such
   pair. Existence gate only (no file-vs-dir gate — consistent with the
   corpus matchers, which return both).
2. HOOK: in `runFuzzyRead` (right after the L304 existsSync fast-path, before
   root/rel/corpus) and `runFuzzyWrite` (right after the per-field L474
   existsSync fast-path): `const collapsed = collapseAdjacentDup(abs); if
   (collapsed !== null && existsSync(collapsed)) { mutate the arg to
   `collapsed`; log the line; return/continue; }` else fall through
   (unchanged). Evidence format (byte-exact, deterministic): `fuzzy
   kind=dedup scope=<read|write> orig=<arg> -> <collapsed-abs> d=0`
   (scope=read in runFuzzyRead; scope=write in runFuzzyWrite; `<collapsed-abs>`
   = the existing path the collapse lands on; NO gap field — structural, not a
   distance match).
3. PROBE S21 (handover_probe.mjs L4327+): (a) RE-PIN 210/211 evidence →
   `fuzzy kind=dedup scope=read|write orig=${ioSegDir}\dd\dd\real-a.txt ->
   ${ioSegDir}\dd\real-a.txt d=0` (mutation target unchanged). (b) ADD a
   realistic-nested fixture under the S21 sandbox: a target whose PARENT DIR
   is a corpus entry + a sibling project (replicating the repro: `…/
   OpenCodeProjects/Free-Snap-Tap/TODO.md` + `…/OpenCodeProjects/SiblingProj/
   whatever.md`). (c) ADD 4 new pins: (i) read doubled-nested (collapsed
   target exists) → `kind=dedup scope=read` resolved + mutated; (ii) edit
   doubled-nested → `kind=dedup scope=write` resolved + mutated; (iii) read
   doubled-nested where the collapsed target is ABSENT → stays
   `fuzzy-rejected` (NO kind=dedup line); (iv) write doubled-nested → NOT
   mutated + ZERO lines (M1 extends to the dedup pre-check). (d) Update the
   S21 section count (8 → 12) + the probe header annotation total (216 → 220)
   to the new machine-verified count.
4. SMOKE (intercept_observer.smoke.mjs): RE-PIN 8g (L279-297) evidence →
   `fuzzy kind=dedup scope=write orig=${proj}\sx\sx\real-a.txt -> ${proj}\sx\
   real-a.txt d=0` (mutation target unchanged). Smoke stays 37/37.

## Definition of done (measurable)
- Run `scratchpad/r7_realistic_repro.mjs`: CASE 0 read + CASE 2 edit →
  resolved (kind=dedup); CASE 1 read → stays rejected. Confirm all 3.
- New + re-pinned S21 pins green; full gate green: probe (annotation ==
  machine count, expect 216 → 220), smoke 37/37, pytest 459+1w, ruff F=0.
- NO other existing pin changes (if one does, a fixture has an adjacent
  identical pair — STOP + report, do not guess).
- Repro torn down (delete `scratchpad/r7_realistic_repro.mjs`).

## DO-NOT-TOUCH
- The maintainer's live files (`.opencode/maintainer/**`, `opencode.jsonc`,
  the prompt set, `AGENTS.md`, `repo_overview.md`); never stage/flag/edit.
- The pair channels, the git-ref channel, `matchNearPathSegments`/
  `matchNearPath`/`segmentDistance` (pure, unchanged), the M1 dispatch guard
  (L653 — do NOT add a write dedup path), the 9-verdict vocabulary
  (kind=dedup is an evidence flag ONLY), the log field layout (8 fields), the
  corpus builder.
- The pytest suite (gate runs it unchanged) + existing S1–S20 pins.
- No live acceptance run (probe + smoke are the gate; the live check rides the
  next restart, the planner's one-shot).

## Worker
`worker_Q4_140K` (the 140K-era roster; precise probe work favors the stronger
model — consistent with the R7 build).
