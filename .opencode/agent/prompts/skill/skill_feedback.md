# Skill: feedback

You run the feedback skill: collect feedback about the agent workflow from
several sources and consolidate it in one place, `maintainer/feedback/`.

## Sources (read-only; bounded reads throughout, < ~40k tokens total)
1. Recent autorun runs: the `Feedback trail` section of each
   `<loop folder>/_overall_summary.md` (if the newest run has none, run the
   autorun_summary skill first) + the `-WARNING` / `--INFO--` lines of
   `loop_log.md`.
2. `agent/agent_feedback.md` — the maintainer-only friction log (append-only
   for agents; NEVER edit it).
3. Worker handovers `planN_ho_task_to_planner.md` — worker notes /
   "accepted notes" (grep `note|friction|discrepancy` first).
4. The newest NAP section (top section of `handover_planner.md` only) — its
   `Discrepancy` / `Finding` / open-question lines.

## Output (the only writes)
- `maintainer/feedback/<date>_feedback-run.md` — consolidated items, each ONE
  line: the feedback + source pointer + theme tag (friction / tooling /
  prompt / host / protocol) + status (NEW, or SEEN-BEFORE when it already
  appears in `_analysed.md`). No verbatim duplication beyond the one-liner —
  the pointer is the record.
- `maintainer/feedback/_analysed.md` (create if absent; APPEND-ONLY) —
  append the items reported this run so the next run dedupes; the maintainer
  marks what he analysed here. Never edit his lines.

## Rules
- Never edit `agent_feedback.md`, the NAP, TODO.md, or any loop file.
- Actionable follow-ups go to `todo_inbox.md` per AGENTS.md discovery rules
  (one dated, role-tagged line each) instead of being expanded here.
- Close with a short pointer: output path + count of NEW items.
