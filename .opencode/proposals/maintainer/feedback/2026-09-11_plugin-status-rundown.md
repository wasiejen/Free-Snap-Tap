# Handover plugin — status rundown (2026-09-11, planner)

**Live version: v2.8** (`handover_v2.4.ts`, built looprun-3 iter-4, probe 63/63,
gate 451/ruff 0 at the #48 close). **Production-confirmed this run**: after your
restart the v2.8 behavior is visibly active — every tool result in my session
carries the appended readout `(NN%/NNNK)` (e.g. `(85%/17K)`), and the
`chat.message` launch line renders the expected `CTX=notAvailable` form for a
fresh session.

## What v2.8 does now (vs. v2.6)
1. **Constant per-tool ctx readout** — ONE gauge read per `tool.execute.after`
   feeds a minimal `(NN%/NNNK)` append (pct of window + REM in K) on the tool
   result ITSELF (031 option 2: linear, cache-safe, no second message).
   Unknown window → `(NNNK)`; no-signal/db-error → append nothing, stay
   silent (never throws, no per-failure log line).
2. **Threshold nudges stay as messages, delivered race-free** — the 50/70/80/
   90/5k ladder with per-rung dedup is unchanged, but delivery is now
   `setImmediate`-deferred + `session.status()` busy-skip (031 option 1) —
   the old synchronous `promptAsync` mid-turn (which busted the KV cache)
   is gone.
3. **Single-file ctx log** — `.opencode/temp/ctx.log` (git-ignored), append-
   only, entry = local datetime + model + readout, written on the same per-
   tool read (replaces the per-session `session_context/` writeout). Lets you
   — and me — see a worker's last state after the fact.

## Open tails (none blocking)
- **v1.3 log-profile rebaseline** (#17/#30/#35) — the ONE-shot `plugin.log`
  read, maintainer call 1, default SKIP.
- **Rename to `ctx_watchdog.ts`** — touches `opencode.jsonc` (your file).
- **Custom gauge tool** (2306#1) — go/no-go was never answered.
- **Compaction detection** (original proposal) — SUPERSEDED: auto-compaction
  is deactivated (`compaction.auto=false`), so constant current-ctx data
  replaced detection as the priority (01-41 ruling, v2.8 design of record in
  `proposals/approved/260910_plugin-compaction-detection.md`).

## Lineage (short)
v1.x skip-set logging → v2.4 (P02 summary-mirror removed) → v2.5 (per-session
gauge read, node:sqlite core) → v2.6 (nudge ladder) → **v2.8 (readout +
race-free nudges + ctx.log)**.
