# EXECUTIVE SUMMARY — Phase 6 / Tier 1 — plugin v2: ownership (deterministic handover)

## What changed (`.opencode/plugin/handover.ts` → v2)

Four ownership behaviors, exactly as specced — the v1/v1.1 log (hooks, JSON line format,
delta filter, [500/150/60] ladder + 2000-char cap) untouched, one behavior added: a `kind:"
transform"` evidence line per transform call (deliberate — it is how the live payload shape
becomes known; the v1.1 writer never emits that kind, so counts stay stable).

1. **Task-file gate (before + after):** a `task` call is a HANDOVER delegation only when
   `args.prompt` contains `.opencode/handover_task.md`. Non-handover delegations are
   invisible to all v2 behavior (no warn, no mirror, no injection) — the v1.1 log line
   itself is unchanged.
2. **Pre-flight (`tool.execute.before`, handover only):** spec file missing or empty →
   one line `{"ts":…,"kind":"warn","reason":"handover-task-file-missing-or-empty","call":…,
   "session":…}` appended to `plugin.log`. Observation only — never blocks or mutates the
   delegation.
3. **Summary mirror (`tool.execute.after`, handover only):** OVERWRITES `.opencode/
   handover_task_to_planner.md` with `output` VERBATIM — no ladder (that applies to
   `plugin.log` lines only). `output` empty → file untouched; `metadata.truncated === true`
   → one trailer `\n\n[TRUNCATED by opencode tool_output cap — see plugin.log call
   <callID>]` appended. All fs best-effort, never throws.
4. **ctxgauge injection (`experimental.chat.system.transform`):** payload logged FIRST as a
   `kind:"transform"` evidence line; if the payload exposes an `agent` whose value starts
   with `planner` (case-insensitive), the line `ctx: <peek.py output>` is pushed onto
   `output.system` — gauge run via the `PluginInput` `$` shell (`.venv/Scripts/python.exe
   .opencode/ctxgauge/peek.py`, 3 s bounded wait, nothrow, no child_process fallback). No
   shell / no identifier → line simply omitted. No hook ever blocks indefinitely or throws.

## Transform hook signature (read from `@opencode-ai/plugin` 1.18.29 in `.opencode/
node_modules` — per instruction, before implementing)

`"experimental.chat.system.transform"?: (input: {sessionID?: string; model: Model}, output:
{system: string[]}) => Promise<void>` — input exposes **no agent identifier**. `BunShell`'s
type is internal (not re-exported by the package), so the plugin uses a minimal structural
`ShellLike` cast (only `cwd()` + tag call + `nothrow().text()` are ever called).

## Offline probe — 19/19 PASS

Runner = v1/v1.1 recipe unchanged: `%LOCALAPPDATA%\Programs\@opencode-aidesktop\OpenCode.exe`
+ `ELECTRON_RUN_AS_NODE=1` → Node 24.15.0; same cosmetic `MODULE_TYPELESS_PACKAGE_JSON`
warning. **One deviation, flagged:** the probe ran with the repo root as cwd (scenario 1
needs the REAL `handover_task.md` renamed away; scenario 3 needs the REAL mirror file), so
`plugin.log` was written in-repo while the in-memory v1.1 writer co-appended its own lines —
all assertions are scoped by `kind` (the running instance never emits `warn`/`transform`, so
exact-kind counts are race-free; scenario 5's global scan covers the co-appended lines).
Scratch files: none left; log left in its co-appended state (gitignored). (Two passes — the
gauge tag call was matched to the declared BunShell call shape between passes and the probe
was re-run against the final code in the tree; the counts are that final pass.)

- **S1** — `before(task)` handover-shape, spec present → **no** warn line. Same, with the
  spec temporarily renamed away (try/finally restore; restore verified BYTE-EXACT — tree
  left exactly as found) → **exactly one** warn line, valid JSON, `reason`/`call`/`session`
  exact. Verbatim (final run):
  `{"ts":"2026-09-08T15:12:51.726Z","kind":"warn","reason":"handover-task-file-missing-or-empty","call":"probe-call-2","session":"probe-session-1"}`
  Evidence sample (`transform` evidence line, SDK-signature payload → note NO `agent` field):
  `{"ts":"2026-09-08T15:12:51.750Z","kind":"transform","session":"probe-session-2","payload":"{\"sessionID\":\"probe-session-2\",\"model\":{\"id\":\"Qwen3.8-27B-IQ3KT-120K_MTP\",\"providerID\":\"llama-swap\"}}"}`
- **S2** — `before(task)` non-handover prompt → no warn, mirror file byte-untouched.
- **S3** — `after(task)` handover-shape: (a) `truncated:false` + synthetic final message →
  mirror overwritten with exactly that content; (b) `truncated:true` → trailer present,
  verbatim; (c) `output` empty → mirror untouched. Pre-probe mirror content restored
  byte-exact in try/finally (replaced afterwards by THIS summary — worker side, per the
  handover routine).
- **S4** — `system.transform`, per the probed signature: planner shape (`agent:"
  planner_120k_mtp"` live-name shape) with the (fake) shell present → `ctx: CTX=…` appended
  exactly once; non-planner agent, SDK-signature shape (no `agent` field at all), and
  planner-shape with NO shell captured → all OMITTED, no throw. Four `transform` evidence
  lines written — exactly the probe's four calls.
