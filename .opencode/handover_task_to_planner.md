# EXECUTIVE SUMMARY — Phase 6 / Tier 1 — plugin v1.1: filter the token-stream flood

## Official BEFORE-record (live log, measured by this worker 2026-09-08 ~14:24Z)
`.opencode/plugin.log` kept growing during the scan (this very model stream is still the
v1 in-memory plugin's writer — see DoD note), so the numbers below are at scan completion
and are the official before-record; they should trend ~same with time (vs planner
snapshot: 7,733 lines / 2.48 MB):
- **12,916 lines / 4,178,996 bytes** · 0 unparseable lines · max line length 1,450 chars
- kind Counter: `event` **12,891**, `tool.before` 14, `tool.after` 11
- event-type Counter: `message.part.delta` **12,585 (≈ 97.4 % of lines)** ·
  `message.part.updated` 128 · `message.updated` 55 · `plugin.added` 45 ·
  `session.status` 28 · `session.updated` 18 · `session.diff` 14 ·
  `file.watcher.updated` 10 · `file.edited` 3 · `catalog.updated` 2 ·
  `reference.updated` 1 · `integration.updated` 1 · `session.created` 1
- tool hooks by tool (before+after): `read` 10 · `write` 7 · `bash` 7 · `task` 1
→ ~97 % of lines are delta; the patch removes them at the source.

## The patch (`.opencode/plugin/handover.ts`, 2 sites, diff below)
```diff
 const DOT = "\u2026";
+const SKIP_EVENT_TYPES = new Set(["message.part.delta"]);
 …
 async function onEvent(input: { event?: unknown }): Promise<void> {
   try {
     const ev = (input?.event ?? {}) as Record<string, unknown>;
+    const type = str(ev.type);
+    if (type && SKIP_EVENT_TYPES.has(type)) return;
     const props = (ev.properties ?? {}) as Record<string, unknown>;
```
Untouched, as specced: hook set, JSON line format (no new fields), truncation ladder
[500/150/60] + 2000 cap, safety guards, log path/gitignore. (Header comment still reads
"v1" — deliberate, TODO.md #13.)

## Offline probe
Runner = v1 recipe unchanged: `%LOCALAPPDATA%\Programs\@opencode-aidesktop\OpenCode.exe`
+ `ELECTRON_RUN_AS_NODE=1` → **Node v24.15.0**, no downloads, same cosmetic
`MODULE_TYPELESS_PACKAGE_JSON` warning as v1 (probe deleted, log reset afterwards).
- **One deviation, flagged:** the probe wrote to a scratch `tmpdir` `.opencode/plugin.log`
  (fresh `mkdtemp` + `.opencode` subdir) instead of the repo log. Reason: the running
  opencode session still holds the pre-patch plugin in memory and streams delta lines into
  the repo log in parallel — an in-repo "exactly N lines" assertion would race it. The
  patched plugin's behavior was fully exercised; the scratch log is its sole writer.
- **Task spec off-by-one, recorded as TODO.md #12:** "exactly 5 lines" vs its own payload
  list — deltas x3 skipped ⇒ 4 lines (message.updated 1 + plugin.added 1 + tool.before 1 +
  tool.after 1). The probe asserts the correct invariant: 4 lines, zero
  `message.part.delta` lines, 1 line per unskipped payload.
- **Result: PROBE OK, 7/7 checks PASS** — default export is a function; hook set exactly
  `{event, tool.execute.before, tool.execute.after}`; exactly 4 lines; no delta line
  survives; all lines ≤ 2000 chars; all `JSON.parse`-able; kinds 2×event / 1×tool.before /
  1×tool.after. Log lines (verbatim):
```
{"ts":"2026-09-08T14:26:59.396Z","kind":"event","type":"message.updated","session":"probe-session-1","agent":"planner","properties":"{\"sessionID\":\"probe-session-1\",\"info\":{\"role\":\"assistant\",\"agent\":\"planner\"}}"}
{"ts":"2026-09-08T14:26:59.397Z","kind":"event","type":"plugin.added","properties":"{\"id\":\"agent\"}"}
{"ts":"2026-09-08T14:26:59.397Z","kind":"tool.before","tool":"task","session":"probe-session-1","call":"probe-call-1","args":"{\"subagent_type\":\"worker\",\"prompt\":\"v1.1 probe\",\"description\":\"Tier 1 v1.1: delta filter\"}"}
{"ts":"2026-09-08T14:26:59.397Z","kind":"tool.after","tool":"task","session":"probe-session-1","call":"probe-call-1","title":"worker: v1.1 probe","output":"\"EXECUTIVE SUMMARY ...\"","metadata":"{\"duration\":42}"}
```

## pytest
`& .\.venv\Scripts\python.exe -m pytest -q` → **434 passed, 13 warnings** (identical
baseline; no FST code touched — tree green).

## v2 evidence (live `plugin.log`, read before reset)
- **This delegation — `tool:before/after`, `task`, v1.1 live-cycle evidence.** The
  `tool.before` line (log line 11973 of 12,916; verbatim):
```
{"ts":"2026-09-08T14:20:53.409Z","kind":"tool.before","tool":"task","session":"ses_f7eb89fa1ffexpkMmpLNw4dRbH","call":"P6sRew7hVYZteQh8eEFr4xqQQ8DgpTFQ","args":"{\"description\":\"Tier 1 v1.1: delta filter\",\"prompt\":\"Read .opencode/handover_task.md and execute exactly it — a full implementation task (patch, verify offline-probe style per AGENTS.md facts: Windows PowerShell shell, .venv, no node/bun on PATH, the Electron RUN_AS_NODE recipe is in .opencode/handover_task_to_planner.md from the v1 summary). Also read .opencode/handover_task_to_planner.md FIRST for the v1 payload findings and probe recipe. Write the EXECUTIVE SUMMARY and commit per the routine…"}
```
  Findings: task-tool args are `{description, prompt}` (no `subagent_type` — that was a v1
  probe-fabrication artifact, the live payload does NOT carry it). Session-ID live format:
  `ses_f7eb89fa1ffexpkMmpLNw4dRbH`; callID = opaque base64-ish string. The matching
  `tool.after` for this very delegation is written by the in-memory plugin **at
  delegation end** — it lands in the live log AFTER this summary text (it contains the
  worker's final message as `output`), so v2 should verify it on its first log read; that
  closes v1 post-restart checklist #2 (worker final-message arrives). Note the pre-deletion
  repo log (reset for the commit) contained only the `before` line: 1 `task` line in
  `tools` Counter.
- **`plugin.added` × 45 — all fire at session start, one line each** (14:13:04.247 →
  14:13:04.305Z; 200 ms burst = provider/model catalog registration, not repeats).
  Each carries exactly one property — the built-in plugin `id`. Two full verbatim lines:
```
{"ts":"2026-09-08T14:13:04.247Z","kind":"event","type":"plugin.added","properties":"{\"id\":\"core/config-reference\"}"}
{"ts":"2026-09-08T14:13:04.248Z","kind":"event","type":"plugin.added","properties":"{\"id\":\"agent\"}"}
```
  Breakdown: 8 core/config plugins (`core/config-reference`, `agent`, `command`, `skill`,
  `models-dev`, `config-agent`, `config-command`, `config-skill`) + 33 provider ids
  (`alibaba` … `zenmux`, incl. `anthropic`, `openai`, `google-vertex`) + 4 (`dynamic-provider`,
  `config-plugin`, `config-provider`, `variant`). Tiny (100–120 B/line) → not a v2 filter
  candidate; the 45 count = provider-catalog size at start.

## v2 ideas (recorded here only — no code)
- Rotation / size cap / per-type volume cap — still v2. Expected effect of v1.1: log line
  volume drops ~97 % (12,916 → ~331 lines in the same window); remaining per-chunk events
  are `message.part.updated` (128) / `message.updated` (55) — collapse or filter if growth
  still bothers (bytes-per-hour check).

## DoD note
The patch goes **LIVE at the next opencode START** — this running session keeps the old
(in-memory v1) copy, which is also why the BEFORE-record and v2 evidence above came from
the v1 writer. **No restart performed here**, none permitted.

## Log reset / tree hygiene
Probe file + scratch dir deleted; `.opencode/plugin.log` deleted (gitignored anyway) —
the live v1 writer will recreate it mid-stream; left in its recreated state, still ignored.

## TODO.md entries appended
- **#12** — task spec's "exactly 5 lines" off-by-one (payload list ⇒ 4 lines); invariant
  for v2 tasks: "one line per unskipped payload".
- **#13** — `handover.ts` line-1 header still self-labels "v1" (cosmetic, deliberate per
  the minimal-patch mandate).

## Files changed / commit
- `.opencode/plugin/handover.ts` — the patch (2 sites).
- `.opencode/handover_task.md` — planner's v1.1 rewrite of the task file (was still the v1
  spec in the tree) — committed with the handover, per the task's file list.
- this summary, `TODO.md` (append-only #12/#13).
- **Left untouched / not staged:** `opencode.jsonc` (pre-existing uncommitted planner-side
  permission tweak, NOT mine and outside the commit list) and `.opencode/handover_planner.md`.

Commit: subject `Filter message.part.delta from handover plugin log (v1.1)`, one short
body line each for: v1.1 probe verified (7/7, 4-line invariant, TODO #12) · v2 evidence
captured (task tool.before + plugin.added x45) · pytest 434 baseline unchanged.
