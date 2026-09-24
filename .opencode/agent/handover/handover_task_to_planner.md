# Worker summary — wave task d: knowledge compaction corrections (spec items 4-9)

STATUS: LANDED — commit `16e0bfb` (record the hash in your follow-up)

## What changed
Exactly two files, APPENDED dated corrections only (2026-09-24) — history
entries preserved, nothing rewritten or deleted:
1. `.opencode/agent/knowledge/knowledge_tools.md` (entry "llama-swap single
   slot: the flush rhythm + the compaction model choice") — two corrections
   appended after the entry's Keys line:
   - Item (1)'s 2026-09-15 "Gemma is now the DEFAULT compaction model" claim
     is stale → `agent.compaction.model` is COMMENTED OUT in opencode.jsonc →
     same-model summarizer (default cross-compact runs on the target's own
     model; the flush-budget rule of item (2) applies again).
   - Item (3)'s "NEVER use keepTokens/keepMessages 0" ruling is stale →
     `keepTokens` REMOVED from compact_memory (commit 7f253ea); a LOW
     keepMessages is legitimate (floor ~25-30k at keepMessages=0,
     server-side); keepMessages 18 is the live default in BOTH stores
     (opencode.json keep block + compact_budget.json).
2. `.opencode/agent/knowledge/knowledge_plugins.md` (entry "compact_memory
   verified working again + Gemma is the DEFAULT compaction model") — one
   correction appended: `agent.compaction.model` COMMENTED OUT → same-model
   summarizer (the "Gemma default" claim above is stale).

All factual lines trace to `maintainer/draft/compaction_guide/full_guide.md`
§12 Corrections (cited in each correction line). No facts added beyond the
spec's allowed list.

## Verification
- `git status --porcelain` before commit: ONLY the two knowledge files modified
  (+19 insertions, 0 deletions per `git diff --stat`) beyond the pre-existing
  maintainer dirty files — zero edits outside scope.
- Read-back of both edited regions (corrections in place, history intact).
- No gate run (markdown only, per spec).

## Commit (named paths only — one commit, two files)
`git add .opencode/agent/knowledge/knowledge_tools.md
.opencode/agent/knowledge/knowledge_plugins.md` → commit `16e0bfb`
"Append 2026-09-24 compaction corrections to knowledge_tools +
knowledge_plugins (wave task d)". Maintainer uncommitted files (opencode.jsonc,
AGENTS.md, prompt_agent_task.md, agent_feedback.md, loop_log.md, ideas.md,
priority.md) NOT staged, NOT touched, NOT committed.

## Deliberately NOT done
- Item (4) of the same knowledge_tools entry ("this host's server schema has
  no keep key → the retry-once drops them") was left uncorrected — §12 now
  says the keep fields reach the server via the tool ARGS (v1 summarize path,
  no args → server default 18). The spec named only the two entries; flag for
  your curation call.
- The emergency-1 fact (04053e8, total 6, post-drain, either system, once) was
  in the allowed fact list but no stale entry in the two files claimed the
  budget counts, so nothing to correct — nothing added.
- This handover file is UNCOMMITTED (spec DoD: the commit is the two knowledge
  files only) — pick it up in your follow-up commit with the status record.

## TODO entries
None (no findings requiring curation).
