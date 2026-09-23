# Task spec — plan11 / #90 implementation: spawned-successor inherit + trigger deactivation

Goal: implement the APPROVED proposal
`.opencode/proposals/approved/2026-09-23_spawned-successor-inherit-deactivate.md`
(Parts A + B + C — his `--comment` 2026-09-23_15-44: "approved A+B and C also").
READ THE PROPOSAL FIRST (166 lines — it is the design source; this spec does not
restate it). Worker: `worker_Q3S_170K`. Stay on the current checkout
(`opencode_test`) — do not switch branches.

## Definition of done (all of it, one green commit at the end)

1. **Part A** (proposal §Part A): the `spawned` exclusion removed from
   `scopeVerdict` (auto_resume.ts L807); the `spawned` map (L290, set L663)
   repurposed as the lineage-depth map (`Map<sid, depth>`); `restartText()`
   (L736) marker made an EXACT OWN-LINE `<|autonom|>` (prose moves to line 2);
   the restart/cap-exhaustion branch (L1098-1107) stores the successor's depth
   = trigger depth + 1 and REFUSES to spawn at depth >= 2 (`skip= depth sid=`
   line); file-trigger spawns stay depth 0.
2. **Part B** (proposal §Part B): `spawnPlanner` RETURNS the new sid or null
   (all failure paths already log `spawn-fail=`); on a successful restart-branch
   spawn set STICKY `w.deactivated = true` on the TRIGGER watch + `deactivate=
   sid=` log line (failed spawn → no flag); `routeScopedIdle` checks the flag
   right after the scope recompute (L1035-1039) → `skip= deactivated sid=`, no
   send; the flag records the trigger's user-message count at deactivation and
   clears ONLY when a NEW user message arrived carrying an own-line ON toggle
   (`<|autonom|>`/`<|Autorun|>`).
3. **Part C** (proposal §Part C): at init (the factory call, L1262) restore from
   the plugin's own `auto_resume.log`: each `route= restart spawn sid=X` line
   paired with the following `spawn= sid=Y` line → deactivated(X) + lineage
   depth(Y) = depth(X) + 1; unpaired `spawn=` lines → depth 0. Bounded parse
   (your discretion: whole file or tail; the log lives in the temp dir).
4. **Smoke** (`.opencode/plugin/tests/auto_resume.smoke.mjs`): the proposal's
   acceptance pins 1-7 — in particular: (i) autorun-scoped NON-planner-agent
   trigger → successor verdict "autorun" + RECOVERED after an idle without an
   action line (the #87 stall case, inverted); (ii) restartText line-1 byte pin
   + restart-safe derivation with in-memory maps emptied; (iii) trigger
   deactivated: next idle → `skip= deactivated`; no-toggle ping stays
   deactivated; own-line-ON-toggle ping clears the flag → routed again →
   `skip= successor`; (iv) depth cap: depth-2 cap-exhaustion → `skip= depth`,
   depth-1 spawns its depth-2 successor; (v) failed spawn → NO deactivation;
   (vi) the OLD spawned-exclusion pins are RE-PINNED to the new behavior; all
   other existing pins stay green.
5. **Standard gate green** (run ONCE at the end): probe
   `.opencode/plugin/probes/handover_probe.mjs` (self-annotated header total —
   curate-don't-duplicate; the current baseline is 241/241 — if your change
   legitimately shifts probe expectations, update the probe pins in the same
   commit), ALL smokes in `.opencode/plugin/tests/`, pytest 459 passed +
   1 warning (the known #10 coroutine warning), ruff F=0. Do NOT run the gate
   more than twice total (wall-time discipline — #88).
6. **Bookkeeping in the SAME commit:** `TODO.md` — #90 status → LANDED (the
   commit hash is recorded by the PLANNER in its follow-up bookkeeping commit —
   do NOT write your own hash); #87 → closed one-liner + its full entry text
   appended to `todo_records.md` FIRST; your handover to
   `.opencode/agent/handover/handover_task_to_planner.md` (executive summary,
   measured verification incl. the exact smoke counts, commit subject, what was
   deliberately not done).
7. **Friction check** (mandatory, your role prompt): before your closing
   message — did real friction occur? If yes, fire `submit(feedback=...)`; if
   nothing, no entry.

## DO-NOT-touch

- `.opencode/plugin/compact_memory.ts`, the gauge plugin, anything under
  `.opencode/maintainer/`, `opencode.jsonc`, the proposal file (READ-ONLY
  reference), `.opencode/agent/prompts/**` (you have no edit access there —
  if a prompt line seems stale, note it in the handover instead).
- No removals of deactivated/commented-out alternative implementations.
- No behavior changes beyond the proposal (the file-trigger path stays
  unchanged — proposal §Part A.4).

## Context discipline

- Bounded reads: auto_resume.ts sections named above (the file is 1286 lines —
  never read it whole); the smoke file: locate sections by grep
  (`spawned`, `scope=`, `restart`, `UNIT`, with `| head -30`).
- First greps always output-limited; no whole-file reads of logs/DB dumps.
- Write-tool flakiness (#74): if a write payload fails with a JSON parse
  error, fall back to small write/edit batches or bash heredoc (see
  knowledge_tools.md) — never re-emit the same big payload twice.
- Near-limit: if your gauge readout reaches ~80 %, estimate ~10 remaining
  calls to the DoD; if it exceeds that, stop at the last green checkpoint,
  write the handover (what is done / what remains), and end cleanly.

## Verification (planner, after your return)

`git log` + the committed diff against the proposal's Parts A/B/C, the smoke
counts you report vs a planner re-run of `auto_resume.smoke.mjs` only (12.5 s
wall — do NOT re-run the full suite in this session if time-constrained; the
planner re-runs the gate in its bookkeeping).
