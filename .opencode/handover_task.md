# TASK — Phase 6 / Tier 1 — plugin v1.1: filter the token-stream flood

FIRST read `AGENTS.md`. Current state: `.opencode/plugin/handover.ts` (v1,
log-only; see `handover_task_to_planner.md` = v1 EXECUTIVE SUMMARY, it has the
offline-probe runner recipe and the v1 payload findings).

## Goal
Minimal patch so `.opencode/plugin.log` stops growing unbounded while models
stream. Measured 2026-09-08 (planner probe, reference point — the log keeps
growing while you work): 7733 lines / 2.48 MB in ~5.5 min, of which **7593
lines (98.3 %) are `event` type `message.part.delta`** (one per model output
chunk) carrying ~98 % of the bytes. tool.* and the other event types were
healthy and tiny.

## The patch (decided — implement exactly this, nothing more)
1. In `handover.ts`:
   - add `const SKIP_EVENT_TYPES = new Set(["message.part.delta"]);`
   - in the `event` hook: if the event's `type` is in the set → return without
     logging. That is the ONLY behavioral change.
2. Untouched: hook set, JSON line format (no new fields), truncation ladder,
   safety guards, log path/gitignore.
3. No rotation / size cap / other type filters — those are v2 (record the idea
   in the summary, not in code).

## Verification
1. **Re-measure the LIVE log yourself before patching** (it has grown since my
   snapshot): parse `.opencode/plugin.log`, record total lines/bytes and the
   kind + event-type Counters in your summary — your numbers are the official
   before-record.
2. **Offline probe** (no `node`/`bun`/`npx` on PATH — use the v1 recipe: the
   OpenCode Desktop Electron binary + `ELECTRON_RUN_AS_NODE=1`, Node 24):
   import the PATCHED plugin, assert the hook set is still exactly
   `{event, tool.execute.before, tool.execute.after}`, then feed synthetic
   payloads: `message.part.delta` x3, `message.updated` x1, `plugin.added` x1,
   task-shaped `tool.before` x1 + `tool.after` x1. Log must end with exactly 5
   lines — **the three `delta` payloads absent** — every line `JSON.parse`-able,
   ≤ 2000 chars. Delete the probe + reset the log afterwards (it is scratch,
   gitignored; leave the tree clean).
3. `& .\.venv\Scripts\python.exe -m pytest -q` → expect **434 passed** (no FST
   code touched — prove the tree is green).
4. **v2 evidence (this delegation is the first real planner→worker cycle under
   the live plugin)** — read the live `plugin.log` before you delete it and
   paste into your summary, verbatim (each line ≤ 2000 chars by construction):
   - the `tool.before` / `tool.after` lines with `"tool":"task"` — this very
     delegation; these prove args/output shapes + `sessionID` correlation,
   - all `"plugin.added"` `event` lines — 45 repeats in one session look odd;
     paste at least 2 full lines (properties included) so v2 can see what they
     carry.
   (Reading `plugin.log` = read-only, allowed.)

## DoD note (say this in the summary)
The patch goes LIVE at the next opencode START — this running session keeps the
old copy. No restart performed here.

## Summary + commit
- EXECUTIVE SUMMARY → `.opencode/handover_task_to_planner.md`: before-Counters
  (live), the patch (short diff description), probe result (5-line log + JSON
  check), pytest result, log-reset note, the v2-evidence paste, effective-from-
  next-restart note.
- Commit per AGENTS.md, subject one-liner:
  `Filter message.part.delta from handover plugin log (v1.1)`.
  Files: `.opencode/plugin/handover.ts`, `.opencode/handover_task.md`,
  `.opencode/handover_task_to_planner.md`, `TODO.md` (append-only if a new
  discrepancy surfaced).
- Do NOT touch `.opencode/handover_planner.md` and do NOT restart/reconfigure
  opencode.
