# knowledge_inbox.md — append-only inbox for new knowledge (his #5, 2026-09-15)

Unsorted, verified, actionable knowledge entries that do not yet have an
obvious area file. APPEND ONLY — the planner cures entries into the area
files (`knowledge_tools.md` / `knowledge_plugins.md` / ...) at session
close or when the placement becomes obvious. Format per the folder README
(Do / Why (evidence) / Ref / Keys) + a date + role tag.

_Curation log (planner):_
- 2026-09-21: "Edit tool chokes on non-ASCII chars" → `knowledge_tools.md`; "single slot serial / half-prefill / cost = time" → `knowledge_tools.md` (model-config facts; the serial-slot half was already covered by the single-slot entry); "tool descriptions = agent-facing surface" → merged into the `description` entry in `knowledge_tools.md` (new-hire test); "plugin repo test( vs it( layout" → `opencode-plugins/auto-resume-map.md` test-layout note.
- 2026-09-21 (plan2): worker's 3 auto-resume SDK/event/live-log facts → `opencode-plugins/auto-resume-unit1-surface-report.md` §UNIT 2 supplement.

## 2026-09-22_00-11 worker_Q3S_160K ses_f3a03af20ffe1bRa56xVl143VG
auto_resume.smoke.mjs pitfall (verified 2026-09-22): the plugin's module-level `client`/`logDir` are overwritten by EVERY factory() call, and all watch state is shared module-level. A smoke section added after the fail-safety block (which re-factories with the throwing v3Session client) must itself re-factory with a fresh spying session client — otherwise sends log `trigger=` but hit the throwing client (`send-fail=`, zero pushes to the spy array) and the case falsely fails.

