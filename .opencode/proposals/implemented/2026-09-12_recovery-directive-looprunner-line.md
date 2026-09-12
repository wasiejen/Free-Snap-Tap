# Recovery directive: the looprunner continuation line (keep / remove)

**Status:** awaiting maintainer ruling (filed iter-6, 2026-09-12).

## Problem
The emergency-recovery directive (`COMPACTION_RELOAD_DIRECTIVE`,
`.opencode/plugin/context_recovery.ts:36-40`) carries one line the
`compact_memory` tool's directive does NOT have:

```
If your role is Looprunner continue the last restart/resume close message of a Planner you have received.
```

It was added by the T5 WIP build (`9e173d1`) and never verified — the probe's
S10→S10 section was never run until the iter-6 re-verify (commit `14af171`,
probe 80/80). The plugin's stale header comment (which claimed
"byte-identical to the compact_memory tool's constant") was fixed as a
comment-only edit in the same iteration; the RUNTIME string is unchanged and
probe-pinned by check 78.

## Question (one decision)
Keep the line or remove it (making the directive byte-identical to the
tool's constant)?

## Recommendation: KEEP
- Role-conditioned ("If your role is Looprunner …") → inert for every other
  role (planner/worker/explorer never match the condition).
- Matches the loop protocol: a compacted looprunner session re-anchors on the
  last planner close message (the `action:` line) — exactly its job
  (AGENTS.md §Interaction-contract).
- Removal is an observable behavior change; keeping costs one inert line.

## Acceptance
- Ruling recorded here. If REMOVE: the constant loses the line, probe check
  78 + the plugin header comment update in the same commit, probe green,
  then this file → `proposals/implemented/`. If KEEP: this file →
  `proposals/implemented/` with a one-line verdict.

-keep

- verdict (2026-09-12, planner iter-7): **KEEP** — maintainer ruling "-keep"
  recorded above. No code change (the runtime string and probe check 78 stay
  as-is); the file moves here per the acceptance clause.
