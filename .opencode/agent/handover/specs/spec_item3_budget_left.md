# TASK SPEC — "N compactions left" in the ctx readout (change-list item 3)

Origin: consolidated change list item 3 + his --comment #2: "will be added ad
indirect information as additon to the ctx_gauge, flag it distinctly as e.g.
1 compaction left (budget threshold is unknown to the model - does not need
the info)".

## Verified facts (at spec time)
- Budget store: `.opencode/temp/compact_budget.json` — v2: per-session
  `{count, updated, model}` + top-level `model_budget` map (`default` + bare
  model ids → caps). After the item 10 spec it also carries `emergency_budget`.
- `auto_resume.ts` already reads that file per nudge-eligible call
  (~L227/L480) to build the UNIT-2 passive ctx-line suffix — the injected
  `ctx: SESSION=… CTX=… (p%) REM=…` line the agent actually sees.
- The self-gauge (`peek.mjs` / `gauge.mjs` in `.opencode/plugin/scripts/`)
  prints the same readout from the DB (repo_commands.md).

## Scope
1. **Primary home — the injected ctx: line (auto_resume.ts unit-2 nudge):**
   append a distinct suffix, computed per call from the budget store:
   - remaining N = `max(0, cap - count)` for the session's model (cap from
     `model_budget[session model]`, else `model_budget.default`, else 1)
     PLUS 1 if the emergency compaction is still available
     (`count === cap` and the effective `emergency_budget >= 1` — read the
     key LENIENTLY; absent → default 1, matching compact_memory's fail-open
     DEFAULT_EMERGENCY_BUDGET — so the readout matches the ACTUAL gate after
     the item 10 spec: at count === cap the emergency IS still available).
   - Format (pinned): ` | 3 compactions left` / ` | 1 compaction left` /
     ` | 0 compactions left` (singular at 1; the ` | ` separator flags it as a
     distinct field). File absent / unparseable → no suffix (fail-open).
     Pin also: count === cap + key ABSENT → 1 remaining (the default-1
     emergency is available), NOT 0.
2. **Secondary home — the self-gauge readout (peek.mjs/gauge.mjs):** the SAME
   suffix on the `CTX=… REM=…` line (worker identifies which script prints the
   readout; same fail-open rule).
3. Pins: `.opencode/plugin/tests/auto_resume.smoke.mjs` (3 states + fail-open);
   the probe/gauge pins for the readout format re-pinned where they exist
   (`handover_probe.mjs` carries gauge/ctx-line pins — worker verifies).

## DO-NOT-touch
- The budget store file + `opencode.jsonc` (maintainer live); the compaction
  plugins' logic (read-only here); prompt/knowledge files;
  `.opencode/maintainer/**`.

## Definition of done
- Smoke pins green for the 3 states + fail-open; existing pins green.
- Gate green: probe full run, smokes, pytest 459 passed + 1 warning,
  ruff F=0.
- One commit. Status → `LANDED` (hash recorded by the planner's follow-up).
  Summary → `handover_task_to_planner.md`.

## Worker
`worker_Q3S_170K` (verify the live roster in opencode.jsonc before launch).
