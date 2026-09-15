# handover_task_to_planner — worker-5 (DONE — final)

Task: speaking nudge readout (plan5, iteration 5), spec `handover_task.md`
(committed 0761e42; loop copy `plan5_ho_task.md`). Session
ses_f594ba57effeJP9cGt9BI15iDt (resumed once after a cross-compaction;
post-compaction protocol followed, working-tree partial edits inspected via
`git diff` and verified hunk-by-hunk before finishing).

## Result: COMPLETE — all DoD criteria met, gates green

### Files changed (the exact spec scope)
- `.opencode/plugin/ctx_watchdog.ts` — v2.8.1 SPEAKING minimal readout:
  - `minimalReadout()`: known window → `(NN% used, NNNK left)`, unknown
    window → `(NNNK used)`. Same numbers, same formulas (formatGauge pct /
    remK), same triggers, same silence rules — only the labels changed.
  - v2.8 header block + the function's own comment updated to the new
    format (byte-exact doc consistency).
  - New dated `v2.8.1` header note (after the v2.8 block) recording the
    rationale: the old unlabeled minimal forms let the K number be
    misread (known window: REMAINING; unknown window: USED). The note
    deliberately does NOT re-quote the old literal form — the DoD
    `grep "%/"` would catch it.
- `.opencode/plugin/probes/handover_probe.mjs` — every byte-exact pin
  re-pinned (IDs unchanged, total 106): checks 54/54 (output string +
  ctx.log regex, header map, RO_ROW comment), 59–63 (n1–n5 output pins),
  65/65 (ctx.log regex + output, header map), 70 (preReadout fixture
  `87% used, 52K left`, label, ctx.log regex). The S8 nudge RUNG lines
  (46–53, full formatGauge readout) were NOT touched, per spec.
  - Annotation: see the deviation note below (`hygiene=6`).

### Deviation (evidence-based, machine-verified)
The spec asked to "add a `hygiene=5` term" because the per-section
annotation "does not sum to the self-counted total". Machine verification
of the committed file (commit 4b4153f, same at spec commit 0761e42):
the annotation already contained the hygiene term as `S5=6` and the
machine sum is 3+4+5+8+8+11+8+12+9+6+4+15+6+7 = 106 = the self-counted
total (probe exits with `results.length` = 106). The hygiene check set is
40/41/42/43/45/64 = SIX checks, all tagged section "S5" in the source
(header: "S5 hygiene (6)"). Adding `hygiene=5` would have broken the sum
(106 + 5 = 111 ≠ 106) — a NEW discrepancy. So the applied "or equivalent"
is: the `S5=6` term renamed to `hygiene=6` (making the hygiene accounting
explicit) and moved to the END of the list (execution order — S5 checks
run last). Sum unchanged: 106. The spec's `hygiene=5` was a miscount.

### Verification (measured, verbatim — machine-verified, not retyped)
- `node .opencode/plugin/probes/handover_probe.mjs` →
  `PROBE handover: 106/106 PASS` (exit 0)
- `./.venv/Scripts/python.exe -m pytest -q` → `459 passed, 1 warning in
  2.37s`
- `./.venv/Scripts/ruff.exe check --select F .` → `All checks passed!`
  (F=0)
- `grep -n "%/" .opencode/plugin/ctx_watchdog.ts
  .opencode/plugin/probes/handover_probe.mjs` → no matches (exit 1)
- `git diff --stat` (after this commit): only `loop_log.md` remains
  modified (this session's START/DONE activity lines — left UNSTAGED per
  "stage ONLY the named files"; the planner's bookkeeping commit picks
  it up, cf. e537e4b).
- Smokes (spec: "run them anyway for green"): 6/7 PASS
  (`block_transfer`, `block_transfer.sandbox`, `context_recovery`,
  `ctx_gauge`, `gauge_core`, `loop_log` all PASS). See the finding below
  for `compact_memory.smoke.mjs`.

### Pre-existing finding (OUT OF SCOPE — reported, not fixed)
`node .opencode/plugin/tests/compact_memory.smoke.mjs` → 4 FAILURES,
**pre-existing at clean HEAD** (proven: `git stash` of my two files,
re-run → identical 4 failures at 4b4153f, then popped). Cause: worker-4's
pre-compaction dump hook (commit 4512fe6) shells out to
`.opencode/agent/scripts/db/dump_session.cjs` relative to the sandbox
root, but the smoke's scratchpad sandbox does not provision that script
→ `WARNING: pre-compaction dump failed for ses_sm_msg (Command failed:
… Cannot find module … dump_session.cjs)` is appended to dispatch
responses, breaking 4 byte-exact dispatch-line assertions. `tests/` is
on the spec's DO-NOT-TOUCH list, so left untouched. Suggested fix for a
future task: the smoke setup copies `dump_session.cjs` into the sandbox
(or the hook's best-effort WARNING is tolerable in the smoke's
byte-exact line).

### TODO entries
None added — the spec's strict diff scope ("exactly: ctx_watchdog.ts,
handover_probe.mjs, the two handover files") forbids extra files, so the
smoke finding is delivered here for the planner to curate into `TODO.md`
with an ID. No `todo_inbox.md` edit was made for the same reason.

### What was deliberately NOT done
- No change to the full formatGauge readout, nudge rung lines,
  `peek.mjs`/`ctx_gauge`, `gauge.mjs`, FST product code, `tests/`,
  maintainer files, or the prompt set (all spec DO-NOT-TOUCH).
- `compact_memory.smoke.mjs` fix (out of scope, see finding).
- `git add -A` never used; only the two code files + this handover file
  were staged.

### Commit
(see `git log -1` — code + this handover in one commit)
