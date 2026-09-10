# P03 — worker prompt: checkpoint rule for long audit tasks

**Proposal:** add to `prompt_agent_task.md` (context-budget section): "For audit/exploration
tasks: after EACH verified finding, write it to TODO.md immediately — a checkpoint is the
unit of work; a dead session must lose at most one finding."

**Context:** agent_feedback (s3, "Worker runs die from context overflow with no
checkpoint"): both audit workers died mid-task on context limits (one with ZERO findings
on disk); the one valuable finding (`remove_all_callbacks`) survived only via planner
re-verification from the CLI transcript. The stop-line rule cannot trigger if the
request 500s first (see P01).

**Impact / risk:** doc-only; dead sessions lose at most one finding instead of all.

**Verdict:**
- isnt the right place the prompt for the explorer?
- implemented 2026-09-10 (looprun 2, iter 3): agreed — applied to
  `prompt_agent_explorer.md` (Stop-line section); `prompt_agent_task.md`
  stays for general workers (audit/exploration tasks run on the explorer).
