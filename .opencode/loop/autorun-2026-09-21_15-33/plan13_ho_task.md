# TASK SPEC — R4: the intercept.log mining scriptlet (staged spec, gate now satisfied)

Worker: `worker_Q3S_170K`. Branch: stay on the current checkout (`opencode_test`).

## Goal
Build the staged R4 scriptlet per its own design source
`.opencode/agent/research/fuzzy-numword/spec_R4_log_mining.md` — READ THAT FILE
FIRST (it is the full design: the 6 output sections, the home conventions, the
DoD). One committed
`node .opencode/agent/scripts/log/summarize_intercept.cjs [logfile]`
(default `.opencode/temp/intercept.log`) that turns the log into a readable
evidence summary + a committed fixture test + one pinned check + the
INVENTORY/README entries. The script must be GENERIC — the log keeps growing,
never hardcode counts or session ids.

## Verified context (planner-measured 2026-09-23, HEAD d6ddf37 — do not re-derive)
- The R4 GATE is SATISFIED: `.opencode/temp/intercept.log` = 3076 lines / 139
  distinct session ids.
- Log line shape (verify with a BOUNDED read: `head -20` of the log, do not
  read the whole file): `date_time | session_id | model | tool |
  args-json | <free-form evidence fields...>` — the final field(s) carry the
  verdict (e.g. `no-candidate`, `out-of-sandbox`, `pair-resolved`).
- Home conventions: `.opencode/agent/scripts/log/README.md` (script home + the
  fixture-under-tests convention) and `.opencode/agent/scripts/INVENTORY.md`
  (one entry per script — copy an existing entry's format).
- Standard gate (must stay green): run per
  `.opencode/agent/prompts/repo/repo_commands.md` — probe 241/241, all
  `.opencode/plugin/tests/` smokes, pytest 459 passed + 1 warning, ruff F=0.

## DoD
1. The script runs on the real log without error and prints the 6 sections from
   the R4 spec (machine-stable lines).
2. One committed fixture log (a few lines) under the log/ tests home + the
   fixture test green.
3. Your ONE pinned check (the fixture test, or a probe section if you judge the
   probe the right home — pick one, pin it, explain the choice in the
   handover) + the standard gate green.
4. `INVENTORY.md` entry + the `log/README.md` pointer.
5. Status: record `LANDED` in your handover (the commit hash goes in the
   planner's follow-up bookkeeping — a commit never carries its own hash).

## DO-NOT-touch
- `.opencode/agent/prompts/**` (no edit access) and the R4 spec file itself
  (its stale `Worker: worker_Q4_140K` line is corrected by the planner — do not
  edit it).
- `.opencode/maintainer/**` (his live files).
- `.opencode/plugin/**` — this task touches NO plugin code.
- Uncommitted maintainer changes on disk (`context_recovery.ts` move,
  `ideas.md`, `my_todos.md`) — never stage them; stage only your named paths,
  never `git add -A`.

## Commit routine
One commit: the script + fixture + INVENTORY/README entries +
`handover_task_to_planner.md`. Commit green, never red. Your handover:
executive summary, measured verification (the script run on the real log +
the fixture test + gate output), commit hash, TODO entries (none expected —
the planner updates #67), what was deliberately not done.
