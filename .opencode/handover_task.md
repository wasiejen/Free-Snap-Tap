# TASK — Phase 6 / Tier 1 — plugin v1.2: log-focus fix (event cascade growth)

FIRST read `AGENTS.md`, `.opencode/handover_task_to_planner.md` (v2 EXECUTIVE
SUMMARY — contains the offline Electron `RUN_AS_NODE=1` Node 24 probe recipe),
and the current `.opencode/plugin/handover.ts` (v2).

## Context (planner's measurement — this is a growth fix, not a feature)
Post-restart planner session 2026-09-08 measured `.opencode/plugin.log` (the
file is scratch + gitignored — the maintainer may have cleared it before this
session, so treat it as optional evidence, not a dependency): a fresh session
grew to 174 lines / 76 KB in its first 77 s (~0.9 KB/s sustained). Per-type
byte share of that log (lines were logged WITH this mix still enabled, i.e. the
measured payload shapes below are live evidence):
- `message.part.updated` — 56 lines, 43% of bytes. Fires on part creation AND
  on every part state transition; `properties` = `{sessionID, part:{id,type,
  text | state:{input, metadata.output, status, time}, ...}, time}` — full part
  payload, duplicating what `tool.execute.before/after` already log (args,
  output).
- `message.updated` — 23 lines, 20%. `properties` = `{sessionID, info: <full
  message object: id, role, agent, mode, time>}` — fires on every message
  update.
- `session.updated` — 9 lines, 9%. `properties` = `{sessionID, info: <full
  session object>}` — per-message-activity churn.
- `session.status` — 12 lines, 3%. `properties` = `{status:{type: busy|idle}}`.
- `session.diff` — 6 lines. `properties` = `{sessionID, diff:[…]}`.
- `plugin.added` — 45-line burst at opencode start (provider-catalog
  registration), `properties` ≈ `{"id":"core/…"}`.
- `catalog.updated` / `reference.updated` / `integration.updated` — a few
  lines total, empty `properties` `{}`.
v1.1's flood filter (`773e1ae`) skipped only `message.part.delta`; this
UPDATE-event cascade remained and is the residual growth source. NOTE:
`message.part.delta` is NOT in the log (v1.1 filter active since this restart —
sanity: if you see it, the running plugin is stale).

## The change (decided — implement exactly this; v1/v2 behavior otherwise byte-for-byte)
1. In `.opencode/plugin/handover.ts`, extend `SKIP_EVENT_TYPES` from
   `{"message.part.delta"}` to exactly:
   `message.part.delta` (v1.1), `message.part.updated`, `message.updated`,
   `session.updated`, `session.status`, `session.diff`, `plugin.added`,
   `catalog.updated`, `reference.updated`, `integration.updated`.
2. Update the file-header comment block: one v1.2 line — the skip set now
   covers the cascading UPDATE events (measured 63% of steady-state bytes);
   `session.created`, `transform`, `warn`, `tool.before/after` stay logged;
   UNSEEN event types remain logged (skip-list = opt-out only → shape
   learning preserved for new opencode event types).
3. NOTHING else changes: no new state, no new hooks, no change to
   `buildLine`/`LINE_CAP`/`CAPS`, task-file gate, warn lines, summary mirror,
   transform gate (those ship with a later decision — do NOT touch).

## Verification (offline, same Electron `RUN_AS_NODE=1` Node 24 recipe)
- **Regression: re-run the FULL v2 probe suite byte-for-byte** — its scenario
  file is in git history: `git show 2a4996c:.opencode/handover_task.md`
  (scenarios 1–5). All must still pass unchanged.
- New v1.2 scenarios, each asserted:
  1. feed each of the 9 newly-skipped event types (reuse the payload shapes
     from the Context section) → assert ZERO appended `plugin.log` lines for
     that type, no throw.
  2. feed an UNSEEN type, e.g. `{"type":"message.part.snapshot"}` → assert it
     IS logged (default-keep preserved).
  3. byte budget: feed 190 events (10 per each of the 10 skipped types + 10
     per retained type: `session.created`, `message.part.delta`, `transform`,
     `tool.before`, `tool.after` — realistic payload sizes) → assert total
     log bytes for this scenario < 4 KB. Run the same mix BEFORE your edit too,
     record both numbers in the summary (before vs after evidence).
  4. every emitted line still JSON.parse-able and ≤ 2000 chars.
- `& .\.venv\Scripts\python.exe -m pytest -q` → **434 passed**;
  `& .\.venv\Scripts\ruff.exe check --select F .` → **6 findings**.
- No live cycle here — the plugin loads at opencode START; live proof =
  post-restart planner session measures the new log's `kind` distribution
  (planner will record it; note this in the summary).

## Summary + commit — ONE SHOT DEVIATION (planner's mirror proof, read
carefully — it overrides the standing prompt below it):
- Per the standing rule the summary goes to `.opencode/handover_task_to_planner.md`
  — **EXCEPT for this task only**: write your EXECUTIVE SUMMARY to
  `.opencode/handover_task_to_planner_worker.md` instead, and DO NOT touch
  `.opencode/handover_task_to_planner.md` at all. The plugin (v2 mirror) will
  overwrite the canonical file from your final message after the task ends —
  this proves the mirror is plugin-owned. Record in the summary (and make the
  final message carry it): the `Get-FileHash` (SHA256) of
  `.opencode/handover_task_to_planner.md` taken BEFORE you started (that hash
  lets the planner prove only the plugin modified the file after delegation).
  Include also: v2.1-spec archive note NOT relevant — omit it. Include: the
  before/after byte-budget numbers, regression + new probe results,
  pytest/ruff counts, commit hash, and that live proof awaits a restart.
- Commit per AGENTS.md: `.opencode/plugin/handover.ts`,
  `.opencode/handover_task.md`, `.opencode/handover_task_to_planner_worker.md`,
  `TODO.md` only if the probes surfaced a discrepancy. NOT:
  `.opencode/handover_task_to_planner.md`, `.opencode/handover_planner.md`,
  `plugin.log`, `opencode.jsonc`, `AGENTS.md`, playground files. Subject:
  `Handover plugin v1.2: skip cascading UPDATE event types (log growth fix)`.
