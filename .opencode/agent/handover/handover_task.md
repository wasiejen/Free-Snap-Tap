# TASK SPEC — remove keepTokens from compact_memory (change-list item 1)

Origin: `maintainer/inbox_planner/compaction_feedback_by_planner.md` — consolidated
change list item 1 (his `--maintainer` directive, 2026-09-24: "keepTokens need to be
set as default 0 and not be accessible via the compact tool: whenever keepToken != 0
keepMessages will be ignored entirely"). Reference docs:
`maintainer/draft/compaction_guide/full_guide.md` (+ §12 Corrections).

## Goal
The `compact_memory` tool never reads, defaults, or sends keepTokens again;
keepMessages is the only keep knob the agent can pass.

## Scope (exact — three files)
1. `.opencode/plugin/compact_memory.ts` (887 lines — work only in these areas):
   - L72-127 config section: drop `keepTokens` from the `CompactionConfig` type, the
     fail-open defaults (L87 `DEFAULT_KEEP_TOKENS = 30_000`, L102), and the file
     parsing (L112). (Default-0 semantics = the key simply no longer exists / is
     never sent; no tokens value may ever reach the server body.)
   - L710-717 tool description + args: remove the `keepTokens` arg (L713) and the
     stale keep-field notes; keepMessages description = working, sent in the request
     body (e.g. 18). (This is change-list item 4's keep-note fix — folded in.)
   - L802-807 keep construction: `keep.tokens` never set; `keep.messages` from
     `args.keepMessages` only (the args-only behavior stays — change-list item 12,
     the cfg-merge, is OUT of scope, his call).
   - `appendCompactLine` call sites (L832, L862) + the log-line builder (L236-260
     area): the COMPACT line reports the kept MESSAGES only — drop the tokens value
     from the format (re-pin whatever the exact current format is).
2. `.opencode/plugin/tests/compact_memory.smoke.mjs` — re-pin:
   - defaults pins L109/L119 (currently `30000/12/...`), fixture L112 (drop
     keepTokens from the JSON), schema-key pin L173-174 → exactly
     `[sessionID, keepMessages, message]`, body asserts L186/L214/L252
     (`body.keep.messages` only, NO `body.keep.tokens`), all call sites passing
     keepTokens (drop the arg), the log-seed test L389-412 (re-pin to messages).
3. `.opencode/plugin/probes/handover_probe.mjs` — re-pin: schema pin L1837
   (3 keys → 2), the COMPACT-line pin L2193 (`tokens=30_000 messages=12` → new
   messages-only format), registration pin L2389-2391, all call sites passing
   keepTokens, comment L2106.

## DO-NOT-touch
- `context_recovery.ts` keepTokens (its removal rides the #93 event-hook port —
  separate spec).
- `opencode.jsonc`, `.opencode/temp/compact_budget.json` (maintainer live files —
  the budget file already carries `"keepTokens": 0`; it becomes inert, leave it).
- `auto_resume.ts`, the prompt files, knowledge files, items 10/12 (other specs).
- Anything under `.opencode/maintainer/`.

## Definition of done
- `grep -n "keepTokens" .opencode/plugin/compact_memory.ts
  .opencode/plugin/tests/compact_memory.smoke.mjs
  .opencode/plugin/probes/handover_probe.mjs` → zero hits, or at most ONE
  comment line documenting the removal.
- Tool args are exactly `[sessionID, keepMessages, message]` (smoke pin).
- The v1 summarize body (the ACTIVE path on this build — L845-854, verified at
  spec time) carries `keep.messages` when given and NO `keep.tokens` key ever.
- Gate green from the just-verified state: probe full run, compact_memory smoke,
  pytest 459 passed + 1 warning, ruff F=0 (Standing baselines; re-run at start).
- Commit: the three files in one commit (imperative subject). Status → `LANDED`
  (the hash is recorded by the planner in the follow-up bookkeeping commit — not
  by you). No TODO.md change (status lives in this spec + planner bookkeeping).
- Worker summary → `handover_task_to_planner.md`.

## Worker
`worker_Q3S_170K` (verify the live roster in opencode.jsonc before launch).
