# Task spec — 5.3 intercept observer plugin (log-only functional prototype)

Approved scope: research doc `2026-09-16_fuzzy-and-numword-tool-reliability.md`
540–549 + addendum `.opencode/agent/research/2026-09-16_fuzzy-numword-addendum.md`
§"Scope after the comments" item 3 (read it — it is the design source).

## Goal
A SEPARATE opencode plugin that observes tool calls and LOGS suspicious
dense-digit / numword / redundancy / path anomalies. It NEVER mutates
`output.args` and NEVER blocks — log-only (the mutation channel is unproven,
§5.4 pending; this prototype must survive being permanently log-only).

## What to build
1. **NEW** `.opencode/plugin/intercept_observer.ts` (name may vary, keep the
   concept): `tool.execute.before` hook, active for ALL tools (read/glob/
   grep/bash + write/edit observed too). Conventions to follow (verified
   facts, do not re-research):
   - Hook shape (installed SDK, `@opencode-ai/plugin/dist/index.d.ts`
     ~235–241): `("tool.execute.before", async (input: {tool, sessionID,
     callID}, output: {args: any}) => …)` — returned from the default-export
     plugin function, same registration shape as `ctx_watchdog.ts` /
     `compact_memory.ts` (both tracked in `.opencode/plugin/`, auto-loaded
     at host restart — do NOT touch `opencode.jsonc`).
   - Best-effort, never-throw: any internal error → at most one
     `kind:"intercept-error"`-style line to the log, the hook returns
     silently. The watchdog header (ctx_watchdog.ts lines 1–20) states the
     house rule.
   - **Single numword map home (addendum C3):** at plugin start, read
     `.opencode/agent/scripts/numword/numwords.json` (ONE shared map — never
     embed a second copy). If the read fails, numword checks are
     silently off (other checks still run).
   - Observations (fire a log line only when at least one fires; cap lines
     per call, cap field length — worker's call, document in file header):
     a) dense-digit args (long digit runs / dates / session-id shapes);
     b) numword tokens present in args (map hit → value; unknown tokens
        like `twozero` are NOT hits — they are not in the map);
     c) `<digit>|<word>` redundancy pairs: left/right check via the map
        (agreement / mismatch / ambiguous);
     d) path sanity: doubled segments (`users\users` shape);
     e) out-of-sandbox path NOTE (the workspace root = the PluginInput
        project directory; note only, no enforcement).
   - Log file: `.opencode/temp/intercept.log` (git-ignored, verified).
     Line shape (addendum C7 — byte-exact, pipe-separated 8 fields):
     `<timestamp> | <session_id> | <model_id> | <tool> | <original-arg> |
     <candidates + distances OR gate evidence> | <context: what the arg is —
     path / commit-ref / date / session-id> | <verdict>` with verdict ∈
     {observed-redundancy-ok, redundancy-mismatch, no-candidate,
     ambiguous, out-of-sandbox, path-anomaly}. `model_id`: obtain the same
     way the watchdog gets model info (its transform cache / session DB
     pattern — peek at how ctx_watchdog.ts fills the `ctx:` line model);
     if unavailable, literal `unknown` (never throw, never spawn
     unbounded).
   - Export the detection core as a NAMED export (pure function(s) over
     arg strings + the map) so the probe can pin fixtures WITHOUT a full
     PluginInput harness (the loop_log smoke shows the alternative).
2. **NEW** smoke `.opencode/plugin/tests/intercept_observer.smoke.mjs` —
   established pattern: `_smoke_base.mjs` (`freshSandbox`, `loadRepo`,
   `makeChecker`); reference `loop_log.smoke.mjs` (simplest). Sandbox must
   point the log at a sandbox temp dir — NEVER the live
   `.opencode/temp/intercept.log` (DO-NOT-touch), and the numword map
   must be the REAL shared file (read-only).
3. **APPEND** probe section S18 to `.opencode/plugin/probes/handover_probe.mjs`
   (insert like S17 did — before the S5 hygiene section, existing sections
   untouched): pin ~15–25 checks on the NAMED-export core — each
   observation class has pass + negative fixtures (dense-digit; numword map
   hit; `twozero`-style unknown → no numword hit; `|`-pair agree /
   mismatch / ambiguous; doubled segment; out-of-sandbox; clean arg → NO
   line), plus: hook returns without mutating `output.args` (byte-identical
   before/after), hook never throws (garbage input → silent), log line
   byte-shape (8 pipe-separated fields, verdict vocabulary). Update the
   header annotation total (machine-checked, digit form — the S17
   precedent; the total is currently 148).
4. **DOCS:** `.opencode/plugin/README.md` gains one line (the new plugin);
   `repo_custom_tools.md` or the plugin file header carries the usage note
   (restart-gated activation; log location; verdict vocabulary).

## Definition of done
- `node .opencode/plugin/probes/handover_probe.mjs` → `PROBE handover:
  <new total>/<new total> PASS` agreeing with the header annotation.
- All 8 smokes green (7 existing + the new one), each
  `node .opencode/plugin/tests/<name>.smoke.mjs` exit 0.
- `./.venv/Scripts/python.exe -m pytest -q` → 459 passed, 1 warning
  (UNCHANGED — no FST product code touched).
- `./.venv/Scripts/ruff.exe check --select F .` → All checks passed.
- `git status` clean at the end (the live `opencode.jsonc` maintainer edit
  is NOT yours — leave it uncommitted if present).
- Commits: one per unit (plugin / smoke / probe / docs) or a single
  coherent commit — your call, message per the git conventions.
- Worker handover to `.opencode/agent/handover/handover_task_to_planner.md`
  (what changed, measured verification, deviations, deliberately not done).

## DO-NOT-touch
- `.opencode/maintainer/**`, `opencode.jsonc`, `ctx_watchdog.ts`,
  `compact_memory.ts`, `TODO.md` / `todo_inbox.md` (append findings to
  `todo_inbox.md` only if you hit real blockers), the research docs,
  `tests/` (FST), `playground/`, the live `.opencode/loop/` +
  `.opencode/temp/` contents (smoke writes sandbox-only).
- NO mutation of `output.args` anywhere — the whole point is log-only.

## Context budget for you
Spec names the areas; first greps carry `| head -30`; read file sections,
not whole files (the watchdog header is history — read lines 1–20 + grep
for the hook keys, not all 732 lines). Branch truth: you are on
`opencode_test` — stay there. Standard gate before each commit.
