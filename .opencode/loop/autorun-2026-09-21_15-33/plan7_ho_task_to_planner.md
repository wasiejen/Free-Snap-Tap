# HANDOVER — auto_resume UNIT B: the auto-compact toggle (budget-file gated)

Status: DONE — all gates green, committed (single commit). Takeover from
worker-9: inspected the uncommitted diff, kept both hunks (Unit-2 header
paragraph + `COMPACT_BUDGET_FILE` constant) — both consistent with the spec
design — and continued from there.

## What changed
`.opencode/plugin/auto_resume.ts`:
- `autoCompactEnabled()` — small per-tick reader of
  `.opencode/temp/compact_budget.json` (`join(logDir, COMPACT_BUDGET_FILE)`,
  READ-ONLY — the file is never written). Lenient parse: missing/unreadable /
  JSON parse failure / scalar root / key absent → ON (fail-open, status quo);
  key present → `Boolean(value)`.
- Unit 2 tick loop: ratio computation and the below-threshold `saturation=`
  line unchanged. At `ratio >= SATURATION_THRESHOLD` with the toggle OFF:
  logs `skip= autoCompact-off sid=<sid> ratio=<3-decimals>` and does NOT call
  `sendSelfCompact` and does NOT consume `w.attempts` (the once-per-busy-cycle
  budget stays for a later ON state). Toggle ON → current path unchanged.
- Header comment (the worker-9 hunk) documents the toggle in the file's
  existing comment style.

`.opencode/plugin/tests/auto_resume.smoke.mjs` — new toggle block at the end
of the Unit 2 section (4 spec cases, each a fresh armed session; sandbox
budget file `proj/.opencode/temp/compact_budget.json`, the live one never
touched):
1. NO budget file + ratio >= 0.85 → trigger fires (explicit status-quo
   regression) + `trigger=` line.
2. `autoCompact:false` → ZERO promptAsync calls, `skip= autoCompact-off`
   line with the ratio; a second idle in the same cycle is skipped again
   (proves the attempts budget was NOT consumed); flip back ON → the
   retained budget sends.
3. `autoCompact:true` → trigger fires + `trigger=` line.
4. MALFORMED file content → fail OPEN, trigger fires.
The four smoke sids (`ses_u2_tgnof/tgoff/tgon/tgmal`) were added to the
final `smokeSids` live-log invariance list.

## Measured verification (repo root, branch `opencode_test`)
- `node .opencode/plugin/tests/auto_resume.smoke.mjs` → **ALL PASS (62/62)**
  (58 existing + 4 new toggle checks… 5 new `chk` lines in total — case 2
  carries the budget-retention checks).
- `./.venv/Scripts/python.exe -m pytest -q` → **459 passed, 1 warning** (the
  known warning).
- `./.venv/Scripts/ruff.exe check --select F .` → **All checks passed! (F=0)**.
- `node .opencode/plugin/probes/handover_probe.mjs` → **PROBE handover:
  241/241 PASS** — agrees with the header annotation. No re-pins needed;
  no existing probe pin broke.

## Commit
Single commit covering code + smoke + this handover + the loop-log lines
(message per the commit routine): see `git log -1` — subject: `auto_resume UNIT B: gate the Unit-2 self-compact trigger behind the autoCompact toggle`.

## TODO entries
None appended (no findings outside the task scope).

## Deliberately not done
- The live `.opencode/temp/compact_budget.json` untouched (real budget
  state; smoke sandboxes only).
- `compact_memory.ts`, `opencode.jsonc`, `.opencode/maintainer/**`,
  auto_resume Unit 3/4 blocks, probe sections — untouched.
- The pre-existing uncommitted changes to `.opencode/maintainer/ideas/ideas.md`
  (maintainer's) and the untracked `plan7_ho_task.md` (planner's loop-folder
  copy) are NOT in my commit — neither authored by this task. The
  looprunner's uncommitted `-WARNING` line rides along in the committed
  `loop_log.md` (shared iteration record, append-only).

Lessons: the smoke's module-level `client` is SWAPPED by every re-factory —
a new smoke section placed after the fail-safety block must re-factory with
its own spying client (the first smoke run failed exactly this way:
`trigger=` logged, but the send hit the v3 throwing client → `send-fail`,
zero pushes to the spy array).
