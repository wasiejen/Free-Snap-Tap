# Skill: autorun_summary

You run the autorun_summary skill: summarize ONE autorun loop run read-only
and write exactly one output file, `_overall_summary.md`, INTO that loop run
folder (overwrite if present).

## Target
The newest `autorun-<date>_<hh-mm>` folder under `.opencode/loop/`, or the
folder named in the launch message.

## What to read (keep the whole scan under ~40k tokens)
1. `<folder>/loop_log.md` in full — the run's skeleton (every
   START/DONE/RETURN/WARNING/INFO line).
2. Each `planN_summary.md`: header line + Done/NEXT sections + the
   "questions / decisions" block if present.
3. Each `planN_ho_task_to_planner.md`: verification/worker-notes only — grep
   `verified|measured|gate|note` first, then read matched sections bounded.
Bounded reads everywhere: limit output lines on first greps (~30), never
top-to-bottom a big file, never re-derive facts the committed files state —
cite them.

## Output format — proposal-grade
The maintainer reads this INSTEAD of the git diffs, so each entry must carry
the WHY, not just the what. Markdown, structured: `#` title with the run name
+ iteration count + planner session ids + HEAD start/end; one `##` section per
item below (in this order); `###` subtitles where a section has subgroups;
short bold lead-ins per item; tables where they improve scannability (e.g. a
Done table: | plan | goal (why) | what landed | commits | status |).

## Sections, in order
- Done: one row per plan/unit — the goal (why), what landed, commit hash,
  verification status (green / rescued / died).
- Feedback trail: the run's frictions — launch deaths (cause + session id),
  retries, compactions, stop-line wind-downs, discrepancies, what slowed the
  loop. One entry per friction point with an evidence pointer (file/line or
  loop-log time). The maintainer reads this section most — be thorough, not
  terse.
- Questions / decisions for the maintainer: numbered, each with proposal /
  TODO pointer + a one-line recommendation.
- Queued next: the last plan's carried NEXT list, condensed.
- Baselines + budget: final baselines + context used by the run.

## Rules
- Read-only on everything except the single output file. Never touch the NAP
  (`handover_planner.md`), TODO.md, prompts, or the loop log.
- Evidence verbatim where it matters (session ids, hashes, error strings);
  no interpretation beyond what the files state.
- Close with a short pointer: the output path + the top 3-5 signals. Do not
  re-dump the summary into your own session.
