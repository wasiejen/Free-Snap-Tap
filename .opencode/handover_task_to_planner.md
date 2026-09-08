<task id="ses_f7d67be43ffeRAOO29hLv1piX7" state="completed">
<task_result>
# EXECUTIVE SUMMARY — Phase 6 / Tier 1 — v2.2.1: gauge-failure evidence logging (+ probe extension)

Worker `worker_120K_mtp`, first run under the relaxed prompts. Deliverable met: after ONE opencode start, the silent-failure branch is identifiable from `.opencode/plugin.log` alone. **Commit: `23b06ed`** (`add v2.2.1 gauge-failure evidence logging (kind:"gauge") to handover.ts`; branch `opencode_test`); files: `.opencode/plugin/handover.ts`, `.opencode/plugin/probes/handover_probe.mjs`, `TODO.md` (#27–#28 appended), `.opencode/handover_task_to_planner.md` (spec itself unmodified — committed by the planner pre-fire).

## Changes

- **`handover.ts`** — `gaugeReadout` now returns a classifiable outcome (`GaugeReadout` union + small `gaugePreviewOf` cap-helper + v2.2.1 file-header note): the ok+injected path stays **byte-identical** (`output.system.push` line and the `transform` evidence line unchanged); on failed readout or ok-but-`system`-not-an-array it appends ONE `kind:"gauge"` line (one `buildLine` call, existing scalar pattern, session id included). Reasons: `shell-missing` | `timeout` (withTimeout `"gauge timeout"` sentinel) | `no-ctx-output` (`preview` = raw output — incl. empty/traceback — or the ERROR text of a foreign rejection such as a BunShell spawn failure; trimmed, ≤ 120 chars, omitted when empty) | `system-not-array`.
- **`handover_probe.mjs`** — S4 extended 4 → 9 shapes: the 2 ok shapes keep byte-identical-injection assertions and now assert zero `gauge` lines; junk/no-shell shapes assert their `gauge` line field-by-field; new synthetic shapes: timeout-sentinel rejection, foreign spawn-error rejection (exercises the 120-cap), empty output (no preview), ok-readout + string system, ok-readout + missing `system` key. S5 renumbered 24–28, tallies now include `gauge==7`, fingerprint extended t5–t9, header expected-summary updated (pre-edit 23/23 vs new 28/28). S1/S3 hygiene logic unchanged.

## Verification (all measured)

- **Probe BEFORE** (old 23-check probe vs unchanged v2.2, `before` mode): **23/23 PASS**, exit 0.
- **Probe AFTER** (new 28-check probe vs v2.2.1, `after` mode): **28/28 PASS**, exit 0 — S1=5 S2=4 S3=5 S4=9 S5=5.
- **`pytest -q`** → **434 passed, 13 warnings** · **`ruff check --select F .`** → **6 findings** (unchanged from baseline).
- Facts re-verified first: `.opencode/plugin.log` (real path — #22 stands) had **0 `gauge` lines** and, being append-live, **166** `kind:"transform"` lines at my measurement (spec's "104" = planner's mid-segment tally; log grew while the spec sat un-fired).

## Diff stat — `gaugeReadout`/`onSystemTransform` region (hard-limit check)

`git diff --numstat`: handover.ts **+59/−11**; of that +7 = the file-header note → the region (incl. adjacent in-code comments) = **+52/−11**: −11 = the old silent-failure branches (signatures, `return undefined` ×2, catch line, 1 ok-branch return, old comment pair, old injection if); +52 = `GaugeReadout` type (3) + `gaugePreviewOf` (5) + rewritten failure branches + the two `gauge` append lines + comment updates. Success path byte-identical; no other hook touched; SKIP-SET untouched.

## TODO.md recorded

- **#27** — v2.2.1 delivered; OPEN follow-up (planner): after ONE opencode start read the `kind:"gauge"` lines → the #23 branch (spawn error / timeout / non-`CTX=` output / `system-not-array`, or ok+injected ⇒ #23 false alarm ⇒ escalate to transform-drop).
- **#28** — found on the way: `GAUGE_CMD` (handover.ts line 63) declared but unused since the v2 readout uses the literal inline; left verbatim per the minimal-diff hard limit — wire or delete, cosmetic.

## Not done (deliberate)

- No SKIP-SET change (v1.3 is a separate maintainer call), no other hook touched, no opencode restart/reconfigure — the proof start is the planner's to ask for.
- **Flag:** spawn-failure rejections map to `no-ctx-output` with the error text in `preview` — the stable 4-reason vocabulary has no spawn reason, `preview` is the only evidence field; a spawn failure stays distinguishable by the error-text preview (recorded in #27 as the in-scope judgment).
- **Flag:** untracked maintainer file `.opencode/plugin/context meter via plugin hook.md` (German research notes, pre-existing, not mine) remains in the tree — deliberately neither committed nor deleted; the post-commit "clean" tree carries only that one untracked item + the planner's mirror-overwrite bookkeeping.

## Spec-friction flag (one line)

Neutral-to-helpful: goal + hard limits + definition-of-pass gave exactly the room needed — the spawn-error → `no-ctx-output.preview` mapping had to be judged inside the fixed vocabulary, and the spec's "deviate, note it" framing made that safe; nothing obstructed.

Stop-line crossed mid-wrap-up (post-commit gauge: **CTX=109097 (90%) REM=10903**) — no new work started; this is the closing record.

</cleanup>
</task_result>
</task>