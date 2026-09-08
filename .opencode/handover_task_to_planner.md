# EXECUTIVE SUMMARY — Phase 6 / Tier 1 — handover plugin v1 (LOG ONLY)

## Files changed
- `.opencode/plugin/handover.ts` (new, 113 lines) — log-only plugin v1: default-export
  `Plugin` function (`satisfies Plugin`, types from `@opencode-ai/plugin`), registers
  exactly `{ event, "tool.execute.before", "tool.execute.after" }`; one compact JSON
  line per hook call to `.opencode/plugin.log`; stringified fields capped at 500 chars
  (`…` suffix) with a whole-line ladder `[500, 150, 60]` that degrades big fields — then
  drops them — until the line is ≤ 2000 chars and still valid JSON. All fs ops wrapped
  (lazy `appendFileSync`, best-effort, hooks can never throw/reject). No tool-output
  mutation, no behavior change.
- `.opencode/.gitignore` — appended `plugin.log` (existing entries kept).
- `.opencode/handover_task.md`, this file — task spec + this summary (commit routine).
- NO FST code/test changes, NO `opencode.jsonc` changes, NO TODO.md append (no
  discrepancies found), NO `.opencode/handover_planner.md` changes (planner-owned).

## Verification
- **Runner**: no `node`/`bun`/`npx` on PATH (checked PATH, user/machine env, common
  install dirs). Ran the probe offline via the OpenCode Desktop Electron binary with
  `ELECTRON_RUN_AS_NODE=1` → **Node v24.15.0** (type stripping flag-free on v24 —
  the closest equivalent to `node --experimental-strip-types` in the task's ladder, no
  downloads).
- **Probe result**: throwaway `.opencode/probe_handover.mjs` (deleted after run)
  imported the plugin default export, asserted it is a function, called it with a
  minimal fake `PluginInput` and got the hook set **`{ "event", "tool.execute.after",
  "tool.execute.before" }` (sorted)** — exactly the 3 v1 hooks. Invoked each with
  task-shaped payloads (3000-char prompt/properties to stress truncation); all calls
  resolved without throwing; `.opencode/plugin.log` ended with 3 lines, each
  `JSON.parse`-able, lengths **635 / 652 / 783** (all ≤ 2000). Probe file + log deleted
  before commit (log is gitignored anyway).
- **Test baseline**: `pytest -q` → **434 passed**, 13 warnings — untouched green
  baseline confirmed (commit adds no FST code).
- Probe-run side note (not a discrepancy): un-bundled `.ts` import emitted Node's
  `MODULE_TYPELESS_PACKAGE_JSON` warning (`.opencode/package.json` has no `"type"`);
  cosmetic, opencode bundles plugins at start, expect none.

## What the payloads actually expose (vs node_modules v1.18.29 — recorded for v1)
- `tool.execute.before`: input `{ tool, sessionID, callID }` — **args are on `output`**,
  not input (that's where the plugin reads them). No `agent` field anywhere in the
  tool payloads — agent attribution comes from `event` payloads (message info carries
  `agent`) or from correlating `sessionID` + `callID` across lines.
- `tool.execute.after`: input `{ tool, sessionID, callID, args }`; output
  `{ title, output, metadata }`.
- `event`: `{ event: { type, properties } }`; session extracted from
  `properties.sessionID` or `properties.info.sessionID`, agent from `properties.agent`
  or `properties.info.agent` (message events). Log lines: `ts, kind, type?, session?,
  agent?, call?, tool?, title?, <big fields: args|properties|output|metadata>`.
- Line formats proven below: args arrive pre-truncated string (double-quoted), whole
  field `cap ≤500`.

## Captured v1 payload evidence (probe lines, verbatim)
```
{"ts":"2026-09-08T14:05:34.383Z","kind":"tool.before","tool":"task","session":"probe-session-1","call":"probe-call-1","args":"{\"subagent_type\":\"worker\",\"prompt\":\"execute the task in the working repo. xxxx…(500 x, ellipsed)"}
{"ts":"2026-09-08T14:05:34.383Z","kind":"event","type":"message.updated","session":"probe-session-1","agent":"planner","properties":"{\"sessionID\":\"probe-session-1\",\"info\":{\"role\":\"assistant\",\"agent\":\"planner\",\"tokens\":\"xxx…(459 x, ellipsed)"}
{"ts":"2026-09-08T14:05:34.386Z","kind":"tool.after","tool":"task","session":"probe-session-1","call":"probe-call-1","title":"worker: v1 probe","args":"{\"subagent_type\":\"worker\",\"prompt\":\"execute the task in the working repo.\"}","output":"\"EXECUTIVE SUMMARY xx…(390 x, ellipsed)","metadata":"{\"duration\":1234}"}
```
(lines shown abbreviated only where 3000-char `x`-runs repeat; actual lengths 635/652/783,
all fields genuinely parse-able at the plugin, full repeats were elided here for brevity)

## DoD status — NOT complete in this session (by design)
v1's full DoD ("plugin.log shows a full planner→worker cycle; opencode start unaffected")
is completed in the **NEXT session after the maintainer restarts opencode**. No planner
session restart or config change happened here (task forbade it).

### Post-restart checklist (what to look for in the real log)
1. **Task call args shape** — a `tool.before` line with `tool:"task"`: does `args`
   carry `subagent_type`, `prompt`, `description`/`task` fields (this probe proves the
   log path works; real args are the payload question). Note args come from the `before`
   `output` object — if a real `task` call shows empty/missing `args`, check whether
   opencode passes args differently.
2. **Worker-final-message arrival** — after a real planner→worker round-trip the log
   should show `tool.after` `tool:"task"` with the worker's final message in `output`
   (and `title`), i.e. delegation is observable end-to-end.
3. **Session IDs** — planner and worker should appear under the same `sessionID`;
   record both the live format (`ses-…` prefix?) and whether `event` lines carry
   `agent` (planner/worker) — v1 correlates sessions by `sessionID` only.
4. **Flag anything**: hook ordering surprises (e.g. `before` logging before `event`
   `message.updated` for the same tool call), `event` payload volume/noise (how many
   `message.part.updated`-style lines per turn — consider filtering in v2), and any
   opencode-start delay/errors attributable to the plugin (escape hatches
   `OPENCODE_DISABLE_DEFAULT_PLUGINS` / `OPENCODE_PURE` noted in the task file).

## Discrepancies
None found against `@opencode-ai/plugin` v1.18.29 types (hook signatures, `PluginInput`,
export shape all as expected) → no TODO.md append. Skill-doc summary is consistent with
the node_modules types.
