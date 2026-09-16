# Worker summary — 5.3 intercept observer plugin (worker-2, ses_f55bd6887ffeeIRO1FXrplLr78)

Looprun `autorun-2026-09-16_13-33`, iteration 1, branch `opencode_test`.
TASK COMPLETE — all DoD items met (measured verification below).

## What changed (3 commits)

1. `7d485b0` — **NEW `.opencode/plugin/intercept_observer.ts`** (518 lines)
   + **NEW `.opencode/plugin/tests/intercept_observer.smoke.mjs`** (24 checks).
   - `tool.execute.before` hook, ALL tools, log-only: NEVER mutates
     `output.args`, NEVER blocks. Separate from the watchdog (own file, own
     registration; `opencode.jsonc` untouched).
   - Observations (each class = one bundled line; cap 3 lines/call, priority
     order: mismatch → path-anomaly → out-of-sandbox → pair-ok → ambiguous →
     no-candidate): (a) dense-digit (≥6-digit runs, `ses_` shape, date
     shapes), (b) numword token hits via the shared map, (c) `<digit>|<word>`
     tight pairs (left/right check: agree/mismatch/ambiguous/unknown-word; a
     shell pipe with spaces is NOT a pair), (d) doubled path segments,
     (e) out-of-sandbox path NOTE (note-only, no enforcement).
   - Line shape C7 byte-exact: 8 `" | "`-separated fields
     `stamp | session | model | tool | original-arg | evidence | context |
     verdict`; field contents flattened (no `" | "` inside, cap 160 chars);
     internal errors → at most one `intercept-error` line (8-field shape,
     field 5 marker), the hook never throws.
   - **Single numword map home (C3):** loads
     `.opencode/agent/scripts/numword/numwords.json` at plugin start (path
     resolved next to the plugin file); read failure → numword checks (b)/(c)
     silently off, other checks run. NO embedded second copy.
   - Model id: same source as the watchdog — `readGauge(undefined,
     sessionID)` from `./scripts/gauge.mjs` (bounded backend chain;
     per-session 60 s cache; no cross-session fallback) → `unknown` when
     unavailable.
   - Log: `.opencode/temp/intercept.log` under the PluginInput project dir
     (git-ignored, verified by probe check 170).
   - Detection core is NAMED exports (pure functions over arg strings + the
     map): `observeArg`, `observePairs`, `observeDense`, `observeNumword`,
     `observePathAnomaly`, `observeSandbox`, `resolveNumword`,
     `classifyContext`, `loadNumwordMap`, `underRoot`, `flattenField`,
     `VERDICTS` + constants — the probe/smoke pin fixtures WITHOUT a full
     PluginInput harness (only the hook-level checks use the real factory,
     against a sandbox project dir).
   - Usage note (restart-gated activation; log location; verdict
     vocabulary) in the plugin file header (the spec's either/or — NOT in
     repo_custom_tools.md).
2. `51529ac` — **probe S18 section (21 checks, 150–170)** in
   `.opencode/plugin/probes/handover_probe.mjs`, inserted before the S5
   hygiene section (existing sections untouched); header intro + section
   summary + the machine-checked annotation updated (digit form):
   `… S17=26 S18=21 hygiene=6 → "PROBE handover: 169/169 PASS"`. Pins:
   shared map home (real file loads / missing → null), C4 grammar parity
   (all 5.2 pass + reject fixtures), ambiguous split via a synthetic map,
   every observation class with pass + negative fixtures, byte-exact
   evidence strings, the 3-line cap + priority, clean arg → no line, hook
   byte-identical args, garbage input → never throws, the 8-field line
   shape + verdict vocabulary, live log untouched, git-ignored log path.
   Same commit: removed a dead "next char is a letter" guard from
   `pairMatches` (the `i`-flagged word class already consumes the maximal
   token — the guard could never fire; the probe's first run pinned the
   real behavior: `4|fourex` IS a pair → unknown-word gate line).
3. Docs (with this handover): `.opencode/plugin/README.md` gains the
   intercept_observer line (purpose + log location + pointer to the header
   usage note).

## Measured verification (all after the final commit's code state)

- `node .opencode/plugin/probes/handover_probe.mjs` → **PROBE handover:
  169/169 PASS**, agreeing with the header annotation (148 + 21).
- All 8 smokes green (7 existing + new):
  `INTERCEPT_OBSERVER_SMOKE: ALL PASS (24/24)`, plus BT-SANDBOX 52/52,
  BLOCK_TRANSFER 22/22, COMPACT_MEMORY 46/46, CONTEXT_RECOVERY PASS,
  CTX_GAUGE 3/3, GAUGE_CORE PASS, LOOP_LOG 24/24.
- `./.venv/Scripts/python.exe -m pytest -q` → **459 passed, 1 warning**
  (unchanged — no FST product code touched).
- `./.venv/Scripts/ruff.exe check --select F .` → **All checks passed!**
- `git status` at the end: my files all committed; remaining unstaged
  entries are the maintainer's own live edits (`.opencode/maintainer/**`,
  `opencode.jsonc`) — left uncommitted per the spec.
- Smoke sandbox discipline verified by the smoke itself: the intercept.log
  lands under the scratchpad sandbox project; the live
  `.opencode/temp/intercept.log` state is byte-identical before/after
  (did not exist at run time — still did not).

## Deviations (none material)

- Smoke = 24 checks (the spec's "established pattern", no count pinned);
  probe S18 = 21 checks (within the spec's ~15–25).
- The smoke/pin fixtures for `|`-pair ambiguity use a SYNTHETIC map passed
  to the pure `resolveNumword` (the real shared map has no ambiguous split —
  the C4 grammar makes splits unique; the ambiguous code path is still
  pinned, per the spec's "ambiguous" verdict requirement).
- Verdict assignment for the log-only gate evidence is documented in the
  plugin header (standalone dense/numword findings → `no-candidate`;
  unknown-word pair → `no-candidate`; multi-split → `ambiguous`) — the C7
  vocabulary has no dedicated "observed-only" verdict.

## Deliberately NOT done

- No `opencode.jsonc` / watchdog / compact_memory / FST product changes
  (DO-NOT-touch list honored).
- No mutation channel, no auto-resolution/renaming of `|` pairs, no
  enforcement of the sandbox note (all §5.4 / open-question 2 scope).
- Live activation is RESTART-GATED (plugins auto-load at host restart) —
  the build is committed + smoke/pinned; one restart is the acceptance
  (the #51/#55 pattern), then the first `intercept.log` lines are the live
  evidence.
- No `TODO.md` / `todo_inbox.md` entries — no real blockers hit.
