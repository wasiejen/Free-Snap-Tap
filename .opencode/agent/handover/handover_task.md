# M1 spec — write-fuzzy scope restriction (the #72 ruling)

STATUS: READY TO LAUNCH 2026-09-17, direct session
ses_f53a10d24ffesL2Oc8jPqY1bBc. GATE: maintainer ruling "M1 approved"
(2026-09-17, recorded in TODO #72 + NAP). Stay on the current checkout
(opencode_test). This is an OBSERVABLE behavior change — pre-approved by
that ruling; no further approval needed inside this scope.

## Goal
Remove the IMPLICIT fuzzy channel from the `write` tool only. `edit` and
`block_transfer` keep it. Rationale (ruling): "new file" is a legal intent
for `write`, so a d=1 near-miss hijack silently overwrites an existing
sibling (live-measured 2026-09-17: `file-5.txt → file-4.txt`, the #72
hazard); for `edit` no new-file intent exists, so redirect is unambiguous.
The PAIR channel (strict existence gate, fail-closed) stays UNCHANGED for
all three tools — it is the explicit, numeral-anchored correction path.

## Verified facts (measured at spec time 2026-09-17 — build on these, do not re-derive)
- Baseline: probe self-annotation **206/206** (S1–S20), smoke **35/35**,
  pytest **459 passed + 1 warning** (the known #10), ruff **F=0**.
  Re-verify by RUNNING before any edit (machine-read the self-annotation;
  mismatch → STOP + report).
- The write-scope fuzzy lives in ONE dispatch point:
  `.opencode/plugin/intercept_observer.ts` lines 608-609 —
  `else if (writeOwned) { fuzzy = runFuzzyWrite(output, tool); }`, where
  `writeOwned` = the tool is in `WRITE_PATH_FIELDS` (write/edit/
  block_transfer, lines 332-336). `runFuzzyWrite` (lines 439-470) itself is
  tool-agnostic (iterates `writePathFields(tool)`).
- The PAIR channel for the same tools is `runPairWrite` (lines 363+),
  dispatched at line 602 — it must keep running for `write` too.
- The matcher core (`resolveWritePath`, `WRITE_FUZZY_MAX_D = 1` in
  `intercept_observer_core.ts` lines 134-140) stays — `edit`/
  `block_transfer` still use it.
- S20 probe section (`.opencode/plugin/probes/handover_probe.mjs`, header
  comment lines 478-498, checks from line 3941): 13 checks. The write-
  fuzzy expectations to RE-PIN: check ~4010 ("write pair gate fail-closed
  … + fuzzy-rejected scope=write on the result"), ~4057 ("write mismatch
  FAIL-CLOSED … + fuzzy-rejected scope=write"), ~4100 ("(200) hook write
  fuzzy d=1: file-9.txt → MUTATED to file-4.txt + fuzzy-resolved
  scope=write"), ~4122 ("(201) hook write fuzzy d=2 → NOT mutated +
  fuzzy-rejected scope=write reason=d-too-high"). Check ~4033 (pair both-
  exist, "no fuzzy line") already expects no fuzzy line → unchanged.
- Smoke 8f (`.opencode/plugin/tests/intercept_observer.smoke.mjs` lines
  216-258): the pin at 256 ("write fuzzy d=1 → MUTATED to the existing
  sibling + fuzzy-resolved scope=write (d=1 gap=inf)") must be re-pinned;
  the pair pins (232-238) and the content-scope guard pin (246) stay.

## Definition of done (measurable)
1. CODE: `write` produces NO fuzzy lines anymore (dispatch guard or early
   return in `runFuzzyWrite` — your call, one-line change + a comment
   citing "M1, 2026-09-17, #72"); `edit`/`block_transfer` fuzzy untouched;
   `runPairWrite` behavior byte-identical for all three tools.
2. PROBE S20: the 4 write-fuzzy expectations above re-pinned to the new
   behavior — NOT mutated + NO fuzzy line (the hook logs nothing for a
   bare `write` miss: zero new lines, not a "rejected" line); the S20
   header comment (200/201 descriptions) updated accordingly. ADD 2 NEW
   pins on the `edit` tool reusing the wfx fixture: edit d=1 (file-9.txt)
   → MUTATED to file-4.txt + fuzzy-resolved scope=write d=1 gap=inf; edit
   d=2 (file-56.txt) → NOT mutated + fuzzy-rejected scope=write
   reason=d-too-high. S20 count (13) → (15); the probe header annotation
   total updated (it is the source of truth); probe **208/208 PASS**.
3. SMOKE: 8f pin 256 re-pinned (write d=1 → args byte-identical + ZERO new
   log lines) + 1 NEW pin: edit d=1 → MUTATED + fuzzy-resolved scope=write
   (same fixture). Smoke **36/36**.
4. GATE: probe 208/208 + smoke 36/36 + pytest 459+1w + ruff F=0 (standard
   gate, all from repo root; the probe's MODULE_TYPELESS warning is
   expected).
5. BOOKKEEPING: TODO #72 status → "M1 landed (<commit>)";
   handover_task_to_planner.md per the worker protocol.

## DO-NOT-TOUCH
- The PAIR channel logic (runPairWrite / runPairRead), the read-scope
  channels (runFuzzyRead / runPairRead), the git-ref channel
  (runGitRefBash), `matchNearPath`/`resolveWritePath`/`WRITE_FUZZY_MAX_D`
  in the core, the content-args guard, the log format (9-field).
- Anything under `.opencode/maintainer/`, `opencode.jsonc`, the FST
  Python package, pytest suite (it does not cover the plugin — gate runs
  it unchanged).
- No new files beyond the spec/handover/TODO bookkeeping; no live
  acceptance run (probe+smoke are the gate; the live check rides the next
  host restart and is the planner's one-shot, not the worker's).

## Worker
`worker_Q4_140K` (default; the 140K-era roster).
