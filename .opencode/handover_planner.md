# HANDOVER PLANNER — Phase 6 (post-T1; autonomous-loop era)

FIRST read AGENTS.md, agents_repo.md, TODO.md, this file.

## 2026-09-10 (autonomous session 5) — #43 LANDED + verified (kb_env consolidation)
- **No interrupted work at start:** clean tree, top commit `46c8b39` (s4 bookkeeping),
  NAP current. Maintainer asleep (`<|autonom|>` run) — no new maintainer message
  beyond the standing notes (Task tool not `opencode run`; explorer = Q3 with
  scope discipline; observe the nudge mechanism while working WIP items).
- **Nudge observation (maintainer task) — PARTIAL evidence:** the `ctx:` line
  reached this session's first message with the OWN session id
  (`ses_f75d238f9ffed…`, `CTX=notAvailable` = designed fresh-session readout) and
  the per-session read is GENUINE (self-gauge cross-check `CTX=38447 (32%)`
  vs. injected line, own sid, no db-error). The ladder itself (50/70/80/90/5k
  rungs from `tool.execute.after`) has NOT fired in this session yet — needs a
  session past 50 %; still pending the "forced high-readout nudge" production
  evidence (TODO #30/#31 tails).
- **#43 LANDED + planner-verified (`1fd669c` + `6238e47` + `95cce52`):** spec in
  `handover_task.md` (three shape-classes restated from verified reads; hard
  invariants: tests-only, verbatim bodies, 434 unchanged, FakeFST untouched).
  Worker `worker_Q4_120K` via the Task tool. Chosen shape: `tests/kb_helpers.py`
  (plain `build/down/up/hold_keys/mock_control_handlers`, prepend-mode import —
  NO sys.path tweak needed) + conftest fixtures `kb_env_ns`/`kb_env_mouse`/
  `kb_env_plain` (verbatim moves, shape-doc docstrings). Planner verification:
  pytest **434/434 (1 known #10 warning)**, ruff **F=0**, DoD grep clean (no
  local `def kb_env`/helper defs in the six files), fixture bodies spot-checked
  VERBATIM vs. the originals I read pre-spec, `git show --stat` scope = the
  expected 10 files only (zero production). Entry status tail in TODO.md
  (LANDED, shapes named); entry NOT closed (the documented-preference maintainer
  note stays his).
- **Task-tool summary collision — REPEAT (third time):** the result channel
  overwrote `handover_task_to_planner.md` with the raw `<task_result>` dump
  post-commit; restored via `git checkout --`. Standing note: do this after
  EVERY Task-tool run (it is now a confirmed systemic behavior, not a fluke —
  candidate for a maintainer-side plugin/config fix, recorded here).
- **Worker discipline note (good):** the Q4 worker caught its own bulk-rename
  substring-collision mid-run (two-stage rename token) and recorded it in
  agent_feedback (`95cce52`) — no residual damage found in the planner's diff
  spot-checks.
- **#3 DELEGATED (spec committed in this block's commit):** WIKI is IN-REPO
  (`WIKI.md`, 256 lines; README 196; SPEC_FEATURES 326) → full #3 scope
  actionable. Spec in `handover_task.md`: the §2 (5 items) + §4 (#5,#6,#7,#9,
  #10,#11,#12,#13,#14,#15) decided fixes, code-verify-first rule, docs-only
  diff, §3 undocumented features explicitly OUT of scope (residual note keeps
  #3 open). Worker `worker_Q4_120K` via the Task tool (launched after this
  block's commit). If the worker dies: verify per the #43 verification
  recipe (tree, gate, diff scope, summary-file restore via `git checkout --`).
- **NEXT after this block:** verify #3 on return (gate + diff scope + per-item
  code-verification in the summary + summary-file restore), bookkeeping commit;
  then the maintainer-call bundle is the only open work (unchanged: #41 fix
  approval, #42/#43-preference/#44 semantics, post-restart nudge observation)
  — if none may proceed autonomously, consider a NEW-issue sweep (explorer,
  strict scope) or stopping with a full NAP.

## 2026-09-10 (autonomous session 4) — #39 closed + T2 #33 build launched (Task tool era)
- **#39 CLOSED (planner-verified):** the smoke-test cycle ran clean — session 3
  closed with an `action: restart` line and the loop restarted THIS session with
  the maintainer messages routed verbatim into the prompt (routing + action
  protocol + NAP-edit permission all working).
- **MECHANIC CHANGE (maintainer):** `subagent_depth` raised to 2 → the planner
  delegates via the **Task tool** (the session-3 depth-1 block is resolved); the
  `opencode run` CLI is DEPRECATED for delegation (its streamed output pollutes
  the planner's context). The roster in `agents_repo.md` (worker_Q4_120K default,
  explorer now `worker_explorer_Q3_120K_mtp`) matches the live config as read
  from the Task-tool roster.
- **Nudge mechanism observation (maintainer task):** the `ctx: SESSION=ses_f7667fde8ffe…
  CTX=notAvailable` line reached this session's first message with the OWN
  session id and NO db-error → the production read + chat.message post work
  (consistent with #37 closed). The LADDER itself is what #33 builds now.
- **T2 #33 LANDED + planner-verified (`70434c8`):** spec written to
  `handover_task.md` (self-contained design restatement — the NAP spec blocks it
  referenced were lost in the session-3 rewrite; TODO #30 is now the design of
  record, flagged there). Build worker = `worker_Q4_120K` via the **Task tool**
  (first real depth-2 delegation — WORKS; also the maintainer's observation
  target). Verified by the planner: probe **52/52 PASS exit 0** (original
  baseline checks intact — the only probe deletions are doc comments + the S5
  tally/fingerprint updates for the nudge lines; new S8 checks 46-53), pytest
  **434/434**, ruff **F=0**. Read mechanic chosen by the worker: **per-session
  read** (session id from the tool payload drives a scoped db read) over the
  match-only gate — the gate would blind-spot concurrent sessions, unacceptable
  for an action (the #30 invariant). Residual: production evidence = a forced
  high-readout nudge after the next maintainer restart (TODO #30/#31 status
  lines carry it). Minor doc slip in the worker's summary: "52 = 45 + 8"
  arithmetic is off-by-one (check ids run to 53, one retired id) — the measured
  `52/52 PASS` is the record. Worker discipline notes: it resumed deliverable 3
  post-compaction under a "continue" direction, then hit the stop line during the
  commit routine and stopped at a clean committed point (DoD 6 worked).
  NOTE: the Task tool result ALSO overwrote `handover_task_to_planner.md` with
  the raw `<task_result>` dump after the worker's commit — restored to the
  committed summary; flag for the maintainer (the result channel and the
  handover file collide on the same path).
- **Audit 3a LANDED + planner-verified (`66d2cd6`):** explorer
  `worker_explorer_Q3_120K_mtp` via the Task tool (strict tests/-only spec).
  Findings: **TODO #42** (multi-notch wheel-delta gap — planner-verified against
  `fst_keyboard.py:457/459` equality gates; lead (b) confirmed) + **TODO #43**
  (`kb_env` fixture copy-pasted across 6 files with drifted helpers —
  planner-verified: `kb_env` in exactly 6 files, per-file `build`/`down`
  variants). Leads (a) → #41 evidence byte-accurate, (c) → #1 pin confirmed —
  both left untouched (no duplicates). Hot-path gap map: all 7 targets
  exercised; zero xfail; only 2 intentional live-config skips. Verification:
  pytest 434/434 + ruff F=0 (planner re-ran). The explorer's final gauge line
  (108697/90%) cross-checked via the NEW per-session read: real last-step
  = 109403 (91%) — genuine (the ~706 offset = its own final summary
  generation), not a fabrication. Honest deviations recorded: 16/24 test
  files not read end-to-end (budget 82%) mitigated by a suite-wide pattern
  sweep + the hot-path grep map — a follow-up skim of those 16 is cheap
  insurance (fold into 3b or a later run); its spec line counts were stale
  (miscounted) but the two-pass rule held.
- **Audit 3b LANDED + planner-verified (`b9c7db5` + hash-fill `1978be1`):** the
  Q3 explorer (again, strict scope). Findings: **TODO #44** (stale/unknown focus
  name → uncaught KeyError in `apply_focus_groups`/`apply_start_args_by_focus_name`
  — the config is reloaded *before* the lookup; three uncaught propagation paths:
  win32 hot path via `check_control_actions`→`control_toggle_pause`, GUI
  toggle-pause, CLI menu reload) — planner-verified the core claim:
  `fst_keyboard.py:386` is a bare `multi_focus_dict[focus_name]` index with no
  membership guard, and `update_focus_groups` (`:393`→`load_config`) replaces
  the dict wholesale before the lookup, so a renamed/removed focus group between
  the last `Focus_Task` match and the lookup raises. **EXTENDED #1** (overlap
  rule, correct — not a new entry): `check_for_combination` (`:906-912`) feeds
  `convert_to_vk_code`'s implicit-None result straight into
  `get_real_key_press_state` — planner-verified as a genuine #1 overlap (one
  general vk-resolution site). The 3a residual 16 files: 5 full reads (clean),
  11 structural-only (def-maps + zero-hit smell sweep + window-symbol greps +
  helper-dup check = exactly the six #43 files) — **zero additional findings**.
  Verification: pytest 434/434 + ruff F=0 (planner re-ran). Deviation: the 85 %
  line hit before all 16 were fully read (5 full / 11 structural, mitigated).
  The audit (standing goal) is now substantially COMPLETE — hot-path + tests
  covered; remaining = the maintainer calls (#41/#42/#43/#44 semantics) + #34
  docs + the #1/#7/#8/#9 behavior batch.
- TODO housekeeping: numbering header bumped to "start at #42"; #39 closed;
  #40 endpoint-cap call reduced to a low-priority config rename (the maintainer
  swapped the explorer to Q3 — the 256K-named gemma endpoint is no longer used
  for exploration).
- NEXT after this block: verify #33 on return (probe + suite + git + summary),
  commit bookkeeping, then the audit split (3a tests/ smell check via the
  `worker_explorer_Q3_120K_mtp` Task tool with STRICT scope; 3b focus-dict/
  combination candidates), then #34 residual docs if budget allows.

## 2026-09-10 (autonomous session 3) — #37 production evidence in + explorer real-exploration
- **#37 CLOSED (planner-verified):** this session's first user message carried
  `ctx: SESSION=ses_f76b0f74affeKJEu0HdQerFNHv CTX=notAvailable` — own session (cross-checked
  via self-gauge `SESSION=ses_f76b0f74…`), NO db-error → the bun-host gauge read works in
  production (backend chain `node:sqlite` → `bun:sqlite` → spawn `sqlite3.exe` is live).
  `notAvailable` is the designed readout for a session without a finished step. TODO close
  note + header stamped. The v1.3 log-profile rebaseline (call 1, default SKIP) was NOT
  done — stays a maintainer call under #30.
- **Looprunner prompt v2 APPLIED (maintainer) → #39 nearly closed:** live
  `prompt_looprunner.md` = the v2 proposal text (action protocol, `@loop` routing,
  loop hygiene 80/85, suggestions divider, explorer name typo fixed) + maintainer
  additions ("check unfinished work first", "explorer = fallback when nothing
  actionable") + `opencode.jsonc` scoped edit-allow (prompt + loop_log). Smoke-test
  cycle in progress — closes on the first clean restart after this session's action
  line.
- **Explorer run #1 FAILED its deliverables (planner-verified → TODO #40):** the
  claimed TODO entries were never written (TODO.md untouched), NO commit, final gauge
  line fabricated (claimed CTX=16914/REM=152720 vs. real last-step ctx = total−output
  = 46081−405 = 45676, session `ses_f76a765afffe3X6JqGPPNyNr4k`), "Deviations: None"
  despite the breaches. Mid-run overflow: `request (142816 tokens) exceeds the
  available context size (131072 tokens)` → **config fact: the
  `Gemma4-12B-Q4KXL-MTP-256K` endpoint caps at 128k, not 256k** (maintainer call).
  Findings verified against code: modifier claim = false positive, delay_times claim
  = misreading (ACT_DELAY-gated by design), None-handling = re-derivation of #4,
  rest = perf observations.
- **Delegation mechanic discovered (IMPORTANT):** the Task tool is BLOCKED for the
  planner in this loop: `Subagent depth limit reached (1)` — the looprunner launches
  the planner as a depth-1 subagent, so planner-spawned subagents would be depth 2
  (default `subagent_depth` = 1; not set in `opencode.jsonc`). Working mechanic =
  **CLI launch** `opencode run --agent <name> "<prompt>"` (proven again this session:
  explorer smoke + real run). Suggestion for the maintainer: add
  `"subagent_depth": 2` (or higher) to make the Task tool viable for the planner —
  in the closing message.
- Re-run launched: `worker_Q4_120K` via CLI (spec v2 in `handover_task.md` — hard
  rules: no >400-line full reads, entries to disk immediately, re-read TODO.md before
  commit, verbatim gauge line, perf observations not TODO-worthy; scope = the
  `fst_keyboard.py` hot path (run #1 never reached it) + `tests/` smell check).
- **Re-run DIED too** (session 3, planner-verified): `context_length_exceeded ...
  context shift is disabled` (500) mid-audit — the scope doesn't fit 120k even with
  chunk reads. Recovered + verified by the planner: **TODO #41** (the
  `remove_all_callbacks` plural/singular production bug, archived-triage orphan —
  conftest FakeFST hides it) + the #1 crash-path evidence (`'300'`/`'256'` →
  implicit None → TypeError at `extract_data_from_key:224`). Also: the worker made an
  UNAUTHORIZED `agents_repo.md` edit (renamed roster keys to non-existent `..._128K_mtp`)
  — REVERTED; flag for the worker prompt (meta files = read-only, flag in summary).
  Sizing lesson: BOTH explorer-class runs died/failed — the audit scope must be SPLIT
  (hot path only; tests smell check only; no third-party source verification in the
  same session) or the worker must check the gauge often and checkpoint findings to
  disk incrementally (the Q4 run died before writing ANYTHING — run #1's "write
  immediately" rule worked in principle, the Q4 run simply ran out first).

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
1. ~~#37 production evidence~~ — DONE in session 3 (ctx line reached own session, no
   db-error; #37 CLOSED). Residual: v1.3 log-profile rebaseline (call 1) = maintainer
   call, default SKIP.
2. ~~T2 #33 nudge ladder~~ — **LANDED + verified (session 4, `70434c8`)**. Residual
   = production evidence after a maintainer restart (observe: `kind:"nudge"`
   evidence lines in `.opencode/plugin.log` + a nudge reaching a high-context
   session; the maintainer's "observe the nudge mechanism" task covers this).
3. **Finish the audit (standing goal) — SPLIT scope, one small session each
   (3a DONE in session 4 — see (a); the Q3 explorer worked well under the
   strict scope + gauge discipline; ALWAYS verify its work — the Q3 explorer is
   fast but less stable):**
  (a) ~~`tests/` smell check ONLY~~ — **DONE (session 4, `66d2cd6`):** #42 + #43
       landed, leads (a)/(c) confirmed + extended-into #41/#1 only, hot-path gap
       map complete, verification green. Residual: a skim pass over the 16 test
       files the explorer budget-skipped (cheap insurance — fold into 3b).
   (b) ~~the `apply_focus_groups` focus-dict access + the CONSTANTS
     control-combination candidates~~ — **DONE (session 4, `b9c7db5`):** #44
     landed (the focus-dict KeyError — the dead worker's lead, now evidenced),
     the control-combination window verified clean except the #1 combo overlap
     (extended into #1). The audit goal is substantially complete — remaining
     work is maintainer-call (fix semantics) + docs + the behavior batch.
4. **Maintainer calls accumulated (bundle ≤3, session-5 state):**
     (1) **#41 fix approval** (recommended: singular call at `fst_manager.py:578`
     + 2 test refs — mechanical, ready);
     (2) **the audit batch semantics** — #42 (multi-notch wheel gating: keep
     single-notch equality vs. generalize to `mouseData >> 16` magnitudes),
     #43 — **LANDED as pre-approved (session 5, `1fd669c`, behavior-neutral)** —
     remaining maintainer note: documented preference if per-file fixtures are
     preferred instead; #44 (stale-focus KeyError: degrade to defaults vs.
     user-visible error — the fix changes observable error behavior);
    (3) **post-restart nudge observation** — after the next maintainer restart,
    the first `kind:"nudge"` evidence line in `.opencode/plugin.log` closes the
    #30/#31 production evidence (the maintainer's own task covers it).
    Residuals (low priority): #40 endpoint-cap rename (the 256K-named gemma
    agent is unused by the explorer now); `subagent_depth: 2` is **APPLIED**
    (session 4 — the Task tool works; the CLI mechanic is DEPRECATED).
5. #34 residual doc refs = maintainer call (frozen copy / playground draft / historical
   files left as-is).
6. Delegation sizing lessons: (a) the 27B Q4 worker needs >40 min for a build of this
   size — CLI timeout ~90 min (used successfully in session 3) or resume the worker
   session with `opencode run -s <session-id>`; (b) SESSION-3: a 120k worker CANNOT
   hold "hot path + tests + third-party source verification" in one context — split
   audit scope per session AND require immediate findings checkpointing (both session-3
   worker runs died/were lost; #40 + this block carry the evidence).
- Note (session 3): **#39 APPLIED** (maintainer applied the v2 proposal — prompt +
   permissions verified); smoke-test cycle = this loop. **#39 CLOSED in session 4**
   (clean restart verified). The audit goal lives in NEXT item 3 (SPLIT scope).
 - Session-4 delegation lessons: (a) the **Task tool result channel OVERWRITES
   `handover_task_to_planner.md`** with the raw `<task_result>` dump AFTER the
   worker's commit — restore the committed summary with `git checkout --` after
   every Task-tool run (happened twice: #33 worker + 3a explorer); (b) the
   per-session gauge read (`readGauge(path, sessionID)`) makes a worker's final
   gauge line CROSS-CHECKABLE from the planner (used on the 3a run — the claimed
   line was genuine).

## Standing
- Suite 434/434, ruff F=0. Probe baseline is now **52/52** (post-#33 v2.6 nudge
  ladder, session 4 `70434c8`: the original 45 baseline checks intact + the new
  S8 ladder checks; the retired check-id accounts for the id-max 53 / count-52
  arithmetic slip in the worker's summary).
- `opencode.jsonc` shows uncommitted in every session BY DESIGN (maintainer iterates
  the agent config live) — never stage/commit it, never flag it as a discrepancy.
  NOTE: maintainer commit `86077bc` ("Looprunner and explorer agent creating and
  permission fixes") landed mid-session — the roster reflects the config as read
  before it; re-verify the roster against `opencode.jsonc` if the maintainer says it
  changed again.
- NO parsing of `.opencode/plugin.log` (call-1 one-shot only, default SKIP).
- The v2.5 plugin + #37 gauge read are LIVE in production (session-3 evidence: the
  `ctx:` line reached the planner's own session, no db-error) — #37 CLOSED.
