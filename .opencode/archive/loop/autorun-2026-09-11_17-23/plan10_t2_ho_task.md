# TASK — T2 (iter-10): ctx_gauge tool (the peek readout as a directly-fired tool) + probe S12

FIRST read `AGENTS.md`, `agents_repo.md` (+ repo part `repo_commands.md`), this file, and
Part 2 of the approved design `.opencode/proposals/approved/2026-09-12_loop-tool-batch.md`.

Branch: `fst_work` (HEAD at launch = `6e29c29`; T1 is verified on top: probe 80/80,
pytest 459 + 1 known #10 warning, ruff F=0 — all planner-re-measured). Commit on
`fst_work`. META task (no FST python code).

## Goal
A new custom tool `.opencode/tools/ctx_gauge.ts` an agent fires DIRECTLY for the
context-gauge readout (no shell-out to peek.mjs), backed by the shared gauge core;
plus the probe extension that pins it (new S12 section, append-only).

## Verified facts (planner, at spec time — do not re-derive)
- `tool()` form reference: `.opencode/tools/compact_memory.ts` (v2) / `block_transfer.ts`
  (T1, sandboxed): `export default tool({ description, args, execute })`, NO `name`
  field — the host names the tool by FILENAME.
- Shared core `.opencode/plugin/scripts/gauge.mjs` exports (USE IT — never re-derive):
  `readGauge(dbPathOverride?, sessionID?)` (async, NEVER throws; returns
  `kind:"ok" | "no-total" | "db-error"`), `formatGauge(r)` → the ONE readout string
  (`SESSION=… CTX=… (…%) REM=…` / `SESSION=… CTX=…` / `SESSION=… CTX=notAvailable`),
  and `setDbPath(p)` (steers the global db path — the probe's fixture hook).
- The CLI `.opencode/plugin/scripts/peek.mjs` is exactly: `const r = await readGauge();
  process.stdout.write(formatGauge(r) + "\n")` (+ a stderr note when
  `kind === "db-error"`). The tool mirrors this but RETURNS the string in-band.
- Probe `.opencode/plugin/probes/handover_probe.mjs` (1866 lines): the S10 section
  (starts ~line 1386) imports a custom tool DIRECT — `const TOOL_TS =
  path.join(REPO_ROOT, ".opencode", "tools", "compact_memory.ts")` (line 1394),
  type-stripped import, the same way the host loads tools; the section-sum header
  comment at line 245 (`S1=3 … S10=9 S11=6 S5=6 → "PROBE handover: 80/80 PASS"`);
  the totals block at ~line 1856 (`results.length`); the last check number is [81].
- Baselines at HEAD: probe **80/80**, pytest **459 + 1 #10**, ruff **F=0**.

## Scope (DO)
1. **New `.opencode/tools/ctx_gauge.ts`**:
   - `import { tool } from "@opencode-ai/plugin"` +
     `import { readGauge, formatGauge } from "../plugin/scripts/gauge.mjs"` (relative
     import — resolves against the tool file's own location; works both under the
     Node-24 type-stripped probe import and under the opencode host);
   - args: optional `sessionID` (string, `tool.schema.string().optional().describe(…)`):
     empty/omitted = the newest-session default read; a value = the v2.6 per-session
     read (the core already supports it — pass it through);
   - `execute`: `const r = await readGauge(undefined, args.sessionID); let out =
     formatGauge(r); if (r.kind === "db-error") out += ` — ${r.error}`; return out;`
     (the in-band mirror of peek.mjs — the line is NEVER replaced by a stack trace);
   - `description` (1–2 lines): read the context usage of the current (or a named)
     session, read-only; returns the `SESSION=… CTX=… (…%) REM=…` readout; fire this
     for context-budget decisions instead of the peek.mjs shell-out.
2. **Probe S12** (APPEND-ONLY — never renumber/reorder existing checks):
   - a new section after the last S11 check (before the totals block ~line 1850),
     importing `ctx_gauge.ts` the S10 way (`path.join(REPO_ROOT, ".opencode", "tools",
     "ctx_gauge.ts")`);
   - new checks numbered AFTER the current last number [81]:
     a. module imports + `tool()` result shape (`description` string, `args` carries
        the optional `sessionID`, `execute` async, no `name` field);
     b. execute against a fixture db steered via `setDbPath(<fixture>)` (reuse the
        S7-style fixture dbs): the ok readout is byte-exact
        `SESSION=… CTX=… (…%) REM=…`;
     c. the db-error path (`setDbPath` to a nonexistent path): `CTX=notAvailable`
        + the appended ` — <error>` note, no throw;
     d. `setDbPath` restored to the default afterwards (the hook-restore pattern —
        cf. check 39) so the sandbox check 45 stays green;
   - update the section-sum header comment (line 245) with the S12 count — measured.
3. **Smoke** (scratchpad `ctx_gauge_smoke.mjs`, the iter-4 pattern): import the tool
   module; run `execute` with no args against the LIVE db default (expect a well-formed
   `SESSION=… CTX=…` line) and against a fixture via `setDbPath`; for one fixture,
   compare the ok readout BYTE-EXACT with `node .opencode/plugin/scripts/peek.mjs`
   output (the byte-identity requirement).
4. **Bookkeeping** per your commit routine: summary →
   `.opencode/handover/handover_task_to_planner.md`, your loop-log lines
   (`agent_readme_loop.md` §Loop log — role `worker-10`, your session id from the
   injected `ctx:` line, model verbatim), `todo_inbox.md` only for discrepancies.

## Definition of done
- Full probe green at the NEW measured total (reported; header updated; existing
  check numbers untouched).
- The tool's ok readout is byte-identical to `peek.mjs` output for the same db state
  (smoke-evidenced).
- `git diff` of the task commit = `ctx_gauge.ts` (new) + the probe file (+ its header)
  + bookkeeping — nothing else.
- Gates re-measured by you and reported: probe <new>/<new>, pytest **459 + 1 #10**,
  ruff **F=0**.
- One green task commit; summary committed.

## DO-NOT-touch
- `gauge.mjs` / `peek.mjs` (the core is USED as-is — zero edits), `compact_memory.ts`,
  `block_transfer.ts`, `context_recovery.ts`, `ctx_watchdog.ts`, `opencode.jsonc`
  (NEVER stage), everything under `proposals/maintainer/`, the FST python packages +
  tests, `repo_map.md`, the role prompts.
- No renumbering/reordering of existing probe checks; no changes to the S1–S11
  section bodies.
- Do NOT register the tool in any config (host-side, maintainer domain).

## Approval boundary
- Pre-approved: the tool file + the probe S12 append + the header update. If you find
  a defect in the shared core (`gauge.mjs`) that blocks the byte-identical readout,
  do NOT fix it in this task — stop, record it in `todo_inbox.md`, and report.
