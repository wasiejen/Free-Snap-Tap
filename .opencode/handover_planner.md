# HANDOVER PLANNER — Phase 6 (post-T1; autonomous-loop era)

FIRST read AGENTS.md, agents_repo.md, TODO.md, this file.

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
- **T2 #33 IN PROGRESS:** spec written to `handover_task.md` (self-contained
  design restatement — the NAP spec blocks it referenced were lost in the
  session-3 rewrite; TODO #30 is now the design of record, flagged there).
  Build worker = `worker_Q4_120K` via the Task tool (first real depth-2
  delegation — also the maintainer's observation target).
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
2. **T2 #33 nudge ladder — IN PROGRESS (session 4):** spec in `handover_task.md`,
   build worker = `worker_Q4_120K` launched via the Task tool. On return: verify
   (probe exit 0 with the original 45 checks intact + new nudge checks; suite
   434/434; ruff F=0; git log; summary's verbatim gauge line) before accepting.
3. **Finish the audit (standing goal) — SPLIT scope, one small session each:**
   (a) `tests/` smell check ONLY (xfails/pins/dup helpers/gaps in the filter paths —
   spec v2 in `handover_task.md` is still the right shape, shrink the scope to
   `tests/`; known leads: the plural-mock hiding at `conftest.py:69` +
   `test_output_manager.py:534` belongs to #41; multi-notch scroll coverage gap
   (single-notch only) was noted by the dead worker);
   (b) the `apply_focus_groups` focus-dict access + the CONSTANTS
   control-combination candidates the dead worker was checking when it died.
   Worker choice: `worker_Q4_120K` via CLI (Task tool is depth-blocked — see the
   session-3 mechanic note); instruct: checkpoint EVERY verified finding to TODO.md
   IMMEDIATELY (IDs from #42), gauge-check every ~2 reads.
4. **Maintainer calls accumulated (bundle ≤3):** #41 fix approval (recommended:
   singular call at `fst_manager.py:578` + 2 test refs); #40 endpoint-cap fact
   (128k endpoint behind the "256K" agent name — rename/config/scope rule);
   `subagent_depth: 2` suggestion (Task tool depth-blocked for the planner, see
   session-3 mechanic note — closing message carries it too).
5. #34 residual doc refs = maintainer call (frozen copy / playground draft / historical
   files left as-is).
6. Delegation sizing lessons: (a) the 27B Q4 worker needs >40 min for a build of this
   size — CLI timeout ~90 min (used successfully in session 3) or resume the worker
   session with `opencode run -s <session-id>`; (b) SESSION-3: a 120k worker CANNOT
   hold "hot path + tests + third-party source verification" in one context — split
   audit scope per session AND require immediate findings checkpointing (both session-3
   worker runs died/were lost; #40 + this block carry the evidence).
- Note (session 3): **#39 APPLIED** (maintainer applied the v2 proposal — prompt +
  permissions verified); smoke-test cycle = this loop; close #39 once the first
  restart-after-action-line runs clean. The audit goal now lives in NEXT item 3 (SPLIT
  scope).

## Standing
- Suite 434/434, ruff F=0 (post-#37 baseline: the probe is now 45/45).
- `opencode.jsonc` shows uncommitted in every session BY DESIGN (maintainer iterates
  the agent config live) — never stage/commit it, never flag it as a discrepancy.
  NOTE: maintainer commit `86077bc` ("Looprunner and explorer agent creating and
  permission fixes") landed mid-session — the roster reflects the config as read
  before it; re-verify the roster against `opencode.jsonc` if the maintainer says it
  changed again.
- NO parsing of `.opencode/plugin.log` (call-1 one-shot only, default SKIP).
- The v2.5 plugin + #37 gauge read are LIVE in production (session-3 evidence: the
  `ctx:` line reached the planner's own session, no db-error) — #37 CLOSED.
