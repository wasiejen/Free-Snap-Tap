# P07 — autorun archive + session-summary channel

**Proposal:** durable per-iteration artifacts in `.opencode/archive/autorun-<YYYYMMDD>/`;
the planner writes his session summary to a file at stop, copies the task spec + worker
summary into the day dir; the looprunner only announces the iteration number and prints
the closing message (existing behavior).

**Context:** maintainer 260910: (a) planner summaries only live in the looprunner's
session log — "bad for actually answering questions if not a restart is close";
(b) "too many changes for me to track afterward what really is happening";
(c) the handover slots are overwritten per cycle. Follows the maintainer's stated
intent; the structure below is efficient with minimal friction for the planner.

**Proposed structure (one dir per calendar day; iterations numbered within it):**
```
.opencode/archive/autorun-260910/
  plan01_summary.md            — planner closing summary (planner writes at stop)
  plan01_ho_task.md            — copy of handover_task.md BEFORE the worker launch
  plan01_ho_task_to_planner.md — copy of the worker summary AFTER verification
  plan02_summary.md ...
```

**Division of labor (each behavior in ONE place):**
- PLANNER — new block in `prompt_agent_planner.md` (paste):
  ```
  ## Autorun archive (autonomous runs)
  - The launch message tells you your iteration number N (the looprunner counts).
  - On start: create `.opencode/archive/autorun-<today>/` if missing.
  - Before launching a worker: copy `handover_task.md` in as `plan<N>_ho_task.md`.
  - After verifying the worker: copy `handover_task_to_planner.md` in as
    `plan<N>_ho_task_to_planner.md` (before any later Task-tool run can clobber it).
  - At stop (stop line or clean end): write your closing summary VERBATIM to
    `plan<N>_summary.md`; your closing message to the loop is a short pointer to it.
  ```
- LOOPRUNNER — one line in `prompt_looprunner.md` (paste):
  ```
  - When launching, tell the planner his iteration number N (1-based, counts across
    this looprun) at the top of the task message.
  ```

**Why the planner archives (not the looprunner):** the planner already reads both
handover files each cycle (verification) and writes the summary at stop — zero extra
steps; the looprunner keeps its current permissions (prompt + loop_log only).

**Impact / risk:** every iteration's spec + worker summary + planner summary survive in
git; the maintainer diffs the day dir to see what really happened; the NAP stays a
progress summary, not the full log. Doc/prompt-only + a few `Copy-Item` calls.

**Verdict:**
- approved
- implemented 2026-09-10 (looprun 2, iter 3): the planner block is live in
  `prompt_agent_planner.md` (Autorun archive section); the looprunner line rides
  in `files/prompt_looprunner.md` (applied on restart); the day dir
  `.opencode/archive/autorun-260910/` starts this iteration (plan03).
