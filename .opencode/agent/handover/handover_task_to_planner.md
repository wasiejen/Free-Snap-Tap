# Text-worker summary — wave tasks c/e/g/h (spec items 4-9 prompt wave)

Planner-as-text-worker session (2026-09-25), executed per launch scope:
ONLY tasks c, e, g, h. Tasks a/b/d/f/f2 were already LANDED (spec Status
section) — not reworked. Text-only: no code, no config, no behavior claims.
Every factual line traces to the change list
(`maintainer/inbox_planner/compaction_feedback_by_planner.md`),
`maintainer/draft/compaction_guide/handout.md`, or the landed specs.

## What was done per task

### c. Repo docs
- `.opencode/agent/prompts/repo/repo_custom_tools.md`:
  - `loop_log` section: roles line → "planner / worker" (looprunner
    retired).
  - `compact_memory` section reworked to the post item-1+10 state: header
    "SELF / CROSS"; args = `[sessionID, keepMessages, message, emergency]`
    (old `providerID`/`modelID` line gone, `keepTokens` noted as gone);
    budget = per target session + model (`compact_budget.json`
    `model_budget`, bare model id → cap, CPU denied cap 0); `emergency`
    arg = the one extra compaction after the normal budget is drained
    (once per session); the old Gemma-flush line → "summarizer is the
    target session's OWN model (same-model — `agent.compaction.model`
    commented out in opencode.jsonc) → ONE flush delegation after a CROSS
    dispatch (llama-swap single slot)". The "server ignores the keep
    fields" note did not exist in the current file (nothing to remove).
- `.opencode/agent/prompts/repo/repo_map.md`: roster note →
  "`planner_*` are not workers" (`looprunner_*` token dropped).
- `.opencode/agent/prompts/skill/README.md`: `skill_autorun_summary.md`
  line → "(run at end of loop)" (the "by the looprunner" attribution
  dropped).

### e. Looprunner retirement (item 8)
- `.opencode/agent/prompts/agent_readme_loop.md`:
  - header: "the planner reads it when driving the loop (autonomous
    launch)".
  - the `--request:` lines bullet (loop-signals Part 2) RETIRED — both
    directions were looprunner↔planner; no consumer exists post-removal
    (nothing to restore — flag for your ruling if you want it kept).
  - Action-line parenthetical: the "INLINED here — the looprunner does NOT
    load AGENTS.md" clause dropped (states list kept, same vocabulary).
  - "…the looprunner reads the LAST one" → "the auto-resume plugin reads
    the LAST one".
  - Loop-log section: the "(Distinct from the looprunner's own
    `.opencode/loop_log.md`…)" parenthetical dropped; role enumeration →
    `planner-N / worker-N / explorer-N` with an annotation that the
    retired `looprunner` token appears in historical lines only; the
    `-->START` writers → "planner and worker"; `-RETURN-` writer → "the
    planner".
  - "## Looprunner's own file" → "## Looprunner's own file (retired)" with
    the note that the role is retired (2026-09-24), the auto-resume plugin
    covers launch/relay/restart, and `.opencode/loop_log.md` no longer
    exists (verified on disk).
- `prompt_agent_looprunner.md` MOVED to `.opencode/archive/` via `git mv`
  (rename staged; archive README needed no change — it does not enumerate
  files).
- `skill/README.md` + `repo_map.md` — covered under task c above (the spec
  lists them for both tasks).
- `agent_readme_post_compaction.md`: NO looprunner content found in the
  current file (STEP 1 list is repo parts + agent readmes, none
  looprunner-specific) → no adjustment needed.
- opencode.jsonc: see the note below.

### g. Bit-drift primer references (his ruling: RETIRED)
- `prompt_agent_planner.md`: the fuzzy-numword primer bullet in the
  Instruction index (L52-57 pre-edit) removed. The planner-prompt index
  line for `agent_readme_loop.md` also lost its stale
  "`--request:` lines" parenthetical (crossfire of the task-e removal).
- `.opencode/agent/research/fuzzy-numword/` area + primer file: untouched,
  per his ruling (reactivatable).
