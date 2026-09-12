# WORKER SUMMARY — T2 (iter-10+1): ctx_gauge tool + probe S12

RESCUE RECORD — the building worker session `ses_f6c3b810bffe00MWTFdwDZ2JKx`
(label per spec `worker-10`, model `Qwen3.8-27B-IQ4KT-120K`, branch
`fst_work`) died at `context_length_exceeded` after writing the tool file +
the probe S12 section (file stamps 06:19) and before the smoke / gates /
summary / commit. Planner-10 verified the artifacts (probe re-run: 84/84)
and completed the remaining spec items PLANNER-DIRECT (rescue — precedent:
the T5 WIP rescue, the T1 bookkeeping fix). This summary is the rescue
record; the verification below was measured by planner-10, not by a worker.

## What changed (task commit: tool + probe + bookkeeping only)

`.opencode/tools/ctx_gauge.ts` (NEW) + `.opencode/plugin/probes/handover_probe.mjs`
(S12 section + header update) — META task, no FST python code:

1. **`ctx_gauge.ts`** — the approved Part 2 design, verbatim shape:
   `import { tool } from "@opencode-ai/plugin"` + relative import of the
   shared core (`../plugin/scripts/gauge.mjs` — resolved against the tool
   file's own location, works under both the Node-24 type-stripped probe
   import and the opencode host); args = optional `sessionID` (empty/omitted
   = newest-session default read, a value = the per-session read, passed
   through); `execute` = `formatGauge(await readGauge(undefined,
   sessionID))` with the `db-error` note APPENDED in-band (` — <error>` —
   the line is NEVER replaced by a stack trace; mirror of peek.mjs's stderr
   note); `description` = the 1–2-line usage guide (read-only, fire for
   context-budget decisions instead of the peek.mjs shell-out); NO `name`
   field (host names by filename).
2. **Probe S12 (APPEND-ONLY, checks 82-85, no renumbering):**
   - 82: tool file imports type-stripped + tool() default export (description
     string, `args` keys exactly `[sessionID]` with a zod schema — undefined
     parses / non-string rejects, async execute, NO `name` field);
   - 83: execute steered via `setDbPath(FX_OK)`: default newest-session read
     BYTE-EXACT `SESSION=ses_fx_ok CTX=10000 (3%) REM=246000` + the
     sessionID arg passed through (`ses_fx_old` → `SESSION=ses_fx_old
     CTX=10000 (8%) REM=110000`);
   - 84: db-error (never-created `MISSING_DB`): no throw, `SESSION=unknown
     CTX=notAvailable` + the appended ` — <error>` note;
   - 85: hook restore (cf. check 39) — global db path back where S12 found
     it; global read == explicit-path read (byte-exact, no drift).
   - Header: the section-sum comment now carries `S12=4` → expected
     `84/84 PASS` (measured).
   - Note: check 85's restore capture uses `getDbPath()` — a REAL core
     export (gauge.mjs:172) that the spec's fact list omitted (the spec
     listed readGauge/formatGauge/setDbPath); the usage is valid, no core
     change.

## Measured verification (planner-10, at the rescue commit HEAD)

- **Probe** `node .opencode/plugin/probes/handover_probe.mjs`: **84/84
  PASS**, exit 0 (full run incl. all four S12 checks; the pre-existing
  S1–S11 sections green — no drift).
- **Smoke** `C:/Users/Wasiejen/AppData/Local/Temp/opencode/ctx_gauge_smoke.mjs`
  (scratchpad, untracked, iter-4 pattern): **3/3 PASS** —
  (1) LIVE BYTE-IDENTITY: the child-process `peek.mjs` output vs the tool's
  `execute` output for the same live db state, run in ONE bash invocation
  (the db cannot change between the two reads within the window) — byte
  equal, both reading the planner's own session; (2) the no-arg live read
  is well-formed `SESSION=… CTX=… (…%) REM=…`; (3) db-error path (in-process
  `setDbPath` to a nonexistent path, restored after): no throw, the line
  never replaced, the ` — <error>` note appended.
- **pytest** `& .\.venv\Scripts\python.exe -m pytest -q`: **459 passed,
  1 warning** (the known #10 warning).
- **ruff** `& .\.venv\Scripts\ruff.exe check --select F .`: **All checks
  passed** (F=0).

## Method note (byte-identity, spec vs. architecture)

The spec asked to compare the tool readout byte-exact with
`node .opencode/plugin/scripts/peek.mjs` "for one fixture" — but peek.mjs
CANNOT be steered at a fixture: the core has no env/path override for
`DEFAULT_DB_PATH` (fixed `~/.local/share/opencode/opencode.db`), and
pointing the child process at the live db is the only option. The smoke
therefore proves byte-identity on the LIVE db inside a single invocation
window (the stronger claim: the production path, both sides), and the
fixture byte-exactness is pinned by probe check 83 (in-process, steered).
Together they cover the requirement; no core edit was needed (DO-NOT-touch
respected — the diff is exactly tool + probe + bookkeeping).

## Open items / not done (deliberate)

- Tool registration is host-side (the maintainer's live `opencode.jsonc`) —
  the tool takes effect at his next process restart, like T1 / the
  compact_memory v2 tail.
- No core changes (`gauge.mjs` / `peek.mjs` untouched), no S1–S11 probe
  renumbering, no FST code — per the spec.

## Commit / process notes

- The dead worker session wrote NO loop-log lines (it died before
  bookkeeping) — the planner logged a `-WARNING` for the failed launch + an
  `--INFO--` for the rescue in the loop folder log; this summary records the
  failed session id so the loop log's `-WARNING` line is the durable record.
- Final gauge (verbatim, at summary-writing time, pre-commit):
  `SESSION=ses_f6c4471a3ffeaQ9rXpnmUTg2AS CTX=83548 (69%) REM=36452`
  (the smoke's live readout — the same state the smoke compared byte-exact).
