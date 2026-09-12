# Proposal — .opencode structure: agent-side folder, local READMEs, proposals rework, 2-git question
(inbox `NAP_size.md` #3/#4/#5 + the `--todo` in `maintainer/README.md`)

## Problem (evidence)
- `.opencode/` is a mixed bag: opencode's program directory (jsonc, tools/, plugin/) + agent
  communication (proposals/) + agent state (handover/) + agent docs (system_prompts/,
  agent_feedback.md) + knowledge (agent/knowledge/). Maintainer concern: "`.opencode` in
  itself is normally a program directory … we were lucky not to run into some opencode usage
  convention".
- Folder purposes are not self-explanatory — the maintainer's own `maintainer/README.md`
  `--todo` says: "clarify what each folder is for".
- `opencode.jsonc` hard-references the layout (agent prompt paths
  `{file:./.opencode/system_prompts/agents/…}` + permission rules on
  `.opencode/handover_planner.md`, `.opencode/prompt_**`, `system_prompts/agent_readme_loop.md`)
  — any move must update the config and needs a host restart.

## Design (independently approvable)
- **Part 1 — the agent-side home (#3):** move
  `system_prompts/` → `.opencode/agent/prompts/`, `agent_feedback.md` → `.opencode/agent/`,
  `handover/` → `.opencode/agent/handover/` (knowledge already sits at `.opencode/agent/`).
  Live references to fix (measured): `opencode.jsonc` (prompt paths + permission rules —
  MANDATORY), AGENTS.md, agents_repo.md, TODO.md, SCRATCH_PAD.md, 4 plugin files
  (handover_probe.mjs, ctx_watchdog.ts, context_recovery.ts, deactivated/handover.ts),
  tools/compact_memory.ts, proposals/README.md, agent/knowledge/README.md, and the moved
  files' cross-references. HISTORICAL records (archive/, done/, todo_records.md, implemented
  proposals) stay untouched.
- **Part 2 — local folder READMEs (#4):** one short README.md (≤ 20 lines: purpose, what goes
  here, what does NOT) per folder that needs one: `proposals/` (root flow),
  `maintainer/{inbox_planner,inbox_worker,done,feedback,draft}` (the README already started in
  maintainer/), `agent/prompts/`, `agent/handover/`, `agent/knowledge/` (exists), `archive/`,
  `loop/`, `archive/loop/`, `tools/`, `plugin/`. Standing rule (planner prompt): creating a
  new sub-folder under `.opencode/` requires its README in the same commit; folder structure
  should be self-explanatory — the README clarifies USAGE, not content.
- **Part 3 — proposals folder as communication dir (#4):** keep the flow
  (root → commented → approved → implemented/rejected) and `maintainer/{inbox_*,done,feedback,
  draft}`. Recommendation: **NO maintainer inbox** — proposals ARE the channel to the maintainer;
  a fine-grained inbox for him would overwhelm (his own words). `proposals/files/` stays his
  read-only draft test set.
- **Part 4 — 2-git separation (#5): RECOMMENDATION: DEFER.** The handover/plan-state files are
  this repo's resume contract ("committed state is the resume contract") — splitting them into a
  parent git while FST stays a gitignored child splits the contract across two histories
  (atomicity of worker commits: code + TODO + handover in ONE commit). The safety goal (explicit
  edit permissions, area-specific commit channels) is already served by `opencode.jsonc`
  permission rules + the Part 1/2 rework. Revisit after the rework has settled.

## Acceptance
- Part 1: `grep -r "system_prompts\|\.opencode/handover\|agent_feedback"` over LIVE files
  (excluding archive/records) → 0 hits; one full loop iteration runs after the host restart.
- Part 2: every listed folder has a README; the folder tree explains itself to a fresh session.
- Part 3: one full proposal cycle (draft → comment → approve → implement) runs unchanged.

## Status
awaiting approval (Part 1 = config-affecting move, maintainer-gated + host restart; Part 2 is
pre-approved meta once agreed; Part 4 needs his explicit deferral/decision)
