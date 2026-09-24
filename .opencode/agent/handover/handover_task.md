# TASK SPEC — wave task d: knowledge compaction corrections (prompt wave, item 4-9)

Origin: `handover/specs/spec_items4-9_prompt_wave.md` task d (the consolidated
change list in `maintainer/inbox_planner/compaction_feedback_by_planner.md`
is the source of truth). Text-only — NO code, NO config, NO behavior claims.

## Scope (exactly two files)
1. `.opencode/agent/knowledge/knowledge_tools.md`:
   - The "never keep 0" compaction ruling entry (~L181 — locate by grepping
     the compaction/keep entries, line numbers are APPROXIMATE): now stale —
     keepTokens is REMOVED from compact_memory (item 1, 7f253ea); a low
     keepMessages is legitimate (hard floor ~25-30k). APPEND a dated
     correction line (2026-09-24) — do NOT rewrite or delete the history
     entry.
   - The Gemma-default-compaction-model entry (~L171-174 — locate by grep):
     now stale — `agent.compaction.model` is COMMENTED OUT in opencode.jsonc
     → same-model summarizer. APPEND a dated correction.
2. `.opencode/agent/knowledge/knowledge_plugins.md`:
   - The "Gemma is the DEFAULT compaction model (agent.compaction.model
     set)" entry (~L119-124 — locate by grep): same correction, dated
     2026-09-24.
Corrections' factual source (do not add facts beyond these):
`maintainer/draft/compaction_guide/full_guide.md` §12 Corrections + the
handout body (keepTokens removed; keepMessages 18 live default in BOTH
stores; same-model summarizer; the emergency-1 budget LANDED — 04053e8 —
total 6, post-drain, either system, once).

## DO-NOT-touch
- Every other knowledge file (the inbox stays for the planner's curation),
  all prompt files, all code, `.opencode/maintainer/**`.

## Definition of done
- Each stale entry has an APPENDED dated correction (history preserved).
- Zero edits outside the two named files (verify with `git status`).
- A read-back of both files. No gate run needed (markdown only).
- One commit (the two files only), imperative subject. Status → `LANDED`
  (the hash is recorded by the planner's follow-up). Summary →
  `handover_task_to_planner.md`.

## Worker
`worker_Q3S_230K_slow` (maintainer's instruction 2026-09-24 — backend
caching observation; verify the live roster in opencode.jsonc is not
required, the type is confirmed in the planner's toolset).
