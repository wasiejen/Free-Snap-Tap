# plan21 summary (autorun-2026-09-21_15-33, iter 21, planner-21, ses_f22c8986affegfHMJhzUxDFDkp)

Unit-4 restart branch after planner-20's `action: restart`. Two units
landed + one incident handled + one proposal filed.

## S4 LANDED (bt-v2 wave COMPLETE)
- Worker-21 `worker_Q3S_245K_slow` (ses_f22c5c7fdffeNsWFzlfdsFterN),
  code `37c2479` + bookkeeping `a666d54`, planner-verified (own spot
  re-run 123/123 + 64/64).
- MAP mode + `last_write` auto-buffer (silent by design) + Part I
  description rework + schema enum 11 modes + 11 smoke pins; the
  sandbox mode-list pin re-pin (8→11) RATIFIED.
- Probe 316/316 unchanged (per spec, no new probe checks); then
  planner-inline: probe check 108's mode-enum pin extended to the 11
  values (`ea0611f`, probe re-run 316/316) — cures the worker's
  todo_inbox entry.

## R3 LANDED (takeover)
- First R3 run (ses_f22a9f87) hit the context wall (250252 > 245248,
  in-flight tool-output rejection) with all four channels implemented
  as an uncommitted, never-gate-verified 495-line diff.
- Fresh takeover per the plan6 worker-8 precedent (task_id resume NOT
  viable — the incident below left that session on
  `agent=planner_Q3S_170K` + the 170K model, verified in DB).
- Worker-21 takeover (ses_f2241f704ffeRVZb6oMIi5epGP): staged diff
  committed `3ec1c5c`; probe S31 = 21 pins (317–337) + ONE real staged-
  diff bug found by the first gate run and fixed in `44c50a2`
  (`LOCATOR_MAX_FILE_CHARS` used but never imported — ReferenceError
  swallowed into intercept-error lines); 9 per-channel smoke checks
  `20d5a48` (68→77). Gate: probe 337/337, io smoke 77/77, pytest 459+1w,
  ruff F=0 — planner spot re-run 77/77.

## 14-26 incident (context_recovery)
- Context_recovery compacted the dead R3 worker AND independently
  resumed it (two active sessions, single slot) with its agent/model
  reset to the DEFAULT (`planner_Q3S_170K` / Q3S-170K) — full-prefill
  ping-pong; the maintainer stopped it via restart and deactivated
  context_recovery (autoCompact 98% of 240k armed).
- Proposal filed at his request (no sugarcoating):
  `.opencode/proposals/2026-09-26_compaction-unification.md` —
  Part A shared `compaction_core.ts` (single behavior: config/budget/
  keepTokens/summarizer-pair carrying the session's own
  providerID+modelID/summarize/COMPACT line; both plugins thin
  wrappers), Part B context_recovery compacts ONLY (no resume —
  unit-4 owns resuming), Part C probe equivalence pin.

## Baselines (re-verified, post-R3)
probe **337/337**; smokes all green (io **77/77**, bt **123/123 +
64/64**, compact 74/74, context_recovery 17/17, auto_resume 139/139,
submit 20/20); pytest **459+1w**; ruff **F=0**.

## Queue (next iteration)
1. NEW-HIRE + HELD-OUT block_transfer tests (PLANNER-SIDE) — BLOCKED
   on the maintainer's process restart (the live process still carries
   the 7 pre-S2 modes; same restart as the #102 live acceptance).
2. loop_log-v2 (approved, flagged stale 14+ days; his priority.md note
   says not yet implemented).
3. Live-acceptance queue (maintainer): #102 `/tmp` probe, #99 fork
   test, #98 compact→idle cycle, R3 channels, the compaction-
   unification proposal (its live acceptance = the re-enable).
4. OPEN (maintainer, non-blocking): WRITE-on-absent-file semantic
   (S3 open question).

## Friction
- `todo_inbox.md` path is unnamed in the prompts (repo root, not
  `.opencode/agent/`) — logged via submit.
