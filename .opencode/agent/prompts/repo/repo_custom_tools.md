# repo_custom_tools.md — host-specific opencode tools (read when you use one, or its behavior surprises you)

Host-specific tools registered for this repo: `.opencode/tools/{block_transfer,ctx_gauge,loop_log}.ts`
+ the `compact_memory` plugin (`.opencode/plugin/compact_memory.ts`). The tool
description injected into your context is CURRENT and authoritative — this part
only adds WHEN-to-use guidance and traps that are not in the description.
Contract pinning lives in `.opencode/plugin/probes/handover_probe.mjs`.

## block_transfer — multi-line block MOVE / COPY / CUT / PASTE / DELETE / CLEAR
- Use it for housekeeping moves of multi-line blocks (TODO sections, log
  sections, prompt blocks) across or within files — instead of write/edit.
- Anchors: `startMarker` / `endMarker` are SHORT UNIQUE line prefixes; the
  block spans start..end INCLUSIVE. A non-unique anchor fails — widen the
  prefix, do not guess.
- One buffer per `bufferName` (default `'default'`); several can coexist.
  MOVE = single direct transfer; COPY/CUT + PASTE = multi-step; DELETE
  discards; CLEAR empties a buffer. `targetMarker` sets the insertion point
  (right after that line); omitted = append to EOF.
- Sandbox: all reads AND writes are confined to the repo working dir + the
  Windows temp dir. Outside paths are rejected.
- Verify after every MOVE/PASTE with `git diff` — the tool reports the line
  it acted on, not the result.

## ctx_gauge — context readout, read-only
- Read the context usage of the current session (omitted/empty `sessionID`)
  or a named one. Prefer it over the `peek.mjs` shell-out — same number,
  no shell cost.
- Readout forms: `SESSION=… CTX=n (p%) REM=m`; unknown window → no pct/REM;
  no total / unreadable db → `CTX=notAvailable` + the error appended.
- GAUGE-LAG TRAP (maintainer #9): the readout lags the TRUE context by ≈2
  tool calls (~5k). Plan with margin; a displayed readout is optimistic.

## loop_log — append one loop-log line (loop roles only)
- Roles in the loop (planner / worker / looprunner) write their bookkeeping
  here instead of hand-formatting `loop_log.md`: it appends the formatted
  line to the current looprun folder and auto-creates the dated folder.
- `status` is exactly one of the 8-char tokens: `-->START`, `DONE<---`,
  `-RETURN-`, `-WARNING`, `--INFO--` (a bogus token is rejected at parse).
- DONE content = the final gauge readout + one-line outcome; START content =
  the task one-liner; RETURN carries `role session model`; WARNING carries
  the failed session id + cause. Pass your session id from the injected
  `SESSION=` field.
- Never hand-edit `loop_log.md`; it is the loop's committed record.

## compact_memory — session compaction (fire-and-forget)
- Fire it to compact your OWN session at the L3 trigger, or cross-session
  (planner rescuing a worker: `sessionID` + `providerID`/`modelID`).
  Cross dispatches are fire-and-forget: success is VERIFIED by the
  `COMPACT` line in `.opencode/temp/ctx.log` (or the terminal), not by the
  response. Budget is per session + quant class (CPU models denied, cap 0).
- Pre-compaction dump (TODO #55, landed plan4): before ANY dispatch the
  target session's full content is dumped to
  `.opencode/archive/sessions/compaction_dumps/<sid>_c<count>.md` —
  NEVER overwritten; a same-count collision falls back to a STAMPED name.
  A dump failure is logged (`DUMP-FAIL` in `ctx.log`) and never blocks.
- After a SELF compaction the session ENDS — continuation rides the
  post-compaction reload directive / `task_id` resume (planner prompt
  §Context-budget trigger). A failed dispatch consumes NO budget.
- Same-model cross compaction → expect ONE flush delegation afterwards
  (llama-swap single slot); a DIFFERENT compaction model (e.g. Gemma) → no
  flush (knowledge_tools.md).

## NOT here
Built-ins (`task`, `skill`, `webfetch`, …) and the probe/gauge scripts
(`.opencode/plugin/scripts/`, `repo_commands.md`) are not custom tools —
their docs live with them.
