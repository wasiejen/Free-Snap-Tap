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
  looprunner role row are gone.

**Clarifications (maintainer, post-compact — supersede the spec text where
they differ):**
- The bit-drift numerals block = **RETIRED** (the models show no such tendency;
  the fuzzy-resolver + fallback stay in the code, reactivatable; the primer
  file stays) → task g.
- The AGENTS.md paste = a **test for now** — full integration pending: the
  Corrections get folded into the body (the handout is now fold-in-complete =
  paste-ready; the AGENTS.md repaste = task f2).
- The planner/worker prompts were only **surface** reworks — the
  Context-budget sections need a deeper compaction-oriented pass → task h.
- **Worker early handover moved 70 % → 80 %** (his test — the old percentages
  predate the 170k window; verified on disk).
- The **Work State dump form** removal may be edit crossfire (he intended only
  the dump-before-compact mentions) → task h carries his pending ruling.
- Note: the current planner session still carries the PRE-3c390e7 AGENTS.md +
  planner prompt in its system prompt — the test is observable from the NEXT
  fresh session.

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
- **f2. AGENTS.md integration — DONE by the maintainer (his uncommitted tree
  edit, verified 2026-09-24):** the fold-in-complete handout is now the
  AGENTS.md `# Compaction Guidelines` section; the looprunner row removed;
  the action line's 'read by' = 'auto-resume plugin / planner (for worker
  end line)'. REMAINING (his cleanup — 4 leftover looprunner references):
  L66 planner row 'consumed by: workers, looprunner, next planner session' →
  'workers, next planner session'; L78 NAP row 'planner (next session),
  looprunner (indirect)' → 'planner (next session)'; L82 '(looprunner and
  planner both read this)' → '(planner reads this)'; L92 'the looprunner
  never touches repo files…' — drop the sentence.
- **g. Bit-drift references (approved by his ruling):** remove the
  fuzzy-numword primer lines from the Instruction index —
  `prompt_agent_planner.md` ~L52, `prompt_agent_task.md` ~L40. The primer file
  + the `.opencode/agent/research/fuzzy-numword/` area STAY untouched.
- **h. Phase-2 prompt pass (planner + worker — make the Context-budget
  sections compaction-oriented per the handout):** default-compact until the
  budget is spent, distilled→drop (mid-unit ok), stop lines as triage
  thresholds, the keepMessages heuristic (when in doubt keep more). Worker
  early handover = 80 % (his test — keep); planner early handover = 70 %
  (unchanged for now). ORDER-STOP / WORK STATE DUMP FORM: removal CONFIRMED
  (his ruling 2026-09-24 — in serial execution a stop order is never usable:
  the worker returns only on close (finish / self-compaction / context
  limit), none need a pre-ordered stop, and dumps are automatic). Nothing to
  restore.

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
