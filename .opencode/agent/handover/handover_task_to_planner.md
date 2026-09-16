# WORKER SUMMARY — plan7 #57-live: dump hook node-resolution fix (#55 live)

Worker: worker-10, session ses_f57e965d0ffeDx7x8vmViJrLzq, model
Qwen3.8-27B-IQ4KT-140K. Status: **DONE** — all DoD gates green (measured
below).

## What changed (commit **9fd7557**, 2 files, +29/-1)
- `.opencode/plugin/compact_memory.ts`:
  - **NEW exported resolver** `resolveNodeExe(execPath: string =
    process.execPath): string` — returns `execPath` when its lower-cased
    basename STARTS WITH `node` (covers node / node.exe / nodejs.exe),
    otherwise the literal `"node"` (resolved from PATH — on Windows PATHEXT
    finds node.exe). One comment block: the live opencode host's execPath is
    the CLI binary, not a node runtime; a wrong spawn fails the dump safely
    (WARNING) but the corpus dump would never happen. Placed next to the
    hook code, directly above `preCompactionDump`.
  - **Spawn site** (line ~279 → now ~290 inside `preCompactionDump`):
    `execFileSync(process.execPath, …)` → `execFileSync(resolveNodeExe(), …)`.
    Nothing else in the hook changed — the failure contract is intact
    (WARNING on the response, DUMP-FAIL line, never throws, never blocks).
- `.opencode/plugin/tests/compact_memory.smoke.mjs`: 3 new chks on the
  exported `resolveNodeExe` (plain node path passes through unchanged;
  `opencode.exe` falls back to `"node"`; the live default's basename starts
  with `node` — NOT pinned to an exact path), with the one-line header
  comment per the spec.

## Measured verification (all after commit 9fd7557, before this commit)
- `node .opencode/plugin/tests/compact_memory.smoke.mjs` →
  **COMPACT_MEMORY_SMOKE: ALL PASS (46/46)**, exit 0 (= old 43 + 3 new).
- ALL 7 smokes in `.opencode/plugin/tests/` → ALL PASS, exit 0:
  block_transfer.sandbox (52/52), block_transfer (22/22), compact_memory
  (46/46), context_recovery, ctx_gauge (3/3), gauge_core, loop_log (24/24).
- `node .opencode/plugin/probes/handover_probe.mjs` →
  **PROBE handover: 120+2/120+2 PASS** (reported as 122/122), exit 0 —
  probe file UNTOUCHED (0 FAIL / no error lines in the output).
- `./.venv/Scripts/python.exe -m pytest -q` → **459 passed, 1 warning in
  ~2s**, exit 0.
- `./.venv/Scripts/ruff.exe check --select F .` → **All checks passed!**
  (0 findings).
- `git status` clean after this bookkeeping commit.

## Deviations / process notes
- **Two commits, not one** (the launch said "one commit = code + smoke +
  TODO.md + handover"): the #55 status note requires the fix commit's hash,
  which is only knowable after the fix commit — same rationale as the
  worker-8/#57 and worker-9/#60 splits (worker-9's handover documents it
  verbatim). Commit 1 = `9fd7557` (plugin + smoke); commit 2 = this file +
  TODO.md #55 note + knowledge entry + the loop log line.
- **Spec/actual nit (no action needed):** the launch called the smoke file
  "282 lines" — it is 310 lines at HEAD (it grew after the spec was
  measured). All 43 baseline chks were present and green; no impact.
- **Knowledge:** one entry appended to
  `.opencode/agent/knowledge/knowledge_plugins.md` (execPath ≠ node runtime
  on the live host — use `resolveNodeExe()` for any future plugin-side
  script spawn).

## TODO bookkeeping
- `TODO.md`: #55 got the one-line status note (node-resolution fix landed,
  commit 9fd7557; live acceptance still pending the host restart). #55 NOT
  closed — per the spec, live acceptance is still pending the maintainer's
  next host restart (first post-restart compaction must produce
  `.opencode/archive/sessions/compaction_dumps/<sid>_c0.md`).
- `todo_inbox.md`: nothing appended — no out-of-scope findings.

## Deliberately NOT done
- No probe checks added (the spec forbids them — the resolver fallback is
  not reachable under plain node; a probe pin would test the wrong thing).
- No changes to the hook's failure contract, the probe file, the tool files,
  `ctx_watchdog.ts`, or anything under `.opencode/agent/prompts/**` /
  `.opencode/maintainer/**`.
- No push (agents never push).
