# Worker handover — NAP Part-2 cleanup (text-worker run, 2026-09-15)

**Commit:** `b36d4c7` "NAP: Part-2 cleanup complete — 32 sections compressed (no-loss rule), Standing to measured baselines" — 8 files (NAP + 7 targets), +460/−1438.
**Final NAP wc -l:** **68** (DoD ≤150). Archive block = 42 lines (32 strict section lines + 1 kept `ses_f601cfc5` line verbatim + 8 folded legacy lines).

## Phase A — the 7 appends (all verified: exact section header present once per target)
| target | tail -n 3 (last line) |
|---|---|
| `archive/loop/autorun-2026-09-10_03-05/plan4_nap.md` | "the plugin build)." (baselines 448/F=0/52-52, meta tasks) |
| `archive/loop/autorun-2026-09-10_03-05/plan3_nap.md` | "needs a full session." (STOPPED at 81% CTX) |
| `archive/loop/autorun-2026-09-10_23-07/plan2_nap.md` | "oldest open work)." (FST behavior batch) |
| `archive/loop/autorun-2026-09-10-0/plan1_nap.md` | "oldest open work)." (FST behavior batch) |
| `archive/loop/autorun-2026-09-10/plan6b_nap.md` | "touched this iteration)." (448/F=0 meta-only) |
| `archive/loop/autorun-2026-09-10/plan5_nap.md` | "one line with the maintainer)." (4 next steps) |
| `archive/loop/autorun-2026-09-10/plan4_nap.md` | "default SKIP)." (#17 v1.3 rebaseline) |

TSV = **32 rows** (`Temp/opencode/nap_line_data.tsv`; snapshot of the prior 26 rows kept at `nap_line_data_prev.tsv`). Script fixed per spec: added the `ses_f71d36a2 → 03-05/plan4_nap.md` mapping + idempotent exact-header skip (run result: 7 appended, 26 skipped, exactly as expected).

## Measured baselines (2026-09-15, all three gates run)
- probe: **99/99 PASS** (`node .opencode/plugin/probes/handover_probe.mjs`)
- pytest: **459 passed, 1 warning** — verified to be the known #10 coroutine warning (`fst_keyboard.py:786`, matches `todo_records.md:260`)
- ruff: **F=0** ("All checks passed!")

Standing block updated in place to these values; the stale `opencode.jsonc uncommitted BY DESIGN` line dropped; gauge line now bash form.

## Folded legacy — example line
`- 2026-09-10 iter 1 (legacy, no-ses) — maintainer rulings applied to TODO; proposals channel + 9 drafts P01–P09 created; P01 \`limit.context\` applied (opencode.jsonc left uncommitted by design); batch spec committed, launch deferred to iter 2 (stop line) — details: git d077de2`

## Could not resolve / notes
1. **L865 chat-segment section has no hash in its body** (TSV hash `none`). I sourced `dc3f137` "Compaction-lifecycle design proposal (agreed with maintainer in chat)" — machine-verified same date (2026-09-12) as the section header and matching its outcome ("proposal written"). Judgment call, spec's fallback chain exhausted.
2. **4 legacy entries cite no hash** (iter 1, session 3/2/1). Dates taken from machine-verified representative commits: iter 1 → `d077de2` (2026-09-10), session 3 → `2cf5f33` (2026-09-09), session 2 → `ff86d9b` (2026-09-09), session 1 → `2a4996c` (2026-09-08). The hashes in those 4 details fields are these representative commits, not original-entry hashes (none existed).
3. Legacy entry session 5 cites hash `6c2151` (6 chars; not a prefix of git's `6c215b1`) — kept verbatim from the entry, presumed original typo; not corrected.
4. Spec said "26 of 32 sections already appended (checkpoint 1f5ccf8)" — confirmed: checkpoint committed 17 files (1047 lines) covering those 26; all 7 new targets were brand-new files (created by this run).
5. Working tree carries maintainer live edits (`maintainer/**`, `proposals/2026-09-11_contradiction-block-decision.md`) — NOT staged, per spec.
6. This handover file was committed separately from the task commit (spec restricted staging to NAP + 7 targets).
