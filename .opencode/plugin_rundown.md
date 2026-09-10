# handover plugin — current state rundown (v2.6, verified from source 2026-09-10)

Requested: the maintainer's "i do not know what the handover plugin is actually doing
in its current state — need a short rundown."

One file: `.opencode/plugin/handover_v2.4.ts` (name is historical; it IS v2.6) + the
shared gauge core `.opencode/ctxgauge/gauge.mjs`. Loaded by opencode at start; reads
`opencode.db` read-only; writes ONLY `.opencode/plugin.log` and (see 2) the handover
summary file.

## The three active behaviors

1. **`chat.message` — the `ctx:` line.** On every user message, read the gauge for
   THAT session (per-session read; session id from the event payload) and inject
   `ctx: SESSION=<sid> CTX=n (p%) REM=m` as a synthetic part of the next model
   request. Never throws (read failure → silence + one `kind:"gauge"` evidence
   line in plugin.log). This is what you see at the top of each message.

2. **`tool.execute.after` — two independent things run here:**
   - **The summary mirror (the collision source, see P02).** If the tool that just
     finished is the handover Task tool, the plugin OVERWRITES
     `.opencode/handover_task_to_planner.md` with the worker's raw final message
     (verbatim, `writeFileSync`, best-effort). It was designed to remove the
     "write file + repeat as final message" doubling — that doubling was already
     fixed in the worker prompt (`52eb0aa`), so the mirror now only clobbers the
     committed summary (4 confirmed occurrences). **This is the overwriting you saw
     — it is the plugin, by design, still live. P02 proposes deleting it.**
   - **The nudge ladder (v2.6, #30/#31/#33).** On EVERY tool call (all agents),
     gauge the calling session; if a rung is crossed (50% / 70% or REM≤30k /
     80% or ≤20k / 90% or ≤10k / REM≤5k, whichever first, ≤1 nudge per rung per
     session), deliver a synthetic nudge via `promptAsync` (queues as the next
     turn at idle; the TUI does not render it as a maintainer message).
     Evidence: `kind:"nudge"` plugin.log lines only; silent otherwise. **First
     production fire: looprun 2 iteration 1 (this session), 50% rung, at
     CTX=64687 (53%) — the readout was genuine (cross-checked against self-gauge).**

3. **`tool.execute.before` — spec pre-flight.** If the worker's spec file
   (`handover_task.md`) is missing or empty when a handover Task tool starts,
   ONE warning line in plugin.log. Observation only.

## What it does NOT do
- No repo file writes beyond the mirror (2a) and plugin.log.
- No parsing of agent output, no log parsing of repo files.
- The planner/worker handover FILE convention (spec / summary / NAP) is
  prompt-level only — the plugin does not create or validate those files.

## Gauge read (shared core)
`gauge.mjs` → sqlite (opencode.db, read-only) → last FINISHED step of the named
session → `ctx = total − output` (token semantics verified, TODO #30). Window from
the model limit. Forms: `CTX=n (p%) REM=m`, `CTX=n` (window unknown),
`CTX=notAvailable` (no finished step yet). Backend chain: `node:sqlite` →
`bun:sqlite` → spawn `sqlite3.exe` (never-throw; `db-error` vocabulary).
