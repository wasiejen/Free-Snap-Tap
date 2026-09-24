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
- Auto side (DESIGN ONLY — the file is DEACTIVATED: `.opencode/plugin/
  deactivated/context_recovery.ts`; the #93 event-hook port writes the live
  file): on its overflow fire, same count logic WITHOUT the arg requirement:
  `count < cap` → consume normally; `count === cap` and emergency available →
  consume the 1 (its blind compaction, keep per its own config); `count > cap`
  → refuse / defer to the forced-new-session (item 11 spec). NOTE for the
  handover: the #93 event-hook port MUST carry this logic.

## Scope
1. `.opencode/plugin/compact_memory.ts` — config section (add the key + default),
   the budget gate + refusal texts, the tool args (add `emergency`), the success
   callbacks (emergency increment + the COMPACT line extension).
2. `.opencode/plugin/tests/compact_memory.smoke.mjs` +
   `.opencode/plugin/probes/handover_probe.mjs` — re-pin (the ACTIVE-plugin
   sections only — S13/S25 area; S10/S11 pin frozen artifacts and stay
   byte-identical, per the spec-01 carve-out): new arg key in the schema pins;
   the gate SEQUENCE test (fixture model_budget {M: 2}, emergency_budget 1:
   calls 1-2 ok; call 3 no-arg refused; call 3 emergency:true ok + COMPACT line
   carries ` emergency`; call 4 emergency:true refused; state survives a fresh
   module instance); emergency_budget 0 → call 3 refused; key absent →
   default 1 (fail-open).
3. DO-NOT-touch (verified 2026-09-24): `.opencode/plugin/deactivated/
   context_recovery.ts` (DEACTIVATED — the auto-side emergency-1 logic above
   lands with the #93 port; its `tests/context_recovery.smoke.mjs` pins are
   FROZEN) and `.opencode/plugin/deactivated/compact_memory_v1.ts`.

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
# TASK SPEC — auto_resume: message relay + forced-new-session directive (items 2 + 11)

Origin: consolidated change list items 2 + 11 (`maintainer/inbox_planner/
compaction_feedback_by_planner.md`). His design: item 2 — "the message will be
relayed as the FIRST message on resume with additional short instructions on
post compaction protokol"; item 11 — "the next run into the context limit (when
both budgeds are exhausted) will trigger a new session with a new planner and a
directive to scan the dump of the last session to gain all relevant knowledge
to make a clean handover/commit if not present".

## Verified facts (at spec time — planner's claims)
- `compact_memory.ts` `queueMessage` (call sites ~L844/L874; the implementation
  is in the ~L600-690 area — worker locates by grep) accepts the `message` arg;
  the promptAsync DELIVERY part is disabled by the maintainer's temp fix
  0f192e5 (existing pins ride that behavior).
- `auto_resume.ts`: reads `.opencode/temp/compact_budget.json` per
  nudge-eligible call (~L227/L480); unit 2 = the passive ctx-line suffix
  (#85 part 3); the restart branch builds `restartText` (own-line `<|autonom|>`
  toggle, #90); unit 4 = the recovery-continue post-compaction resume path
  (verified working, plan11).
- The post-compaction protocol: `.opencode/agent/prompts/
  agent_readme_post_compaction.md` (its steps are the "short instructions").
- Post-compaction planner RESUME = the auto-resume plugin (the #90/#91 family
  — the restart spawn carries the real planner agent; #91: the compaction
  summary is skipped in spawn identity/routing). The `action:` line is read
  by the plugin even in Direct sessions, where ACTING on it is deactivated
  (maintainer confirmation 2026-09-24).

## Scope
1. `.opencode/plugin/auto_resume.ts` (the worker reads the file first — bounded:
   the restart branch, the unit-4 recovery section, any queued-message
   consumer):
   a. **Item 2 — message relay:** on resume after a compaction (the unit-4
      recovery path AND any self-compact resume), the queued message is
      delivered as the FIRST message of the resumed session, followed by a
      short post-compaction addendum (one line, shape: "post-compaction:
      re-read your head files per .opencode/agent/prompts/
      agent_readme_post_compaction.md and CONTINUE — never re-plan from
      scratch"). This replaces the temp fix's disabled delivery — the message
      stays STORED at queue time (no promptAsync at queue time) and is
      delivered at RESUME time by this relay.
   b. **Item 11 — forced-new-session directive:** when the restart branch is
      triggered from a fully-exhausted budget state (the budget store shows
      count > cap for the last planner session — the post-item-10 exhaustion
      state; before item 10 lands, treat count >= cap as exhausted),
      `restartText` carries the directive (shape: "compaction budget exhausted
      — scan the dump of <last session id> to gain all relevant knowledge
      (the auto-dump corpus; `dump_session.cjs` in
      .opencode/agent/scripts/db/ for on-demand dumps); make a clean
      handover/commit if not present; then continue per the NAP"). The
      session id comes from the budget store / ctx.log (worker's call which
      source — pin one).
      NOTE: the DETECTION of the limit-run itself is the #93 context_recovery
      port — this spec covers the directive CONSTRUCTION + the condition check.
2. `.opencode/plugin/tests/auto_resume.smoke.mjs` — new pins: relayed message is
   FIRST + addendum present; exhaustion → restartText carries the directive;
   the temp-fix pins (0f192e5 behavior) updated/replaced as the relay lands.
3. NARROW EXCEPTION: if `queueMessage` does not yet persist the message where
   a resume-side reader can find it, add the minimal persistence in
   `compact_memory.ts` (e.g. one temp file per session under
   `.opencode/temp/`). This is the ONLY allowed edit outside auto_resume.ts —
   note it in the handover.

## DO-NOT-touch
- `context_recovery.ts` (the #93 port owns it), the prompt/knowledge files,
  `opencode.jsonc`, `.opencode/temp/compact_budget.json`,
  `.opencode/maintainer/**`.

## Definition of done
- New pins green + ALL existing auto_resume pins green (102/102 baseline,
  post-#85 part 3).
- Gate green: probe full run, smokes, pytest 459 passed + 1 warning, ruff F=0.
- One commit. Status → `LANDED` (hash recorded by the planner's follow-up).
  Summary → `handover_task_to_planner.md` (name the narrow exception if used,
  and what the #93 port must carry: the limit-run detection + the directive
  hand-off).

## Worker
`worker_Q3S_170K` (verify the live roster in opencode.jsonc before launch).
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