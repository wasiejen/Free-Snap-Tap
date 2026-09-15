# 2026-09-15 — AGENTS.md additions (his #5 knowledge rule + the new stop/compaction protocol)

Status: AWAITING APPROVAL — AGENTS.md is YOUR file (edit-a-copy rule), so this
is the exact wording to paste. Both items are already LIVE in the planner and
worker prompts (commits this iteration); this makes AGENTS.md agree with them
so the auto-loaded protocol does not contradict the prompts.

## Item 1 — stop line + worker dump protocol (§Context budget, your file)

Your ruling 2026-09-15 (priority.md, top item): "stop/compaction protokol for
now 95% — this means explicitly around 90% gauge with lagging value". The
current §Context budget says "Stop line: stop starting new work when
`REM ≤ 15k` or usage ≥ 85%". Suggested replacement of that line (rest stays):

- **Stop line:** stop starting new work when the gauge readout reaches
  ≈90 % (≈95 % of the real wall, which sits below the limit — the gauge
  lags ~2 tool calls, so the readout is a lower bound). `REM ≤ 15k` stays
  as the hard tail (the handover still needs ~10–15k to write).

And the new worker protocol (suggested addition after the stop line):

- **Worker near the limit:** the planner ORDERS an early stop (safe commit
  point), DUMPS the worker session pre-compaction
  (`node .opencode/agent/scripts/dump_session.cjs <sid>`), then cross-compacts
  it and resumes it via `task_id`. A pre-compaction dump keeps the session
  corpus complete (the no-overwrite dump naming is the TODO #55 build).

## Item 2 — knowledge rule (§"agent knowledge" or a new short section)

Your #5 (2026-09-15): general knowledge (actionable items, code, facts that
helped solve a problem) is sorted into `.opencode/agent/knowledge/`; when
searching for a solution, grep that folder first (output-limited); new
knowledge goes to `knowledge_inbox.md` (append-only inbox, the planner cures
it into the area files) or the area file directly when the placement is
obvious. Suggested wording (one short section):

- **Knowledge base (`.opencode/agent/knowledge/`):** verified, actionable
  findings (NOT protocol — protocol stays in this file + the role prompts).
  When searching for a solution, grep it FIRST (output-limited:
  `grep -n -i "<kw>" .opencode/agent/knowledge/ | head -30`). When you gain
  verified, actionable knowledge, append it: `knowledge_inbox.md` (append-
  only) when the area is unclear, the area file directly when it is obvious
  (format in the folder README). The planner cures the inbox into the area
  files.

## Recommendation (one)
Paste both (Item 1 first — the prompts already override AGENTS.md's stop line
until it lands; Item 2 codifies what the prompts already do). Then the
prompts' "overrides AGENTS.md" notes can be retired in a later cleanup.
