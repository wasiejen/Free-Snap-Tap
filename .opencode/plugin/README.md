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
`Object.values` entry must be a function). `intercept_observer.ts` R6
(2026-09-25): the edit-scope HINT channel (edit only — exact-1 `oldString`
is silent; absent → the content-locator runs and logs `edit-hint` (single
candidate: line + d + gap + snippet), `edit-ambiguous` (multiple matches:
ALL candidate line numbers), or `no-candidate` (anchor absent) — never
mutates `oldString`, never auto-retries; a dense date / numword in
`oldString` also fires an observation line, the hint is the LAST line) + the
AFTER-HOOK enrichment (the failed edit's `output.output` gains the hint
line — consumed once; live acceptance restart-gated) + the PAYLOAD JOURNAL:
every write/edit/block_transfer appends one line to
`.opencode/temp/journal_write.log` / `journal_edit.log` (one file per
edit-class tool — the tool field disambiguates edit vs block_transfer;
date-stamped names = natural cap; git-ignored; best-effort, never fails the
call). **Recovery protocol (doc, not code):** on a failed edit/write or a
dead session, the journal line + hint line are the one-command fallback —
`cp` the journal payload in place (a write), or apply the hinted edit /
block_transfer-PASTE the section by anchor (an edit); the agent or rescue
session fires it (the hook NEVER auto-retries). `tools/` — bundled binaries; `scripts/` — the gauge core (`gauge.mjs` +
`peek.mjs`, node:sqlite); `probes/` — the test gates (`handover_probe.mjs`
under NODE; the total is self-annotated in the probe header — the annotation
is the source, no duplicated moving number); `deactivated/` — retired plugins
(frozen); `dev/` —
development copies. Program files: changes activate at host restart; the probe
gate must stay green after any plugin change.
