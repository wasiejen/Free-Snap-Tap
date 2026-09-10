# P04 — add `agents_repo.md` to the worker deny lists

**Proposal:** add `"agents_repo.md": "deny"` to every worker / explorer / raw-agent
permission block in `opencode.jsonc` (planner included).

**Context:** agent_feedback (s3, "Worker edited a maintainer-owned meta file without
flagging"): a Q4 worker renamed roster keys in `agents_repo.md` (→ non-existent
`..._128K_mtp`) to document a fact it had learned. The file header says "Agents do not
edit it directly" but the deny lists cover only `AGENTS.md` / `prompt_**` /
`handover_planner.md` — config and doc disagree on ownership; the planner had to revert.

**Impact / risk:** config and doc agree on ownership; stale-repo-fact flags route
through TODO.md (the documented channel). Config-only change.

**Verdict:**
- that was me the maintainer previous to removing gemma altogether. may error. does not need to be done
