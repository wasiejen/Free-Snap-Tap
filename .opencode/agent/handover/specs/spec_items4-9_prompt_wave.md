# TASK SPEC — prompt/knowledge text wave (change-list items 4-9, +12 note, +8)

Executor: a **PLANNER agent in Planner-as-text-worker mode** (its launch prompt
instructs it to IGNORE its planner prompt and act as a plain text worker —
workers have NO edit access to `.opencode/agent/prompts/**`). Runs LAST — after
specs 01, 10, 2+11, 3 are LANDED (it documents the post-build state).
Sources of truth (read first, in one batch):
`maintainer/inbox_planner/compaction_feedback_by_planner.md` (the change list),
`maintainer/draft/compaction_guide/full_guide.md` (esp. §11 stale passages +
§12 corrections), `maintainer/draft/compaction_guide/handout.md`.

## Status (verified at launch — 3c390e7 landed before launch)
**DONE by the maintainer (commit 3c390e7; his design choices supersede the
original task text — do not rework):**
- **a. Planner prompt** — guide content removed (Work State dump protocol,
  dump-before-compact, the "starting value" notes, looprunner mentions, the
  >90 % DUMP parenthetical all gone).
- **b. Worker prompt** — guide content removed (he also removed the
  Direct-session section + the Order-stop bullet).
- **f. AGENTS.md** — the handout is now the `# Compaction Guidelines` section
  (incl. Corrections); the old 3-line `Compaction Guideline` section and the
  looprunner role row are gone. (He also removed the bit-drift numerals block
  — separate topic, no action.)

## Tasks (remaining; ordered; text-only — NO code, NO config, NO behavior claims)
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
- **e. Looprunner retirement (item 8 — scope CONFIRMED: full removal; the
  AGENTS.md row is already done in 3c390e7):** `agent_readme_loop.md` — retire
  the looprunner-role content, KEEP the loop-folder/loop-log conventions still
  used by the planner; `agent_readme_post_compaction.md` STEP 1 list adjusted
  accordingly; `prompt_agent_looprunner.md` → move to `.opencode/archive/`;
  `skill/README.md` ~L9; `repo_map.md` ~L105 roster note. The opencode.jsonc
  agent removal = MAINTAINER domain — verify his live file first, note the
  outcome in the handover, do not touch.
- **f2. AGENTS.md paste follow-up (MAINTAINER pastes — the text-worker only
  produces the exact replacement text in the handover, NEVER edits AGENTS.md):**
  (1) the pasted body still carries two lines its own Corrections section
  overrides — "(keepMessages-capable, default 12)" and "SHARED between your
  self-triggered emergency … First-come-first-served". Replacement:
  `- \`normal\`: 5 self-triggered compactions (keepMessages-capable — live default 18).`
  `- \`emergency\`: 1 — consumed ONLY after the 5 are drained; usable by either
     system (self via the \`emergency\` arg, or the auto one at the limit), once.`
  (2) leftover looprunner reference in the role table's planner row:
  "consumed by: workers, looprunner, next planner session" → "consumed by:
  workers, next planner session".

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
