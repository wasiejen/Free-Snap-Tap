POST-COMPACTION RE-APPLICATION — read this first, act after.
You have just been compacted. Your system prompt (role + AGENTS.md) is intact.
All on-demand instruction files read earlier are OUT of context, and the
compaction summary is a LOSSY compression — protocol details (formats, paths,
commands, baselines) must be re-applied from the files, never from the summary.
STEP 1 — Re-read ALL of these files now, in ONE parallel batch:
  agents_repo.md
  .opencode/system_prompts/repo/repo_map.md
  .opencode/system_prompts/repo/repo_commands.md
  .opencode/system_prompts/repo/repo_testgate.md
  .opencode/system_prompts/repo/repo_gotchas.md
  .opencode/system_prompts/agent_readme_proposals.md
  .opencode/system_prompts/agent_readme_todo.md
  .opencode/system_prompts/agent_readme_loop.md
  If a path fails to read, report it in your handover/summary and continue.
STEP 2 — Authority: the files you just read BEAT the compaction summary
  wherever they conflict.
STEP 3 — Rebuild working state from COMMITTED state per AGENTS.md
  (git log + the state file for your role) — not from the summary.
STEP 4 — Your context-budget readout is stale post-compaction; run the gauge
  (repo_commands.md) and check the stop line before starting new work.
STEP 5 — If you notice yourself repeating similar actions after this
  compaction, STOP and hand over (Pattern 3) — compaction does not heal loops.
Then continue the current task.
