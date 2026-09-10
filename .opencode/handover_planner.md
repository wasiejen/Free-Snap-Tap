# HANDOVER PLANNER — Phase 6 (post-T1; autonomous-loop era)

FIRST read AGENTS.md, agents_repo.md, TODO.md, this file.

## 2026-09-10 (autonomous session 1) — roster + explorer smoke test + #37 build LANDED
- Maintainer via Looprunner (autonomous mode; the prompt is re-injected on restarts;
  NAP edit permission FIXED — the old planner edit-deny on this file is gone).
- **(1) Roster DONE:** `agents_repo.md` `## Worker roster` rewritten to the live
  `opencode.jsonc` (DEFAULT = `worker_Q4_120K`; new `worker_explorer_jill_gemmaQ4_256K`
  with its edit allow-list + "check its work" note; raw `agent_*` variants; CLI launch
  mechanics — the planner function set has NO Task tool: `opencode run --agent <name> …`
  with the spec in `handover_task.md`).
- **(2) Explorer smoke test DONE + verified:** the explorer read the spec, appended the
  #38 TEST entry, committed ONLY `TODO.md` (`452de1a`), stopped in ~45 s. CAVEAT: its
  final self-gauge line was FABRICATED (no session step carries those numbers — format
  mimicry without running the command). #38 CLOSED with the caveat (TODO + records).
- **(4) #37 build LANDED + verified (planner-finished):** the gauge core now has the
  backend chain `node:sqlite` → `bun:sqlite` → spawn `sqlite3.exe` (per-process cache;
  readout byte-identical; never-throw; named-backend db-error previews; NO plugin
  change). Worker `worker_Q4_120K` built it; killed by the planner's 40-min CLI
  timeout at the final renumber step; the planner finished (duplicate check-ID
  fix + final verifications). Verified: probe 45/45, suite 434/434 (1 warning = the
  #10 13→1 profile), ruff F=0, system-node + system-bun(1.4.2) host proofs green,
  bun:sqlite API facts recorded (spec sketch was wrong: `{readonly,timeout}`, not
  readWrite). Detail in the summary file + TODO #37 status line.
- **(3) Open tasks reported** in the session closing message (the looprunner prints
  it — the maintainer is testing whether the runner injects them into the next
  prompt). If the next prompt does NOT carry them, the NEXT block below is the source.

## NEXT (resume order)
1. **#37 production evidence = MAINTAINER RESTART of the opencode instance**: a
   `ctx: SESSION=<own sid> CTX=…` line must reach the planner's own session with NO
   db-error line (check `plugin.log` only via the standing one-shot call-1 read if
   asked). After the evidence: close the #37 tail; the v1.3 log-profile rebaseline
   (call 1) could fold into that same restart read (maintainer call).
2. **T2 #33 nudge ladder** — next build, UNBLOCKED once the #37 restart evidence is
   in (the ladder depends on the production read). Approved design lives in TODO #33
   (rungs 50 % → 70 %/30k → 80 %/20k → 90 %/10k → final 5k; `promptAsync` synthetic;
   `kind:"nudge"` evidence only; readout must reach EVERY acting session). The probe
   is the standing 45-check base to extend.
3. **Standing autonomous goal:** launch the explorer (`worker_explorer_jill_gemmaQ4_256K`)
   for a REAL repo exploration run (beyond the smoke test) and CHECK its findings —
   new TODO IDs start at #39. Verify its output numbers (fabricated-gauge caveat, #38).
   Suggested scope for the first real run: FST core modules (`fst_manager.py`
   constraint/evaluation paths, `fst_keyboard.py` filter) + test-suite smell check.
4. #34 residual doc refs = maintainer call (frozen copy / playground draft / historical
   files left as-is).
5. Delegation sizing lesson (this session): the 27B Q4 worker needs >40 min for a
   build of this size — either raise the CLI timeout to ~90–120 min for big builds,
   or resume the worker session with `opencode run -s <session-id>` instead of
   re-delegating from scratch.

## Standing
- Suite 434/434, ruff F=0 (post-#37 baseline: the probe is now 45/45).
- `opencode.jsonc` shows uncommitted in every session BY DESIGN (maintainer iterates
  the agent config live) — never stage/commit it, never flag it as a discrepancy.
  NOTE: maintainer commit `86077bc` ("Looprunner and explorer agent creating and
  permission fixes") landed mid-session — the roster reflects the config as read
  before it; re-verify the roster against `opencode.jsonc` if the maintainer says it
  changed again.
- NO parsing of `.opencode/plugin.log` (call-1 one-shot only, default SKIP).
- v2.5 plugin + the #37 core fix both activate on the NEXT maintainer restart.
