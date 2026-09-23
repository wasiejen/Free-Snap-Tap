# HANDOVER PLANNER — Phase 6 (post-T1; autonomous-loop era)

FIRST read AGENTS.md, repo_overview.md, TODO.md, this file.

## Current session — autorun, 2026-09-23 (ses_f33f1eb98ffeFvrnTdmTzmyE2x, planner-8, Qwen3.8-27B-Q3S-170K)
- #85 part 3 LANDED + planner-verified (ded7245 code+smoke+TODO + 5992f38
  handover; worker-13 ses_f33c05575ffeYtM7PHyL30GgID, worker_Q3S_170K, closed
  at 94%): the Unit-2 tick leg is REMOVED — the nudge is a PASSIVE ctx-line
  SUFFIX on the session's own tool-call return (tool.execute.after, the gauge
  plugin's ctx: channel), per busy session, ladder (>=0.95 "self-compact now"
  / >=0.98 --maintainer line), scope "none" (Direct) suppresses it (c),
  scopeVerdict checks the LAST OWN-LINE TOGGLE FIRST (d — Direct deactivates
  Unit 4 for the planner), Unit-4 scope unchanged, NO promptAsync on the
  Unit-2 path. Verified from files: commits + the worker's own gate output in
  its session dump (smoke 102/102, probe 241/241, pytest 459+1w, ruff F=0) +
  spot checks (tick leg gone, hook registered, promptAsync only on the spawn
  path, toggle-first verdict order). Smoke count 105→102: the old
  promptAsync-era unit-2 checks adapted to the passive mechanism.
- worker-12 (ses_f33ee8eabffeaE0xuwZ7lc65NR) DIED at the context wall mid
  smoke-write (step-finish reason=length, output=23,156, total=170,238):
  forensics (MEM-0107) — ~34k tokens were two planning-prose messages + the
  whole-smoke read; the auto_resume.ts code diff was COMPLETE on disk; the
  in-flight smoke was salvaged verbatim (plan8_worker12_smoke_draft.md);
  worker-13 took over from the salvage — zero rework.
- Fixed the planner-prompt marker-sweep command (verified broken this
  session: `--include="*.md"` after `--` is swallowed as a FILE argument →
  the md filter silently dropped → the whole tree incl. the multi-MB
  plugin.log was searched; the fix puts `--include` before the pattern via
  `-e`, verified clean).
- TODO #85: part 3 hashes recorded (ded7245/5992f38) in this bookkeeping.
- NEXT (this iteration, unit 2): reduce the auto_resume smoke wall-time
  (his 2026-09-23_00-12 priority note) — spec + delegate.
- LIVE FINDING (his Unit-4 question, answered from the plugin log): my
  session was SPAWNED by the Unit-4 restart branch (log `spawn=`
  02:17:49Z; first user msg = the locked restartText) → the #85 part-1
  `spawned` self-mark (L754 check, L612 set, no clear path) scopes it
  "none" PERMANENTLY — Unit 4 never routes a self-spawned successor
  (measured: 3 idle events, `scope= none` 03:00:03Z, no recovery=/route=
  lines). A self-compaction close WITHOUT an action line therefore
  STALLS the plugin-driven loop (no live looprunner in this mode to
  resume via task_id); his `<|Autorun|>` "continue" rescued it but does
  NOT re-scope it (spawned check precedes the toggle). Design question
  filed as TODO #87 (4 options: stall / bounded re-spawn / looprunner
  handoff / re-arm on fresh busy). Also curated #86 (deferred worker
  audit) from todo_inbox 2026-09-23_01-08. NOTE: the LIVE plugin is still
  the PRE-part-3 build (opencode started before the ded7245 commit —
  log shows the old tick leg `skip= autoCompact-off` lines, 5s period);
  part 3 is on disk, live-activation = the next restart. The maintainer's
  autoCompact=OFF setting means the new Unit-2 nudge is also skipped
  live until he turns it on.
- Parked (need him, AFK): #82 live acceptance + (now resolved by design:
  Direct gates Unit 2); #80 close (his confirm); #83 backstop (his
  activation); the TODO.md curation review is in todo_inbox
  (2026-09-23_02-51) for the shrink unit.



