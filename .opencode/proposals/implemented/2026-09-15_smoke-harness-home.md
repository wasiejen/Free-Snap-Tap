# Smoke harness home — save the plugin/tool smoke tests in the repo

Status: APPROVED (2026-09-15). Maintainer confirmed the target area `plugin/tests/`
in the 2026-09-15 direct session; formal proposal for the inbox item
`save_all_plugin_took_testing_files.md` (moved to `maintainer/done/`).

## Problem
The smoke tests for the custom plugin tools live ONLY in the scratchpad
(`C:/Users/Wasiejen/AppData/Local/Temp/opencode/`) — the worker's comments about
them exist only there too. They are:
- volatile (temp folder — lost on cleanup),
- unattributable (abrev names: `bt_smoke.mjs`, `cm_v2_smoke.mjs`),
- duplicated (shared boilerplate copy-pasted per file),
- not runnable from the repo state (hardcoded absolute paths; one references the
  old `.opencode/ctxgauge/` location).
They are the anchor of the tested functionality (maintainer 2026-09-15).

## Design (independently approvable parts)
- **Part 1 — home:** `.opencode/plugin/tests/` (maintainer-confirmed area) + a
  `tests/README.md` (layout rule: new sub-folder needs its README in the same
  commit).
- **Part 2 — same-name attribution:** one smoke file per tested tool, same stem as
  the tool (behavior suffix where two anchors exist):
  | scratchpad file | tests the | candidate in-repo name |
  |---|---|---|
  | `bt_smoke.mjs` | block_transfer tool() translation | `block_transfer.smoke.mjs` |
  | `bt_sandbox_smoke.mjs` | block_transfer sandbox guard | `block_transfer.sandbox.smoke.mjs` (or fold into the above) |
  | `cm_v2_smoke.mjs` | compact_memory v2 no-client fallback path | `compact_memory.smoke.mjs` |
  | `qc_smoke/smoke.mjs` | compact_memory S13 pre-probe smoke | same file (fold) or `compact_memory.s13.smoke.mjs` |
  | `loop_log_smoke.mjs` | loop_log tool | `loop_log.smoke.mjs` |
  | `ctx_gauge_smoke.mjs` | ctx_gauge tool (live byte-identity etc.) | `ctx_gauge.smoke.mjs` |
  | `t5_smoke.mjs` | recovery plugin (context_recovery, currently in `plugin/deactivated/`) | `context_recovery.smoke.mjs` (verify attribution at build time) |
  | `pw_test.mjs` | gauge core `scripts/gauge.mjs` (path moved — rewire) | `gauge_core.smoke.mjs` |
  (`plugin/probes/handover_probe.mjs` stays — the probe is the plugin's own test,
  distinct from tool smokes.)
- **Part 3 — shared base:** ONE shared file for the common smoke boilerplate
  (type-stripped import helper, scratchpad sandbox setup, assert/fail-count
  pattern, repo-root resolution). Name candidates: `_smoke_base.mjs` /
  `smoke_base.mjs` — build worker's pick.
- **Part 4 — rewire:** replace the hardcoded absolute paths (repo root, scratch
  dir, the old `.opencode/ctxgauge/` ref) with file-relative resolution so every
  smoke runs from anywhere; each smoke verified GREEN from the repo before commit.
- **Part 5 (his call):** after the in-repo copies pass, the scratchpad originals
  may be deleted — the agent does not touch the scratchpad on its own.

## Acceptance
- Every moved smoke runs green: `node .opencode/plugin/tests/<tool>.smoke.mjs`.
- Each file is attributable to its tested tool by name alone.
- Shared code lives in the base file, not copy-pasted.
- No hardcoded absolute Windows paths in `plugin/tests/`.
- The probe + existing gates stay green (99/99, 459+1#10, ruff F=0).

## Scope (suggested)
`.opencode/plugin/tests/` (new), the scratchpad source files (read-only),
`plugin/tests/README.md`.


## Verdict (2026-09-15, plan1)
LANDED + verified (worker-16 build, resumed post-compaction): `plugin/tests/` = 7 smokes + `_smoke_base.mjs` + README, all green from the repo (42/42 on the new smoke self-run); gates 99/99 + 459 passed + 1#10 + ruff F=0. Part 5 (scratchpad originals) stays his call — untouched. Commits: 6c38fd4..109ddff.
