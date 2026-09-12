# agent/handover/ — the live communication + plan-state files

Purpose: the committed channels between roles (semantics: AGENTS.md
§Interaction-contract):
- `handover_planner.md` — the NAP (planner-owned plan state; the resume
  contract)
- `handover_task.md` — the current task spec (planner → worker)
- `handover_task_to_planner.md` — the worker's latest executive summary

Only the owning role writes each file; workers never touch the NAP; phase
close archives the NAP to `archive/`. Supersedes the retired root-level
no-slash `handover_*.md` forms (2026-09-12 restructure, Part 1).
