# P05 — document the edit tool's `replaceAll` semantics (single-pass vs rescan)

**Proposal:** pin the fact in `agents_repo.md` (gotchas): does the edit tool's
`replaceAll` rescan its own replaced output? If single-pass, say so (direct
`kb_env` → `kb_env_ns` is safe); if it can rescan, recommend scripted whole-file
renames (pwsh/node single-pass substitution) instead of staged edits.

**Context:** agent_feedback (worker, #43 run, "Bulk rename: two-stage token vs prefix
collision"): the two-stage token dance (`kb_env` → `ZZ…` → final name) existed only
because the semantics are undocumented; it still corrupted one occurrence (an earlier
edit had already written the final name) and cost ~3 extra edit calls + a verification
script (~2-3k context) + sustained doubt.

**Proposed action:** run ONE probe (rename a token whose replacement contains the
source token as a prefix, in a scratch file), record the observed behavior.

**Impact / risk:** doc-only; removes doubt-driven overhead from every future bulk rename.

**Verdict:**
