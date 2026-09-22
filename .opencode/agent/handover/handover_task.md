# Task spec — TODO #80 continuation (worker-2; worker-1 died at the limit, zero code changes)

**Worker:** worker_Q3S_160K (roster changed live 2026-09-22 —
worker_Q3S_110K_mtp is commented out in opencode.jsonc). **Branch:** the
current checkout (`opencode_test` @ a7acd6a — verify with `git branch -v`
before committing).

**Your plan is committed:**
`.opencode/agent/handover/handover_draft_worker_ses_f3950da93ffeZ6qSsewYup8ElY.md`
— worker-1's checkpoint: verified facts, the EXACT implementation plan (changes
0-4 + the smoke changes), the item-3 evidence (H1/H2), and resume
instructions. READ THAT FIRST — it is your plan. This spec adds only the state
deltas since that draft + one open check.

## State deltas since the draft (planner-verified, 2026-09-22)
- The tree is CLEAN at a7acd6a — the maintainer committed his live files + the
  compact_memory temp fix (0f192e5/531037c/730e725/a7acd6a). The draft's
  "leave uncommitted" caveats are obsolete: commit only YOUR files (plugin,
  smoke, TODO.md, your handover).
- The smoke red baseline is CONFIRMED: `node
  .opencode/plugin/tests/auto_resume.smoke.mjs` → ERR_MODULE_NOT_FOUND
  (`.opencode/plugin/auto_resume.ts`) — draft change 0 (import path) stands.

## Open check (item 3, H1 — run BEFORE writing your verdict)
- DB: `C:/Users/Wasiejen/.local/share/opencode/opencode.db` (node:sqlite,
  read-only): ALL user-role parts of session
  ses_f39d250e9ffeheip2FVEeY5Fk6 — every part type (not just text parts) —
  searched for the literal string `<|autonom|>`. Context: the session was
  compacted AFTER the incident window; compaction summaries / injected
  messages quote the marker literally and may be stored as user parts.
- IF any user part contains it → H1 CONFIRMED: the scope=planner verdict came
  from a non-launch user message quoting the marker → implement the
  fail-safe: the scope verdict targets ONLY the first user message (the
  launch) — plus a smoke check for it. Say so in the handover with the
  matching part(s) quoted.
- ELSE → verdict (b) as the draft plans (evidence + hypotheses; the `scope=`
  verdict line is attribution-only, no behavior change).

## Everything else: per the draft's plan + the original DoD
- Change 0 (smoke import path), changes 1-4 (the plugin), the smoke
  extension (~10-11 new checks), gates green (probe / pytest / ruff per
  `repo_commands.md`).
- The plugin stays deactivated (in `deactivated/`, never added to config).
- `TODO.md` #80 status line: "implementation LANDED (worker commit — the
  planner records the hash in a follow-up); live acceptance pending
  re-activation (maintainer call)". Do NOT guess your own commit hash
  (circular reference — repo precedent: the planner records hashes later).
- Your final handover goes to `.opencode/agent/handover/handover_task_to_planner.md`
  (replaces the draft's checkpoint content — KEEP its evidence section).
- ONE commit: plugin + smoke + TODO.md + handover (commit routine).

## DO-NOT-touch (unchanged from the original spec)
- re-activating the plugin; `.opencode/maintainer/**`; the live config;
  FST product code (plugin-only task); live opencode instances (no live
  listeners — smoke only); `.opencode/agent/prompts/**` (edit-deny — report,
  don't work around).

## Baselines
- Smoke: red at import (confirmed 2026-09-22); 63 checks green pre-deactivation
  (eaef397). Gates: probe 241/241, pytest 459+1w, ruff F=0 (repo_commands.md).
- Branch `opencode_test` @ a7acd6a.
