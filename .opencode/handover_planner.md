# HANDOVER PLANNER — Phase 6 (post-T1; autonomous-loop era)

FIRST read AGENTS.md, agents_repo.md, TODO.md, this file.

## 2026-09-10 (autonomous session 2) — Looprunner-prompt optimization (maintainer task, light)
- Maintainer task (via Looprunner): optimize `.opencode/prompt_looprunner.md` for
  looprunner↔planner coordination — proposal only, no repo code work this round.
- **Deliverable LANDED:** `.opencode/looprunner_prompt_proposal_planner.md` (new file,
  committed) — consolidated proposal with a ready-to-paste replacement prompt,
  point-by-point verdicts on the Looprunner's 8-point proposal + the gemini proposal,
  full typo list, maintainer action items.
- **Verdicts in one breath:** ADOPT = closing action protocol
  (`action: restart` / `ask_maintainer: <q>` / `stop`, last `action:` line wins,
  default restart), `@loop`/`@looprunner` prefix routing, 80 % loop_log write / 85 %
  stop hygiene, mechanical suggestion capture (planner heading
  'Looprunner prompt suggestions' → looprunner appends VERBATIM below a divider),
  typo fixes. REJECT = `loop_state.json` (the NAP is already the durable state;
  unparseable closing = default restart — one channel). PARTIAL = `action: resume`
  (optional only, via the Task tool `task_id`, only after an `ask_maintainer` pause —
  a fresh restart + NAP stays the loop's backbone).
- **Config facts used (live `opencode.jsonc` read this session):**
  `looprunner_Q4_120k` = `task: allow` / `edit: deny` / `bash: deny` → it MUST launch
  `planner_Q4_120K` via the Task tool (CLI impossible without a bash grant) and CANNOT
  write `loop_log.md` / append prompt suggestions without a scoped edit-allow change
  (maintainer action item 2 of the proposal).
- **Discrepancies flagged (maintainer-owned files, left as-is):**
  (a) the session-1 NAP text claims the planner "function set has NO Task tool" and
  that agents_repo.md was rewritten with "CLI launch mechanics" — the live config gives
  the planner `task: allow` and THIS session's Task tool roster DOES list the
  planner/worker agents; current `agents_repo.md` carries no CLI-launch-mechanics line
  (maintainer live edits — `86077bc` era). This NAP claim is stale; re-verify the roster
  line against `opencode.jsonc` before any delegation-mechanic decision.
  (b) `git log` top = `c629f2e temp commit` — NOT planner-authored (maintainer/looprunner
  artifact, content unexamined); working tree was clean at session start.
  (c) The embedded planner task text (looprunner prompt L12) names a non-existent agent
  `worker_explorer_jill_gemmaQ4_256K` — real key `worker_explorer_jill_gemma_256K_mtp`
  (in the proposal's typo list; functional, not cosmetic).
- **TODO:** #39 added (maintainer call: apply the proposal + permission change +
  smoke-test). Numbering header bumped to "start at #40".
- Closing message per task spec: proposal summary + 8-point verdicts + prompt
  suggestions + `action: restart` line.

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
- Note (session 2): **#39 Looprunner prompt v2 = MAINTAINER CALL** (apply proposal
  `.opencode/looprunner_prompt_proposal_planner.md` + scoped permission change +
  smoke test) — no autonomous next step until applied. The next EXECUTABLE autonomous
  item remains 3 (explorer real exploration run, findings → new TODOs from #40).

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
