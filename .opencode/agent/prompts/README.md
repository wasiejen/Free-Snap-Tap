# agent/prompts/ — the live agent instruction set (read-mostly)

Purpose: the instruction text agent sessions load — role prompts + on-demand
instruction files. `agents/prompt_agent_*.md` (live role prompts, wired in
`opencode.jsonc`), `repo/repo_*.md` (`repo_overview.md` + the parts),
`agent_readme_*.md` (protocol readmes: loop / proposals / todo /
post-compaction), `roles/` (role-design drafts).

DOES NOT go here: task/handover state (`agent/handover/`), knowledge findings
(`agent/knowledge/`), phase plans (the NAP). Edits here are protocol changes —
a host restart activates prompt/config changes, and the probe gate must stay
green after.
