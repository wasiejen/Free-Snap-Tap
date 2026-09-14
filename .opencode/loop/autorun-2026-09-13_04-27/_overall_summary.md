# OVERALL SUMMARY — autorun-2026-09-13_04-27 (4 planner iterations, fully finished)

Planner sessions: plan1/plan2 `ses_f676f6a82ffe960mvrZD9W0DjQ` (same session, plan2
= plan1's session resumed at the stop line), plan3 `ses_f674587ecffeaYLsKgST57D0ve`,
plan4 `ses_f66fe2c4dffegaGBq3zg1QTZGl` → adopted by relaunch
`ses_f6653f01fffevE1LCJvK8J0Ld4`. HEAD: start `1cf5dc0` (04-05 "safe state before
autorun") → end `61622b2` (09-56 plan4 wind-down). Run closed with a stop; the 14-31
loop-log line is a maintainer summary request answered in-session, no loop-state change.

## Done

| plan | goal (why) | what landed | commits | status |
|---|---|---|---|---|
| plan1 | Codify the compaction-resume protocol (maintainer instruction) + live acceptance of the compact_memory plugin fix | Worker prompt gains the compact_memory-live block (checkpoint before firing; post-compaction protocol on resume); planner prompt gains "compacted worker = resume, not relaunch" (same sessionID via task_id). Live acceptance DONE: compaction part `{"type":"compaction","auto":false}` in DB (part `prt_0989b3bb1001BOaL89rlDAXOmT`), 3649-char structured summary attached, reload directive verbatim in the tool output, budget v2 1/3 + COMPACT line in ctx.log — the active host runs our plugin | `4f61a42` (protocol), `c89646e` (worker-1 Phase A checkpoint), `bdc4504` (acceptance + close) | green (rescued — resume died, Phase B verified planner-direct) |
| plan2 | — (no new work: session resumed at the stop line) | Committed-state rebuild only: HEAD `bdc4504` current, NAP current, findings proposal still awaiting approval, inbox unchanged | `51350e2` (bookkeeping) | green (wind-down) |
| plan3 | nap-size build (approved, top buildable): Part 1 prompt rule + Part 2 NAP cleanup delegated; TODO #52 close | TODO #52 CLOSED (full text to `todo_records.md`, next-ID header fixed #54/#55). nap-size Part 1 LANDED: planner prompt carries `## NAP size discipline (session close)`. Part 2 spec committed (DoD: NAP ≤ 150 lines, no information loss); delegation launch DIED — retry order recorded in NAP | `4db7505`, `81a47d9`, `a018f49` (+ `03eeba9` early handover at 71%) | green for Part 1 + #52; Part 2 launch died |
| plan4 | nap-size Part 2 retry per recorded order (step 1 = Q3-MTP, step 2 = Q4, step 3 = self-fallback) | Both delegation retries DIED at request-level context overflow (zero artifacts); retry order fully exhausted → escalation proposal `proposals/2026-09-13_subagent-launch-overflow.md` filed; step-3 self-fallback (planner-direct NAP compression) queued + prepped (29-section list, `plan4_sections.txt`); loop log + proposal + NAP committed | `6af5f9a` (start), `61622b2` (wind-down) | died (all 3 worker-launch attempts across plans 3+4); wind-down green |

## Feedback trail

The run's dominant friction is **host-side subagent-launch context overflow — every
delegated text-worker launch in plans 3+4 died with zero artifacts**, plus one rescued
acceptance in plan1:

1. **plan1 — worker-1 resume-via-task_id failed** (loop log 04-45 WARNING, session
   `ses_f6765a68bffeudOXmVzLROTYk6`): after its self-compact, resume was rejected
   with `the request exceeds the available context size` — the server's summarize
   schema carries no keep key, so the requested keep (12 msgs / 30K) was not honored.
   Rescued planner-direct (established T2 rescue pattern): all acceptance points are
   DB/file facts, verified verbatim (worker handover `plan1_ho_task_to_planner.md`).
   Headline finding: **self-compact near the window top makes the session
   unresumable**; worker's budget (1/3) consumed regardless.
2. **plan2 — relay protocol misfire** (loop log 05-04 INFO): the maintainer relay
   keyword-triggered on plan1's compact_memory content and applied the post-compaction
   protocol, but the resumed session was NOT compacted (full iteration-1 context
   intact). Session was at the stop line (86% / REM 16K) → minimal committed-state
   rebuild, no new work started. Protocol nuance surfaced: keyword trigger does not
   imply an actual compaction happened.
3. **plan3 — Q4 text-worker launch died** (loop log 06-20, session
   `ses_f67324bf4ffeEeQMPWJBhFGRya`): `context_length_exceeded` at ~step 16 (read
   phase), 6 host retries over 13 min, zero artifacts — no WIP to rescue (T2 pattern).
   Unsolved host-side quirk noted: the same model+agent runs fine in the parent
   session at 80 % context.
4. **plan4 retry step 1 — Q3-MTP text-worker died** (loop log 08-33 WARNING, session
   `ses_f66f1edc9ffeB78gLoWb4LjunF`): request-level `context_length_exceeded`; server
   log shows 6 host retry pairs over 13 min on Qwen3.8-27B-IQ3KT-120K_MTP, zero
   artifacts — the Q3-MTP prefill exceeds its available context.
5. **plan4 retry step 2 — Q4 text-worker died instantly** (loop log 09-17 WARNING,
   session `ses_f668543dcffebxrGu3meTIjVrp`): instant request-level "the request
   exceeds the available context size". Both delegation paths exhausted → escalation
   proposal filed + bounded-read self-fallback queued per the recorded retry order.
6. **plan4 relaunch adoption** (loop log 09-53 INFO, session
   `ses_f6653f01fffevE1LCJvK8J0Ld4`): the fresh planner session adopted the dead
   predecessor (both delegation retries dead, escalation proposal filed, work
   uncommitted) and committed loop log + proposal. Hit the stop line at 89–90 %
   before the compression unit could start.
7. **Stop-line wind-downs throughout**: plan1 DONE at 74%/30K, plan2 resumed at
   86%/16K (no work), plan3 wind-down at 84 % (no self-compact — per the findings
   proposal, self-compact near the window top risks an unresumable session), plan4
   predecessor at 96 % (`61622b2`). The loop never broke a stop line.
8. **Discrepancies found and fixed in-run**:
   - `maintainer/done/context_async_compaction.md` showed an unstaged touch — plan2
     read it as a maintainer edit and left it alone; plan3 determined the uncommitted
     replier block was planner-1's own bookkeeping and reverted it to committed state
     (`4db7505`).
   - Part 2 spec (`a018f49`) was written with "23 sections"; the machine-derived
     section list at relaunch found **29 closed sections** (spec count stale) →
     `plan4_sections.txt` supersedes it.

## Questions / decisions for the maintainer

1. **`proposals/2026-09-13_compact_memory-findings.md`, item 1** — self-compact near
   the window top makes the session unresumable (server summarize schema has no keep
   key; the requested keep 12 msgs/30K was not honored). Options: (a) lower the
   self-compact trigger to ≤50–60 % (one-line prompt edit), (b) server honor a keep
   field (your domain). **Recommendation: (a) now, (b) as the durable fix.**
2. **Same proposal, item 2** — `time_compacting` is NULL on the session row
   post-completion (transient live flag, or not set for manual compaction). **Rec:
   treat the compaction PART as the durable record and close as-is unless you intend
   to change the flag's semantics.**
3. **`proposals/2026-09-13_subagent-launch-overflow.md`** — three delegated
   text-worker launches (Q4 plan3, Q3-MTP plan4-1, Q4 plan4-2) all died at
   request-level context overflow on this host with zero artifacts, while the same
   models run fine in parent sessions. **Rec: rule it a host defect (your domain);
   meanwhile let the step-3 self-fallback (planner-direct NAP compression) proceed —
   it was queued exactly because delegation is currently dead on this host.**
4. **AGENTS.md mirror hunk** — nap-size Part 1's AGENTS.md mirror stays queued for
   the AGENTS.md copy flow (proposal B, which also bundles the gauge-lag hint + TODO
   #5 + #6 additions). **Rec: bundle into the next AGENTS.md sync.**

## Queued next (last plan's carried NEXT, condensed)

1. **Step-3 self-fallback: planner-direct NAP compression** — the spec is
   `plan4_ho_task.md` (copy of `a018f49`), the section list is `plan4_sections.txt`
   (29 sections, machine-derived, supersedes the spec's "23"). DoD: NAP ≤ 150 lines,
   no information loss, over-long detail → `plan<N>_nap.md` / `archive/loop/nap_direct.md`.
   Bounded-read protocol inside the spec.
2. Carried from plan1/plan3 NAP §NEXT (unchanged order): snippet_collection +
   priority #4 (small) → proposal B (agents.md additions) → test-file-home proposal →
   helper-scripts explorer task.

## Baselines + budget

- **Final baselines (carried all run — no FST product code touched):** probe 98/98,
  smoke 23/23, pytest 459+1#10, ruff F=0.
- **Context used by the run:** 4 planner sessions (one of them resumed at the stop
  line), 1 worker (worker-1, self-compacted, budget 1/3 consumed), 3 dead
  text-worker launches. Gauges: plan1 close 74 %/30K; plan2 resumed 86 %/16K; plan3
  early handover 71 % / close 89 %/13K (wind-down 84 %); plan4 predecessor 96 %
  (`61622b2`), relaunch 89–90 % before the compression unit.
