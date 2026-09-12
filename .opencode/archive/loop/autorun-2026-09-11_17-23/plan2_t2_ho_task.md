# TASK T2 — ctx.log normal lines gain the tool-name field (L1 data layer, approved: `proposals/approved/2026-09-11_compaction-lifecycle.md` L1)

FIRST read `AGENTS.md`, `agents_repo.md` (+ the repo parts it names as
needed), this file, and the L1 section of the approved proposal above.
SMALL task — one field added to one log line format + probe updates. Do not
widen it (the COMPACT line and the `compact_memory` tool are T3, NOT here).

## Goal

The single-file ctx log (`.opencode/temp/ctx.log`) normal lines carry the
tool name — free: `tool.execute.after` already carries `input.tool` (the
plugin logs it in the `tool.after` plugin.log line already). Per the design:
the exact line shape is your call — pin it with the probe; keep it minimal
and consistent with the model-field convention (field OMITTED when empty).

## Current state (planner-verified at spec time)

- Plugin: `.opencode/plugin/ctx_watchdog.ts` (renamed in T1, `6ea76ed`).
  - `appendCtxLog(modelId, readout)` ≈517 writes
    `<localStamp>[ <modelId>] <readout>\n` to `.opencode/temp/ctx.log`
    (best-effort, never throws; sample line:
    `2026-09-10_19-06 Qwen3.8-27B-IQ4KT-120K (50%/59K)`).
  - Call site: `onToolAfter` ≈696 `appendCtxLog(g.modelId, readout)` —
    `input.tool` (string) is available at the same site (≈674 it is already
    used in the `tool.after` line).
- Probe: `.opencode/plugin/probes/handover_probe.mjs` — 63 checks; the
  ctx.log line format is byte-exact pinned in checks 54/55/59/60/61/62/63
  (e.g. check 54: `NEW ctx log line <dt> probe-model-120K_MTP (35%/78K)`).

## Scope

1. `appendCtxLog` gains the tool name (pass it from the `onToolAfter` call
   site; omit-when-empty, mirroring the model field).
2. Probe: update the byte-exact ctx.log expectations in the affected checks
   + at least ONE explicit check that the tool name is present on the line
   (the probe's fake tool name) and OMITTED when the payload has no tool
   name.
3. A one-line note in the plugin's v2.8 header block (or the ctx-log
   comment above `appendCtxLog`) recording the new field — comment hygiene.

## Do NOT touch

- `opencode.jsonc` (NEVER stage it) or anything under `proposals/maintainer/`.
- The maintainer's prototypes (`.opencode/tools/compact_memory.ts`,
  `.opencode/plugin/context_recovery.ts`).
- The nudge ladder / readout append / plugin.log behavior — ONLY the ctx.log
  line format changes.
- Any FST python code.

## Definition of done

1. `node .opencode/plugin/probes/handover_probe.mjs` →
   `PROBE handover: N/N PASS`, exit 0, with the new/updated checks green
   (N ≥ 63).
2. `& .\.venv\Scripts\python.exe -m pytest -q` → 451 passed + 1 known #10
   warning.
3. `& .\.venv\Scripts\ruff.exe check --select F .` → 0.
4. ONE commit: plugin + probe + summary file. Follow the AGENTS.md commit
   routine (gauge check after commit). Record the chosen line shape in your
   summary (T3 builds the COMPACT line to match it).

## Approval boundary

Pre-approved by the approved proposal (meta-only plugin/probe change; the
ctx.log is a maintainer-side observation file — no observable FST change;
no config edit).

## Worker

`worker_Q4_120K` (fresh session).
