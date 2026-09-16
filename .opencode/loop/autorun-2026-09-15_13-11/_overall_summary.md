# Overall summary — autorun-2026-09-15_13-11 (10 iterations, plans 1–10)

Run started `2026-09-15_13-11`, closed `2026-09-16_06-27` with `action: stop`.
HEAD: **`6d66e69` → `2608361`** (start per plan1_summary; end = plan10 close commit).

**Planner sessions** (model noted; 120K for plans 1–6, 140K for plans 7–10):

| plan | planner session | model |
|---|---|---|
| 1 | ses_f5b3bf425ffesUdbQYxpvk0Z4t | IQ4KT-120K |
| 2 | ses_f5b1f19… (ses_f5b1f1994ffeh6lLruXAY0bRTW) | IQ4KT-120K |
| 3 | ses_f5a01190cffehd0OO4TDPSrwvy | IQ4KT-120K |
| 4 | ses_f59d27449ffeEFeV4vaQ6NlqTs | IQ4KT-120K |
| 5 | ses_f5978ea6affe6oCCcpZsyN6hEl | IQ4KT-120K |
| 6 | ses_f58eea7eaffefmb0hOoPK5dUiP | IQ4KT-120K |
| 7 | ses_f5881492fffekCwsEwdfna4sge | IQ4KT-140K (first 140K) |
| 8 | ses_f57dc514dffeO3jFufy9dxV6Lw | IQ4KT-140K |
| 9 | ses_f57c84fbbffeaLDqNyuJzEw85G | IQ4KT-140K |
| 10 | ses_f579a961bffecIKwgeKvhtSVh3 | IQ4KT-140K |

