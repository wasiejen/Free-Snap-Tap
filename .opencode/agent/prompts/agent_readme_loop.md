# agent_readme_loop.md — the loop protocol

Planner-owned static file; the planner reads it when driving the loop
(autonomous launch). Iteration state lives in the launch message + the NAP —
not here.

## Iteration semantics
- N is 1-based and counts across the whole looprun (it does not reset per
  planner session); it is given at the top of the launch message.
- **Counter mismatch (loop-signals Part 2, approved 2026-09-15):** if the launch
  N is smaller than the last `planner-N` in the loop log, use the BIGGER
  number for the `plan<N>_*` files — never clobber existing ones; the planner
   notes it in an `--INFO--` loop line and in its summary.

## Action line
- The states (the planner references AGENTS.md §Interaction-contract, same
  vocabulary):
  - `restart` — fresh planner launch (the default; missing/unclear → restart)
  - `resume` — resume the same sub-agent session via `task_id`
  - `ask_maintainer: <q>` — pause the loop until the maintainer answers
  - `stop` — goal reached / unrecoverable
- The planner ends each autonomous session with a closing summary
  (`plan<N>_summary.md`) and exactly one `action:` line; the auto-resume
  plugin reads the LAST one.

## Loop folder
- The CURRENT looprun lives in `.opencode/loop/autorun-<YYYY-MM-DD_HH-MM>/` —
  exactly one folder there at any time (unambiguous).
- ALL older loopruns live in `.opencode/archive/loop/autorun-…/`.
- Rollover: when the planner starts at ITERATION 1 (a new looprun), it moves
  the current `loop/autorun-…/` folder into `archive/loop/` and creates a fresh
  `loop/autorun-<now>/` (folder name machine-generated, never retyped). A
  direct (non-looprun) planner run starts its own current folder the same way
  if `loop/` is empty.
- Spec/summary copies ride along in the current folder: `plan<N>_ho_task.md`
  (the task spec, copied before the worker launch) and
  `plan<N>_ho_task_to_planner.md` (the worker summary, copied after
  verification).
- Session-id marker files are RETIRED — session ids are recorded in the loop
  log (§Loop log); the log is the lookup source.
- Self-identification (the iteration number, 2026-09-25 — his loop.log
  read-cost question): a plugin-spawned session's TITLE is
  `<loop-folder> planner-<N>` (the #89 spawn ident — live-verified
  2026-09-25: the spawned planner reads its own number from the title,
  no loop-log read needed). To verify or recover the number: a BOUNDED
  grep, never a full read (the log is 30k+ chars of dense numbers):
  `grep -oE "planner-[0-9]+" <loop folder>/loop_log.md | sort -u -V |
  tail -1` (before your own START line has landed: +1 = yours).

## Loop log
- The looprun activity log — who ran when, on what; for the loop itself and for
  the maintainer after the fact.
- ONE file per looprun, in its loop folder:
  `.opencode/loop/autorun-<YYYY-MM-DD_HH-MM>/loop_log.md` — append only,
  created on first write. Logged: loopruns and direct planner runs; plain
  interactive chat has no log.
- Tool (v2, landed 2026-09-26): when the `loop_log` tool is in your toolset,
  WRITE your lines via it — it resolves the current looprun folder (creating
  the dated one when absent), machine-stamps, and appends exactly one line,
  returning `folder: <name> (created|existing)` + the exact line +
  `verified: readback-match` (or `readback-MISMATCH: …`), plus
  `corrects: <previous line>` for a `correct` status. v2 details: `status` is
  a free-form KEYWORD — `start` / `done` / `return` / `warn` / `info` /
  `correct` — normalized into the 8-char tokens below; `role`, `model`,
  `session` are OPTIONAL (auto-filled from the host context: agent
  identifier + model, your session id). An unrecognized status is rejected
  with the accepted keywords named (nothing is written). The line-format
  description below stays the FALLBACK for when the tool is not registered
  (hand-append in that case, in the exact form below).
