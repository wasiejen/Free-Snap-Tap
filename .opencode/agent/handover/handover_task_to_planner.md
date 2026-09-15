# handover_task_to_planner — worker-16 (DONE — final)

Task: smoke-harness build per `.opencode/agent/handover/handover_task.md`
+ approved proposal `2026-09-15_smoke-harness-home.md`.

## Result: COMPLETE — all 7 smokes green, all gates green
Final commit: the one landing after `f4de326` (contains the last smoke +
`TODO.md` close-note + this file; see `git log`).

### What landed in `.opencode/plugin/tests/` (commits 6c38fd4 → final)
| file | origin (scratchpad, read-only) | result |
|---|---|---|
| `_smoke_base.mjs` | new (Part 3 of the proposal) | shared boilerplate: REPO_ROOT from file location, SCRATCHPAD runtime fixture path (as-is, documented in README), `loadRepo` type-stripped import, `freshSandbox`, `makeChecker` |
| `README.md` | new | purpose / what goes here / what doesn't (≤20 lines) |
| `gauge_core.smoke.mjs` | `pw_test.mjs` | ALL PASS (10 window + 3 model-id cases) |
| `loop_log.smoke.mjs` | `loop_log_smoke.mjs` | 24/24 |
| `block_transfer.smoke.mjs` | `bt_smoke.mjs` | 20/20 |
| `block_transfer.sandbox.smoke.mjs` | `bt_sandbox_smoke.mjs` | 52/52 (ALLOW + REJECT matrices) |
| `compact_memory.smoke.mjs` | FOLD of `cm_v2_smoke.mjs` + `qc_smoke/smoke.mjs` (fold allowed by the proposal) | 42/42 |
| `context_recovery.smoke.mjs` | `t5_smoke.mjs` | ALL PASS |
| `ctx_gauge.smoke.mjs` | `ctx_gauge_smoke.mjs` | 3/3 (LIVE db) |

### Key adaptations (all test-side — NO tool/plugin source touched)
1. **compact_memory** — adapted to the 2026-09-14 FIRE-AND-FORGET build:
   `execute` returns the dispatch line (never a success claim); budget
   increment + COMPACT line land in the async success callback → the smoke
   drains (~25 ms) before side-effect assertions; the retry-keep note and
   the background failure go to console.log/console.error (captured); the
   six-key arg shape is pinned (providerID/modelID — the explicit-pair
   override case replaces cm_v2's retired context.api/context.session.id
   source checks); cm_v2's no-client core (never throws / names the probes
   / zero side effects) folded in; stale success/directive strings replaced
   by the exact dispatch-line form.
2. **context_recovery** — import rewired to
   `.opencode/plugin/deactivated/context_recovery.ts`; attribution verified
   at build time (it IS the T5 emergency hook, behavior matches all
   assertions); the activation flag is a SANDBOX opencode.jsonc fixture —
   the live config is never read.
3. **gauge_core** — stale `.opencode/ctxgauge/gauge.mjs` ref rewired to
   `.opencode/plugin/scripts/gauge.mjs`; the smoke gained an explicit
   `process.exit` (the original only printed).
4. **sandbox hygiene** — every smoke now cleans its scratchpad subdir on
   start (`freshSandbox`), so re-runs are idempotent (the originals were
   not); the block_transfer sandbox smoke's outside-dir is now
   `path.dirname(REPO_ROOT)` (computed, not hardcoded).

### Gates (measured, all green)
- `node .opencode/plugin/probes/handover_probe.mjs` → **99/99 PASS**
- `./.venv/Scripts/python.exe -m pytest -q` → **459 passed, 1 warning** (the
  known #10 ResourceWarning pattern)
- `./.venv/Scripts/ruff.exe check --select F .` → **All checks passed (F=0)**
- all 7 smokes run exit-0 from the repo root (compact_memory verified
  idempotent on a second run)

### TODO
- One-line close-note appended to `TODO.md` `Closed entries` (no ID — the
  task was proposal-driven, not a numbered entry): "closed 2026-09-15, the
  first commit after f4de326, worker-16".

### Deliberately NOT done
- No scratchpad file was deleted (read-only zone — the originals stay there).
- No tool/plugin source edit (the adaptation was entirely in the smokes).
- No `--wip`/maintainer file touched; `opencode.jsonc`, `proposals/`,
  `.opencode/maintainer/`, `.opencode/agent/prompts/`, the NAP and
  `.opencode/loop/` untouched.
