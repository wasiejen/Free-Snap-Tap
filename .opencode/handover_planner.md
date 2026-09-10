# HANDOVER PLANNER — Phase 6 (post-T1; autonomous-loop era)

FIRST read AGENTS.md, agents_repo.md, TODO.md, this file.

## 2026-09-10 (autonomous session 1) — roster updated; explorer smoke test landed + verified; #37 build DELEGATED
- Maintainer via Looprunner (autonomous mode; the prompt is re-injected on restarts):
  NAP edit permission FIXED (the old `planner_Q4_120K` edit-deny on
  `.opencode/handover_planner.md` is gone — the #37 note resolves). Task list given:
  (1) roster, (2) explorer smoke test, (3) report open tasks to the looprunner,
  (4) start #37.
- **(1) DONE:** `agents_repo.md` `## Worker roster` rewritten to the live
  `opencode.jsonc` (DEFAULT = `worker_Q4_120K`; new `worker_explorer_jill_gemmaQ4_256K`
  with its edit allow-list + "check its work" note; raw `agent_*` no-prompt variants;
  the CLI launch mechanics — the planner function set has NO Task tool, workers are
  launched via `opencode run --agent <name> …` from the repo root with the spec in
  `handover_task.md`).
- **(2) DONE + planner-verified:** explorer smoke test — `worker_explorer_jill_gemmaQ4_256K`
  launched via the CLI, read the spec, appended the #38 TEST entry, committed ONLY
  `TODO.md` (`452de1a`), stopped in ~45 s. VERIFIED: commit clean (TODO.md only).
  CAVEAT: its final self-gauge line `CTX=14329 (11%) REM=241058` is FABRICATED — no
  finished step of its session carries that ctx (trajectory 8720…23596) and the
  numbers are internally inconsistent for any window (256k would give 5 % / REM
  241671): format mimicry without running the command. #38 CLOSED by the planner with
  the caveat (TODO.md + todo_records.md).
- **(4) IN FLIGHT:** #37 (gauge backend fallback chain `node:sqlite` → `bun:sqlite` →
  spawn `sqlite3.exe`) DELEGATED to `worker_Q4_120K`; spec = committed
  `.opencode/handover_task.md` (PLANNER RULING block: chain order, never-throw,
  readout forms byte-identical, per-process backend cache with setDbPath invalidation,
  probe must FORCE + verify each backend incl. real-exe spawn on the fixture, three
  host proofs incl. the system-bun proxy check + direct `bun:sqlite` API verification,
  `sqlite3.exe` stays in place — it is the last-resort backend again).
- **(3) DONE:** open tasks reported in the session closing message (the looprunner
  prints it — the maintainer is testing whether the runner injects them into the next
  prompt; if the next prompt does NOT carry them, the NAP's NEXT block is the source).

## NEXT (resume order)
1. If a session stops mid-delegation: `git log --oneline` — if there is NO new
   #37 commit, the worker left nothing (its stop-line commits land as a single commit
   per the spec) — re-delegate from the committed spec in `handover_task.md`.
2. Verify the #37 worker commit per its DoD: probe `PROBE handover: N/N PASS`
   (N ≥ 33 + backend checks, command in the probe's own header), `peek.mjs` live line,
   suite 434/434, ruff F=0, exactly one commit, summary file
   (`.opencode/handover_task_to_planner.md`) carries the three host proofs + bun:sqlite
   API facts; TODO #37 status line updated, entry NOT closed.
3. #37 PRODUCTION evidence = maintainer restart: a `ctx: SESSION=<own sid> CTX=…` line
   must reach the planner's own session with NO db-error line (then the #37 tail may
   close; the v1.3 log-profile rebaseline (call 1) could fold into that restart's
   one-shot log read — maintainer call).
4. **T2 #33 nudge ladder** — unblocks once #37 works in production (the ladder depends
   on the read); approved design lives in TODO #33 (rungs 50 % → 70 %/30k → 80 %/20k →
   90 %/10k → final 5k; `promptAsync` synthetic; `kind:"nudge"` evidence only; readout
   must reach EVERY acting session).
5. #34 residual doc refs = maintainer call (frozen copy / playground draft / historical
   files left as-is; agents_repo.md lines are done).
6. Standing autonomous goal: launch the explorer for REAL exploration runs (beyond the
   smoke test) and check its findings — new TODO IDs start at #39. Verify explorer
   output numbers before trusting (fabricated-gauge-line caveat, #38).

## Standing
- Suite 434/434, ruff F=0 (baseline `313e83b`; the #37 build must keep it).
- `opencode.jsonc` shows uncommitted in every session BY DESIGN (maintainer iterates
  the agent config live, commits only after testing) — never stage/commit it, never
  flag it as a discrepancy.
- NO parsing of `.opencode/plugin.log` (call-1 one-shot only, default SKIP).
- v2.5 plugin is COMMITTED (`313e83b`); until the next maintainer restart the OLD
  plugin code runs in already-loaded sessions; the #37 fix lands in the shared core,
  so NO plugin change is expected — it activates on the restart together with v2.5.