## Compressed archive (one line each — details in git log + TODO/records)
- 2026-09-22/23 direct (ses_f39d250e9ffeheip2FVEeY5Fk6, planner Qwen3.8-27B-Q3S-160K, auto-resume branch — restarted mid-session into the planner-8 autorun) — #80 LIVE + live scope incident (quoted `<|autonom|>` → #82 root cause) + toggle design fully agreed (last-toggle-wins, own-line, ON=autonom/Autorun ci, OFF=Direct ci) + unit 2/4 semantics nailed + #85 parts 1+2 LANDED (97fccfc, b038b92) + part-3 final design (Unit-2 passive ctx-line suffix, no resume; Direct gates Unit 2 + beats planner in scopeVerdict; no <|Off|>) + spec written for the new planner; excess appended to nap_direct.md — details: git 8ae3ff3 + TODO #80/#82/#85
- 2026-09-21 looprun autorun-2026-09-21_15-33, iteration 7 (ses_f3a24dc3bffe59B5xpa0Ho3XZd, planner-7, Qwen3.8-27B-Q3S-160K) — plan7: UNIT B LANDED + re-verified (d4ef76e, worker-10, after the worker-9 cancel); #79 root cause (msgPairs `{data}` wrapper) + fix LANDED + re-verified (eaef397, worker-11); live acceptance deferred to the post-restart direct session — details: loop folder plan7_summary.md + git 05e62ed
- 2026-09-21 looprun 2026-09-21_15-33, iteration 6 (ses_f3a51aedcffeSa0cwt8PmwlXAr, planner-6, Qwen3.8-27B-Q3S-160K) — plan6: post-restart live acceptance (DUMP-OK LIVE PASS; the CROSS MODEL-READ live bug found + fixed 280b8d0 — dual-shape unwrap, the SAME root cause later filed as #79 for auto_resume `msgPairs`; Unit 2 `arm=` lines live; the Unit-4 spurious-recovery finding — corrected by planner-6 to the #79 shape bug) + the UNIT B spec committed (1c599a6; worker-8 stream-cut, zero loss; UNIT B toggle design decision recorded in plan6_summary.md: top-level optional `autoCompact` in the budget file, absent/true = ON, false = suppressed + `skip=` line, malformed = fail-open) + #78 filed, #70/#75 statuses — details: loop folder plan6_summary.md + git 280b8d0/a475d8a
- 2026-09-21 looprun 2026-09-21_15-33, iteration 5 (ses_f3acaf402ffexZ2GH0r5N0ZEWm, planner-5, Qwen3.8-27B-Q3S-160K) — plan5: Compact_memory UNIT A LANDED + planner-verified + landed-by-planner after the worker's context-limit death (6864bc0; 4-key args, config-resolved summarizer, queued message, DUMP-OK, stdio ignore; probe 241/241, 10/10 smokes, pytest 459+1w, ruff F=0) — details: loop folder plan5_summary.md + git 6864bc0/ab01f57
- 2026-09-21 looprun 2026-09-21_15-33, iteration 4 (ses_f3b1fb61effes4b4uZhoDYM3ix, planner-4, Qwen3.8-27B-Q3S-160K) — plan4: UNIT 3 live acceptance PASSED (trigger → spawn + marker file, both sides verified); UNIT 2 live acceptance FAILED → the live `session.status` shape bug found + fixed (`4b1a965`, smoke 40/40, live re-acceptance pending the next restart); UNIT 4 planner-liveness watchdog LANDED + planner-verified (`8e4f778`, smoke 53/53); gate green (probe 235/235, pytest 459+1w, ruff F=0); closed at the 90% stop line — details: loop folder plan4_summary.md + git bd5dfbe
- 2026-09-21 looprun 2026-09-21_15-33, iteration 3 (ses_f3b666ca6ffeEbClb1Q3r3gRYQ, planner-3, Qwen3.8-27B-Q3S-160K) — plan3: AUTO-RESUME UNIT 3 LANDED + planner-verified (worker `worker_Q3S_160K` ses_f3b555033ffem2gI9qBct1JZwG, spec `992c372`, code `ee75861` + friction `e62a8a6`) — the new-planner spawn helper (one-shot trigger file → `create()` + ONE queued `promptAsync`, `agent: planner_Q3S_160K`, no model field; `spawn=`/`spawn-fail=` lines; consume-on-failure; `spawned` map self-mark; `create` surface candidate) + #77 stale smoke pin fix (52/52) — details: loop folder plan3_summary.md + git 504105a
- 2026-09-21 looprun 2026-09-21_15-33, iteration 2 (ses_f3b948fcdffeiw3Lx7PsOzvP7I, planner-2, Qwen3.8-27B-Q3S-160K) — plan2: AUTO-RESUME UNIT 2 LANDED + planner-verified (worker `worker_Q3S_160K` ses_f3b8c19e9ffe2IoV4S9lrx0vSi, spec `3d51721`, code `d90973b` + summary `0a21139`) — the context-limit compaction trigger (queued `promptAsync` SELF-compact at ratio >= 0.85, once per busy cycle, one 5s gated tick; smoke 32/32; gates re-verified) + 3 spec-vs-reality discrepancies cured to the surface report §UNIT 2 supplement (SDK `provider.list()` not `get()`; top-level model pair; live-log growth invariant) + knowledge curation — details: loop folder plan2_summary.md + git 4faae29/b3df290
- 2026-09-21 looprun 2026-09-21_15-33, iteration 1 (ses_f3bd43f5bffe32mM8F3rQfaNh5, planner-1, Qwen3.8-27B-Q3S-160K) — plan1: maintainer destill task FILLED (destilled_mem.md + memory README) + knowledge curation (4 inbox entries + README + repo_commands caveat) + AUTO-RESUME UNIT 1 LANDED & planner-verified (d322927, smoke 14/14, probe 235/235) + probe [87] stale pin fix (TODO #76) + Unit 1 LIVE ACCEPTANCE PASSED post-restart (surface= line + 12,629 live event lines; verdict in the unit-1 surface report) — details: loop folder plan1_summary.md + git 8491a04
- 2026-09-18 looprun 2026-09-17_23-58, iteration 2 (ses_f4e47085affelnyR0nKkHeF54M, planner-2, Qwen3.8-27B-IQ4KT-140K) — plan2: BOTH units LANDED + planner-verified (Unit 1 = submit session/role autofill 86a977f; Unit 2 = #0 numword escape sentinel 4e2fd0c/67ccd73/281b6d9, S24 pins; gate probe 235/235, 9/9 smokes, pytest 459+1w, ruff F=0); incidents recovered (worker sandbox stop + context-limit dump/cross-compact/resume; my stop-line self-compact with DUMP-FAIL — committed checkpoint was the durable state); maintainer-domain tail (registration, live acceptance, AGENTS.md paste) closed in the 2026-09-18 direct session — details: archive/loop/autorun-2026-09-17_23-58/plan2_summary.md + git
- 2026-09-21 direct (ses_f3cb105d3ffetOmzWtMuDVBFN5, planner Qwen3.8-27B-Q3S-160K) — Phase 3 kickoff: the auto-resume build spec written as ONE slim proposal (4 ordered units, A/B/C referenced by path) + TODO #75 seeded; #74 CLOSED-ENOUGH (timeline root cause, old ik_llama, A/B 4-fail-vs-3-clean); spec revised per his two in-file comments (queued-prompt rule, Unit 2/3/4 restructure) and back at root — details: full section appended to `.opencode/archive/loop/nap_direct.md` + git 629d19d
- 2026-09-21 direct (ses_f4a3f85e1ffeO9206c9ENvkK0f, planner Qwen3.8-27B-IQ4KT-140K) — opencode-auto-resume research Phases 1-2 COMPLETE: map (Run C, verified) + deep-dives A/B/C all vendored into `knowledge/opencode-plugins/` (B consolidated from 3 runs + spec line fix 1084→1122-1159; C vendored byte-identical from Q3S worker ses_f3e0a156bffeQYDNsR9B4AfIbb); compaction budget ruling landed (3-bit cap→3, 2-bit row→1); TODO #74 filed (write-tool flakiness, host-side) — details: full section appended to .opencode/archive/loop/nap_direct.md (2026-09-21) + git 820a7bd
- 2026-09-18 direct (ses_f4c039ae2ffeRqvdPqGu8IdB37, planner Qwen3.8-27B-IQ4KT-140K, post-opencode-restart) — live acceptance PASSED for both pending items (submit registration, #0 escape via intercept.log); his AGENTS.md paste LANDED (submit one-liner + sentinel-gated escape block); prompt-rework 8 commits `671a582..e00d52b` mapped; memory pilot planner namespace seeded (MEM-0101/0102); maintainer-file discipline (MEM-0103) + IQ3KT-MTP corruption/recovery entry recorded; full section text appended to nap_direct.md — details: git cc8e8cb
- 2026-09-18 looprun 2026-09-17_23-58, iteration 1 (ses_f4e9ea998ffeQ3Pa0atv10oysQ, planner-1) — plan1: #53 unit LANDED in full (Part A 5e29cb0 friction-check close-down in all 4 role prompts, planner-direct + Part B worker-14 `submit` tool b83b34f + bookkeeping a8636ef; gate re-verified by planner: probe two-two-nine, 9 smokes, pytest 459+1w, ruff F=0; proposal → implemented/); pending maintainer-domain: submit registration + live acceptance + AGENTS.md paste — details: loop folder plan1_summary.md + git 4fd2065/f13886d
- 2026-09-17 direct (ses_f4f539d7cffeVeRhsFQRdoSRUC, Qwen3.8-27B-IQ4KT-120K) — the FST live-listener session: live capture (FST 0.1.2.4) + fuzzy/numword observer R0–R7 + R7.5 LANDED & live-accepted (baseline two-two-nine) + #56 distillation DEFERRED (his 2-2-0 ruling); TODO #65/#71/#73 + #70/#53 filed; maintainer domain left: live-listener restarts, AGENTS.md paste, FST live testing, #56 distillation — details: TODO + knowledge_plugins.md + decision-record §5 + git 0105b9f/dfda0dd
- 2026-09-17 direct (ses_f510a05ceffeE6SnMBlvti40DE) — #73 dedup-collapse build + planner-verified (spec d627403, code dce82ad, bookkeeping 9c701ed; gate 216/37/459+1w/F=0; M1 write guard untouched; flattenField pin lesson; the abs-path-not-rel design catch) + numword-escape proposal filed (da3ca41) — details: nap_direct.md + git dce82ad/9c701ed/da3ca41
- 2026-09-17 direct (ses_f53a10d24ffesL2Oc8jPqY1bBc) — R2 write-scope LIVE accepted post-restart (benign corrected + #72 hazard live-measured + display finding: post-mutation path shown, log field 5 = authority); #72 M1 ruling recorded + LANDED (9ec4c0b) + live-accepted; dump-fail evidence (hung child in host, not script slowness; DUMP-OK suggestion); path-repair topic opened + R7/R8 STAGED (his ruling; allowlist config-derived; R9 parked); R7 design (substitution bar approved) + FOUNDING (ee19a84; 1-seg bypass amendment 134b107); realistic nested doubling REJECTED → #73 filed — details: nap_direct.md + git 35f8143/9ec4c0b/ee19a84/24daf1e
- 2026-09-16/17 looprun 2, iteration 2 (ses_f556cadecffeH5P5uZNS33i20R, planner Qwen3.8-27B-IQ4KT-140K) — plan2: read-scope fuzzy + pair convention `[left:right]` ruled (supersedes pipe form); R1 (96bb173) + R2 (35f8143) landed + verified, gates 206/206 + 35/35 + 459+1w + F=0; TODO #65-72; details: loop folder plan2_nap.md + git 4030e01
- 2026-09-16 direct (ses_f54ee6ba8ffeeoFUc1zptUtsb5) — fuzzy/numword topic: #66 LIVE verdict, pair convention + scratchpad-sandbox ruled (decision record), R1/R2 live acceptance, incidents (worker inbox trim, producer-drift 3/3, line-153 correction), R6 staged; details: nap_direct.md + research/fuzzy-numword/ + git d1c148b..4030e01
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






## Standing
- Baselines (re-verified 2026-09-22 by the planner, post-#81):
  probe **241** [two-four-one; self-annotated header total is the source
   and agrees with the reported total — machine-verified; [97] re-pinned
   to the temp-fix behavior in #81]; smokes **all green** (auto_resume
   102/102 post-#85 part 3, compact_memory 57/57 post-#84, intercept_observer
   39/39, submit 20/20; the per-suite counts are in each smoke's own
   readout — no total kept here); pytest **459 passed + 1 warning (the known
   #10 coroutine warning)**; ruff **F=0**.
- Cross-compaction (measured 2026-09-18 plan2; re-verified live 2026-09-22):
  `compact_memory` with a foreign sessionID — no model args in the tool
  schema; the summarizer model resolves per `agent.compaction.model` (set in
  opencode.jsonc) ELSE from the target session's own config (live 2026-09-22:
  worker-11 dispatch resolved to `Qwen3.8-27B-Q3S-110K-MTP` = the target's
  own model; compaction applied, session resumed clean). CPU models are
   denied (cap 0). The SELF path was BROKEN on this build (race: queued
   message delivers before compaction applies → cache invalidation →
   hard-limit stall) — FIXED by the maintainer's temp fix 0f192e5
   (the queued-message promptAsync commented out) + VERIFIED LIVE
   2026-09-22 14:42 (COMPACT line landed, gauge dropped 144944→~57k);
   the proper message-path fix is still open (the gate pins ride the
   temp-fix behavior via #81 until then).
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
- Delegation: Task tool (`subagent_depth` 2); the roster is LIVE-edited in
  opencode.jsonc — verify BEFORE every launch (2026-09-22: active
  `worker_Q3S_160K` + `worker_gemma_Q4_128K`; `worker_Q3S_110K_mtp` /
  `worker_Q2XS_210K_mtp` commented out mid-run — a launch against a
  commented agent fails with "Unknown agent type"); raw `agent_*` =
  fallback; explorer = fast, less stable — ALWAYS verify its work.
- NO parsing of `.opencode/plugin.log` (call-1 one-shot only, default SKIP).
- TODO.md curation: open items + one-line records in TODO.md; full text of
  closed entries in `todo_records.md` (formalized by split proposal part 3).
- **Disclosure (dc3f137):** the `git add -A` there also staged the maintainer's live `opencode.jsonc` (compaction.keep now system:true / tokens:60000 / messages:20) and his new draft `draft/compact_memory/compact_memory.ts` (72 lines) - both were in the working tree at commit time. Nothing was reverted; maintainer decides whether that belongs in the git record.

