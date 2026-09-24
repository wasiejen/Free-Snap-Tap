# TASK SPEC — the emergency-1 compaction budget (change-list item 10)

Origin: consolidated change list item 10 (`maintainer/inbox_planner/
compaction_feedback_by_planner.md`) — his design (2026-09-24): "the emergency
budget is simply an increase in the normal budget that can be used by either
system - but only used once … will only be consumed if normal budget is already
drained"; and "a tooloption to allow an additional compaction above budget when
an 'emergency' parameter is ticked on". Reference: `full_guide.md` §4/§5/§12.
PREFACE: runs after item 1 (same file) — write against the post-item-1 state
(fresh line numbers).

## Design (pinned — planner-verified from the design discussion)
- Total per session = normal cap (model_budget) + 1 emergency. The 1 is consumed
  ONLY after the normal cap is drained, by EITHER system, ONCE.
- Tracking needs NO store-schema bump: the count itself tracks it — after the
  emergency dispatch, count = cap+1; `count > cap` = fully exhausted.
- Config: new top-level key `emergency_budget` (number >= 0, fail-open default
  1) in `.opencode/temp/compact_budget.json` — parsed like the other config keys.
  The live file is maintainer-owned — the spec does NOT edit it; the fail-open
  default covers its absence.
- Gate (compact_memory.ts, current refusal at `count >= cap`, ~L777-787):
  - `count < cap` → dispatch normally (increment).
  - `count === cap` and `emergency_budget >= 1` and `args.emergency === true`
    → dispatch as EMERGENCY (increment to cap+1).
  - `count === cap` and `args.emergency` not true → refuse (existing text +
    one line: the emergency compaction is available via the `emergency` arg).
  - `count > cap` → refuse (fully exhausted — the item 11 directive state).
- Tool schema: add `emergency: tool.schema.boolean().optional()` — describe:
  "Consumes the once-per-session emergency compaction (allowed only when the
  normal budget is exhausted). Omit = a normal compaction."
- COMPACT log line: append ` emergency` when the emergency was consumed
  (re-pin the format in smoke/probe).
- Auto side (context_recovery.ts, live file — the T5 emergency hook): on its
  overflow fire, same count logic WITHOUT the arg requirement: `count < cap` →
  consume normally; `count === cap` and emergency available → consume the 1
  (its blind compaction, keep per its own config); `count > cap` → refuse /
  defer to the forced-new-session (item 11 spec). NOTE for the handover: the
  #93 event-hook port MUST carry this logic.

## Scope
1. `.opencode/plugin/compact_memory.ts` — config section (add the key + default),
   the budget gate + refusal texts, the tool args (add `emergency`), the success
   callbacks (emergency increment + the COMPACT line extension).
2. `.opencode/plugin/context_recovery.ts` — the overflow path per the design
   above (the worker reads the file — it is small; the #93 port is separate).
3. `.opencode/plugin/tests/compact_memory.smoke.mjs`,
   `.opencode/plugin/tests/context_recovery.smoke.mjs`,
   `.opencode/plugin/probes/handover_probe.mjs` — re-pin: new arg key in the
   schema pins; the gate SEQUENCE test (fixture model_budget {M: 2},
   emergency_budget 1: calls 1-2 ok; call 3 no-arg refused; call 3
   emergency:true ok + COMPACT line carries ` emergency`; call 4 emergency:true
   refused; state survives a fresh module instance); emergency_budget 0 → call
   3 refused; key absent → default 1 (fail-open).

## DO-NOT-touch
- `.opencode/temp/compact_budget.json`, `opencode.jsonc` (maintainer live).
- `auto_resume.ts` (the item 2+11 / item 3 specs own it).
- Prompt / knowledge files. `.opencode/maintainer/**`.

## Definition of done
- The gate-sequence smoke above passes; all existing pins green.
- Tool args = `[sessionID, keepMessages, message, emergency]` (post-item-1 —
  smoke pin).
- Gate green: probe full run, both smokes, pytest 459 passed + 1 warning,
  ruff F=0 (Standing baselines; re-run at start).
- One commit (the scoped files). Status → `LANDED` (hash recorded by the
  planner's follow-up — not by you). Summary → `handover_task_to_planner.md`,
  including the #93-carry-over note.

## Worker
`worker_Q3S_170K` (verify the live roster in opencode.jsonc before launch).
