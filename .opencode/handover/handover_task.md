# TASK — plugin v2.8: constant per-tool ctx readout + idle-deferred nudges + single-file ctx log (re-scoped 01-41 design of record)

FIRST read `AGENTS.md`, `agents_repo.md`, and this file. Sources of the design (read
them — they are the design of record): `proposals/approved/260910_plugin-compaction-detection.md`
(the design file you UPDATE in Part 1), `proposals/maintainer/done/2026-09-11_01-41.md`
(the re-scope), `proposals/maintainer/done/2026-09-11_00-31.md` (the two delivery
mechanics — option 1 = idle-deferred message, option 2 = mutate the tool result).
Approval: maintainer message 01-41 approved this observable plugin behavior and named
the proposal file as the place to record it. NO FST code, NO `opencode.jsonc`, NO
`tests/**` (the gate is the Python suite + the bun probe).

## Design summary (what v2.8 is)
Compaction is entirely DEACTIVATED — the window cannot be exceeded — so constant
current-ctx data matters more than compaction detection. ONE per-session gauge read
per `tool.execute.after` (the existing `readGauge`/per-session mechanic stays) feeding
three consumers from the SAME read:
1. **Constant per-tool readout** (the priority): appended to the tool result itself —
   very minimal, like `(50%/15K)` (pct of window + REM in K, your exact format
   choice in that shape; unknown window → REM-only form; no signal / db-error →
   append NOTHING, stay silent — never throw, no per-failure log line; the
   chat.message gauge failure channel stays the failure channel). This is the 031
   option-2 mechanic: linear, cache-safe, no extra message. Check the SDK hook types
   (`dist/gen/types.gen.d.ts`) for how `tool.execute.after` returns/mutates the result
   and pin the mechanic in the v2.8 header block.
2. **Threshold nudges STAY as messages** (the 50/70/80/90/5k ladder, per-rung
   per-session dedup, `kind:"nudge"` evidence lines — all unchanged), but delivery
   becomes RACE-FREE per 031 option 1: `setImmediate`-deferred + a session
   busy/idle check before `promptAsync` (the 031 code sketch is the reference; the
   SDK may not expose `status` — if not, `setImmediate` deferral alone is the
   mechanic; record which landed). Never call `promptAsync` synchronously inside
   `tool.execute.after` anymore.
3. **Single-file ctx log** (the step-3 ruling in the proposal file): ONE file (path
   your choice under the git-ignored `.opencode/temp/` tree — the old per-session
   `session_context/<sid>` writeout idea is superseded), append-only; each entry
   = leading datetime (the general `YYYY-MM-DD_HH-MM` convention) + the current
   model if discoverable from the gauge/session data + the readout — logged on the
   same per-tool read that feeds (1), so the planner can gauge a worker's LAST state
   from the log or the session's own appended tool returns.

## Part 1 — spec fold-in FIRST (before any build)
Update `proposals/approved/260910_plugin-compaction-detection.md`: add a dated
"Planner status (2026-09-11, iteration 4)" block recording the re-scoped design of
record — the 01-41 re-scope supersedes the 031 minimal read; compaction entirely
deactivated; the three consumers above; which 031 mechanic landed for each; the log
file path. Keep it factual and short; do not rewrite the maintainer's comments.

## Part 2 — build (`.opencode/plugin/handover_v2.4.ts` + probe)
- Restructure `onToolAfter`: ONE `readGauge` read → feed the readout append, the
  ladder (as today), and the single-file log entry.
- Add a v2.8 header block (the header comment is the design of record — same style
  as the v2.6/v2.7 blocks): what changed, the mechanics chosen, the SDK type facts.
- Probe (`.opencode/plugin/probes/handover_probe.mjs`): extend with the new
  scenarios — readout appended to a fake tool result; no-append on db-error /
  missing session; idle-deferred delivery shape (the fake client is not called
  synchronously; busy → skipped/deferred per the landed mechanic); single-file log
  entry format (datetime + model-if-found + readout). Rebuild the check count
  consistently (currently 52).
- `chat.message` ctx line, `tool.execute.before` pre-flight, and the silence
  discipline (no NEW gauge-failure reasons, no per-tool log-line growth in
  plugin.log beyond what exists) stay as-is.

## Definition of done
1. Part 1 block present in the proposal file, committed BEFORE the build commit
   (two commits or one commit with the fold-in verifiable in the diff — your call,
   note it in the summary).
2. Readout appended on every `tool.execute.after` with a successful read; format
   minimal `(NN%/NNNK)`-ish; silent no-append on no-signal reads; probe pins it.
3. No synchronous `promptAsync` inside `tool.execute.after` (grep-verifiable);
   the deferred delivery mechanic is recorded in the v2.8 header block + Part 1.
4. Single-file ctx log under `.opencode/temp/` (git-ignored — verify `git status`
   stays clean with the file present), entry format per the step-3 ruling; probe
   pins the format.
5. Probe: ALL checks PASS, exit 0 (record the new total); gate unchanged:
   `& .\.venv\Scripts\python.exe -m pytest -q` = **448 passed** + 1 known #10
   warning; `& .\.venv\Scripts\ruff.exe check --select F .` = **0**.
6. ONE (or two) commit(s): plugin + probe + proposal fold-in + your summary file.
   `opencode.jsonc` never staged.

## Context gauge / stop line
Per AGENTS.md §Context budget — self-gauge `node .opencode\plugin\scripts\peek.mjs`
between chunks and after the commit; stop line `REM ≤ 15k` or `≥ 85 %`. If you hit
the line mid-build: commit the green state you have, write the summary with the
exact remainder, stop. Findings you cannot fix in scope → APPEND to
`todo_inbox.md` (never `TODO.md`).
