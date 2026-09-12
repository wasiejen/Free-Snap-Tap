# TASK — T3 (iteration 13): loop_log tool (the loop log as a directly-fired tool)

FIRST read `AGENTS.md`, `agents_repo.md` (+ repo part `repo_commands.md`), this file,
and Part 3 of the approved design `.opencode/proposals/approved/2026-09-12_loop-tool-batch.md`
(the design of record — the spec below sharpens it, it does not contradict it).

Branch: `fst_work` (HEAD at launch = `7bf6533`). Commit on `fst_work`. META task
(no FST python code). This iteration is "iteration 13" (the launch message's
numbering); your loop-log role label is `worker-13` — verify it against this
header, never retype it.

## Goal
A new custom tool `.opencode/tools/loop_log.ts` an agent fires DIRECTLY to append
its loop-log line (no hand-formatting, no per-agent folder-permission management),
plus a scratchpad smoke that pins it. NO probe section (Part 3's acceptance is
smoke-based; the probe must simply stay green).

## Verified facts (planner, at spec time — do not re-derive)
- `tool()` form references: `.opencode/tools/ctx_gauge.ts` (T2, simplest) /
  `block_transfer.ts` (T1): `export default tool({ description, args, execute })`,
  NO `name` field (the host names the tool by FILENAME).
- The line format (`.opencode/system_prompts/agent_readme_loop.md` §Loop log):
  `<date_time> <STATUS> <role>[-<iteration>] <session_id> <agent_model> <content>`
  where `<date_time>` = local `YYYY-MM-DD_HH-MM` (minute resolution) and the role
  string ALREADY carries its iteration (e.g. `planner-10+1`, `worker-10+1`).
- The five STATUS tokens (exactly, 8-char): `-->START`, `DONE<---`, `-RETURN-`,
  `-WARNING`, `--INFO--`.
- Loop folder invariant: exactly ONE `autorun-*` folder in `.opencode/loop/` at
  any time (rollover is planner work — this tool does NOT rollover; see the
  multi-folder rule below).
- Baselines at HEAD: probe **84/84**, pytest **459 + 1 #10**, ruff **F=0**.

## Scope (DO)
1. **New `.opencode/tools/loop_log.ts`** per Part 3:
   - args: `role` (string, required — the agent writes its own full role token),
     `model` (string, required — verbatim model id), `status` (required enum of
     exactly the five tokens above — a bogus token must be rejected at PARSE
     time, i.e. the zod enum, not a runtime check), `content` (string, required),
     `session` (OPTIONAL string — the agent's own session id from its injected
     `ctx:` line; omitted/empty → the literal `unknown` in the line);
   - `execute` (all paths per Part 3, in order):
     1. resolve `.opencode/loop/` against `context.directory ?? process.cwd()`;
     2. if NO `autorun-*` folder exists there → create `autorun-<YYYY-MM-DD_HH-MM>`
        (name MACHINE-COMPUTED from the local clock, never retyped — pattern-5
        discipline) + its `loop_log.md` (append creates the file when absent);
        if exactly one exists → use it; if SEVERAL exist → use the
        most-recently-MODIFIED one and surface the anomaly in the return value
        (never silently resolve, never pick an arbitrary one);
     3. append ONE line `<date_time> <status> <role> <session|unknown> <model>
        <content>` — machine-timestamped, same local `YYYY-MM-DD_HH-MM` form;
        append-only (the tool never rewrites or curates the file);
     4. return the folder name + the exact line it wrote (the agent sees what
        landed); on the anomaly case, also the anomaly note.
   - `description` (1–2 lines): appends ONE loop-log line to the current
     looprun's `loop_log.md` (auto-creates the dated folder when `.opencode/
     loop/` is empty); returns the folder + the line written; fire this for
     your loop-log bookkeeping (START/DONE/RETURN/WARNING/INFO).
2. **Smoke** (scratchpad `loop_log_smoke.mjs`, the iter-4 pattern — Node-24
   type-stripped import of the tool module; the context object carries a
   scratchpad temp `directory`, NEVER the live `.opencode/loop/`):
   - empty dir → creates the dated `autorun-*` folder + `loop_log.md`
     (verify the name by LISTING the dir — never retype/compare a retyped
     date string; check the form `autorun-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}`);
   - exact line form: byte-compare the written line against a hand-built
     expected line for the SAME args — MINUTE-BOUNDARY-SAFE: compute the
     expected timestamp for the minute before AND after the call and assert
     the written line equals one of the two (the clock can tick mid-call);
   - append-when-exists: a second call appends (both lines present, order
     preserved, file not rewritten);
   - `session` omitted → literal `unknown` in the line;
   - the status enum REJECTS a bogus token at parse time (zod `safeParse`
     fails — no line written);
   - multi-folder anomaly: pre-create TWO `autorun-*` dirs with distinct mtimes
     (bump one's mtime explicitly), assert the line lands in the most-recently-
     modified one AND the return value mentions the anomaly.
3. **Bookkeeping** per your commit routine: summary →
   `.opencode/handover/handover_task_to_planner.md`, your loop-log lines
   (this iteration's protocol: hand-append them to the CURRENT loop folder's
   `loop_log.md` — the new tool is NOT registered in the live host yet; role
   label per the header; your session id from the injected `ctx:` line; model
   verbatim), `todo_inbox.md` only for discrepancies.

## Definition of done
- Full probe green at the UNCHANGED total **84/84** (re-run; report).
- Smoke N/N PASS (measured, reported; script in the scratchpad, untracked).
- `git diff` of the task commit = `loop_log.ts` (new) + bookkeeping — nothing
  else (NO probe file change, NO prompt change — those are planner-applied
  after verification, per Part 3).
- Gates re-measured by you and reported: probe 84/84, pytest **459 + 1 #10**,
  ruff **F=0**.
- One green task commit; summary committed.

## DO-NOT-touch
- The LIVE `.opencode/loop/` folder (the smoke targets a scratchpad `directory`
  only — never point the tool at the real loop folder during the smoke),
  `gauge.mjs` / `peek.mjs`, `compact_memory.ts`, `block_transfer.ts`,
  `ctx_gauge.ts`, `context_recovery.ts`, `ctx_watchdog.ts`, the probe file,
  `opencode.jsonc` (NEVER stage), everything under `proposals/maintainer/`,
  the FST python packages + tests, the role prompts + `agent_readme_loop.md`
  (planner-applied after green), `repo_map.md`.
- Do NOT register the tool in any config (host-side, maintainer domain).

## Approval boundary
- Pre-approved: the tool file + the smoke (scratchpad) + bookkeeping. If you
  find the Part 3 design under-determines a behavior (e.g. mtime granularity on
  Windows makes the anomaly rule flaky), do NOT invent a design — stop that
  sub-point, record it in `todo_inbox.md` with the observed behavior, and
  report; the planner decides.
