# plugin/ — the opencode plugins (context gauge + watchdog + probes)

Purpose: `ctx_watchdog.ts` (the live plugin: gauge readout/nudge, handover
pre-flight, event log) + `context_recovery.ts` (compaction directive) +
`intercept_observer.ts` (the 5.3 log-only intercept observer + the 5.4
read-scope fuzzy resolution: a `tool.execute.before` hook that LOGS
dense-digit/numword/redundancy/path anomalies to
`.opencode/temp/intercept.log` — the observation channel never mutates,
never blocks; the READ-scope fuzzy channel mutates `output.args.filePath`
for a d<=2 mistyped read (fail-closed otherwise, both outcomes logged);
restart-gated, see its file header for the usage note + verdict
vocabulary). `intercept_observer_core.ts` — its pure named core (types,
constants, regexes, pure functions, the read-scope matcher); the plugin
file exports the default factory ONLY (the host loader contract — every
`Object.values` entry must be a function).
`tools/` — bundled binaries; `scripts/` — the gauge core (`gauge.mjs` +
`peek.mjs`, node:sqlite); `probes/` — the test gates (`handover_probe.mjs`
under NODE; the total is self-annotated in the probe header — the annotation
is the source, no duplicated moving number); `deactivated/` — retired plugins
(frozen); `dev/` —
development copies. Program files: changes activate at host restart; the probe
gate must stay green after any plugin change.
