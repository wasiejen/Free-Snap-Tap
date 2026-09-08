# EXECUTIVE SUMMARY — Phase 6 / Tier 1 — v2.2.1: gauge-failure evidence logging (+ probe extension)

Worker `worker_120K_mtp`, first run under the relaxed prompts. Deliverable met: after ONE
opencode start, the silent-failure branch is identifiable from `.opencode/plugin.log` alone.
Commit: `add v2.2.1 gauge-failure evidence logging (kind:"gauge") to handover.ts` — hash
visible via `git log -1` (the worker commit carries no post-hoc hash of itself); files:
`.opencode/plugin/handover.ts`, `.opencode/plugin/probes/handover_probe.mjs`, `TODO.md`
(#27–#28 appended), this task pair (spec + mirror).

## Changes

- **`.opencode/plugin/handover.ts`** — `gaugeReadout` now returns a classifiable outcome
  (`GaugeReadout` union + a small `gaugePreviewOf` cap-helper, new v2.2.1 file-header
  note, in-code comments): ok+injected path stays **byte-identical** (`output.system.push`
  line unchanged, `transform` evidence line unchanged); on failure / ok-but-`system`-not-an-
  array it appends ONE `kind:"gauge"` line (one `buildLine` call, existing scalar pattern,
  session id included). Reason vocabulary: `shell-missing` | `timeout` (the withTimeout
  `"gauge timeout"` sentinel) | `no-ctx-output` (`preview` = raw output — includes
  empty/traceback — or the ERROR text of a foreign rejection such as a BunShell spawn
  failure, trimmed, ≤ 120 chars via cap, omitted when empty) | `system-not-array`.
- **`.opencode/plugin/probes/handover_probe.mjs`** — S4 extended 4 → 9 shapes: the 2 ok
  shapes keep asserting byte-identical injection AND now assert zero `gauge` lines; junk/
  no-shell shapes assert their `gauge` line field-by-field; new synthetic shapes:
  timeout sentinel rejection, foreign spawn-error rejection (exercises the 120-cap),
  empty output (no preview), ok-readout + string system, ok-readout + missing `system` key.
  S5 renumbered, tallies now include `gauge==7`; probe-fingerprint extended t5–t9; header
  expected-summary updated. S1/S3 hygiene logic unchanged.

## Verification (all measured, not claimed)

- **Probe BEFORE** (old 23-check probe vs unchanged v2.2 plugin, `before` mode):
  **23/23 PASS**, exit 0.
- **Probe AFTER** (new 28-check probe vs v2.2.1 plugin, `after` mode): **28/28 PASS**,
  exit 0. Section totals: S1=5 S2=4 S3=5 S4=9 S5=5.
- **`pytest -q`** → **434 passed, 13 warnings** — matches baseline.
- **`ruff check --select F .`** → **6 findings** — matches baseline (list = TODO #2,
  unchanged).
- **Facts re-verified before relying on them**: `.opencode/plugin.log` (the real path —
  the spec's #22 note stands) showed 0 `gauge` lines and — since it append-live during this
  cycle — **166** `kind:"transform"` lines at my measurement (the spec's "104" was the
  planner's 395-line-segment tally; the log grew while the spec sat un-fired).

## Diff stat — `gaugeReadout`/`onSystemTransform` region (hard-limit check)

`git diff --numstat`: handover.ts **+59/−11**. Of that, +7 = the new file-header v2.2.1
note → the gaugeReadout/onSystemTransform region (incl. the adjacent in-code comments) =
**+52/−11**: the −11 are the old silent-failure branches (2 signature/shell-check lines,
1 ok-branch return, catch with `return undefined` ×2 incl. `} catch {`, 1 old comment pair,
2 lines in the old injection if) and the +52 are the `GaugeReadout` type (3) +
`gaugePreviewOf` (5) + rewritten failure branches + the two `gauge` append lines +
comment updates. Success path: `output.system.push(...)` byte-identical; zero change in any
other hook (SKIP-SET untouched — the v1.3 call stays the maintainer's).

## TODO.md recorded

- **#27** — v2.2.1 delivered; OPEN follow-up (planner): after ONE opencode start read the
  `kind:"gauge"` lines → the #23 branch (spawn error / timeout / non-`CTX=` output /
  `system-not-array`, or ok+injected ⇒ #23 false alarm ⇒ escalate to transform-drop).
- **#28** — new discrepancy found on the way: `GAUGE_CMD` (handover.ts line 63) declared
  but unused since the v2 readout uses the literal inline; left verbatim per the minimal-
  diff hard limit — wire or delete, cosmetic.

## Not done (deliberate)

- No SKIP-SET change (v1.3 is a separate maintainer call), no other hook touched.
- No opencode restart/reconfigure — the proof start is the planner's to ask for (spec step
  + #27 follow-up).
- The `no-ctx-output` mapping of spawn-failure rejections (error text in `preview`) is an
  in-scope judgment under the fixed 4-reason vocabulary — flag: the vocabulary has no
  spawn reason; `preview` is the only evidence field, and a spawn failure remains
  distinguishable by the error-text preview.

## Spec-friction flag (asked for, one line)

Neutral-to-helpful: the goal + hard limits + definition of pass gave exactly the room
needed (the spawn-error→`no-ctx-output.preview` mapping had to be judged inside the fixed
vocabulary — the spec's "deviate, note it" framing made that safe), nothing obstructed.

Post-run self-gauge for record (context line check pending planner). The plugin
overwrite of this mirror file at delegation end is the planner's to book.
