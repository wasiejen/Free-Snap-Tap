# HANDOVER PLANNER — Phase 6 (post-T1; autonomous-loop era)

FIRST read AGENTS.md, repo_overview.md, TODO.md, this file.

## Compressed archive (one line each — details in git log + TODO/records)
- 2026-09-16 looprun 2, iteration 1 (ses_f5605f805ffeElHB9mgtksjye1, planner-1) — plan1: research addendum C1-C7 + 5.2 numword scriptlet (worker-1) + 5.3 log-only intercept observer (worker-2) landed+verified (baseline 169/169) + self-compact test PASSED — details: loop folder plan1_summary.md + git aa4132d
- 2026-09-16 looprun 2, iteration 10 (ses_f579a961bffecIKwgeKvhtSVh3, planner-10) — plan10: fast no-actionable close (all real work maintainer-blocked); gates re-verified green (probe 122/122, pytest 459+1w, ruff F=0); priority.md #4/#6/#9/#10 (fully handled) moved to _past_priorities.md — details: loop folder plan10_summary.md + git 2608361
- 2026-09-16 looprun 2, iteration 9 (ses_f57c84fbbffeaLDqNyuJzEw85G, planner-9) — plan9: approved research lane LANDED + verified (RESEARCH ONLY, no build): worker-13 `37b000d` delivered `.opencode/agent/research/` (README + 426-line fuzzy/numword tool-reliability doc ending in ranked §5.1-5.4 recommendations — maintainer call, content NOT in NAP per his instruction); TODO #64 (stale 84/84 baseline) handled planner-direct; two live 140K dense-digit incidents (subject matter bit back); OPEN (all maintainer-blocked, unchanged from plan8 + new §5.2/§5.3 decision) — details: loop folder plan9_summary.md + git 37b000d/e6564a1
- 2026-09-16 looprun 2, iteration 8 (ses_f57dc514dffeO3jFufy9dxV6Lw, planner-8) — plan8: approved batch #54 (no-circumvent rule into all three role prompts) + #51 (stale type:module removed) + #58 (probe named in the standard-gate definition) all planner-direct; gates green; ONE concrete 140K observation (dense-digit `1-2-2` perceived as `120+2`); PLAN9 spec = approved research lane (queued, now executed in plan9) — details: loop folder plan8_summary.md + git a3af0d0
- 2026-09-16 looprun 2, iteration 7 (ses_f5881492fffekCwsEwdfna4sge, planner-7) — plan7: #63 (smoke stub) + #57 (MOVE guard hoist) + #60 (probe S15/S16, worker-9 rescued via dump/cross-compact/resume) + #57live node-resolution fix (`9fd7557`) all verified green (probe 120+2/120+2, pytest 459+1w, ruff F=0, 7/7 smokes); 140K model era begins (renamed agents, 140K window, observation mandate) — details: loop folder plan7_summary.md + git 04cbc0f
- 2026-09-15 looprun 2, iteration 5 (ses_f5978ea6affe6oCCcpZsyN6hEl, planner-5) — plan5: worker-4 RESCUE succeeded (dump hook `4512fe6`); worker-5 speaking-readout build `28783a7` verified by the planner (probe 106/106, gates green); #8 custom-tools repo part + #9 gauge-lag one-liners; maintainer stop-line semantics + info.md rulings recorded; baseline corrected + TODO #60-62 filed — details: loop folder plan5_summary.md + git 84421c8
- 2026-09-15 looprun 2, iteration 4 (ses_f59d27449ffeEFeV4vaQ6NlqTs, planner-4) — plan4: dump-hook spec LANDED (`2f4a5c4`); worker-4 ran to `context_length_exceeded` mid-build (no COMPACT line, no budget entry); cross-compact (Gemma) dispatched + stop-line handover; inbox triage (`compact_memory.md` --comment ruling recorded → done/; `dense_numbers.md` --wip left) — details: loop folder plan4_summary.md + git 810a558/e537e4b
- 2026-09-15 looprun 2, iteration 3 (ses_f5a01..., planner-3) — plan3: maintainer context-limit failure-message info codified (planner+looprunner prompts + knowledge); script collection LANDED + verified (worker 2933dd0..d352e4a; gates 459+1w / F=0 / 99/99); corpus refreshed to 147 sessions; helper-script prompt pointers + "Branch truth" bullet; loop re-aligned to opencode_test (fst_work2 stays the parked rebuild branch); TODO #57-59 curated — details: loop folder plan3_summary.md + git a15828c
- 2026-09-15 looprun 2, iteration 2 (ses_f5b1f19..., planner-2) — plan2: maintainer #0 backlog reduction — 6 proposals closed with verdicts, consolidated decision file (his rulings D1-D4 all handled), fst-rebind-repeat spec delegated then PARKED for his direct session (spec preserved at loop folder plan2_ho_task.md; tap-group ruling absorbed), worker-kill incident interpretation corrected (context overflows, not provider unload) — details: loop folder plan2_summary.md + git f09ff56/5bdce2a
- 2026-09-15 direct session (ses_f5ce87718ffedT6ngBjJN3LEhH) — his --comment rulings handled (autorun postponed; #55 APPROVED; NAP-backup rule; smoke-harness home = plugin/tests/); looprunner prompt reworked (a41ffc3/67f68f6: readout, context-limit procedure, AFK, status blocks); smoke-harness BUILT + VERIFIED via worker-16 compact/resume cycle (f4de326→109ddff, smoke 42/42, gates 99/99+459+F=0); his config issues flagged (block_tansfer typo, "*" polarity) — details: .opencode/archive/loop/nap_direct.md
- 2026-09-15 looprun 1, iteration 1 (ses_f5b3bf425ffesUdbQYxpvk0Z4t) — maintainer priority batch: stop/compaction protocol (90 % gauge stop line + dump-before-compact) codified in both prompts; marker grep command + context-discipline + marker rulings in prompts; knowledge_inbox + session_scan skill built; proposal backlog pass (subagent-overflow → implemented/, findings → root revised, smoke-harness → implemented/); 4 inbox items triaged → done/; TODO #56 (deferred distillation); script-collection spec WRITTEN + ready to launch — details: loop folder plan1_summary.md + git b3435d9
- 2026-09-15 direct session (ses_f5d75a58fffeDLp7CGLqqZP8EQ) — Part-2 NAP cleanup COMPLETE + verified (`b36d4c7`); `# 3 2` dump script + 137-session corpus backfill delegated + verified (`ab1451d`, `e877364`); dense-content question answered (knowledge entries); his re-prioritization triaged (`60d61b8`..merge `23eb24c`) — details: .opencode/archive/loop/nap_direct.md + git 1d98075
- 2026-09-15 direct session (ses_f5df3e30cffeCpv0iy41ybL6iA) — bash switch verified; compact_memory re-verified (Gemma now default compaction model); NAP-size discussion: memory folder + consolidation + session-dump designed, Part-2 cleanup APPROVED (backup condition) and delegated — details: .opencode/archive/loop/nap_direct.md + git b4a6b93
- 2026-09-14 direct session (ses_f5f0689d9ffe0G0Uhvz0AIr5Vh) — cross-session compaction round 2: WORKS — his explicit-pair fix supersedes round 1; `cross_session_compaction_summary.md` handled → done/ — details: .opencode/archive/loop/nap_direct.md + git 22268de
- **2026-09-14 direct (ses_f601cfc5):** state rebuild from his uncommitted additions; today's `--comment` (meta-feedback) acknowledged; #02 autorun_summary re-run delegated + verified (`02388a9`); gauge/nudge consistency + mid-turn context reconstruction measured (post-compaction floor ≈ system prompt + keep); cross-session compaction ROUND 1 (old cross path: no resolvable pair → no send; test2 fire-and-forget error swallowing mapped; model-serialization hypothesis) — SUPERSEDED by round 2 (next section, ses_f5f0689d9); detail: `archive/loop/nap_direct.md` + git `663a184`.
- 2026-09-13 direct session (ses_f652ea3d0ffeblu0lAc5a0w27p) — priority #01: cleanup (old #1 → past); `--comment` marker codified; skillsets built (autorun_summary + feedback) — details: .opencode/archive/loop/nap_direct.md + git 61622b2
- 2026-09-13 iteration 4 relaunch (ses_f6653f01fffevE1LCJvK8J0Ld4) — plan4 continued: dead predecessor ADOPTED (loop log + escalation proposal committed); retry order EXHAUSTED; self-fallback queued + prepped; stop line before the compression unit — details: .opencode/archive/loop/autorun-2026-09-13_04-27/plan4_nap.md + git 6af5f9a
- 2026-09-13 iteration 3 (ses_f674587ecffeaYLsKgST57D0ve) — nap-size build: Part 1 LANDED (`81a47d9`); Part 2 cleanup delegated (text-worker); #52 CLOSED (`4db7505`) — details: .opencode/archive/loop/autorun-2026-09-13_04-27/plan3_nap.md + git 81a47d9
- 2026-09-13 iteration 1 (ses_f676f6a82ffe960mvrZD9W0DjQ) — compaction-resume protocol codified; live acceptance DONE (rescued); resume-overflow finding → proposal — details: .opencode/archive/loop/autorun-2026-09-13_04-27/plan1_nap.md + git 1cf5dc0
- 2026-09-13 direct session (ses_f692e1071ffevodtnJTET0DEEs) — compact_memory live no-op bug FIXED (commit follows this section) — details: .opencode/archive/loop/nap_direct.md + git 4b44d8c
- 2026-09-12 direct session (ses_f692e1071ffevodtnJTET0DEEs) — priority #1 BUILD DELEGATED: compact_memory plugin (approved proposal v2, Parts 1-4) — details: .opencode/archive/loop/nap_direct.md + git b684894
- 2026-09-12 direct session (ses_f6976031bffeRa8gNNcpy5FoYj) — attention-keywords close-out; priority #1 (compact_memory quant-class budget) design grounded — awaiting his ruling — details: .opencode/archive/loop/nap_direct.md + git 6b51fe2
- 2026-09-12 direct session (ses_f6a0d11ebffed36PDKoTeWxddD) — .opencode restructure, Part 1 LANDED: agent-side home; host restart required — details: .opencode/archive/loop/nap_direct.md + git cc9c67e
- 2026-09-12 direct session (ses_f6a42cb49ffev8w5ITrdSkUpPd) — merge `fst_work`→`opencode_test` done (`ef2f05b`); inbox handled: 5 proposals filed, 6 items → done; sweep PENDING — details: .opencode/archive/loop/nap_direct.md + git ef2f05b
- 2026-09-12 iteration 14 (ses_f6bd63bf9ffeirBsm422kPUj2q) — relaunch after iter-13 `stop`; state unchanged, NO new non-gated work; re-issue `stop` — details: .opencode/archive/loop/autorun-2026-09-12_17-23/plan14_nap.md + git c9d1927
- 2026-09-12 iteration 13 (ses_f6c036282ffe2qh5zQFPeyh6Wa) — T3 LANDED + verified (`6ebe288`, loop_log tool); 3-item tool batch CLOSED (verdict + `approved/`→`implemented/`; Part 2/3 prompt lines applied); no non-gated work left — loop goal reached — details: .opencode/archive/loop/autorun-2026-09-12_17-23/plan13_nap.md + git 6ebe288
- 2026-09-12 iteration 10+1 (ses_f6c4471a3ffeaQ9rXpnmUTg2AS) — T2 LANDED via rescue (worker launch died at context_length_exceeded after partial run); gates 84/84; T3 (loop_log tool) next — details: .opencode/archive/loop/autorun-2026-09-12_17-23/plan10+1_nap.md + git 010c257
- 2026-09-12 iteration 10 (ses_f6c6ed7feffe9cGQ2bykHaKMJ0) — 3-item tool batch proposal FILED + approved (pre-approval); inbox → done; T1 (block_transfer sandbox) spec committed, worker-10 launched — details: .opencode/archive/loop/autorun-2026-09-12_17-23/plan10_nap.md + git b31d069
- 2026-09-12 iteration 9 (ses_f6cbb0797ffe71FAx40bQyURTr) — FST batch COMPLETE on `fst_work` (units A+B verified); proposal → `implemented/`; 6 TODO entries closed — details: .opencode/archive/loop/autorun-2026-09-12_17-23/plan9_nap.md + git ce4b390
- 2026-09-12 iteration 7 (ses_f6cee5235ffeTa34Ob0pHMrmg6) — maintainer rulings landed; compact_memory v2 integrated (maintainer marker, planner-direct); FST batch delegated on the new `fst_work` branch — details: .opencode/archive/loop/autorun-2026-09-12_17-23/plan7_nap.md + git 018c696
- 2026-09-12 iteration 6 (ses_f6d1d3627ffeSDD7HoxQuvlmCu) — T5 re-verified (probe 80/80, WIP→task commit `14af171`); maintainer directives landed (early-handover protocol, task-spec index trigger) — details: .opencode/archive/loop/autorun-2026-09-12_17-23/plan6_nap.md + git 14af171
- 2026-09-12 iteration 5 (ses_f6d394ee1ffeE49CoI3UdAUCbl) — T5 re-verify gate NOT met (compact_memory.ts still uncommitted); re-verify spec made execution-ready; loop blocked on maintainer — details: .opencode/archive/loop/autorun-2026-09-12_17-23/plan5_nap.md + git 0c0de11
- 2026-09-12 iteration 4 (ses_f6d472e56ffeJUAKrfcs4BOjYN) — maintainer marker handled: block_transfer.ts → tool() form (planner-direct); T5 still blocked; early handover per maintainer — details: .opencode/archive/loop/autorun-2026-09-12_17-23/plan4_nap.md + git 7edca3d
- 2026-09-11 iteration 3 (ses_f6e137295ffeH81n9i8wLI3cz7) — T4 landed (planner-direct); T5 spec/launch — details: .opencode/archive/loop/autorun-2026-09-12_17-23/plan3_nap.md + git f3dd195
- 2026-09-11 iteration 2 (ses_f6eb9cab5ffebLGhxdSs8jBrGI) — maintainer prototypes landed; spec re-decomposed T1–T5; T1 launched — details: .opencode/archive/loop/autorun-2026-09-12_17-23/plan2_nap.md + git 1db6743
- 2026-09-11 new looprun, iteration 1 (ses_f6ef5418effeloEwm4zr53XpXa) — approval moves landing; #17/#30/#35 closed; Cycle-1 + rename build — details: .opencode/archive/loop/autorun-2026-09-12_17-23/plan1_nap.md + git 5a39c3f
- 2026-09-11 same direct run, post-compaction chat segment (ses_f6fd8a0caffedqEYeUMCq0x12f) — compaction-lifecycle design agreed + proposal written — details: .opencode/archive/loop/nap_direct.md + git dc3f137
- 2026-09-11 DIRECT planner run (ses_f6fd8a0caffedqEYeUMCq0x12f) — inbox 11-11 handled: loop.log v2 + loop/ reorg + #50 + decision proposals — details: .opencode/archive/loop/nap_direct.md + git b11e1b8
- 2026-09-11 looprun 3, iteration 5 (ses_f714b3128ffeILuAaWp2YUqnLt) — TODO curation + #48 delegated — details: .opencode/archive/loop/autorun-2026-09-10_03-05/plan5_nap.md + git 449556f
- 2026-09-11 looprun 3, iteration 4 (ses_f71d36a2affeVrJfwDARNwG7lo) — deferred pair in order: loop.log prompt task, then the re-scoped plugin task — details: .opencode/archive/loop/autorun-2026-09-10_03-05/plan4_nap.md + git 7264b1f
- 2026-09-10 looprun 3, iteration 3 (ses_f7210e535ffe3ac5bYAzqFwQe5) — todo_inbox curated; date sweep LANDED + verified; loop.log/plugin deferred — details: .opencode/archive/loop/autorun-2026-09-10_03-05/plan3_nap.md + git d848e34
- 2026-09-11 new looprun 3, iteration 2 per launch (ses_f725ba15effe6Od7tQ9XO2QuYE) — inbox 01-16/031 handled; #49 closed; split build LAUNCHED — details: .opencode/archive/loop/autorun-2026-09-10_23-07/plan2_nap.md + git b6dc3e7
- 2026-09-10 new looprun, iteration 1 per launch (ses_f729fdeecffeL1itaHiEEsKjYG) — inbox feedback given; loop paused for approval — details: .opencode/archive/loop/autorun-2026-09-10-0/plan1_nap.md + git 8b4123b
- 2026-09-10 looprun 2, iteration 6b (no-ses) — part 3 LANDED + verified; P02 saga CLOSED; gauge moved — details: .opencode/archive/loop/autorun-2026-09-10/plan6b_nap.md + git f6075a2
- 2026-09-10 looprun 2, iteration 5 (no-ses) — P02 + P08 LANDED + verified; P01 re-test PASSED; maintainer meta batch processed — details: .opencode/archive/loop/autorun-2026-09-10/plan5_nap.md + git 1ed1108
- 2026-09-10 looprun 2, iteration 4 (no-ses) — P09+P07 applied to the LIVE looprunner prompt + #47 CLOSED — details: .opencode/archive/loop/autorun-2026-09-10/plan4_nap.md + git c4ad33c
- 2026-09-10 iter 3 (legacy, no-ses) — P10 maintainer inbox channel built (`inbox_planner`/`inbox_worker`/`done`; agent moves after handling, never edits) + P03/P05/P06/P07/P09 applied; P08+P09 moved to approved/ by the maintainer; `handover_maintainer.md` retired → archive; NO code touched — details: git 0540b16
- 2026-09-10 iter 2 (legacy, no-ses) — approved-fix batch #41+#42+#46 LANDED + verified (436 passed); #48 ADDED (packed-word equality report-back, implicitly approved, delegation-ready); #47 §3 docs LANDED incl. 4 behavior flags documented as-is (headless-toast TypeError = the standing call) — details: git bdab550 724a630 b40a1a7 73c0097
- 2026-09-10 iter 1 (legacy, no-ses) — maintainer rulings applied to TODO; proposals channel + 9 drafts P01–P09 created; P01 `limit.context` applied (opencode.jsonc left uncommitted by design); batch spec committed, launch deferred to iter 2 (stop line) — details: git d077de2
- 2026-09-10 session 5 (legacy, no-ses) — #43 LANDED (kb_env consolidation → `tests/kb_helpers.py` + conftest fixtures); #3 fix-list LANDED (docs-only); WIKI.md tracked; summary collision 3rd/4th time — details: git 1fd669c 6c2151 fcc3add 28e1865
- 2026-09-10 session 4 (legacy, no-ses) — #39 closed (clean restart); T2 #33 nudge ladder LANDED (probe 52/52); audit 3a → #42/#43 + 3b → #44 + #1 overlap extension; Task-tool era begins (subagent_depth 2, CLI delegation deprecated); Task-tool clobber mechanic documented (restore after every run) — details: git 70434c8 66d2cd6 b9c7db5
- 2026-09-09 session 3 (legacy, no-ses) — #37 closed (production `ctx:` line reached own session, no db-error); looprunner v2 prompt applied by the maintainer; explorer run #1 failed (fabricated gauge, no entries) → #40 + sizing lesson (split scope, checkpoint findings); CLI-delegation mechanic discovered — details: git 2cf5f33
- 2026-09-09 session 2 (legacy, no-ses) — looprunner-prompt optimization proposal (consolidated verdicts; adopted closing action protocol `action: restart/ask_maintainer/stop`) — details: git ff86d9b
- 2026-09-08 session 1 (legacy, no-ses) — agents_repo roster synced to live opencode.jsonc; #38 explorer smoke test (PASSED w/ fabricated-gauge caveat); #37 gauge build LANDED (backend chain node:sqlite → bun:sqlite → spawn sqlite3.exe) — details: git 2a4996c

  re-injection); post-compaction protocol re-applied from files.