- **S5** — every `plugin.log` line from the probe window: `JSON.parse`-able, ≤ 2000 chars
  (including co-appended live v1.1 writer lines).

## pytest / lint

`& .\.venv\Scripts\python.exe -m pytest -q` → **434 passed, 13 warnings** (identical
baseline — no FST code touched). ruff `--select F`: **6 findings** — baseline unchanged.

## Design flags (planner calls — recorded, not decided here)

1. **Transform payload exposes no clean agent identifier** — per the pre-set call from the
   task (and confirmed from the SDK types: input = `{sessionID?, model}`): **NOT**
   injecting for all agents; the line is omitted at v2's live debut unless opencode happens
   to hand the transform call an `agent` identifier. The `agent`-field evidence from the v1
   logs (v1.1 summary): assistant-message `message.updated` lines carry `info.agent` = the
   CONFIG agent name (`planner_120k_mtp` / `worker_120K_mtp`) — the gate is exactly
   `startsWith("planner")`, so if the identifier DOES arrive live, injection fires with
   zero code change. The `transform` evidence lines settle the question from the
   post-restart log — no guessing. (TODO.md #14.)
2. **Instruction tension** — AGENTS.md plan-state pre-commit update vs the task's "do NOT
   touch `handover_planner.md`": worker updated the stamp + one status bullet only, folded
   into this single commit (no separate plan-state commit). Maintenance to keep in the same
   lane, the task governs this run. (TODO.md #15.)
3. Gauge-line visibility (the DoD half below) can only be proven after restart — and only
   if an identifier arrives (see #1).

## Effective-at-next-restart (note)

The patch goes **LIVE at the next opencode START** — this running session keeps the
in-memory v1.1 copy; no restart performed here, none permitted. The v1.1 filter already
quieted the live log (verified: the co-appended lines in this run's probe window carry no
delta lines).

## DoD for next session (planner's record)

One real delegation where the mirror write happened **BY THE PLUGIN** (that cycle's task
spec drops the "worker writes the summary" line — the plugin owns the file) + the gauge
line visible in the planner context. Both prove against a fresh quiet post-restart
(v1.1-filtered) log — with identifier-availability caveats as in flag #1.

## TODO.md appended

- **#14** — transform payload exposes no agent identifier: line omitted + payload
  evidence-logged; follow-up (alternative planner-only signal) is a planner call.
- **#15** — AGENTS.md plan-state pre-commit vs task "do not touch handover_planner.md" —
  worker resolution recorded; maintenance to keep the lane consistent.

## Files / commit

- `.opencode/plugin/handover.ts` — v2 (ownership hooks + transform evidence logging; v1/
  v1.1 log behavior byte-for-byte kept).
- `.opencode/handover_task_to_planner.md` — this summary.
- `.opencode/handover_task.md` — the v2 task file (as written by the planner — committed
  with the handover, per the file list).
- `TODO.md` (#14/#15 append-only), `.opencode/handover_planner.md` (stamp + one status
  bullet — see #15).
- **Left untouched / not staged:** `opencode.jsonc` (pre-existing maintainer dirty edit —
  explicitly out of scope), `.opencode/plugin.log` (gitignored; probe evidence consumed),
  `v2probe.mjs` (deleted before commit — v1/v1.1 hygiene).

Commit subject: `Add handover plugin v2: task gate, summary mirror, ctxgauge injection`.
