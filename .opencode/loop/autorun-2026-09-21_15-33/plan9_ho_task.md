# TASK: autorun-identifiable names for plugin-spawned sessions (his # 2026-09-23_04-34)

**Worker:** worker_Q3S_170K (worker-15). **Branch:** stay on the current
checkout (verified `opencode_test` — do not switch).

## Goal
Sessions the auto_resume plugin SPAWNS (the file-trigger spawn and the
Unit-4 restart branch) must carry an identifiable name: the current loop
folder name + the loop's session number, e.g.
`autorun-2026-09-21_15-33 planner-9`. Cosmetic — makes the sessions that
belong to a loop autorun findable later (the maintainer's request in
priority.md # 2026-09-23_04-34; today the name is auto-resolved by
opencode from context).

## Definition of done
1. Identifier: `<loop-folder> planner-<N>` where `<N>` = the largest
   `planner-<N>` found in the current loop folder's `loop_log.md`, + 1
   (the same rule the planner uses to derive its iteration number).
   - Loop folder: scan `.opencode/loop/` for the folder holding a
     `loop_log.md` (mirror the detection in `.opencode/tools/loop_log.ts`
     ~L75: readdirSync, pick the current one; the plugin's directory
     input is the project dir).
   - If `.opencode/loop/` has no folder or the log has no `planner-<N>`
     line → no identifier (spawn exactly as today).
2. Delivery of the identifier — BOUNDED verification first (ONE question,
   then build): does `session.create()` accept a `title`? The plugin
   imports `@opencode-ai/sdk` (`auto_resume.ts` L164), resolved in the
   HOST process — the repo has NO node_modules; host install is the npm
   global at `C:\Users\Wasiejen\AppData\Roaming\npm\` (locate the SDK type
   defs there, or grep the vendored source study in
   `.opencode/agent/knowledge/opencode-plugins/`). ONE answer:
   - title supported → pass it in the `create()` call on BOTH spawn
     paths (they share the helper);
   - not supported → the queued launch prompt's FIRST LINE on both paths
     is the identifier (opencode derives the session title from the
     first user message).
3. Smoke (`tests/auto_resume.smoke.mjs`, spy-client harness — the UNIT 3
   section ~L577 re-invokes the factory with a spying client;
   `createCalls` / `spawnCalls` record the args): create a deterministic
   loop folder in the smoke's temp project (e.g. `autorun-test_0-0` with
   a `loop_log.md` carrying a `-->START planner-7` line), trigger a
   spawn, and assert the identifier lands where the chosen mechanism
   puts it (the create title, or the first line of
   `spawnCalls[0].parts[0].text`). At least ONE new check; keep every
   existing check (102/102 before → 102+n after, no removals).
4. Gates green: full smoke suite, probe 241/241, pytest 459 passed +
   1 warning (the known #10 coroutine warning), ruff F=0. Baselines as
   of commit 725ab3a.
5. TODO.md: APPEND entry #89 (next free ID — #88 is the highest
   existing) with the contract fields; status per the commit-hash rule:
   → LANDED (the hash is recorded in the PLANNER's bookkeeping commit,
   never in this one).
6. Handover summary to `.opencode/agent/handover/handover_task_to_planner.md`
   (executive summary, measured verification, TODO entries, what was
   deliberately not done). Commit: code + smoke + TODO.md + handover
   (named paths only — see below).

## DO-NOT-touch
- `.opencode/maintainer/**` (priority.md, ideas.md, my_todos.md — his
  live files) and `opencode.jsonc` (read ok, edit/stage NO). The working
  tree also carries his uncommitted files (knowledge_inbox.md, ideas.md,
  opencode.jsonc, untracked archive dumps) — NEVER stage those.
- TODO.md header numbering note + the closed entries (a separate
  curation unit runs right after you — your commit is APPEND-ONLY there).
- The #88 tick mechanism (the `tickMs` factory option + `tickWait()`) —
  do not restructure the smoke timing.
- The Unit-2 ctx-line-suffix code (#85 part 3, ded7245) — the spawn
  paths only.
- LIVE acceptance is NOT yours: the live plugin activates on the next
  host restart; the planner verifies the first named spawn.

## Spawn area (where to work)
`.opencode/plugin/auto_resume.ts` — the `sess.create()` call ~L585
(UNIT 3 helper) + the Unit-4 restart branch (the comment at L146-148,
the `route= restart spawn` line; the restart prompt text is built near
the spawn helper). The helper is shared by both spawn paths — implement
the identifier once in it.

## Notes
- Keep writes chunked (≤ ~8KB per write call) — the long-write host flake
  (TODO #74) + the worker limit-death precedent (the previous worker on
  this plugin died mid smoke-write at the output cap).
- If the SDK answer is unclear after the bounded check: build the
  prompt-prefix fallback (it always works) and note the open question in
  the handover.
