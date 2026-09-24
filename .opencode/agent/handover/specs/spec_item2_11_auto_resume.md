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
