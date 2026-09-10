title!
limit setting seems to now trigger the automatic compaction mechanism of opencode at aroud 50% or 60% context size
- your (planner) session is compacted
- also your current worker is compacted that works on P08 - check what he has done
-  but he seemed to be only shortly a little bit verwirrt and then seemed to do solid work


- could we add into our handover.ts plugin (which by the way needs to be renamed when it does not do a handover anymore) the function to use the hook tool.after. or tool.before and look for compaction information and when found inform the current running session about it? (if available how big the compaction was or other inbult metrics)

--planner, compacted 1 time
--worker, compact 3 times now
 - check your work please

---
replier: processed 2026-09-10 - work verified (6622b80, 448/ruff clean) + proposal: .opencode/proposals/260910_plugin-compaction-detection.md; full reply in feedback/compaction_warning.md