## plan2 (iteration 2, ses_f556cadecffeH5P5uZNS33i20R, planner Qwen3.8-27B-IQ4KT-140K)
- 5.3 live acceptance = NO on first check: the plugin FAILED TO LOAD in the
  current run ("Plugin export is not a function", opencode.log run
  9f0b3d78); root cause verified in the installed binary: the loader
  iterates `Object.values(module)` — EVERY value must be a function (or
  `.server`); the named non-fn exports kill the load (ctx_watchdog is
  default-only → loads fine). No `.opencode/temp/intercept.log` existed.
- The small fix + the READ FUNCTION (his conditional approval) LANDED +
  verified (worker-13 ses_f55463549ffelXphfcDlDGMhPJ, `4719cc5`): core
  split (`intercept_observer_core.ts`; plugin = default ONLY,
  `grep -c ^export` = 1, pinned by probe 171) + read-scope fuzzy resolution
  (`read` + string filePath ONLY; exact/normalize fast-path; d<=2 AND
  gap>=2 → mutate filePath + `fuzzy-resolved` line; else fail-closed
  `fuzzy-rejected` line w/ top-3 cands — C7 8-field shape; corpus TTL
  cache). GATE RE-RUN BY ME: probe 180/180, smoke 29/29, pytest 459+1w,
  ruff F=0.
