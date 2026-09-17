# R7 spec — segment-level path resolver (the doubling/segment channel)

STATUS: READY TO LAUNCH 2026-09-17, direct session
ses_f53a10d24ffesL2Oc8jPqY1bBc. GATE SATISFIED (verified 09-17): R2
live-accepted + M1 landed (9ec4c0b) + host restart (M1 live-accepted).
Maintainer rulings on file: staging (decision-record §5, R7 block),
**seg-d≤1 both scopes**, and the **substitution bar** (approved 09-17): a
pure segment INSERTION (the doubled folder) resolves free under the
existence+uniqueness gate; a segment SUBSTITUTION counts as seg-d=1 ONLY
when the two segment names are char-close (intra-segment Levenshtein ≤1) —
a char-far substitution fails closed. Stay on the current checkout
(opencode_test). Design source: decision-record §5 R7 (grep the heading —
the record is large).

## Goal
Add a SEGMENT-LEVEL resolver between the pair channel and the char-fuzzy
channel. A path is a sequence of folder units; distance counts per
segment (one extra / one mismatched folder = 1). This catches the doubled
folder (`OpenCodeProjects/OpenCodeProjects/…` — char-distance 17, invisible
to the char channel) and one-folder-mismatch typos, under the same strict
gate discipline. The `write` tool stays fully excluded from the implicit
channels (M1 — the segment channel inherits the exclusion).

## Verified facts (measured at spec time 09-17 — build on these)
- Baseline: probe **208/208**, smoke **36/36**, pytest **459+1w**, ruff
  **F=0**. Re-verify by RUNNING before any edit (mismatch → STOP + report).
- Core (`.opencode/plugin/intercept_observer_core.ts`, 689 lines):
  `levenshtein(a,b)` exported at 615 (reuse it for intra-segment distance);
  corpus = sorted array of `/`-joined relative paths from the nearest
  existing ancestor (built 590-612); `normPathForm` normalizes for
  comparison; `matchNearPath(argRel, corpus, maxD)` (645) is the pure
  matcher shape: exact → resolved iff d≤maxD AND gap≥`FUZZY_MIN_GAP`
  (= 2, line 135) → rejected with top-3 `[relPath, d]` + reason
  (`d-too-high`/`gap-too-small`/`empty-corpus`/`empty-arg`); returns
  `ReadResolution` (`{kind:"exact"|"resolved"|"rejected", path?, d?, gap?,
  cands?, reason?}`). Scope bars: `FUZZY_MAX_D=2` (read),
  `WRITE_FUZZY_MAX_D=1` (write) at 134-140.
- Hook (`.opencode/plugin/intercept_observer.ts`): dispatch at 605-617 —
  `pairOwned → runFuzzyRead` (read scope) / `writeOwned && tool !==
  "write" → runFuzzyWrite` (the M1 guard; `edit`/`block_transfer` only);
  `runFuzzyRead`/`runFuzzyWrite` each: existsSync fast-path →
  `nearestExistingDir` → `getCorpus(root)` → matcher → mutate + log on
  resolved (evidence `fuzzy scope=… orig=… -> … d=… gap=…`).
- Probe (`.opencode/plugin/probes/handover_probe.mjs`): S20 header at
  line 3951 `// ---- S20 write-scope pair/fuzzy (15)`; the header
  annotation total (208) is the source of truth — update it when S21
  grows the probe. S21 goes AFTER the S20 section.
- Smoke (`.opencode/plugin/tests/intercept_observer.smoke.mjs`, 268
  lines): the 8f write-scope block ends at line 258; add the new pin
  before the `(9) live log untouched` block.

