# agent_readme_loop.md — the loop protocol

Planner-owned static file; the looprunner reads it when driving the loop
(autonomous launch). Iteration state lives in the launch message + the NAP —
not here.

## Iteration semantics
- N is 1-based and counts across the whole looprun (it does not reset per
  planner session); it is given at the top of the launch message.

## Action line
- The vocabulary (`restart` / `resume` / `ask_maintainer` / `stop`) lives in
  AGENTS.md §Interaction-contract — reference it, don't restate it.
- The planner ends each autonomous session with a closing summary
  (`plan<N>_summary.md`) and exactly one `action:` line; the looprunner reads
  the LAST one.

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

## Loop log
- The looprun activity log — who ran when, on what; for the loop itself and for
  the maintainer after the fact.
- ONE file per looprun, in its loop folder:
  `.opencode/loop/autorun-<YYYY-MM-DD_HH-MM>/loop_log.md` — append only,
  created on first write. (Distinct from the looprunner's own
  `.opencode/loop_log.md`, §Looprunner's own file.) Logged: loopruns and
  direct planner runs; plain interactive chat has no log.
- One line per event:
  `date_time <STATUS> <role>[-<iteration>] <session_id> <agent_model> <content>`
  - `<STATUS>` is exactly one of these 8-char tokens: `-->START`, `DONE<---`,
    `-RETURN-`, `-WARNING`, `--INFO--`.
  - `<role>[-<iteration>]` — `looprunner` / `planner-N` / `worker-N` /
    `explorer-N`; the iteration number when known (it is in the launch
    message / task spec), role only for direct runs.
  - `<content>` per status:
    - `START-->` — looprunner, planner, and worker each write one at their own
      session/task start; content = the task oneliner.
    - `<---DONE` — every agent WITH loop-folder write access (planner, worker)
      writes one on task completion; content = the final gauge readout
      `<CTX>%/<REM>K` — verbatim from the gauge command, never guessed.
      (The explorer has no loop-folder write access — its completion rides the
      planner's `-RETURN-` line.)
    - `-RETURN-` — planner and looprunner each write one when a sub-agent
      returns; content = the returned agent's `role-N session_id model`.
    - `-WARNING` — the supervising agent writes one when a sub-agent task FAILS
      (e.g. `context_length_exceeded`); content = the failed sub-agent's
      `session_id` + one-phrase cause.
    - `--INFO--` — any agent reports a run problem it observed (looping
      behavior, confusion, protocol glitches); content = short info + an
      example if possible.
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
  (`.opencode/handover/handover_planner.md`), `TODO.md` — never from memory.

## Looprunner's own file
- `.opencode/loop_log.md` is the looprunner's bookkeeping; the planner does not
  edit it.
