how to gain knowledge
  To distill knowledge for future agents, I would implement a three-phase workflow:
  1. Real-time Capture: Use agent_feedback.md to `log immediate friction` and todo_inbox.md to record "gotchas" (e.g., the commit hash chicken-and-egg problem) as they occur.
  2. Post-Mortem Reflection: ``After each task, include a "Lessons Learned" and "Tool ROI"`` section in the handover_task_to_planner.md ``summarizing which tool sequences were most efficient and which failed``.
  3. Knowledge Synthesis: Periodically aggregate these insights into repo_overview.md or a dedicated knowledge/ directory as "Agent Tips" to provide a searchable repository of verified patterns and avoided pitfalls.

To distill knowledge from a "swamp" of hundreds of session logs, I would execute a four-stage data mining pipeline:
  1. Structured Extraction: Run a script to parse all .md files in .opencode/archive/sessions/, converting them into a structured JSON dataset containing: task titles, tool call sequences, reasoning blocks, and error strings.
  2. Cluster Analysis: Group the data by task type (e.g., "refactoring," "dependency updates") to identify high-frequency tool chains and "failure clusters" where agents repeatedly hit the same errors.
  3. LLM Distillation: Pass these clusters to a high-context agent (like agent_Q3_210K) with a specific prompt to "identify the most efficient tool path" and "summarize the top 3 recurring pitfalls" for each category.
  4. Knowledge Mapping: Synthesize these findings into a structured knowledge_base.md categorized by Tool ROI, Workflow Blueprints, and The Wall of Shame (known errors to avoid), then update repo_overview.md with these high-level "Agent Tips."
