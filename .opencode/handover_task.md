# TASK — T2 #33: v2.5 auto-nudge ladder (plugin build)

FIRST read `AGENTS.md`, `agents_repo.md`, this file, and `TODO.md` — especially entry
**#30** (the approved design of record + token semantics) and **#37** (the
production-read fact). Repo root = the directory containing `agents_repo.md`.

## Goal
Add the APPROVED auto-nudge ladder to the live plugin
(`.opencode/plugin/handover_v2.4.ts`, currently v2.5) so EVERY acting session gets
staged mid-run context warnings BEFORE it walks into its stop line
(85 % / REM ≤ 15k). The design was approved by the maintainer on 2026-09-10 —
implement the design below; you do NOT re-derive it.

## Approved design (restated from TODO #30 — this IS the design of record)
- **Fire point:** the `tool.execute.after` hook (the plugin is agent-independent —
  planner + workers + all agents).
- **Rungs (ladder):** 50 % (generic "context watch" nudge) → 70 % / REM ≤ 30k →
  80 % / REM ≤ 20k (wind-down — just before the 85 % stop line; commit routine,
  prep the NAP) → 90 % / REM ≤ 10k (critical — commit + write the NAP NOW).
  Condition = pct OR REM, whichever hits first.
- **Final 5k rung:** REM < 5k → nudge carrying the VERBATIM gauge readout
  (`CTX=… (…%) REM=…`) plus "stop line reached — further work needs planner
  approval" (working past the line is a rule violation; the planner decides
  continuation).
- **Dedup:** at most ONE nudge per rung per session (in-plugin in-memory state
  keyed by session id).
- **Delivery:** `client.session.promptAsync(sessionID, { parts: [{ type: "text",
  text: <nudge text> }] })` — synthetic text part, fire-and-forget (never block
  the tool hook on it; never `await`; catch errors and evidence-log them). It
  queues as the next turn at idle and must NOT render as the maintainer's
  message in the TUI.
- **Evidence:** `kind:"nudge"` log lines ONLY — otherwise SILENT (the v1.x
  log-growth discipline applies: no log line for a non-fire). The existing
  `chat.message` ctx: line STAYS UNCHANGED.
- **Invariant (maintainer ruling):** the readout must reach EVERY acting session —
  blind spots are unacceptable for an ACTION. The read mechanic (session id
  carried in the readout + match-only gate, the way the chatmsg post does it,
  vs. a per-session read via an optional session-id parameter on `readGauge`) is
  YOUR CALL under that invariant — record the choice in the plugin header block.

## Implementation facts (planner-verified this session — trust, do not re-explore)
- Live plugin: `.opencode/plugin/handover_v2.4.ts` (~405 lines; the FILE name keeps
  the v2.4 name — versions are tracked in header comment blocks). Hooks registered
  at the bottom: `tool.execute.before`, `tool.execute.after`, `chat.message`.
  The v2.5 header block at the top documents the de-peek change — ADD a new
  block (v2.5.1 or v2.6, your call) documenting the ladder + your read-mechanic
  choice.
- Shared gauge core: `.opencode/ctxgauge/gauge.mjs` (~458 lines) —
  `readGauge(dbPathOverride)` → result with `{ ok, sid, window, ctx }` (+ more);
  `formatGauge(r)` → `SESSION=<sid> CTX=… (…%) REM=…` or `SESSION=<sid>
  CTX=notAvailable` (NEVER throws — the db-error kind IS the fallback).
  CURRENT STATE: newest-session-only reads (`SQL_NEWEST_SESSION` /
  `SQL_FINISHED_STEP` with `ORDER BY time_updated DESC LIMIT 1` subqueries,
  `gauge.mjs` ≈252-269) — if you choose the per-session read, parameterize the
  SQL by session id and keep the newest-session default behavior byte-identical.
