# plan8 summary — autorun-2026-09-21_15-33, iteration 8 (planner-8, ses_f33f1eb98ffeFvrnTdmTzmyE2x, Qwen3.8-27B-Q3S-170K)

## Unit 1 — #85 part 3 LANDED + verified
- Spec (written by the prior planner, `plan8_ho_task.md`): the Unit-2 tick leg
  is REMOVED — the nudge is a PASSIVE ctx-line SUFFIX on the session's own
  tool-call return (`tool.execute.after`, the gauge plugin's ctx: channel),
  per busy session, ladder (>= 0.95 "self-compact now (ratio=…)" / >= 0.98
  `--maintainer`-flagged line), scope "none" (Direct) suppresses it (c),
  `scopeVerdict` checks the LAST OWN-LINE TOGGLE FIRST (d — Direct deactivates
  Unit 4 for the planner), Unit-4 scope unchanged, NO `<|Off|>`.
- worker-12 (ses_f33ee8eabffeaE0xuwZ7lc65NR) died at the context wall mid
  smoke-write (step-finish reason=length, output 23,156, total 170,238) with
  the auto_resume.ts code diff COMPLETE on disk and no commit. Forensics
  (MEM-0107, recorded): ~34k of the window were two planning-prose messages +
  a whole-smoke read. The in-flight smoke section was salvaged verbatim
  (`plan8_worker12_smoke_draft.md`); worker-13 took over from the salvage.
- worker-13 (ses_f33c05575ffeYtM7PHyL30GgID, worker_Q3S_170K, closed at 94%):
  LANDED `ded7245` (code + smoke + TODO) + `5992f38` (handover).
- Planner verification (from files, not the summary): commits present; the
  worker's own gate output in its session dump (smoke 102/102 ×7 mentions,
  probe 241/241, pytest 459+1w, ruff All checks passed); spot checks:
  tick() has no Unit-2 leg, `onToolAfterNudge` registered, `promptAsync`
  only on the Unit-3/4 spawn path, `scopeVerdict` toggle-first (L753-761).
- Smoke count 105 → 102: the old promptAsync-era unit-2 checks adapted to
  the passive mechanism (all DoD pins present: stale-armed no-fire, 0.95/0.98
  ladder, per-session nudge, Direct suppresses both units, no promptAsync on
  the Unit-2 path).

## Bookkeeping
- TODO #85: part 3 status + hashes (ded7245/5992f38) recorded; title updated.
- NAP: the 2026-09-22/23 direct session section compressed into the archive
  (excess → nap_direct.md); current session section written; baseline
  updated (auto_resume smoke 102/102).
- MEM-0107 recorded (memory.md + destilled_mem.md): worker limit-death
  forensics from the dump (step-finish meta, per-message byte sizes,
  salvage-from-last-message protocol, chunked-write + section-read
  discipline for the successor).
- Planner-prompt marker-sweep command FIXED (verified broken this session:
  `--include="*.md"` after `--` is swallowed as a filename → the filter
  silently dropped → the whole tree incl. plugin.log was searched; fixed via
  `--include="*.md" -e "pattern"`, re-run clean).

## Pending (need the maintainer — he is AFK)
- #82 live acceptance (his post-restart test) — the unit-2-suppression
  question is RESOLVED by the part-3 design (Direct gates Unit 2).
- #80 close (his confirm; (c) after #82). #83 backstop (his activation).
- TODO.md shrink (the curation review is in todo_inbox 2026-09-23_02-51).
- Live activation of part 3 = the next opencode restart (changes are on disk;
  the live plugin still runs the old code until then).

## Unit 2 — smoke wall-time reduction LANDED + verified
- Spec: `plan8_ho_task2.md`. worker-14 (ses_f3237593effeGgPtp8RtS0ftQl,
  worker_Q3S_170K, closed at 49%): LANDED `532ddbc` (plugin + smoke) +
  `739d8a1` (TODO #88 + handover).
- Result: 145.5 s → 12.5 s wall (91.4 % off — target was ≥50 %). Lever:
  default-preserving `tickMs` factory option (default 5000 — live
  unchanged; first factory call sets the module-level tick) + the 7×
  `sleep(5600)` became `tickWait()` (2 ticks + margin, same pin
  semantics), smoke runs with `tickMs: 300`.
- Planner verification: commits present; `tickMs` default-preservation
  confirmed in source (L1219-1224); I re-ran the smoke myself:
  ALL PASS 102/102 in 13.0 s; the worker's own gate output in its dump
  (probe 241/241, pytest 459 passed, ALL PASS).

## For the next iteration (planner-9)
- TODO.md shrink + curation (the review is in todo_inbox 2026-09-23_02-51;
  header note now stale again — next ID is #89).
- Research spec (priority.md #1: ups+downs of compact_memory +
  block_transfer).
- #87 ruling (dead-successor semantics) + #82/#80 live acceptance + #83
  backstop = maintainer calls (he was AFK).
- Live activation of #85 part 3 + the tickMs option = the next opencode
  restart (on disk; the live plugin is the pre-part-3 build until then).