- DEFERRED: `prompt_agent_task.md` L40-44 (same primer bullet) — the file
  is maintainer live-edited (uncommitted changes at launch).

### h. Phase-2 prompt pass (planner side)
- `prompt_agent_planner.md` §Context-budget trigger (L3) + stop line:
  reworked compaction-oriented per the handout:
  - header line pointing at the AGENTS.md `# Compaction Guidelines`
    section as the general model (this section = role-specific triage +
    handover mechanics on top of it).
  - "Default: compact until the budget is spent — routine
    speed/maintenance tool, not an emergency valve".
  - "Distilled → drop (mid-unit ok)".
  - Stop lines reframed as TRIAGE thresholds (80 % ~10-call estimate /
    90 % ~6-call estimate + emergency handover / 95 % commit + compact
    NOW, do-not-deliberate).
  - "Compaction is NOT a restart" kept (same-model summary wording).
  - keepMessages heuristic added (keep what you would have to RE-DERIVE;
    committed handover → keep less; when in doubt → keep more; spend the
    `emergency` 1 PROACTIVELY at the stop line — the auto one takes it
    blindly (18)).
  - auto-dump line (no manual dump before compact; dump = recovery source
    for a forced new session).
  - Worker-context-limit bullet kept (CROSS compact + task_id resume).
- `prompt_agent_planner.md` §Delegate-vs-do compacted-worker bullet: the
  stale Gemma flush line ("host's compaction model (Gemma) differs from
  the target's model → no flush…") → same-model summarizer + ONE flush
  delegation (llama-swap single slot).
- §Early handover (planner, 70 %): UNCHANGED, per his test ruling.
- ORDER-STOP / WORK STATE DUMP FORM: removal CONFIRMED (his 2026-09-24
  ruling) — nothing to restore; the rework above adds no dump/stop-order
  content.
- DEFERRED: `prompt_agent_task.md` §Context budget (worker side) — the
  file is maintainer live-edited (uncommitted changes at launch). For the
  next pass: the worker section still lacks the default-compact /
  distilled→drop / triage-threshold / keepMessages-heuristic framing, and
  its self-compaction bullet's "the reload message is attached to the
  compaction summary" line predates the spec 2+11 message-relay build.

## Verification (per spec DoD)
- Grep-clean: no `looprunner` outside the two deliberate
  retired/historical annotations in `agent_readme_loop.md`; no
  `providerID`/`modelID`/`quant class`/`Gemma`/"server ignores" in
  `repo_custom_tools.md` (`keepTokens` only in the intentional "is gone"
  note); no `fuzzy-numword`/`primer`/`Gemma` in `prompt_agent_planner.md`.
- Read-back of every edited file (full or the edited regions).
- Zero edits outside the named files (git status: only the 5 files + the
  rename + this summary).
- No gate run (markdown only).
- Branch: `opencode_test` (verified at launch; stayed on the checkout).

## Deferred live-edited files (SKIPPED, not touched)
Files with uncommitted changes at launch (maintainer live-edited) — their
edits deferred:
- `.opencode/agent/prompts/agents/prompt_agent_task.md` — defers the
  task-g primer bullet (L40-44) and the task-h worker Context-budget
  rework (§Context budget, L73-93; notes for the next pass above).

Not touched / not staged (per launch scope): `opencode.jsonc`,
`AGENTS.md`, `.opencode/agent/agent_feedback.md`,
`.opencode/loop/autorun-2026-09-21_15-33/loop_log.md`,
`.opencode/maintainer/ideas/ideas.md`, `.opencode/maintainer/priority.md`.

## opencode.jsonc note (MAINTAINER domain — verified, not touched)
The looprunner agent is ALREADY removed there: the `looprunner_Q3S_170K`
agent block is commented out (opencode.jsonc L149+; the whole sub-agent
registration is `//`-commented). Nothing further to do on the file; the
archived prompt file no longer has a live registration pointing at it.
Also noted for context: `agent.compaction.model` is commented out there
(same-model summarizer — the factual basis for the flush-line rewrites).

## Commit
One commit, named paths only: the 5 edited files + the archive rename
(staged via `git mv`) + this summary file.

## TODO entries
None new (deferrals ride in this handover; the planner curates).
