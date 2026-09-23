# plan9 summary — autorun-2026-09-21_15-33 iter 9
(planner-9 ses_f322793f5ffeI34HE19SEmxU43, Qwen3.8-27B-Q3S-170K;
Unit-4 restart branch after planner-8's `action: restart`)

## Done this session
- Triage: priority.md `# 2026-09-23_04-20` (marker-sweep 17k-token noise)
  CLOSED — the fixed sweep command verified committed (8f21b1e) and
  re-run clean (only legitimate .md hits) → the line moved to
  `_past_priorities.md` with the reply.
- UNIT A LANDED + planner-verified (commit 2240d00, worker-15
  ses_f32120a60ffeoM8J0xg8Sb5Yym, worker_Q3S_170K): plugin-spawned
  sessions carry the title `<loop-folder> planner-<N>` — `body.title` on
  the SHARED `spawnPlanner` helper's create call (both spawn paths:
  Unit-3 file-trigger + Unit-4 restart) + an `ident=` bit in the `spawn=`
  log line; no loop folder / no `planner-<N>` line → no identifier
  (spawn exactly as before, the prompt-prefix fallback unused). The
  bounded SDK answer was YES: vendored `@opencode-ai/sdk` types in
  `.opencode/node_modules/` (`SessionCreateData.body?: { parentID?,
  title? }`). Two new smoke checks (deterministic loop folder
  `autorun-test_0-0` → title `autorun-test_0-0 planner-8`; no-planner-
  line regression → no title). Measured: auto_resume smoke 104/104
  (102 baseline, no removals) — planner's OWN run ALL PASS in 13.1 s;
  other 9 smokes all green; probe 241/241; pytest 459 passed + 1
  warning (#10); ruff F=0. TODO #89 (hash recorded in the planner's
  bookkeeping per the commit-hash rule).
- Incident: the worker-15 launch DIED on a backend crash (connection
  error — host side; the maintainer applied a first fix and is
  investigating). The session had a COMPLETE planning phase (33 msgs /
  ~54k) and ZERO file changes → resumed via task_id per the maintainer's
  order; the intact planning carried through — finished in one go, zero
  rework.

## Carried / pending (need the maintainer or a future restart)
- #87 (Unit-4 cannot revive a dead self-spawned successor — 4 design
  options, maintainer call); #80/#82/#83 (maintainer items); live-
  acceptance tails (#79/#82/#85) + the FIRST NAMED SPAWN check for this
  unit (`ident=` line in `.opencode/temp/auto_resume.log` + the session
  title in the DB) after the next host restart.
- #86 (deferred worker audit of plugin/scripts tools).

## Next session
1. TODO.md shrink curation — the todo_inbox 2026-09-23_02-51 review has
   6 explicit findings (stale header numbering note; ~40 closed
   full-text entries still in the open sections; status-marker drift on
   #66/#81/#79/#80/#82/#85; #74 is one ~4k-char line in the wrong
   section; #75 is a ~90-line changelog).
2. The --info items: worker compaction timing (adopted in the worker-15
   launch spec — compaction after planning/drafting, before the heavy
   tool calls); dump completeness is already tracked as TODO #78.
