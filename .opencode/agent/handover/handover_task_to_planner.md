# Worker summary — R7 segment-level path resolver (COMPLETE)

STATUS: COMPLETE — full standard gate green (measured below). One commit:
code + probe + smoke + this summary, on `opencode_test` (branch verified at
start and at commit). No live acceptance run — probe + smoke are the gate
(spec; the live check rides the next host restart, the planner's one-shot).

## Measured verification
Baseline RE-VERIFIED by running before any edit (all matched the spec):
probe **208/208**, smoke **36/36**, pytest **459 passed, 1 warning**,
ruff **F=0**. After all edits (all from repo root):
- probe `node .opencode/plugin/probes/handover_probe.mjs` → **216/216 PASS**
  (new S21 section, 8 pins 210-217; annotation updated S21=8, total
  208→216 — the annotation is the source of truth; all S1-S20 pins
  untouched and green).
- smoke `node .opencode/plugin/tests/intercept_observer.smoke.mjs` →
  **37/37 ALL PASS** (1 new pin (8g) edit doubled-segment end-to-end + the
  named-core-surface chk extended with matchNearPathSegments).
- `./.venv/Scripts/python.exe -m pytest -q` → **459 passed**, 1 warning
  (the known #10; the suite does not cover the plugin — run unchanged).
- `./.venv/Scripts/ruff.exe check --select F .` → **All checks passed**
  (F=0).

## What changed (as implemented)
- **CODE (core, `intercept_observer_core.ts`):**
  - `export const SEG_MAX_D = 1` after WRITE_FUZZY_MAX_D (the seg-d<=1 bar,
    both scopes — the ruling).
  - `segmentDistance(a, b)` (private): DP over segment arrays, dp cell =
    lex-min [seg-d, charSum]; delete/insert cost 1; substitution ONLY when
    intra-segment `levenshtein <= 1` (cost = lev, charSum += lev) — a
    char-far sub is non-substitutable (the DP routes around at cost 2 =
    fails closed). charSum = the intra-segment char total of the chosen
    alignment (the tie-break second key).
  - `export function matchNearPathSegments(argRel, corpus)`: same
    ReadResolution shape as matchNearPath (exact short-circuit; accept iff
    seg-d <= SEG_MAX_D AND gap to the second-best >= FUZZY_MIN_GAP;
    deterministic tie-break (seg-d, charSum, lexical); rejected with top-3
    [relPath, seg-d] + reason d-too-high/gap-too-small). TOTAL function —
    no 1-segment short-circuit (see the hook gate below).
- **CODE (hook, `intercept_observer.ts`):** in `runFuzzyRead` +
  `runFuzzyWrite`, the rel+corpus are computed ONCE and the segment matcher
  runs BEFORE the char matcher, gated to **>=2-segment relative args**
  (`normPathForm(rel).split("/").filter(≠"").length >= 2`).
  **The 1-segment BYPASS (planner ruling at my observation, now spec'd at
  commit 134b107):** a single-segment rel is a bare filename — the char
  channel owns it exactly as byte-pinned in S18-179/S20-208 (their
  char-form evidence has no `kind=seg`); the doubling case is
  structurally >=2 segments, so nothing is lost. Segment-resolved →
  mutate + one line, verdict `fuzzy-resolved`, evidence `fuzzy kind=seg
  scope=<read|write> orig=… -> … d=… gap=…` (gap inf when single
  candidate); segment-rejected → fall through to the existing char matcher
  (byte-identical code path, unchanged); segment-exact → no line.
- **PROBE S21 (8 pins, after S20):** 210 read doubled-seg → MUTATED +
  kind=seg scope=read d=1 gap=2 (char-lev 3 — the char channel is blind);
  211 edit doubled-seg → MUTATED + kind=seg scope=write; 212 write
  doubled-seg → NOT mutated + ZERO lines (M1 extends to the segment
  channel); 213 PURE lev-1 folder mismatch (OpenCodeProject vs
  OpenCodeProjects) → resolved d=1 gap=4 (the substitution bar); 214 HOOK
  char-far folder mismatch → NOT mutated + fuzzy-rejected (seg-rejected →
  the char fallback also rejects; NO kind=seg); 215 PURE seg-d=2 (two
  insertions) → rejected d-too-high; 216 PURE tie at seg-d=1 → rejected
  gap-too-small; 217 PURE 2-seg filename typo (sub/file-x.txt vs
  sub/file-4.txt) → resolved d=1 gap=inf (the segment channel subsumes a
  char-close name typo inside a folder). All pin EXPECTED VALUES were
  machine-verified against the real core before pinning (a scratch script
  in the scratchpad — my hand-math was off-by-one on two of them).
  Header annotation + section block updated.
- **SMOKE (1 new pin → 37/37):** (8g) edit doubled-segment end-to-end —
  MUTATED + the edit lands where the log says (host-simulated write) +
  fuzzy-resolved kind=seg scope=write d=1 gap=2 byte-exact; the
  named-core-surface chk extended with matchNearPathSegments (house
  pattern — the R1 "VERDICTS pin grew to 9" precedent).

## Deviations / notes
1. **Pin layout (213/215/216/217 are PURE-matcher pins, 210/211/212/214
   are hook-level)** — the spec's pin 4 wording ("MUTATED + kind=seg
   d=1" for the lev-1 folder mismatch) is infeasible as a hook pin:
   intermediate dir entries (the parent folder of the target) always sit
   at seg-d=2 and kill the gap rule for a resolved folder-mismatch, so
   the resolved-mismatch case is pinned at the pure-matcher level with a
   controlled corpus (still machine-verified values). Pins 215/216/217
   are pure for the same reason (rejection shapes are hook-feasible but
   the pure level is the sharper pin); pin 217 is pure because a hook
   filename typo is a 1-segment rel (the bypass). Noted here per the
   spec's "procedure is a suggestion" clause; the DoD's observable
   properties are all pinned.
2. **One compaction mid-task** (context 94% before the implementation
   unit): the IN-PROGRESS checkpoint (56d56ed) + the design notes
   (scratchpad `r7_build_notes.md`) carried the resume; the pre-compaction
   dump hook fired (my session dump in
   `.opencode/archive/sessions/compaction_dumps/`).
3. Nothing under `.opencode/maintainer/`, `opencode.jsonc`, the FST Python
   package, or the pytest suite was touched; the pair/git-ref channels,
   matchNearPath/resolveReadPath/resolveWritePath, the M1 dispatch guard,
   the 9-verdict vocabulary, the 8-field layout, the corpus builder, and
   the content-args guard are all untouched (DO-NOT-TOUCH honored).

## TODO entries
- No TODO change (spec DoD 6 — no open entry covers R7 build state; the
  landing is recorded here only). No new inbox findings: everything
  touched was spec'd; the 1-segment bypass is the approved design (now
  in the spec at 134b107), not a finding.

## Deliberately NOT done
- No live/host acceptance run (spec — the planner's one-shot at the next
  restart).
- No NAP edits (planner-owned); no pushes (maintainer-only).
- No behavior for 1-segment args changed anywhere (the bypass keeps the
  char channel exactly as pinned in S18/S20 + smoke 8a-8f).