- Worker incidents (loop log): launch 1 died on a doubled-path permission
  rejection (spec now carries the relative-path rule); launch 2 died at
  context_length_exceeded (142k) → cross-compact (friction: summarizer
  resolved to the SAME model — Qwen — not the Gemma compaction model →
  #70) → COMPACT line verified → task_id resume → green.
- Maintainer feedback delivered:
  `maintainer/feedback/2026-09-16_number-w2n-convention.md` (one / multiple
  / mixed-with-letters cases); he live-commented it (`--comment`, "to be
  discussed in direct session": `<8-6-1>`→861 fallback, `<6|six>`
  redundancy form — the grammar part waits for that discussion).
- Addendum Q1-Q3 rulings folded in: Q1 redundancy naming YES (loop/plan
  file names); Q2 `<4|four>` angle-bracket delimitation (name format);
  Q3 roadmap = read THEN write scope, one step after the other.
- TODO #65-71 filed (loop_log tool bug, restart acceptance, fuzzy
  extension, write-scope gated, naming codification, compact_memory
  rework, stale repo_commands totals).
- **RESTART ACCEPTANCE PENDING (#66) — the FIRST check at the next
  restart:** (1) `.opencode/temp/intercept.log` exists with lines;
  (2) mutation-channel verdict: read the scratchpad sentinel
  `C:/Users/Wasiejen/AppData/Local/Temp/opencode/fuzzy_accept/file-four.txt`
  via a d<=2 mistyped path → TWIN content (`TWIN`) + `fuzzy-resolved` line
  = mutation LIVE (→ #68 unblocked); else NOT live (5.3 stays log-only,
  #69 naming route primary). Then record verdict (TODO + research doc) and
  tear down the sentinel per §5.4.
- Maintainer live files UNCOMMITTED (never stage): priority.md (new
  compact_memory rework item → #70), ideas.md (bit-drift = GENERATION
  problem not perception; ctx.log wants session_id+role attribution),
  feedback-file comment.
- Loop folder this run: `autorun_2-6_0-9_1-6__1-3_3-3` (his rename).

## Direct session (2026-09-16, ses_f54ee6ba8ffeeoFUc1zptUtsb5) — fuzzy/numword topic: verdict + convention + staged specs
- **#66 CLOSED: mutation channel LIVE** at this restart (intercept.log live;
  mistyped read → `fuzzy-resolved d=1 gap=4` → TWIN content). Verdict in
  research doc dated section + decision record §1; sentinel torn down.
- **Convention ruled with him** (full reasoning in
  `research/fuzzy-numword/decision-record.md` — the basis doc): pair form
  `[left:right]` (SUPERSEDES `<4|four>` — measured bash table: `<`/`|`
  fatal, `[]`+`:` survives), single-digit dash form recommended, full map =
  accepted fallback, candidates only inside delimiters, right-wins on
  mismatch, adder-left = incident signal, no letter-fuzzy/aliases yet
  (his misspellings ≠ agent drift), scratchpad = allowed sandbox root.
  Pipeline: pair resolution first, fuzzy second, read-scope mutation.
- **Topic folder created** `research/fuzzy-numword/` (README + decision
  record + specs R1 launch-ready, R2/R3/R4 staged with gates; R5 no spec).
- **His pending actions:** AGENTS.md paste (draft in decision-record §4 —
  the rule's compaction-surviving home, his "direct answer to Loop Pattern
 5") + the R2 write-scope approval.
- **Live incidents (measured, this session):** the subject matter bit the
  planner — a doubled `OpenCodeProjects` write path (machine-detected
  pre-commit, fixed) + one perception drift of my own path arg (perceived
  path ≠ generated path; machine-checked). Spurious loop folder
  `autorun-2026-09-16_13-33` (3rd #65 occurrence) consolidated + removed.
  His FB files relocated by him to `research/` (`FB_` prefix) — his
  reorg, left untracked.
- TODO #65-69 amended (67→R3, 68→R2 gates, 69 form superseded + ruled).
- **R6 added (late, his proposal):** edit-scope hint channel + payload
  journal (every write/edit dumped per-tool to temp; anchor-first content
  locator; hints for not-found/multiple-matches; NEVER mutates content,
  NEVER auto-retries — recovery = agent fires cp/block_transfer from the
  journal). Observation-only → gates on R1, not R2. Design + reasoning:
  decision-record §8, spec staged `spec_R6_edit_hint_journal.md`. After-hook
  result-enrichment still UNVERIFIED (log-only fallback).
- **Primer landed (his request, session end):** `research/fuzzy-numword/
  primer.md` (short usage form: when/forms/where/observer-behavior/do-nots,
  with the "grep the 10k record, don't read it" guard) + Instruction-index
  pointer lines in planner AND worker prompts (need-based read).
- **R1 GREEN — VERIFIED** (worker-13, ses_f5467718…, commit `96bb173`):
  probe 193/193 (new S19, 13 checks), smoke 31/31, pytest 459, ruff clean,
  export=1 — matches the handover's measured numbers (I verified against
  git + the committed handover, not the Task return, which was a stale
  mid-session snapshot). Grammar interpretation adjudicated: NO tens+unit
  composition on pair sides (worker's mini-grammar reading accepted — see
  decision-record §5 R1). Baseline now 193/193 (self-annotation).
- His AGENTS.md paste CONFIRMED committed (bf18f14, matches §4 draft) — the
  permanent rule lives in 3 carriers (AGENTS.md + primer + prompt index
  lines); his call: the redundancy "sticks better for the beginning".
- **R1 LIVE — guard removed** (2026-09-16 22:13, post-restart one-shot):
  pair channel live (`pair-resolved gate=mutated canon=4`), fuzzy live
  (3x d=1), scratchpad zero out-of-sandbox noise. TEMPORARY guard lines
  removed from primer + both prompts (form fully re-enabled in tool args).
  Finding: 3/3 LATER pair-form attempts degraded to bare numerals at MY
  generation (fuzzy caught every one) — decision-record R1 block; R4
  mining question logged. CORRECTION (his line-153 pointer): that log line
  is MY BOOKKEEPING EDIT being pair-logged (non-read logging confirmed
  live); the 3/3 read degradation stands, arg-level confirmed (log
  146-149 field 5). Attribution rule (never attribute own args from
  memory; log field 5 = authority) added to primer + friction line.
- **INBOX INCIDENT (worker role slip):** worker-13 TRIMMED `todo_inbox.md`
  (deleted header + 2 uncurated blocks) instead of appending — recovered
  from git (aaf6b03) and curated properly (worker-8 → confirm-with-him;
  worker-9 → superseded; R1 entry → folded into #71). Defensive worker-prompt
  line added ("APPEND ONLY — never touch existing entries").
- TODO: #69 CLOSED (acceptance met); #68 gates → R1 satisfied, ONLY his
  write-scope approval remains; #71 refreshed (193).
- **R2 LAUNCHED** (2026-09-16, his "R2 approved"; worker_Q4_140K): spec in
  `handover/handover_task.md` (refreshed at launch: post-R1 baseline
  193/193 + R1 codebase facts + approval boundary + the `args[1:one]`
  content-scope guard pin). Write scope: pairs on write/edit/block_transfer
  path args (strict existence gate, mismatch FAILS CLOSED), fuzzy d<=1 on
  write paths, git refs gated on rev-parse; read scope FROZEN (regression
  gate); content args never mutated.
- **R2 GREEN — VERIFIED** (35f8143; worker-14 compacted twice mid-task,
  resumed via task_id both times, dumps archived — checkpoint protocol
  worked): probe 206/206 (S20), smoke 35/35 (8f controlled write audit),
  pytest 459, ruff clean; read scope frozen-green. Deviation ACCEPTED:
  ref gate = `for-each-ref` membership (rev-parse vacuous for 40-hex —
  worker-measured, decision-record §5 R2, supersedes §3.4). #68 CLOSED;
  residual new-file near-miss hazard → #72 (his decision). His notes
  this round: true ceiling ≈145K/103%; compact_memory `message` param is
  NOT auto-delivered (manual copy into starting message) — #70 evidence;
  his doubled-path init read (log 179-180) caught by out-of-sandbox.
- **Next moves:** (1) his next restart → one-shot WRITE-scope acceptance
  (sentinel: controlled scratchpad write, verify log says where it landed);
  (2) his ruling on #72 (accept hazard vs intent-signal follow-on);
  (3) confirm worker-8's feedback-file ask.

## Standing
- Baselines (re-verified 2026-09-16, plan2, gates re-run by the planner
  after worker-13): probe **180/180** (S17=26 numword pins, S18=32
  intercept-observer + read-scope-fuzzy pins incl. the loader-contract
  check; the header annotation total is DIGIT-form and is the source);
  pytest **459 passed + 1 warning (the known #10 coroutine warning)**;
  ruff **F=0**. All 8 smokes green (7 + intercept_observer 29/29).
- Corpus refresh cadence (planner call, plan6 — TODO #59 CLOSED): refresh
  BEFORE the #56 distillation runs + after heavy loopruns —
  `node .opencode/agent/scripts/db/dump_session.cjs --all --slim`.
- Per-session full NAP backup (his ruling 2026-09-15): ONE `cp handover_planner.md
  .opencode/archive/nap_backup_<date>_<ses>.md` at the close commit — a single cp
  (no double write); the emergency-compaction method has to be enough — no further
  mechanism built for it.
- Context wall (his protocol 2026-09-15): the real wall sits ≈ **90% gauge reading**
  (a session hit the actual limit at a ~90-96% readout); the gauge lags ~2 tool
  calls (his # 9 — plan with ~5k margin against the injected `ctx:` line).
- **Stop line (his ruling 2026-09-15, priority.md top): ≈90 % gauge** (= 95 %
  true wall) — codified in both role prompts; worker protocol = order-stop →
  pre-compaction dump (`dump_session.cjs`) → cross `compact_memory` → `task_id`
  resume. AGENTS.md (his file) still says 85 % — the change rides
  `proposals/2026-09-15_agents-knowledge-stopline.md` until he pastes it.
- NAP session section: write + COMMIT it BEFORE the stop line (incident
  2026-09-15: session lost at the limit mid-edit, the next planner had no
  orientation). Full pre-cleanup NAP backup: `archive/nap_backup_2026-09-15_pre-cleanup.md`.
- Markers (his ruling 2026-09-15, priority.md): `--comment` MAY be removed once
  acted on/acknowledged; `--wip` may be ignored when it blocks work (afk/autorun).
- Maintainer-inbox handling: move the file to `maintainer/done/` CONTENT-UNTOUCHED;
  the reply/feedback is recorded in the NAP + summary (the `proposals/maintainer/feedback/` folder no longer exists).
- The maintainer's live files (prompt set, `proposals/files/` drafts) — never stage/flag;
  draft copies may carry stale paths until he finalizes the set.
- P02 saga CLOSED (iter 6b functional proof PASSED — no clobber after a
  fresh-process Task-tool run). If a clobber EVER recurs, restore via
  `git checkout --` and re-open the investigation.
- Gauge lives in `.opencode/plugin/scripts/` (self-gauge:
  `node .opencode/plugin/scripts/peek.mjs`; the file-relative
  `DEFAULT_EXE_PATH` inside `gauge.mjs` must be re-checked if that dir moves).
- Delegation: Task tool (`subagent_depth` 2), default `worker_Q4_120K` (P01
  re-test PASSED — worker-prompt launches work); raw `agent_*` = fallback;
  explorer `worker_explorer_Q3_120K_mtp` (fast, less stable — ALWAYS verify its
  work).
- NO parsing of `.opencode/plugin.log` (call-1 one-shot only, default SKIP).
- TODO.md curation: open items + one-line records in TODO.md; full text of
  closed entries in `todo_records.md` (formalized by split proposal part 3).
- **Disclosure (dc3f137):** the `git add -A` there also staged the maintainer's live `opencode.jsonc` (compaction.keep now system:true / tokens:60000 / messages:20) and his new draft `draft/compact_memory/compact_memory.ts` (72 lines) - both were in the working tree at commit time. Nothing was reverted; maintainer decides whether that belongs in the git record.

