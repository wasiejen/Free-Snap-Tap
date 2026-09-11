# EXECUTIVE SUMMARY — T2: ctx.log normal lines gain the tool-name field (L1)

**Outcome:** DONE — one field added to the ctx.log normal-line format + probe
updates, per the spec's Definition of done. All DoD checks green.

## Chosen ctx.log line shape (T3 must match this)

```
<YYYY-MM-DD_HH-MM>[ <modelId>][ <tool>] <readout>
```

- ` <modelId>` — existing field, space-prefixed, OMITTED when empty (unchanged).
- ` <tool>` — NEW field, space-prefixed, placed AFTER the model, BEFORE the
  readout; OMITTED when the payload has no tool name (mirrors the model-field
  convention).
- ` <readout>` — the existing minimal readout `(NN%/NNNK)` / `(NNNK)`
  (unchanged).
- Sample (known window, tool `task`):
  `2026-09-10_19-06 Qwen3.8-27B-IQ4KT-120K task (50%/59K)`
- Sample (tool omitted — no `tool` key in the payload):
  `2026-09-10_19-06 Qwen3.8-27B-IQ4KT-120K (50%/59K)`
- Sample (model omitted, tool present): `2026-09-10_19-06 task (46K)`
- The T3 COMPACT line should follow the same field convention (space-prefixed,
  omit-when-empty) with its own payload after the stamp.

## What changed
- `.opencode/plugin/ctx_watchdog.ts`
  - `appendCtxLog` (≈line 520): signature gains `tool: string | undefined`
    between `modelId` and `readout`; the tool field is built with the exact
    same omit-when-empty pattern as the model field; line format =
    `${localStamp()}${model}${toolField} ${readout}\n`.
  - Call site `onToolAfter` (≈line 700): passes `str(input?.tool)` (the
    already-available `tool.execute.after` tool string — the plugin already
    logs it in the `tool.after` plugin.log line).
  - Comment hygiene (2 one-line updates): the consumer-3 comment above
    `appendCtxLog` and the v2.8 header block consumer (3) entry-shape
    description both record the new field.
- `.opencode/plugin/probes/handover_probe.mjs`
  - Checks 54/55 byte-exact ctx.log regexes updated to carry `task` (the
    probe's fake tool name, hardcoded in `afterFeed`).
  - NEW check 65 — explicit PRESENCE: line byte-shape
    `<dt> CPU-Qwen3-0.6B task (46K)` (fake tool name on the line).
  - NEW check 66 — explicit OMISSION: the hook is called directly with a
    payload that has NO `tool` key → line byte-shape
    `<dt> CPU-Qwen3-0.6B (46K)`.
  - Check 42 (S5 exact kind tallies): `tool.after` 22 → 24 (S9 10 → 12 feeds).
  - Check 43 fingerprint list: `f13`, `f14` added (the two new call ids).
  - Header comments: top EXTENDED line, the S9 "WHAT IT RUNS" section
    (count 10 → 12, 54/55 bullets, new 65/66 bullets), the S5 tally line,
    the fingerprint-id range note, and the EXPECTED OUTPUT line (63/63 →
    65/65).

## Verification (measured, pre-commit)
- `node .opencode\plugin\probes\handover_probe.mjs` → **`PROBE handover:
  65/65 PASS`**, exit 0 (63 → 65: the two new checks; 54/55/42/43 updated and
  green).
- `& .\.venv\Scripts\python.exe -m pytest -q` → **451 passed, 1 warning**
  (the known #10 warning — no FST code touched).
- `& .\.venv\Scripts\ruff.exe check --select F .` → **All checks passed
  (0 findings)**.
- Baseline before the change was also green (63/63 PASS, exit 0) — the
  change set is exactly what moved the format.

## Notable / deliberately NOT done
- The spec's "current state" claimed the ctx.log format is byte-exact pinned
  in checks 54/55/59/60/61/62/63 — actually only 54/55 assert the line
  byte-exact (59/60 count-only `lBefore+1`; 61/62/63 have no ctx.log
  assertion). Only 54/55 needed byte-exact updates; 59/60/61/62/63 stayed
  green untouched.
- NOT done (out of scope per spec): the T3 COMPACT line, the
  `compact_memory` tool, the nudge ladder / readout append / plugin.log
  behavior, any FST python code, `opencode.jsonc` (left locally modified,
  NEVER staged), and anything under `proposals/maintainer/` (left
  untracked/untouched).
- Git emitted the pre-existing LF→CRLF warning for the two edited files
  (repo-wide checkout behavior, unchanged by this task).
