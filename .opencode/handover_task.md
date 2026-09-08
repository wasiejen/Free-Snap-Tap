# TASK — Phase 6 / Tier 1 — v2.2 worker-side live proof (the "both" call)

FIRST read `AGENTS.md` (commands only are relevant). Then check for `opencode/plugin/plugin.log` ONLY after Step 3 — it is a measurement input, not code.

## Why
v2.2 (`.opencode/plugin/handover.ts`, `onSystemTransform`) injects one
`ctx: CTX=…` line into the system prompt on EVERY transform — planner AND worker
sessions (maintainer "both" call, TODO #18). The PLANNER side is proven (log shows 18+
LIVE transform payloads of the exact shape the offline probe validated). This task
proves the WORKER side: does this session's system prompt actually carry the line?

## Steps (strict order — this is a measurement task, NOT an edit task)

1. **First action, before any other work:** search YOUR system prompt for an item that
   begins with `ctx: CTX=`. In the summary, under the heading `## ctx: line (verbatim)`,
   quote it VERBATIM (exact line, no paraphrase). If it occurs more than once, quote each
   occurrence and give the count. If there is NO such item at all, write exactly:
   `ctx: line NOT FOUND`
   A NOT FOUND result is a valid, reportable outcome — do NOT hunt around or "try to fix" it.

2. Run the two baseline commands (AGENTS.md §Run / test) and report the actual numbers:
   - `& .\.venv\Scripts\python.exe -m pytest -q`  → expect **434 passed** (13 warnings baseline)
   - `& .\.venv\Scripts\ruff.exe check --select F .`  → expect **6 findings**

3. Read `.opencode/plugin/plugin.log` (it is a gitignored plain log). Find ALL lines whose
   JSON contains `"kind":"transform"` and a `"session":"ses_..."` whose session id is the
   NEWEST one present (created latest; expect that newest transform line is one of yours —
   this session was created after all earlier ones). Report: the newest transform line's
   `ts`, its `session` id, and how many transform lines carry that same session id. Do NOT
   modify the log.

4. Run `& .\.venv\Scripts\python.exe .opencode\ctxgauge\peek.py` and note the output — it is
   your final self-context estimate; end the summary with: `Context at stop: X% used / N
   tokens remaining`.

## Summary + commit (standard two-party flow)
- Write the EXECUTIVE SUMMARY to `.opencode/handover_task_to_planner.md` (overwrite — the
  latest summary wins) AND make it your final chat message (the plugin mirror owns the
  file post-run; a post-commit overwrite of it is expected and must NOT be "fixed" by you).
- **No FST code, no TODO.md edit** unless a discrepancy appears — in which case append the
  new numbered TODO.md entry (next free number, TODO.md style) and include TODO.md in the
  commit.
- Commit: `git add` ONLY `.opencode/handover_task.md` + `.opencode/handover_task_to_planner.md`
  (+ `TODO.md` only if you appended). Subject (one line, imperative):
  `v2.2 worker-side proof: worker quotes its ctx line`.

## Definition of pass
- Summary contains `## ctx: line (verbatim)` with the quoted line(s) OR the exact NOT FOUND
  string.
- Baseline numbers reported (pass/fail vs 434/6).
- Newest-transform report present (ts + session id + count).
- Exactly one commit, working tree clean afterwards (the later mirror overwrite is the
  planner's to book, not yours).
