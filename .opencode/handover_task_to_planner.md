# EXECUTIVE SUMMARY — TODO #37 (gauge backend fallback chain)

**Commit:** rides along in the task commit (one commit: code + TODO.md + this file).
**State: COMPLETE + verified.** Built by `worker_Q4_120K`; the worker was killed by the
planner's 40-min CLI timeout at the final probe renumber step — the PLANNER finished the
remainder (duplicate check-ID fix: last S5 check 41→45 + header 41/41→45/45, then the
final verifications below). Deviation recorded here per the spec's shape-surprise clause.

## What changed
- `.opencode/ctxgauge/gauge.mjs`: backend chain `node:sqlite` → `bun:sqlite` →
  spawn `.opencode/plugin/tools/sqlite3.exe` (path resolved relative to the core file),
  first success wins, per-process cache (keyed by db path, invalidated by
  `setDbPath`/`setBackends`). Test hooks: `setBackends`/`getBackends`/`DEFAULT_BACKENDS`,
  `setImportForTest`/`clearImportForTest`/`importAttemptsForTest`. Never-throw preserved;
  db-error previews NAME the failing backend; readout forms + `formatGauge` byte-identical;
  header block documents the chain + host facts.
- `.opencode/ctxgauge/peek.mjs`: comment-only update (chain note). No functional change.
- `.opencode/plugin/probes/handover_probe.mjs`: new S7 section (11 checks, 29–39) —
  forces each backend (node host: bun:sqlite absent → named db-error; adapter shape via
  unit-mock incl. bun's `get()→null` no-row; spawn backend END-TO-END with the REAL
  sqlite3.exe on fixtures: ok / unknown-window / no-total; fallback + cache memoization +
  hook restore). S5 renumbered 40–45. Total 45 checks.
- Plugin file UNCHANGED (as specified).

## Measured verification (planner re-ran after the finish)
- Probe: `PROBE handover: 45/45 PASS`, exit 0.
- Host proof 1 (system node): `node .opencode\ctxgauge\peek.mjs` →
  `SESSION=ses_f77274cfaffegSzSxOe4CXzxVd CTX=107998 (89%) REM=12002` (live).
- Host proof 2 (system bun 1.4.2, worker): all three backends forced + default chain
  byte-identical against the LIVE WAL db (readonly open 1 ms); bun:sqlite API facts:
  option is `readonly` (NOT `readWrite`/`readOnly` — the spell-check error even tells
  you), native `timeout` option exists, `exec()` exists, `get()` returns `null` (not
  `undefined`) on no row, write attempt throws `attempt to write a readonly database`.
  CAVEAT (per spec): system bun is only a PROXY — the opencode-baked-bun verdict lands
  with the maintainer restart; if `bun:sqlite` is absent there, backend 3 (spawn,
  v1.x-proven in production) is the guard.
- Suite: 434 passed, 1 warning (the 13→1 profile per the #10 record — the T1 spec's
  "13-warning" line was stale; not a regression).
- Ruff F: 0 ("All checks passed!").

## TODO entries
- #37 status line updated (build LANDED + production evidence pending restart). NOT closed.

## Deliberately not done
- No plugin change (not needed). No sqlite3.exe move/delete (it is the last-resort
  backend now). No production evidence (needs the maintainer restart).
