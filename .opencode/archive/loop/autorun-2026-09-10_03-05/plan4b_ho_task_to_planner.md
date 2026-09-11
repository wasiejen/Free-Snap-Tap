# EXECUTIVE SUMMARY — plugin v2.8 (re-scoped 01-41 design): Part 1 + Part 2 LANDED

**Outcome:** the full v2.8 build is LANDED and verified. Part 1 (spec fold-in)
by worker run 1 (`66c0ac9`, stopped at its stop line after Part 1 — its
summary, committed in `3b1589c`, is the resume contract with all LOCKED
decisions). Part 2 (the build) by worker run 2 (fresh session) — it died on
`context_length_exceeded` (500) mid-run having left the build nearly complete
UNCOMMITTED (plugin +175, probe +342, gitignore +1). Planner assessment: the
work was coherent and complete; the probe run showed 62/63 with ONE failure
(check 60).

**Planner inline fix (one line, the planner's direct-edit allowance):** the
failure was a PROBE bug, not a plugin bug — check 60 measured `lBefore`
AFTER `afterFeed`, but the ctx-log entry is written synchronously INSIDE
`afterFeed`, so the `+1` expectation was off by one. The plugin's busy-skip
was correct (calls=1, readout appended, one log entry). Fix: measure
`lBefore` before `afterFeed` (`.opencode/plugin/probes/handover_probe.mjs`,
S9 check 60).

## Verification (measured by the planner, post-fix, pre-commit)
- Probe: `node .opencode\plugin\probes\handover_probe.mjs` = **63/63 PASS,
  exit 0** (52 pre-v2.8 + S9 10 + S5 +1 git-ignore check — per the locked
  plan's expected 63).
- Gate: `& .\.venv\Scripts\python.exe -m pytest -q` = **448 passed, 1
  warning** (known #10); `& .\.venv\Scripts\ruff.exe check --select F .` =
  **0**.
- DoD3 grep: `promptAsync` in the plugin = type declaration + the ONE call
  site inside `deferredDeliver` (the setImmediate-deferred fn) + comments —
  no synchronous call path in `tool.execute.after`.
- `git status` clean-with-commit for: plugin + probe + `.opencode/.gitignore`
  (`temp` line) + this summary; `git check-ignore -q .opencode/temp/ctx.log`
  exits 0 (probe check 64 pins it).

## What landed (the locked plan, all of it)
- `.opencode/proposals/approved/260910_plugin-compaction-detection.md` — the
  v2.8 design of record (Part 1, `66c0ac9`).
- `.opencode/plugin/handover_v2.4.ts` — v2.8 header block + restructured
  `onToolAfter` (ONE `readGauge` read feeding: minimal readout `(NN%/NNNK)`
  appended in place to the tool result; the ladder, now read-taking; the
  single-file ctx log `.opencode/temp/ctx.log` = `<YYYY-MM-DD_HH-MM> [model]
  (readout)`, entry IFF the readout was appended) + race-free delivery
  (`setImmediate` + `session.status()` busy-skip, both status carriers
  accepted).
- `.opencode/plugin/probes/handover_probe.mjs` — S9 section (checks 54–63),
  S8 tick() additions, S5 tally update (63 total).
- `.opencode/.gitignore` — `temp`.

## Production tail (PENDING, like the v2.6 ladder had)
The new behavior takes effect at the NEXT maintainer restart of the
opencode process (plugin code loads per process). The per-tool readout
should then appear on every tool result; `ctx.log` accumulates. No further
planner action needed — the next autonomous run can confirm from its own
tool results.

## Deliberately NOT done
- No FST code / `tests/**` / `opencode.jsonc` touched (gate is the Python
  suite, unaffected).
- `TODO.md` untouched — nothing here closes or opens a TODO entry.