- One line per event:
  `date_time <STATUS> <role>[-<iteration>] <session_id> <agent_model> <content>`
  - `<STATUS>` is exactly one of these 8-char tokens: `-->START`, `DONE<---`,
     `-RETURN-`, `-WARNING`, `--INFO--`, `CORRECT-` (the sixth, v2 2026-09-26 —
     hand-append it in that exact form in the fallback).
  - `<role>[-<iteration>]` — `planner-N` / `worker-N` / `explorer-N` (the
    retired `looprunner` token appears in historical lines only); the
    iteration number when known (it is in the launch message / task spec),
    role only for direct runs.
  - `<content>` per status:
    - `-->START` — planner and worker each write one at their own
      session/task start (the WORKER'S is its FIRST action after reading the
      task spec - before planning or heavy tool calls, because an interrupted
      delegation does not return the task_id and the log is the only way to
      find the session); content = the task oneliner.
    - `DONE<---` — every agent WITH loop-folder write access (planner, worker)
      writes one on task completion; content = the final gauge readout
      `<CTX>%/<REM>K` — verbatim from the gauge command, never guessed.
      (The explorer has no loop-folder write access — its completion rides the
      planner's `-RETURN-` line.)
    - `-RETURN-` — the planner writes one when a sub-agent
      returns; content = the returned agent's `role-N session_id model`.
    - `-WARNING` — the supervising agent writes one when a sub-agent task FAILS
      (e.g. `context_length_exceeded`); content = the failed sub-agent's
      `session_id` + one-phrase cause.
    - `--INFO--` — any agent reports a run problem it observed (looping
      behavior, confusion, protocol glitches); content = short info + an
      example if possible.
    - `CORRECT-` (v2) — a clarification/addition to a PREVIOUS line (append
      only — the old line is never rewritten); content names the corrected
      entry (its timestamp or a content fragment). Via the tool: status
      keyword `correct` — the return carries the previous line for exact
      referencing.
- `session_id` is the `SESSION=` field of the injected `ctx:` line.
- Examples (one per type):
  ```
  2026-09-11_09-30 -->START  planner-3 ses_abc123 Qwen3.8-27B-IQ4KT-120K plan3: loop-log section
  2026-09-11_09-45 -RETURN-  planner-3 ses_abc123 Qwen3.8-27B-IQ4KT-120K worker-3 ses_def456 Qwen3.8-27B-IQ4KT-120K
  2026-09-11_10-02 DONE<---  planner-3 ses_abc123 Qwen3.8-27B-IQ4KT-120K 42%/78K
  ```
- Discipline: append only; NO curation of this file — a dead session loses at
  most its unfinished tail.

## Interrupt handling
- Rebuild from committed state: `git log`, the NAP
  (`.opencode/agent/handover/handover_planner.md`), `TODO.md` — never from memory.

## Looprunner's own file (retired)
- `.opencode/loop_log.md` was the looprunner's bookkeeping. The role is
  retired (2026-09-24) — the auto-resume plugin covers launch/relay/restart —
  and the file no longer exists.

## Maintenance unit (counter-triggered, planner-run — GO 2026-09-25)
- Trigger: every 5th iteration (iteration N of the current looprun, N % 5 ==
  0), run at session START — after the state rebuild (git log / NAP / TODO)
  and BEFORE task selection. Never idle-triggered (idle detection is the
  ghost/unit-4 pathology zone) and not via the priority list (that channel
  is for urgent items).
- Scope (bounded, ~10 tool calls total):
  1. `knowledge_inbox.md` → curate into the area files (shrink the inbox);
  2. NAP archive compression check (closed sessions keep only their
     compressed one-liner);
  3. TODO.md curation with a RETIREMENT target: entries untouched 14 days →
     re-verify — stale → condense into `todo_records.md` (one-liner +
     pointer), live → status refresh;
  4. baselines in Standing: current against the last measured gate;
  5. stale proposals/drafts: `proposals/` root items or maintainer drafts
     untouched 14+ days → FLAG to the maintainer (summary/NAP) — NEVER
     auto-delete.
- Precedence: a pending maintainer call wins — the pass defers to the next
  trigger; if the session starts above ~70% context, defer (record in the
  NAP).
- Run inline by the planner (the surfaces it touches — NAP/TODO/knowledge —
  are the planner's lane; no delegation). Close it with ONE `--INFO--` loop
  line: what was curated, what was flagged.