## Definition of done (measurable)
1. CODE (core): new `SEG_MAX_D = 1` constant + a pure
   `matchNearPathSegments(argRel, corpus)` following the
   `matchNearPath` shape: exact short-circuit, then per-candidate
   segment distance via DP over segment arrays where substitution cost is
   1 iff `levenshtein(segA, segB) <= 1`, else non-substitutable
   (insert/delete cost 1); accept iff seg-d ≤ SEG_MAX_D AND gap ≥
   FUZZY_MIN_GAP; deterministic tie-break (seg-d, then intra-segment
   char-sum, then lexical); same `ReadResolution` shape with d = segment
   distance. Export it (the probe imports the core exports).
2. CODE (hook): in `runFuzzyRead` and `runFuzzyWrite`, run
   `matchNearPathSegments` BEFORE the char matcher on the same arg+corpus;
   segment-resolved → mutate + one line, verdict `fuzzy-resolved`,
   evidence `fuzzy kind=seg scope=<read|write> orig=… -> … d=<segd>
   gap=…`; segment-rejected → fall through to the existing char matcher
   (unchanged). The M1 guard stays EXACTLY where it is — `write` produces
   no lines from either matcher. **Single-segment args (no folder
   component) BYPASS the segment matcher** (planner ruling at
   worker-observation, 09-17 — the worker's analysis is approved): the
   char channel owns 1-segment args exactly as pinned in S18/S20 (its
   evidence carries no `kind=seg`); the segment channel handles args with
   ≥2 segments only. (The doubling case is structurally ≥2 segments, so
   nothing is lost.)
3. PROBE S21 (new section, 8 checks): (1) read doubled-segment (one
   insertion, e.g. `a/a/b/c.txt` vs corpus `a/b/c.txt`) → MUTATED +
   `kind=seg … d=1`; (2) `edit` doubled-segment → MUTATED + `kind=seg
   d=1` (write scope keeps the channel); (3) `write` doubled-segment →
   NOT mutated + ZERO lines (M1 exclusion extends to the segment
   channel); (4) read one mismatched folder, intra-seg lev 1 (e.g.
   `OpenCodeProject` vs `OpenCodeProjects`) → MUTATED + `kind=seg d=1`;
   (5) read one mismatched folder, char-far (e.g. `zzz`) → NOT mutated +
   NO `fuzzy-resolved` line (the char fallback also rejects); (6) read
   seg-d=2 (two insertions) → NOT mutated + rejected; (7) two candidates
   tied at seg-d=1 → NOT mutated + `gap-too-small`; (8) filename typo
   `sub/file-x.txt` vs corpus `sub/file-4.txt` (2-segment arg) → MUTATED
   with `kind=seg` in the
   evidence (the segment channel subsumes a char-close name typo inside a
   folder). 1-segment filename typos stay the char channel's (the
   bypass rule — S18/S20 pins prove it).
   Probe total 208 → **216**, annotation updated.
4. SMOKE: 1 new pin — `edit` doubled-segment end-to-end (the edit lands
   where the log says; line carries `kind=seg`). Smoke 36 → **37/37**.
5. GATE: probe 216/216 + smoke 37/37 + pytest 459+1w + ruff F=0.
6. BOOKKEEPING: no TODO change needed (no open entry covers R7 build
   state — record the landing in the worker summary only);
   handover_task_to_planner.md per the worker protocol.

## DO-NOT-TOUCH
- The pair channels (runPairRead/runPairWrite), the git-ref channel,
  `matchNearPath`/`resolveReadPath`/`resolveWritePath`/`FUZZY_MAX_D`/
  `WRITE_FUZZY_MAX_D`, the M1 dispatch guard (line 612), the 9-verdict
  vocabulary (kind=seg is an evidence flag ONLY), the log field layout
  (8 fields), the corpus builder, the content-args guard.
- Anything under `.opencode/maintainer/`, `opencode.jsonc`, the FST
  Python package, the pytest suite (gate runs it unchanged), existing
  S1–S20 pins.
- No live acceptance run (probe + smoke are the gate; the live check
  rides the next restart and is the planner's one-shot).

## Worker
`worker_Q4_140K` (default; the 140K-era roster).