- Probe: `node .opencode\plugin\probes\handover_probe.mjs` (exit 0 = pass,
  exit 1 = fail). Currently **45 checks**, incl. the S4 chat.message shapes (8)
  and the S7 backend-chain checks; fixture dbs are steered with `setDbPath`.
  Token semantics (VERIFIED, #30): `total = input + output + cache.read` holds
  exactly → `ctx = total − output` = prompt size at the latest finished step.
- PRODUCTION FACT (#37, closed 2026-09-10): the bun-host backend chain
  (`node:sqlite` → `bun:sqlite` → spawn `sqlite3.exe`) works in production —
  the `ctx: SESSION=…` line reaches agents, no db-error. Do not touch the chain.

## Deliverables (IN THIS ORDER — the order is the checkpoint plan)
1. **Core (only if your read-mechanic choice needs it):** optional per-session
   read in `gauge.mjs` (session-id parameter; newest-session default unchanged).
   If you choose the match-only gate instead, this step is skipped.
2. **Plugin:** ladder state + `tool.execute.after` fire + `promptAsync` delivery
   + `kind:"nudge"` evidence lines + header block.
3. **Probe extension:** new checks for the ladder — rung boundaries (50/70/80/90/5k),
   per-rung dedup (a second tool fire at the same rung posts NOTHING), no fire
   below the first rung, evidence-logging shapes, and the existing chatmsg
   regression unchanged. Build on the probe's existing fake-client / fake-hooks
   harness pattern.
4. **Verification** (see DoD) + summary + commit.

## Definition of done
1. `node .opencode\plugin\probes\handover_probe.mjs` → exit 0; ALL original 45
   checks still pass; the new nudge checks pass (report the exact NEW total).
2. FST suite untouched by the change: `& .\.venv\Scripts\python.exe -m pytest -q`
   → 434/434 (baseline); `& .\.venv\Scripts\ruff.exe check --select F .` → 0.
3. No NEW gauge-failure reasons; the silent path stays silent.
4. Summary in `.opencode/handover_task_to_planner.md` (OVERWRITE): files changed
   (one line each), the read-mechanic choice + why, new probe total, VERBATIM
   verification command outputs (the probe's final lines, the pytest summary
   line, the ruff line), commit hash(es), honest deviations, and the LAST line =
   the VERBATIM output of `node .opencode/ctxgauge/peek.mjs` (actually run it).
5. Commit: code + `TODO.md` update (entry #30 status: "ladder build LANDED —
   production evidence (a forced high-readout nudge after a maintainer restart)
   PENDING") + the summary file. No push.
6. STOP-LINE DISCIPLINE: if you approach REM ≤ 15k / ≥ 85 % — finish the
   current deliverable, run the probe, write the summary with honest
   deviations ("not done: X"), commit, stop. Never start a new deliverable past
   the line.

## Hard rules (each answers a dead-worker failure mode — TODO #40)
1. Gauge-check `node .opencode/ctxgauge/peek.mjs` every ~2 file reads; read
   nothing > 400 lines in one call (use Grep + offset/limit on the 458-line
   gauge.mjs and the 843-line probe).
2. Extend the probe with TARGETED edits (edit tool), never a full rewrite.
3. No third-party/opencode-SDK source verification in this session — the
   `promptAsync` signature comes from the SDK type in
   `.opencode/node_modules/@opencode-ai/plugin` (check the .d.ts if unsure —
   that's the only SDK reference allowed).
4. `Deviations` in the summary must list EVERY rule you bent or broke.
5. Do NOT touch: `handover_planner.md`, `opencode.jsonc`, FST python code,
   `playground/`, live listeners.

## Approval boundary
- Pre-approved: everything in `.opencode/plugin/`, `.opencode/ctxgauge/` (meta
  scope — no FST behavior change; the plugin only affects agent sessions).
- Your call (record in summary): nudge TEXT per rung (keep it short and
  actionable — one line + the rung's instruction), version-block name.
- STOP and flag (do not decide): any change to the existing ctx: line behavior,
  any change to the backend chain, any need for a new opencode hook name.
- Conventions: pwsh shell (read `agents_repo.md` `Environment & shell`); python
  = `& .\.venv\Scripts\python.exe` only.
