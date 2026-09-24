# TASK SPEC — prompt/knowledge text wave (change-list items 4-9, +12 note, +8)

Executor: a **PLANNER agent in Planner-as-text-worker mode** (its launch prompt
instructs it to IGNORE its planner prompt and act as a plain text worker —
workers have NO edit access to `.opencode/agent/prompts/**`). Runs LAST — after
specs 01, 10, 2+11, 3 are LANDED (it documents the post-build state).
Sources of truth (read first, in one batch):
`maintainer/inbox_planner/compaction_feedback_by_planner.md` (the change list),
`maintainer/draft/compaction_guide/full_guide.md` (esp. §11 stale passages +
§12 corrections), `maintainer/draft/compaction_guide/handout.md`.

## Tasks (ordered; each small; text-only — NO code, NO config, NO behavior claims)
- **a. Planner prompt** (`.opencode/agent/prompts/agents/prompt_agent_planner.md`)
  — his ruling 2026-09-24: the shared compaction knowledge MOVES to AGENTS.md
  (its paste, task f). So: REMOVE the compaction guide content (the
  handout-equivalent policy passages + the stale passages: the two "(starting
  value … calibrate from measured loopruns)" notes, the Gemma flush line
  (~L179), the dump-before-compact protocol lines — dumps are AUTOMATIC now,
  `dump_session.cjs` stays for manual/forensics, the looprunner mentions
  ~L65/84/85/209/265). KEEP only the role-specific triage/handover mechanics
  (near-limit triage, emergency handover form, Work State dump form, stop-line
  protocol) + one pointer line: "Compaction: see AGENTS.md §Compaction."
- **b. Worker prompt** (`.opencode/agent/prompts/agents/prompt_agent_task.md`):
  same — REMOVE the compaction guide content (stale removals: dump step in the
  near-limit protocol, Gemma/keepTokens/looprunner mentions if present — grep
  first), KEEP role-specific mechanics + the pointer line.
- **c. Repo docs** (`.opencode/agent/prompts/repo/`): `repo_custom_tools.md` —
  the compact_memory tool section: args now `[sessionID, keepMessages, message,
  emergency]` (post item 1+10), keepTokens gone, the "server ignores keep
  fields" note gone, the tool description reframed (maintenance tool, not
  emergency valve); the Gemma flush line (~L60) → same-model summarizer
  (`agent.compaction.model` commented out); the looprunner line (~L34) →
  auto-resume plugin. `repo_map.md` ~L105 roster note; `skill/README.md` ~L9.
- **d. Knowledge** (`.opencode/agent/knowledge/`): `knowledge_tools.md` L181
  (the never-keep-0 ruling → stale: keepTokens removed; a low keepMessages is
  legitimate, floor ~25-30k) + L171-174 (Gemma default → same-model summarizer);
  `knowledge_plugins.md` L119-124 (same). Append corrections with dates — do
  NOT delete history.
- **e. Looprunner retirement (item 8 — his scope call, ASSUMED: full removal
  from agent-side files; if he rules differently the text-worker re-scopes):**
  `agent_readme_loop.md` — retire the looprunner-role content, KEEP the loop-
  folder/loop-log conventions still used by the planner (rewrite, not delete,
  unless the maintainer file says otherwise); `agent_readme_post_compaction.md`
  STEP 1 list adjusted accordingly; `prompt_agent_looprunner.md` — move to
  `.opencode/archive/` (its removal from `opencode.jsonc` is MAINTAINER domain —
  note it, do not touch).
- **f. AGENTS.md paste list (MAINTAINER does the paste — the text-worker only
  produces the exact replacement text in the handover, NEVER edits AGENTS.md):**
  (1) the NEW Compaction section = the handout (`draft/compaction_guide/
  handout.md`, ~950 tokens) — his ruling: test it as-is, shrink later — it
  REPLACES the old `Compaction Guideline` section (incl. the stale "(message
  is currently not working …)" line once item 2 lands); (2) the role table /
  interaction contract looprunner rows (item 8 — CONFIRMED full removal).

## DoD (per task: grep-clean of the stale strings named above; a read-back of
each edited file; zero edits outside the named files; zero behavior claims —
every factual line traceable to the change list / guide / the landed specs)
- One commit (the named prompt/knowledge files + the archive move if task e
  runs). Status → `LANDED` (hash recorded by the planner's follow-up).
- Summary → `handover_task_to_planner.md` including the AGENTS.md paste text
  (task f) for the maintainer.

## Worker
A planner agent per the live roster (verify opencode.jsonc) — launched in
Planner-as-text-worker mode per the no-circumvent rule (TODO #54).
