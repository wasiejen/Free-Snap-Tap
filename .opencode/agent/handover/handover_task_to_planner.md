# Worker summary — M1 write-fuzzy scope restriction (the #72 ruling) (COMPLETE)

STATUS: COMPLETE — full standard gate green (measured below). Code commit:
`9ec4c0b` (code + probe + smoke, on `opencode_test`); this file + the TODO #72
status update ride the FINAL bookkeeping commit (the commit right after
`9ec4c0b` in `git log`). Branch: `opencode_test` (verified at start). No live
acceptance run — probe + smoke are the gate (spec).

## Measured verification
Baseline RE-VERIFIED by running before any edit (all matched the spec's
verified facts): probe **206/206**, smoke **35/35**, pytest **459 passed, 1
warning**, ruff **F=0**.
After all edits (the gate, all from repo root):
- probe `node .opencode/plugin/probes/handover_probe.mjs` → **208/208 PASS**
  (section-sum annotation updated S20=13→15, total 206→208; sum
  machine-verified with node, not mental math).
- smoke `node .opencode/plugin/tests/intercept_observer.smoke.mjs` →
  **36/36 ALL PASS** (re-pinned write pin + 1 new edit pin).
- `./.venv/Scripts/python.exe -m pytest -q` → **459 passed**, 1 warning (the
  known #10; the suite does not cover the plugin — run unchanged).
- `./.venv/Scripts/ruff.exe check --select F .` → **All checks passed** (F=0).

## What changed (as implemented)
- **CODE (one-line dispatch guard, per DoD 1):**
  `.opencode/plugin/intercept_observer.ts` line ~609 —
  `else if (writeOwned && tool !== "write")` with a comment citing
  "M1, 2026-09-17, #72". `write` no longer reaches `runFuzzyWrite`;
  `edit`/`block_transfer` fuzzy untouched; `runPairWrite` byte-identical for
  all three tools (untouched); `resolveWritePath`/`WRITE_FUZZY_MAX_D`/
  `matchNearPath` in the core untouched. The (3b) header doc in the same file
  was updated to state the exclusion (docs-only).
- **PROBE S20 (13 → 15 checks):**
  - re-pinned 196 (pair gate fail-closed → NOT mutated + gate=none-exist +
    NO fuzzy line, exactly one line) and 198 (mismatch fail-closed → NOT
    mutated + NO fuzzy line);
  - re-pinned 200 (write fuzzy d=1: file-9.txt → NOT mutated + ZERO new log
    lines) and 201 (write fuzzy d=2: file-56.txt → NOT mutated + ZERO new
    log lines);
  - 197 (both-exist) already expected no fuzzy line → unchanged (spec);
  - NEW 208 (edit d=1, the wf fixture file-9.txt → MUTATED to file-4.txt +
    fuzzy-resolved scope=write d=1 gap=inf) and NEW 209 (edit d=2,
    file-56.txt → NOT mutated + fuzzy-rejected scope=write
    reason=d-too-high) — edit keeps the channel + the d<=1 bar;
  - header annotation (line 524) + S20 header block + section banner updated
    (the annotation is the source of truth — updated to 208/208).
- **SMOKE 8f (35 → 36):** pin 256 re-pinned (write d=1 → args byte-identical
  + ZERO new log lines) + 1 NEW pin (edit d=1, same wfx fixture → MUTATED +
  fuzzy-resolved scope=write d=1 gap=inf); the pair pins (232-238) and the
  content-scope guard pin (246) stay.

## Deviations / notes
1. **Two commits, not one:** the TODO #72 status line must name the code
   commit's hash, which does not exist until the code is committed — so the
   bookkeeping (TODO + this summary) rides a second commit right after
   `9ec4c0b`. All changes are still in one atomic sequence; nothing is
   committed red.
2. Probe check 197 needed no re-pin (the spec predicted this — it already
   expected "no fuzzy line").
3. Nothing under `.opencode/maintainer/`, `opencode.jsonc`, the FST Python
   package, or the pytest suite was touched; no new files beyond
   spec/handover/TODO bookkeeping.

## TODO entries
- `TODO.md` #72 Status → **M1 LANDED (commit 9ec4c0b, 2026-09-17)** with the
  pin changes + gate numbers; the follow-on path-repair DISCUSSION note
  (not yet approved) kept.
- No new inbox findings: everything I touched was spec'd; the untracked
  archive dump `ses_f53a10d24ffesL2Oc8jPqY1bBc_c0.md` (planner session
  compaction dump) was left in place, uncommitted.

## Deliberately NOT done
- No live/host acceptance run (spec: rides the next host restart — the
  planner's one-shot, not the worker's).
- Pair channel (runPairWrite/runPairRead), read-scope channels, git-ref
  channel, core matcher, content-args guard, 9-field log format: untouched
  (DO-NOT-TOUCH list honored).
- No NAP edits (planner-owned); no pushes (maintainer-only).
