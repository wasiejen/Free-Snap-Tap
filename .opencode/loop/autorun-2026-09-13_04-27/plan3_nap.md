
## COMPRESSED 2026-09-15 (Part-2 cleanup, ses_f5d9e86a6) — verbatim section text (no-loss rule)

## 2026-09-13 (iteration 3; ses_f674587ecffeaYLsKgST57D0ve) — nap-size build: Part 1 LANDED (`81a47d9`); Part 2 cleanup delegated (text-worker); #52 CLOSED (`4db7505`)
- **Start:** HEAD `51350e2` (plan2 wind-down; no new maintainer commits); findings
  proposal still at the proposals root (AWAITING APPROVAL); inbox unchanged
  (5 items). Working tree: `priority.md` M (uncommitted maintainer change —
  READ-only, leave alone; NOT committed, NOT removed) + `done/
  context_async_compaction.md` M (my own iter-1 replier block left uncommitted;
  plan2 misread it as a maintainer touch → reverted this session, `4db7505`).
- **Bookkeeping committed:** `4db7505` — TODO #52 CLOSED (full text →
  `todo_records.md` + one-line record in TODO.md; live acceptance DONE iter-1)
  + next-ID header fixed (#54 used / #55 next).
- **nap-size Part 1 LANDED (`81a47d9`):** planner prompt gains `## NAP size
  discipline (session close)` (compress own section at close; over-long detail
  → loop-folder `plan<N>_nap.md`, direct sessions → `archive/loop/nap_direct.md`
  append-only; NAP = header + archive + Standing + current section; baselines
  updated IN PLACE in Standing). The AGENTS.md mirror hunk stays queued for the
  AGENTS.md copy flow (bundled with proposal-B items: gauge-lag hint + #5
  knowledge rule + #6 grep-limit rule — exact text owed in the proposal).
- **nap-size Part 2 DELEGATED → LAUNCH DIED (this session):** spec committed
  `a018f49` (= loop-folder `plan3_ho_task.md`); launch of fresh
  `planner_Q4_120K` in PLANNER-AS-TEXT-WORKER mode DIED: session
  `ses_f67324bf4ffeEeQMPWJBhFGRya` ran ~16 steps (read phase — NAP + supporting
  files) then `context_length_exceeded` ×6 host retries over 13 min (server log
  `~/.local/share/opencode/log/opencode.log`), ZERO artifacts (no writes, no
  commits) — the T2 pattern with no WIP to rescue. The overflow at ~16 steps /
  ~50K content on a 120K window is UNSOLVED (my own session on the SAME
  agent/model runs fine at 80 %) — host-side quirk, do not re-diagnose from
  scratch next session. RETRY ORDER (next session): (1) fresh
  `planner_Q3_120k_mtp` text-worker, same spec; (2) if that dies the same way →
  `planner_Q4_120K` once more; (3) if BOTH die → STOP burning iterations: flag
  it as a host-side launch defect in the findings-proposal queue / a new short
  proposal (subagent launch context overflow on this host) and fall back to
  doing the compression myself in a fresh session with bounded reads (sections
  in chunks of ~150 lines, compressed line written per chunk to a scratch file
  in the scratchpad, final splice at the end).
- **On worker return (verification checklist, carried):** verify against git
  log + diff + line count (≤150) + 3-line spot-check; land any knowledge
  candidates (small, my edits); copy the worker summary in as
  `plan3_ho_task_to_planner.md`; then, IF BUDGET ALLOWS: priority #4 (one-line
  ready-made marker-grep command in the planner prompt) + `snippet_collection.md`
  → done/ (replier: marker line landed; the full recipe collection merges into
  the queued helper-scripts explorer task); NAP section current +
  `plan3_summary.md` + action line.
- **NEXT (in order, carried):** 1. HIS rulings on the findings proposal
  (item-1 threshold edit lands on approval — it changes L3 behavior of every
  role prompt). 2. Priority #2 (compact_memory usage guideline + return-value
  `COMPACTION: n/m` line + emergency-extend question) — file a short proposal
  with recommendations IF budget allows. 3. Proposal B (AGENTS.md copy flow:
  nap-size Part-1 mirror hunk + gauge-lag hint from `gauge_mismatch.md` + #5
  knowledge rule + #6 grep-limit rule — exact proposed text). 4. The two bigger
  inbox items (helper-scripts explorer task; test-file-home proposal). Standing
  gated (unchanged): #11, #51, #53, #54, the SWEEP, host-side registrations.
- **Baselines (carried — no FST code touched):** probe **98/98**, smoke
  **23/23**, pytest **459 + 1 #10**, ruff **F=0**.
