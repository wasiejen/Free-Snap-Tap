# TASK — P02: disable the plugin's summary mirror (mirrorSummary removal + probe rebuild)

FIRST read `AGENTS.md`, `agents_repo.md`, and this file.

## Goal
Remove the `mirrorSummary` behavior from `.opencode/plugin/handover_v2.4.ts` (the
v2 summary mirror on `tool.execute.after` for the handover Task tools) and rebuild
the probe so it passes at the new check count.

## Why (root cause, already verified — do not re-derive)
After EVERY Task-tool run the plugin overwrites
`.opencode/handover_task_to_planner.md` with the worker's raw final message
(7 confirmed collisions across sessions; each costs the planner a
`git checkout --` recovery). The mirror's original purpose (avoid the
"write file + final message" doubling) was resolved on the worker-prompt side
(the worker no longer emits a final summary message, `52eb0aa`) — the mirror is
now pure damage. The worker writes its own summary file; the COMMITTED version
is canonical. Approved by the maintainer (proposals channel, P02, approved/).

## Scope (non-exhaustive)
- `.opencode/plugin/handover_v2.4.ts`:
  - delete `mirrorSummary()` (≈ lines 296-314) and its call site in
    `onToolAfter`;
  - KEEP the `tool.execute.before` spec pre-flight warning;
  - KEEP everything else (nudge ladder, chat.message ctx line, evidence lines,
    header block).
- `.opencode/plugin/probes/handover_probe.mjs`: remove/rebuild the check(s) that
  pin the mirror behavior so the probe suite is consistent with the new plugin.
- `.opencode/handover_task_to_planner.md`: your EXECUTIVE SUMMARY (what changed,
  new probe count, measured gate, commit hash, deviations, verbatim final gauge
  line).
- NO TODO.md entry exists for P02 (the proposals channel tracks it) — do not add
  one.
- Meta files (`agents_repo.md`, prompt files) are READ-ONLY — flag issues in the
  summary instead of editing.

## Definition of done
1. No `mirrorSummary` symbol remains in `handover_v2.4.ts`
   (`Select-String -Path .opencode/plugin/handover_v2.4.ts -Pattern mirrorSummary`
   = no hits); the `tool.execute.before` pre-flight warning is intact.
2. Probe rebuilt and green: `node .opencode/plugin/probes/handover_probe.mjs`
   → `PROBE handover: N/N PASS`, exit 0. N = 52 minus the retired mirror check(s)
   (baseline before your change is 52/52 — report the exact new N).
3. Gate green: `& .\.venv\Scripts\python.exe -m pytest -q` = 436 passed (1 known
   #10 warning); `& .\.venv\Scripts\ruff.exe check --select F .` = 0 findings.
4. The functional proof (that a Task-tool run no longer clobbers the summary
   file) is the PLANNER's job after your run — just make sure your own
   `handover_task_to_planner.md` commit is the last write to that file.
5. ONE commit: plugin + probe + summary file. NEVER stage `opencode.jsonc`
   (maintainer's live config — it will show modified in the tree, that is
   expected, leave it).
6. Final gauge line verbatim from `node .opencode\ctxgauge\peek.mjs` at the end
   of the summary.

## Protocol
- venv-only python/ruff (bare `python` = 3.14 without repo deps); pwsh for the
  gate, git-bash only for true unix pipes.
- Stop line: `REM ≤ 15k` or usage `≥ 85 %` → stop at a clean committed point,
  finish the summary. Writing the summary needs headroom — check the gauge
  between chunks.
- NEVER parallel-edit the same file (sequential edits only).
- If the probe reveals mirror checks beyond the ones you expected, report them
  in the summary — do not silently delete extra checks.
