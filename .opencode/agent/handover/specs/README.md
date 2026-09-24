# specs/ — pre-written task spec queue (trusted compaction system)

Purpose: task specs written by the planner (2026-09-24, direct session) from the
consolidated change list (`maintainer/inbox_planner/compaction_feedback_by_planner.md`)
— pre-compact spec wave per the maintainer's ruling. Each spec is committed before
launch; a new planner (or this one post-compaction) launches them in queue order.
- `spec_item01_keepTokens.md` — change-list item 1 (his --maintainer item): remove
  keepTokens from compact_memory (top of queue = also the current `handover_task.md`).
- `spec_item10_emergency1.md` — item 10: the emergency-1 budget (total 6, post-drain,
  either system, once). Depends on item 1 (same file).
- `spec_item2_11_auto_resume.md` — items 2 + 11: post-compaction message relay +
  forced-new-session directive (auto_resume.ts).
- `spec_item3_budget_left.md` — item 3: "N compactions left" in the ctx readout.
- `spec_items4-9_prompt_wave.md` — items 4-9 (+12 note): prompt/knowledge text
  updates, executed by a PLANNER agent in text-worker mode (workers have no edit
  access to `.opencode/agent/prompts/**`). Runs LAST, after the build specs.
Queue order: 01 → 10 → 2+11 → 3 → prompt wave.
What does NOT go here: launched specs' worker summaries (handover folder root),
NAP, non-compaction specs.
