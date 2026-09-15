# Task — compact_memory pre-compaction dump hook (plan4, iteration 4)

## Goal
TODO.md line 152 — the entry titled "`compact_memory` needs a dump function of the
current session" (status APPROVED + BUILDABLE, maintainer ruling 2026-09-15):
before ANY compaction dispatch, dump the target session's FULL pre-compaction
content into the corpus — so the corpus stays complete for compacted sessions.
Plus the maintainer's `--comment` (top of `priority.md`): dumps of the same
session_id across compactions must NEVER overwrite each other — separate files
keyed on the tracked compaction budget.

## Verified facts (planner, plan4 — do not re-derive)
- Plugin: `.opencode/plugin/compact_memory.ts` (548 lines). Dispatch paths:
  v2 `client.session.compact(...)` and v1 `callSummarize(...)` (THE ACTIVE PATH)
  — both fire-and-forget (no await). Hook point = after the budget gate passes,
  before each dispatch (both branches; the shared spot is just before `const
  client = ctx?.client;` at the "4. the client call path" comment, where `root`,
  `sessionID`, `model` are already resolved).
- Budget store: `<root>/.opencode/temp/compact_budget.json` v2; `budgetCount(root,
  sessionID)` exists; `resolveRoot(c)` resolves the root; DUMP-FAIL logging can
  reuse the `appendCompactLine` pattern (append to `<root>/.opencode/temp/ctx.log`,
  best-effort, never throws).
- Dump script: `.opencode/agent/scripts/db/dump_session.cjs` —
  `node dump_session.cjs <sid>` = full-detail dump, writes
  `<repoRoot>/.opencode/archive/sessions/<sid>.md` (OUT_DIR derived from
  `__dirname` four levels up: `..`,`..`,`..`,`archive`,`sessions`), opens the
  LIVE host DB `readOnly: true`, exit 0 on success.
- Probe: `.opencode/plugin/probes/handover_probe.mjs` — 94 checks, last section
  S13 (15). APPEND-only: new section S14 after S13, update the header total
  line (≈ line 291, the `S1=3 ... → "PROBE handover: 99/99 PASS"` line) and the
  header comment; never renumber existing checks.
- Baselines (measured plan3, must hold after your change): probe 94/94;
  `./.venv/Scripts/python.exe -m pytest -q` → 459 passed + 1 warning (the known
  #10 coroutine warning); `./.venv/Scripts/ruff.exe check --select F .` → F=0.

## Design (planner decision — implement it)
1. **`dump_session.cjs`**: add ONE optional flag `--out <relpath>` (single-
   session mode only): write the dump to `OUT_DIR/<relpath>` instead of
   `<sid>.md` (create parent dirs). Validate `<relpath>`: no `/`-rooted or `..`
   traversal, safe chars only; reject otherwise with exit 2. `--all` mode
   ignores the flag (error if combined). Update the usage text.
2. **Plugin hook** in `compact_memory.ts`:
   - `export function preCompactionDumpName(sessionID: string, count: number,
     stamp: string | null): string` → pure, probe-able: returns
     `compaction_dumps/<sid>_c<count>.md`, or
     `compaction_dumps/<sid>_c<count>_<stamp>.md` when stamp != null
     (stamp = `YYYYMMDDTHHmmss` — NO clock inside the function).
   - `export function preCompactionDump(root: string, sessionID: string,
     count: number): { ok: boolean; file?: string; error?: string }`:
     scriptPath = `<root>/.opencode/agent/scripts/db/dump_session.cjs`;
     name = `preCompactionDumpName(sid, count, existsSync(target) ? stamp : null)`
     (target = `<root>/.opencode/archive/sessions/<name>`) — NEVER overwrite;
     spawn `execFileSync(process.execPath, [scriptPath, sid, "--out", name],
     { timeout: 60_000, stdio: "pipe" })`; success (exit 0) → { ok, file };
     any failure → append a `DUMP-FAIL <sid> <one-line error>` line to
     `<root>/.opencode/temp/ctx.log` (same append style as appendCompactLine),
     return { ok:false, error } — NEVER throw, NEVER block the tool.
   - Call site: at the shared hook point, `const dump = preCompactionDump(root,
     sessionID, budgetCount(root, sessionID));` — on `!ok`, append
     `\nWARNING: pre-compaction dump failed for <sid> (<error>)` to the
     dispatch response; on ok, the response stays UNCHANGED (smoke stability).
     The dispatch itself (fire-and-forget) is unchanged.
3. **Probe S14** (6-8 checks, fixture-based, sandbox root like S13):
   import the plugin module fresh (type-stripped, same as S13).
   (a) `preCompactionDumpName` byte-exact, normal + stamp cases;
   (b) `preCompactionDump` is a function;
   (c) sandbox root WITHOUT the script → no throw, { ok:false }, and a
   `DUMP-FAIL` line appended to the sandbox `ctx.log`;
   (d) place a FAKE `dump_session.cjs` at the sandbox script path (a tiny .cjs
   mimicking the real one's `__dirname`-derived OUT_DIR + `--out` handling:
   parses args, writes a marker file to `OUT_DIR/<rel>`) → hook call #1 creates
   `<sandbox>/.opencode/archive/sessions/compaction_dumps/<sid>_c0.md`; hook
   call #2 (same count) creates the STAMPED name, and file #1 stays
   byte-identical (no-overwrite proof).
4. **Knowledge**: append an entry to `.opencode/agent/knowledge/knowledge_tools.md`
   (Do/Why/Ref/Keys per its format) — the pre-compaction dump hook contract +
   the no-overwrite naming.
5. **READMEs**: `.opencode/agent/scripts/db/README.md` — the `--out` flag in the
   dump_session.cjs row/usage.
6. **TODO.md**: the line-152 entry — Status becomes: BUILD LANDED (plan4,
   this commit) — live acceptance pending the maintainer's host restart; a
   single compact_memory call must then produce `compaction_dumps/<sid>_c0.md`.
   Keep the entry OPEN (not closed). Do not touch any other TODO entry.

## Definition of done (measured, report all)
- `node .opencode/plugin/probes/handover_probe.mjs` → `PROBE handover: N/N PASS`
  with N = 94 + (your S14 check count), S14 all green.
- pytest 459 passed + 1 warning; ruff F=0.
- `git diff --stat` scope = exactly: compact_memory.ts, handover_probe.mjs,
  dump_session.cjs, scripts/db/README.md, knowledge_tools.md, TODO.md, the two
  handover files.
- The live host DB was never opened write (the script is readOnly; the probe
  never points at the real DB).

## DO-NOT-TOUCH
- Maintainer live files: `opencode.jsonc`, `priority.md`, anything under
  `.opencode/maintainer/`.
- The corpus (`.opencode/archive/sessions/`) — except files your OWN fake-script
  probe run creates in the sandbox (it must NOT write to the repo corpus — the
  probe sandbox root guarantees that; verify in your diff).
- FST product code (`fst_*.py`, `tests/`), AGENTS.md, the prompt set
  (`.opencode/agent/prompts/**` — worker edit-deny anyway), `fst_work2` branch.
- `git add -A` — stage ONLY the named files.

## Verification commands (from the repo root)
- `node .opencode/plugin/probes/handover_probe.mjs`
- `./.venv/Scripts/python.exe -m pytest -q`
- `./.venv/Scripts/ruff.exe check --select F .`
