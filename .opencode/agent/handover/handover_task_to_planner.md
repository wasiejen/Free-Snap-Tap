# HANDOVER (worker-14, worker_Q3S_170K) — auto_resume smoke wall-time reduction

**Status: DONE — all DoD points met.** Branch `opencode_test`.
Code commit: **532ddbc**. (Follow-up commit: this handover + TODO #88 + friction.)

## Measured result (DoD 1)
- **Before:** `time node .opencode/plugin/tests/auto_resume.smoke.mjs` → **2m25.523s (145.5s)**, 102/102.
  (His complaint said ~300s; the measured baseline on this host was 145.5s — I report the measurement.)
- **After:** same command → **12.465s** (run 1), **13.123s** (run 2 — stable), 102/102.
- **Reduction: 91.4 % (11.7× faster)** — target was ≥50 %.

## What changed
1. **Plugin (`auto_resume.ts`, default-preserving):** the factory now reads an
   OPTIONAL `tickMs` from the input object (validated: finite number > 0, else
   5000). The live host never passes it → the tick stays **5000 ms**; no named
   export added (the smoke pins default-only exports, L87-88). The module-level
   `tickTimer` guard is unchanged — the FIRST factory call sets the period
   (smoke re-factories don't re-arm it).
2. **Smoke (`auto_resume.smoke.mjs`):** the first factory call passes
   `tickMs: 300`; the 7× `sleep(5600)` became `tickWait()` = 2 ticks + 200 ms
   margin (same "at least one full tick period" pin semantics); `waitUntil`
   (200 ms poll, bounded deadline) is UNCHANGED — it now resolves in ~0.5 s
   instead of ~5 s because the tick fires every 300 ms.

## Why no check semantics changed (DoD 2 — still 102/102, nothing removed)
Verified from the plugin source, not assumption: the tick only routes sessions
with `idlePending === true`, and `routeScopedIdle` clears that flag on EVERY
decision path (only an in-flight send latches it, held microseconds) — one
decision per idle cycle, so a faster tick cannot double-route, double-fetch, or
double-spawn. `checkSpawnTrigger` is silent when the trigger file is absent.
The NO-fire pins ("one full tick period passed, nothing happened") are
satisfied by ≥2 ticks during the 600 ms wait — same assertion, fewer seconds.

## Full gate (DoD 3) — all measured after the change
- handover_probe: **241/241 PASS**
- smokes: auto_resume **102/102**; block_transfer.sandbox 52/52; block_transfer
  22/22; compact_memory 57/57; context_recovery ALL PASS; ctx_gauge 3/3;
  gauge_core ALL PASS; intercept_observer 39/39; loop_log 24/24; submit 20/20
- pytest: **459 passed, 1 warning**
- ruff F: **0** (all checks passed)

## Default preservation (DoD 4)
Live tick stays 5000 ms (option absent → default path; validated non-number /
≤0 → 5000). No nudge/routing logic touched. The option is test-only in effect.

## TODO
- **#88** appended (one-line LANDED record) — the complaint had no prior
  numbered entry (flagged as friction via submit).

## Deliberately NOT done
- No parallelization of sections (shared spy clients + module-level state make
  isolation non-trivial; unnecessary at 12.5 s).
- `waitUntil` deadlines (8 s / 12 s) left as-is — safety margins, now mostly
  unused.
- No short tick for the probe or other smokes (probe doesn't exercise
  auto_resume; out of scope).

## Friction
1 submit(feedback) line fired pre-handover (the #88 numbering gap above).
