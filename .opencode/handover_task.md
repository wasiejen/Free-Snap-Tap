# TASK — Phase 6 / Tier 1 — v2.2.1: persist the offline probe harness + stale v2 comments

FIRST read `AGENTS.md`, `.opencode/handover_task_to_planner.md` (v2.2 EXECUTIVE
SUMMARY — the offline Electron probe recipe + the #19 comment finding), then
`.opencode/plugin/handover.ts` (the current, final code).

## Why (maintainer feedback — the context economy is part of the task)
The previous two offline runs rebuilt the probe from scratch each time, and one worker
burned ≈10 minutes and a large context slice hunting for the Electron/`node.exe`
executable before the probe even started. Decision: the probe is now PERMANENT repo
tooling — committed, re-run, never rebuilt (except when the plugin's hook surface
changes).

## A. Persistent probe harness — `.opencode/plugin/probes/handover_probe.mjs`
Build it ONCE this cycle — from your v2.2-cycle probe recipe (it is summarized in
`.opencode/handover_task_to_planner.md`; scratch is deleted and git holds none — so:
full S1–S3 byte-for-byte suite + S4 four transform shapes + S5 line hygiene, 23/23,
temp sandbox root, `before`/`after` modes, zero co-appended live lines, real
handover files untouched). Requirements for the persisted file:
1. Header comment = the complete recipe: the EXACT run command, the pinned opencode
   Electron executable path (`%LOCALAPPDATA%\Programs\@opencode-aidesktop\OpenCode.exe`
   — DO NOT search for it; that hunt cost a prior cycle ≈10 min; if the path is ever
   wrong, report it as a discrepancy, do not re-hunt), `ELECTRON_RUN_AS_NODE=1`,
   Node 24 via the Electron binary, and the expected output summary.
2. One file, self-contained, re-runnable from the repo root: `node --experimental-...`
   variants are NOT acceptable — only the pinned Electron-Node recipe.
3. After building: run it against the CURRENT code → record 23/23 as the BEFORE
   baseline in the summary.

## B. Stale v2 comments (TODO #19) — COMMENT-ONLY edit in `handover.ts`
Update EXACTLY the two stale v2 comment passages (header v2 bullet: "Planner-only,
decided call, never second-guess: inject-for-all would be wrong … See TODO.md #14." and
the comment above `onSystemTransform` with the same "planner-only / never inject-for-all"
framing) to say: injection now runs on EVERY transform (maintainer "both" call
2026-09-08, TODO.md #18); keep the evidence-logging sentence and the `#14` pointer in
both places. No executable line may change. `git diff` must show comments only — paste
the stat into the summary.

## Verification order (strict — the persisted probe is also B's evidence)
1. A: harness built + committed-path; run on current code → **23/23** (baseline).
2. B: comment edit.
3. Re-run the SAME persisted harness → **23/23** (comments must not change behavior).
4. `& .\.venv\Scripts\python.exe -m pytest -q` → **434 passed**;
   `& .\.venv\Scripts\ruff.exe check --select F .` → **6 findings**.

## Summary + commit (normal flow — summary → `.opencode/handover_task_to_planner.md`)
- TODO.md: append **#20** (next free number; append-only):
  "20. Persistent offline probe + exact executable pinned (2026-09-08)

  Offline Electron probes used to be scratch: rebuild from memory + re-discovering the
  Electron executable cost a full cycle ≈10 min + a large context slice. The harness is
  now permanent at `.opencode/plugin/probes/handover_probe.mjs` with the exact run
  command + pinned executable in its header — future plugin task specs run it, never
  rebuild it (exception: plugin hook-surface change). Also resolves #19 (stale v2
  comments rewritten per the v2.2 'both' decision; comment-only edit, 23/23 both sides)."
- Commit per AGENTS.md: `.opencode/plugin/handover.ts`,
  `.opencode/plugin/probes/handover_probe.mjs`, `.opencode/handover_task.md`,
  `.opencode/handover_task_to_planner.md`, `TODO.md`. NOT: NAP, `opencode.jsonc`,
  `AGENTS.md`, playground, `plugin.log`. Subject one-liner:
  `Persist handover plugin probe harness and fix stale v2 comments (#19/#20)`.
- Do NOT restart/reconfigure opencode. Do NOT add or rename hook entries or behavior
  — the plugin code stays v2.2 final + comment-only edits.
