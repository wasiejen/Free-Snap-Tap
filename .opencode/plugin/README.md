# plugin/ — the opencode plugins (context gauge + watchdog + probes)

Purpose: `ctx_watchdog.ts` (the live plugin: gauge readout/nudge, handover
pre-flight, event log) + `context_recovery.ts` (compaction directive).
`tools/` — bundled binaries; `scripts/` — the gauge core (`gauge.mjs` +
`peek.mjs`, node:sqlite); `probes/` — the test gates (`handover_probe.mjs`,
84/84 under NODE); `deactivated/` — retired plugins (frozen); `dev/` —
development copies. Program files: changes activate at host restart; the probe
gate must stay green after any plugin change.