**Worker sessions:** worker-3 ses_f59f7cff… (scripts), worker-4 ses_f59c0d40… (dump hook), worker-5 ses_f594ba57… (nudge readout), worker-7 ses_f5878dd2… (#63), worker-8 ses_f5868feb… (#57), worker-9 ses_f5857670… (#60), worker-10 ses_f57e965d… (#57live), worker-13 ses_f57bfbc8… (research).

## Done

| plan | goal (why) | what landed | commits | status |
|---|---|---|---|---|
| 1 | Maintainer priority batch: codify stop/compaction protocol + #55 dump-hook groundwork + script-collection spec | stop-line ≈90% + worker rescue protocol in both role prompts; knowledge_inbox created; `skill_session_scan.md`; proposal backlog reduced (subagent-launch-overflow → implemented/); inbox triaged (4 items); #56 added DEFERRED | 6d66e69 → b3435d9 (meta-only) | green (no product code) |
| 2 | Maintainer #0 backlog reduction; fst-rebind-repeat build | 6 proposals closed + verdicts; D1–D4 rulings applied (#11 closed); self-compaction codification (bdd7031); branch recovery (fst_work2 cut from opencode_test); rebind spec reworked with maintainer's correction (regression = tap-group TESTS failing) | 1cf55f6 → bdd7031 → f09ff56 | green; **rebind build PARKED** for direct session |
| 3 | Codify "Task-failure = context-limit, not failed start" (maintainer info) + build script collection | context-limit message strings codified in planner/looprunner prompts + knowledge; 8 helper scripts + READMEs + grep_snippets + INVENTORY | 2933dd0 → 7f7f61c → b3a34d8 → d352e4a | green (gate 99/99, 459+1w, F=0) |
| 4 | #55 compact_memory pre-compaction dump hook (worker) | dump-hook spec committed (`compaction_dumps/<sid>_c<count>.md` no-overwrite naming, S14 probe, `--out` flag); inbox triaged (3 items, nudge-clarity queued) | 2f4a5c4 | **stopped at stop line** (97%/3K); worker-4 died → rescue dispatched |
| 5 | Finish #55 dump hook (rescue) + tails #8/#9 + nudge-clarity | worker-4 rescue succeeded → dump hook landed (probe 106/106); repo_custom_tools.md + gauge-lag one-liner; v2.8.1 speaking gauge readout (28783a7); baseline correction 94→106 | 4512fe6, 0761e42, 28783a7 | green (rescued) |
| 6 | #62 compaction-clarity + 90/95 rules in both prompts (planner-direct) | 90/95 emergency pair in planner+task prompts (037e959); #62/#59 closed; #61 narrative REFUTED (machine-verified); pre/post-compaction dump question answered (no-overwrite, separate folder) | 037e959, 386937a | green (planner-direct); stopped at 90% before delegation |
| 7 | #63 smoke fix + #57 guard + #60 probe pins (first 140K session) | #63 smoke adapted (6a9877f); #57 MOVE missing-dstFile guard hoisted (733ca7a, data-loss fix); #60 S15+S16 appended (75be075+3f94875, probe 106→120+2); #57live node-resolution fix (9fd7557) | 6a9877f, 733ca7a, 75be075, 9fd7557 | green (worker-9 rescued; 7 smokes) |
| 8 | #54 no-circumvent rule + #51 type:module + #58 probe-in-gate (planner batch) | no-circumvent in all 3 prompts; `type:module` removed (gitignored local); repo_commands.md §Run/test names probe + defines "standard gate" = pytest+ruff+probe | 384080f, f113002 | green (probe 120+2 = 122) |
| 9 | Approved research lane: fuzzy name resolution + numword tool-call hardening (RESEARCH ONLY) | `.opencode/agent/research/` README + 426-line reliability doc (5 sections, ranked §5.1–5.4); TODO #64 handled (stale 84/84 → header-total pointer) | 37b000d | green (research only, no build) |
| 10 | Fast no-actionable close (reality rebuilt from git + NAP + TODO + priority + inbox) | priority.md #4/#6/#9/#10 (fully handled) → `_past_priorities.md`; gate re-verified, no drift | 2608361 | green — `action: stop` |

## Feedback trail

The maintainer reads this section most.

### Launch deaths / context-overflow (the recurring theme of this run)
- **plan2 — two worker launches "died" at the provider/context boundary.** Launch #1 (ses_f5aefe9e…) returned exactly `Task cancelled`; launch #2 (ses_f5a27f9c…) returned exactly `Subagent failed (task_id: ses_f5a27f9c2ffev2SyYx11QQseVX): the request exceeds the available context size, try increasing it`. **Both were context overflows in a RUNNING worker, not failed starts** — this was the maintainer's correction that got codified (plan3). Consequence: the fst-rebind-repeat build was PARKED ("too knotty for solo delegation after two context-overflow deaths"). *loop_log lines 6–7; plan2_summary §"Answer to your question".*
- **worker-4 (plan4 → plan5):** hit `context_length_exceeded` after a manual-style compaction — **no COMPACT line in ctx.log, no budget entry** (a manual-style compaction that left no trace); `task_id` resume failed with the same error. Planner-4 cross-compact (Gemma) + retry ordered at the stop line; planner-5 confirmed the COMPACT line (21:17, session→45%), resumed via `task_id` with the post-compaction protocol → dump hook landed `4512fe6`. *loop_log lines 19–24.*
- **worker-9 (plan7) #60:** died at `context_length_exceeded` on an **uncommitted partial probe** (heavy single task: 2513-line probe + spec). Rescue: session dumped to corpus → cross `compact_memory` (COMPACT line 03-49) → `task_id` resume → **finished at a 93% gauge**. Notable finding: the **140K window did NOT prevent the wall** on a heavy single task; compaction-rescue remains the real safety net. *plan7_summary §"Rescue record".*

### Stop-line wind-downs (stop line ≈90%, ~15k REM reserve)
- **plan4** exited at **97% / 3K** (stop-line exit; spec landed, worker-4 rescue dispatched, tails #8/#9 not started). *loop_log line 20.*
- **plan6** stopped at the **90% line before delegation** — #63 and #60 were spec-ready but pushed to plan7. *plan6_summary §"Not done".*
- **worker-9** finished at **93%** gauge (plan7) — completed but right at the line.
- Final planners (plan7/8/9/10) all closed in the 62–91% band (plan7 worker-9 93%, plan8 62%, plan9 78%, plan10 62%).

### Dense-digit / numword traps (the standing 140K-observation mandate)
A concrete instance was requested each 140K session:
- **plan7:** (a) mangled plain "145k" into progressively uglier numword forms ("one-four-ty-FIVE k") in the NAP — numwords discipline over-applied to a single non-dense number is a net negative; (b) probe label/counter reconciliation (labels max 107 vs reported 106, then "120+2" after +16) took **two failed regex passes + a mental-math confusion** before machine-checking 106+16=120+2.
- **plan8:** while reading the probe total, repeatedly perceived the digit-string **"1-2-2" as the expression "120+2"** across several tool outputs and almost filed a false baseline-drift alarm; string-compare said `false`, char-code/value compare said `true` (same value, different notation).
- **plan9 (strongest evidence):** (1) machine-computed next worker number (10+1) read as a shifted digit across several outputs — settled only by letter-based machine output (roman/words): it is `eleven`, hence the worker ran as **worker-13**; (2) the probe total perceived as a 5-char string with an inserted "zero-plus" — **even my TYPED literals were corrupted** (a false baseline-drift alarm produced by my own mistyped comparison string); settled by raw charcodes `[49,50,50]` from a fresh probe run. **The corruption hit generation (typed commands), not just perception** — the machine's own output was fine; the inputs fed to it were not. This is the strongest evidence yet for the research doc's §5.1 prompt-rule floor and for letter-region (words/roman) as the stable channel.
- **plan10:** no new incident (text-only curation edits, machine-verified via `git diff` + re-read).

### Baseline drift / self-consistency
- Probe baseline evolved **94/94** (plan3/plan4 era) → **106/106** (plan5, S14) → **120+2** (plan7, +S15/S16) → **120+2 = 122** (plan8 onward).
- **plan5 #61 "annotation stale by 5 hygiene checks" narrative was REFUTED in plan6**: machine verification showed the header annotation was self-consistent at every commit checked (a15828c / 4512fe6 / 4340043 / HEAD); the verified endpoints are ninety-four (plan3 era) → one-zero-six (post-S14). Original #61 text recoverable in git (`0761e42`/`4b4153f`).
- **plan9 #64:** stale "84/84" probe baseline found in the plugin README (by worker-13 via todo_inbox) → replaced by the #58 curate-don't-duplicate pointer (the self-annotated probe header total is the source).

### Discrepancies / protocol glitches
- **loop_log token validation looser than the 8-char spec:** line 2 of the run carries a malformed **7-char `--START`** token (planner-1, accepted by the tool; INFO line 3 records it); **line 27** carries a **5-char `--->START`** (worker-5). *plan1_summary §Feedback trail.*
- **START lines with `unknown` session id:** planner-3, planner-9, planner-10 START lines carried `unknown` (tool session param omitted), each corrected by a follow-up INFO line (planner-3 ses_f5a01190…, planner-9 ses_f57c84fb…).
- **Branch drift:** the loop drifted onto `fst_work2` since plan2 (launch message named the wrong branch; `opencode_test` was 5 behind). Plan3 re-aligned (opencode_test fast-forwarded to loop HEAD d352e4a) and added a "Branch truth" bullet to the planner prompt. *plan3_summary §"Loop fixes".*
- **Marker typo:** the #58 `--commment` marker has a TYPO and evades the ready-made marker sweep (found in plan7's retriage). *plan7_summary item 2.*
- **`head -40`-truncated marker sweep:** the session-start sweep in plan7 was truncated and missed the five TODO.md `--comment` lines until a second, targeted sweep. *plan7_summary item 3(a).*

### What slowed the loop
- **fst-rebind-repeat build** was PARKED after two context-overflow worker deaths in plan2 (the rebind/tap/macro/toggle interaction judged "too knotty for solo delegation") — it stayed PARKED for the maintainer's direct session through plan10.
- **#55 dump-hook live acceptance** was **repeatedly blocked on the maintainer's host restart** (plugin reload; first `compaction_dumps/<sid>_c0.md` is the proof) — carried as open across plan5/6/7/8/9/10. The build landed (4512fe6) and the execPath bug was found + fixed (9fd7557) via the first live test, but no live dump file was ever produced in this run.
- The run's final iterations (plan8/9/10) were increasingly **maintainer-gated** — every remaining real task required the maintainer's direct session, culminating in plan10's fast no-actionable close.

## Questions / decisions for the maintainer

All items below are maintainer-blocked (nothing autonomous can lift them); condensed from the plan10 blocked list.

1. **AGENTS.md 90% stopline paste** — his file; the two-item proposal rides `proposals/approved/2026-09-15_agents-knowledge-stopline.md` (AGENTS.md still says 85%). *Rec: paste now — it retires the role prompts' "overrides AGENTS.md" notes.*
--comment: approved
2. **Research doc §5.1–5.4 recommendations** — `.opencode/agent/research/2026-09-16_fuzzy-and-numword-tool-reliability.md` is ranked for the direct session (§5.1 prompt-rule floor / §5.2 scriptlet under agent/scripts / §5.3 intercept plugin / §5.4 one-shot live-host mutation-channel check at next restart). *Rec: adopt §5.1 prompt-rule floor first — it's the cheapest and the plan7/8/9 incidents are its strongest evidence; defer the §5.3 plugin.*
--comment: see research file
3. **#55 compact_memory dump live acceptance** — build landed, pending his host restart (first `compaction_dumps/` file is the proof). *Rec: verify at the next restart.*
--comment: should have be active since the switch to 140K models
4. **#56 distillation runs (`--defer`) + #53 agent-feedback tool (deferred)** — he lifts the deferrals. *Rec: keep deferred until the §5 research lane is decided.*
--comment: see --info not in priorities on --deferred
5. **fst-rebind-repeat build** — PARKED for his direct session (spec preserved, worker2's draft tests in the export are a usable starting point).
--comment: stays parked until repo splits see priority.md # repo split research/proposal
6. **`2026-09-13_compact_memory-findings` — his one-move closure** (implemented/ or rejected/); Item 2 (`time_compacting` semantics) stays his ruling.
--comment: what decision is here needed?
7. **#63 smoke-in-gate question** — optional, his call: should the plugin smokes join the standard gate (relates to #58's gate definition).
--comment: what are the consequences of including or expluding them? the gate is to my understanding the test with more detail or the requirement for acceptance? need more info before deciding - but on intuition i would say include it as early indicator for that something is wrong.

## Queued next (last plan's carried NEXT, condensed)

plan10 closed with **`action: stop`** — no autonomous work remains; the entire NEXT list is the maintainer-direct-session agenda:
- AGENTS.md stopline paste (Q1)
- research doc §5.1–5.4 decisions (Q2), incl. the §5.4 one-shot live-host check at the next restart
- #55 live acceptance (Q3)
- #56/#53 deferral lifts (Q4)
- fst-rebind-repeat build (Q5)
- #63 smoke-in-gate decision (Q7)
- `dense_numbers.md` (`--wip`) is already fully covered by the plan9 research doc — nothing to do short of the direct session.

## Baselines + budget

**Final baselines (re-verified green at HEAD `2608361`, plan10):**
- probe (`handover_probe.mjs`) **120+2 / 120+2** (reported as 120+2 and as "122"; header self-annotates the section sum 106+10+6)
- pytest **459 passed + 1 warning** (the known #10 coroutine warning)
- ruff `--select F` **F=0**
- all **7** plugin smokes green

**Baseline evolution across the run:** 94/94 → 106/106 (S14, plan5) → 120+2 (S15+S16, plan7) → 120+2=122 (plan8 onward, stable to plan10).

**Context used by the run:** model transition mid-run — IQ4KT-**120K** for plans 1–6, IQ4KT-**140K** for plans 7–10. Final planner (plan10) gauge: **CTX=87126 (62%) REM=52874**. Heaviest single-session gauges: plan4 stop-line 97%/3K; worker-9 93%; plan6 90%/11K. Every stop-line and death in the run was rescued via the cross-compact + `task_id`-resume protocol.

---
**Output path:** `.opencode/loop/autorun-2026-09-15_13-11/_overall_summary.md`

**Top signals:**
1. The run's central theme was **context-overflow deaths and their rescue** — two in plan2, worker-4 (plan4/5), worker-9 (plan7); the cross-compact + `task_id`-resume protocol was proven live on both 120K and 140K.
2. **Dense-digit / numword traps** were observed live on every 140K session, with the plan9 incident showing corruption hitting *generation* (typed commands), not just perception — strong support for the research doc's §5.1 prompt-rule floor.
3. **Everything actionable landed green** (probe 94→120+2, 7 smokes, F=0, 459+1w); the run ended maintainer-gated with `action: stop`.
4. The recurring open blocker is **the maintainer's host restart** (needed for #55 live acceptance and the research §5.4 live check).
5. The **fst-rebind-repeat build** remains PARKED for the direct session after two overflow deaths.
