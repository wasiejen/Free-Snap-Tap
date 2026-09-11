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

## Autorun archive
- On an autonomous start the planner creates
  `.opencode/archive/autorun-<YYYY-MM-DD_HH-MM>/` if missing.
- When creating the folder, write ONE marker file
  `<session_id>.md` into it — the session id is the `SESSION=` field of the
  injected `ctx:` launch line (e.g. `ses_f72e…`); marker content is minimal
  (launch time, iteration N, role). The FILE NAME is the info: it restores
  which session owns the archive after an interruption (the looprunner only
  ever sees the id if the planner finished).
- Spec/summary copies ride along: `plan<N>_ho_task.md` (the task spec, copied
  before the worker launch) and `plan<N>_ho_task_to_planner.md` (the worker
  summary, copied after verification).

## Loop log
- The looprun activity log — who ran when, on what; for the loop itself and for
  the maintainer after the fact.
- ONE file per looprun, in that looprun's autorun archive folder:
  `.opencode/archive/autorun-<YYYY-MM-DD_HH-MM>/loop_log.md` — append only,
  created on first write. (Distinct from the looprunner's own
  `.opencode/loop_log.md`, §Looprunner's own file.) Loopruns only — interactive
  sessions have no log.
- One line per event, `date_time TYPE session_id agent_model <extra>`:
  - `START` — looprunner, planner, and worker each write one at their own
    session/task start; `<extra>` is the task-oneliner.
  - `RETURN` — planner and looprunner each write one when a sub-agent returns;
    the id/model name the RETURNED agent.
  - `DONE` — EVERY agent writes one on task completion; `<extra>` is the final
    gauge readout `<CTX>%/<REM>K` — verbatim from the gauge command, never
    guessed.
- Examples (one per type):
  ```
  2026-09-11_09-30 START  ses_abc123 Qwen3.8-27B-IQ4KT-120K plan3: loop-log section
  2026-09-11_09-45 RETURN ses_abc123 Qwen3.8-27B-IQ4KT-120K
  2026-09-11_10-02 DONE   ses_abc123 Qwen3.8-27B-IQ4KT-120K 42%/78K
  ```
- `session_id` is the `SESSION=` field of the injected `ctx:` line.
- Discipline: append only; NO curation of this file — a dead session loses at
  most its unfinished tail.

## Interrupt handling
- Rebuild from committed state: `git log`, the NAP
  (`.opencode/handover/handover_planner.md`), `TODO.md` — never from memory.

## Looprunner's own file
- `.opencode/loop_log.md` is the looprunner's bookkeeping; the planner does not
  edit it.
