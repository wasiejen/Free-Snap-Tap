# TASK — T1 (iter-10): block_transfer sandbox + agent-facing usage text

FIRST read `AGENTS.md`, `agents_repo.md` (+ repo part `repo_commands.md`), this file, and
Part 1 of the approved design
`.opencode/proposals/approved/2026-09-12_loop-tool-batch.md` (the authority for this task).

Branch: `fst_work` (HEAD at launch = `b31d069`; the baseline there is pytest **459 + 1
known #10 warning**, ruff F=0, probe **80/80** — measured by the planner). Commit on
`fst_work`. This task is META (no FST python code).

## Goal
Sandbox `.opencode/tools/block_transfer.ts` so ALL file access (reads AND writes, every
mode) is confined to the opencode working dir + the Windows temp dir, and rewrite the
tool's `description` into an agent-facing usage guide. Test extensively; fix any bug
found.

## Verified facts (planner, at spec time — do not re-derive)
- The file is in the `tool()` form (iter-4 translation): `export default
  tool({ description, args, execute })`, no `name` field; imports `fs`, `path`,
  `tool`; 133 lines. Current path handling: `cwd = context.directory ||
  process.cwd()`; `srcPath`/`dstPath` via `path.resolve(cwd, p)`; `fs.mkdirSync(
  path.dirname(dstPath), {recursive: true})` for new dst files (PASTE + MOVE paths).
- The tool is NOT imported by the probe — the probe baseline stays 80/80 (re-run to
  confirm, not to extend — probe work is task T2's).
- Smoke-test precedent: iter-4 `bt_smoke.mjs` in the scratchpad (Node-24 type-stripped
  import of the .ts file, behavior-based via `safeParse`), 20/20 PASS. Build your smoke
  on that pattern: `C:/Users/Wasiejen/AppData/Local/Temp/opencode/bt_sandbox_smoke.mjs`.
- Baselines at HEAD (carried, re-measure at the end): pytest **459 + 1 #10**, ruff
  **F=0**, probe **80/80**.

## Scope (DO)
1. **Path guard** — ONE helper, applied to EVERY file-path argument (src and dst, all
   modes) BEFORE any fs access (no partial writes on rejection):
   - allowed roots: `[context.directory ?? process.cwd(), process.env.TEMP ??
     process.env.TMP]` (Windows; TMP/TEMP per the design);
   - resolve the given path with `path.resolve(cwd, p)` (collapses `..`); allow only if
     the resolved path equals an allowed root or starts with `root + path.sep` —
     compare CASE-INSENSITIVELY (Windows paths);
   - on violation return an error string of the form
     `Error: '<path>' is outside the sandbox (allowed: <r1>, <r2>)` — no read, no write.
2. **Rewrite `description`** (the usage guide; the tool description IS the usage
   channel): the six modes and when each is used (MOVE = immediate cut-and-paste;
   COPY/CUT → PASTE = multi-buffer work across files; DELETE = purge without outputting;
   CLEAR = empty a buffer), anchor semantics (short UNIQUE line prefixes; the block
   spans `startMarker`..`endMarker` INCLUSIVE; optional `targetMarker` for insertion,
   else append to EOF), named buffers (default `default`, multiple per session), the
   sandbox boundary (working dir + temp dir only — reads included), and the
   housekeeping rule (use this tool for moving/copying/deleting multi-line blocks,
   TODO / log sections instead of write/edit).
3. **Smoke test** (the scratchpad script; run it to green and record the measured N):
   - sandbox ALLOW: file in cwd, file in a cwd subdir, file in the temp dir, file in a
     temp subdir (reads and writes);
   - sandbox REJECT: `..` traversal out of cwd, an absolute path outside cwd
     (e.g. `C:\Windows\...`), a sibling dir of the repo root — for src reads AND for dst
     writes (incl. MOVE with dst outside, PASTE into outside, DELETE of outside);
   - functional round-trips for ALL SIX modes (allowed paths);
   - buffer isolation (two buffer names, no cross-talk);
   - error paths: missing src file, missing start marker, missing end marker, PASTE from
     empty buffer, mkdir-of-new-subdir INSIDE the sandbox still works;
   - **fix any bug found** — in your own task commit, one-line `todo_inbox.md` note if
     the fix touches more than the guard/description.
4. **Bookkeeping** (your commit routine): `TODO.md` / `todo_inbox.md` only if a
   discrepancy surfaced; worker summary to
   `.opencode/handover/handover_task_to_planner.md`; your loop-log lines per
   `agent_readme_loop.md` §Loop log (write `-->START` at your start and `DONE<---` at
   your completion into the current loop folder's `loop_log.md` — role `worker-10`,
   your session id from the injected `ctx:` line, your model verbatim).

## Definition of done
- Smoke script N/N PASS (measured; N reported in the summary) covering the matrix above.
- `git diff` of the task commit = `.opencode/tools/block_transfer.ts` (+ the
  bookkeeping files) — nothing else.
- Gates re-measured by you and reported: probe **80/80** (unchanged), pytest **459 +
  1 #10**, ruff **F=0**.
- Mode/anchor/buffer semantics UNCHANGED for allowed paths (the guard + description are
  the only deltas).
- One green task commit + the bookkeeping commit; summary file committed.

## DO-NOT-touch
- `compact_memory.ts`, `context_recovery.ts`, `ctx_watchdog.ts`, `gauge.mjs`,
  `peek.mjs`, the probe file (S12 is the NEXT task's scope), `opencode.jsonc` (NEVER
  stage it), everything under `proposals/maintainer/`, the FST python packages and
  tests, `repo_map.md` and the role prompts.
- Do NOT register the tool in any config (host-side, maintainer domain).
- Do NOT change the allowed-path behavior (byte-identical results where the guard
  passes).

## Approval boundary
- Pre-approved scope: the sandbox guard, the description rewrite, and in-file fixes for
  bugs the smoke test finds. If a "bug fix" would change the semantics of an
  allowed-path operation, DO NOT do it — record it in your summary as an open item and
  stop that change (the planner decides).
