# PLAN 1 SUMMARY (iteration 1, looprun autorun-2026-09-13_04-27)

**Done**
1. Maintainer instruction codified (commit 4f61a42): worker prompt gains
   the compact_memory-live block (checkpoint before firing; on resume →
   post-compaction protocol + agent_readme_post_compaction.md); planner
   prompt gains "compacted worker = resume, not relaunch" (same
   sessionID via task_id).
2. Live acceptance of the compact_memory fix — DONE via worker-1
   (ses_f6765a68bffeudOXmVzLROTYk6) + planner-direct rescue (its
   resume hit a context overflow; Phase B verified planner-side, all
   evidence verbatim in the worker summary): compaction part
   {"type":"compaction","auto":false} in DB, reload directive verbatim
   in the tool output, the structured 3649-char summary attached to the
   session, budget v2 count 1/3 + COMPACT line. The active host runs
   our plugin.
3. Inbox: context_async_compaction.md → done/ with replier.

**Headline finding (needs his ruling)**
Self-compact near the window top makes the session UNRESUMABLE: resume
of the compacted worker session was rejected (request exceeds the 120K
window — the server's summarize schema has no keep key, so the
requested keep 12 msgs/30K was not honored). Proposal filed:
proposals/2026-09-13_compact_memory-findings.md — item 1 rec: lower the
self-compact trigger (≤50–60 %) as a one-line prompt edit + server keep
support as the durable fix; item 2: time_compacting is NULL
post-completion (semantics = his ruling).

**Queued for next iterations** (NAP §NEXT): nap-size build (approved,
top buildable) → snippet_collection + priority #4 (small) → proposal B
(agents.md additions: gauge-lag hint + #5 + #6) → test-file-home
proposal → helper-scripts explorer task.

**Baselines** (carried, no code touched): probe 98/98, smoke 23/23,
pytest 459+1#10, ruff F=0.

action: restart
