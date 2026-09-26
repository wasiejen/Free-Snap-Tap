# plan20 summary — autorun 2026-09-26, iteration 20 (ses_f24a7fc46ffeHrj1SC7Q9CVpqc, planner-20, Qwen3.8-27B-Q3S-245K-slow)

## Units landed (all planner-verified from files + targeted spot re-runs)
1. **Maintenance pass (N%5==0, first):** knowledge inbox empty; TODO #100
   header fixed (open→LANDED); no open TODO untouched 14+ days;
   baselines current at start; FLAGGED stale proposals to the maintainer:
   `approved/2026-09-12_fst-rebind-repeat.md` + `approved/2026-09-12_
   loop_log-v2.md` (both 14+ days untouched; never auto-delete).
2. **bt-v2 spec wave COMMITTED** (`handover/specs/bt_v2/`, S1→S4) +
   S1..S3 executed:
   - S1 `0d85a8c` — one exported pure `resolveAnchor` (+ `matchAnchorLines`
     swappable rule place), all modes routed, teaching taxonomy, smoke 45/45.
   - S2 `f5f888c` — schema-level `string|integer` refs, COPY-list/`text`,
     APPEND, `ref-out-of-range` wired, smoke 87/87; probe S15 108/109
     re-pin RATIFIED (stale under any S2 build; the alternative was red).
   - S3 `8cc8819` — WRITE (single + `regions` list, highest-line-first,
     overlap error, file-creation path) + PEEK (bounded, cap 25) + Part F
     feedback complete for all modes + the S1 deferred v2 error switch
     (probes 115/263 + 6 more re-pinned in place) + probe S30; probe
     316/316, block_transfer 112/112, sandbox 61/61.
3. **MAINTAINER LIVE REPORT handled** ("worker keep trying to access the
   temp/tmp folder directly and are stopping the loop repeatedly"):
   triaged from files — R8 redirect WORKS for the Windows-Root form
   (intercept.log L4668); the POSIX `/tmp` form has no mapping ->
   fail-closed -> gate STOP. Mitigation: worker-prompt scratchpad bullet
   (committed). Structural fix: **TODO #102 LANDED `be07ce6`** —
   `/tmp` + `/var/tmp` -> scratchpad root in the core resolver + the bash
   `command`-string redirect (spec assumption was wrong: bash was
   excluded as "opaque"; extended per spec fallback); intercept 68/68,
   probe 305/305 at that point.
   **LIVE ACCEPTANCE PENDING the maintainer's process restart** (the
   live plugin runs pre-restart code; probe: `echo hi > /tmp/x` + a
   typed `/tmp/x` read, expecting redirect + landing in the sandbox +
   kind=redirect lines).

## Baselines (measured, post-S3)
probe **316/316**; smokes all green (block_transfer 112/112 + 61/61,
intercept_observer 68/68, compact_memory 74/74, auto_resume 139/139,
context_recovery 17/17, submit 20/20); pytest 459 passed + 1 warning;
ruff F=0.

## Open questions (ordered by priority)
1. **WRITE-on-absent-file semantic** (flagged detail #2): refs cannot
   resolve against an empty file, so the creation path is unreachable
   via refs (worker note 2 in the S3 handover). If the maintainer meant a
   different semantic (e.g. numeric spans creating a new file), that is
   a separate decision. Non-blocking.
2. **#102 live acceptance** — maintainer, post-restart (the probe above).
3. **Stale proposals** — `fst-rebind-repeat` (parked FST spec) +
   `loop_log-v2` (his own note: not yet implemented) — his call.

## Next iteration (planner-21)
Stage + launch S4 (`handover/specs/bt_v2/bt_v2_s4_map_lastwrite_
description.md`) -> verify; after S4: the NEW-HIRE test (a fresh agent
uses every mode from the description alone, file-blind task) + the
HELD-OUT multi-step task (assemble a 3-section file via COPY-list +
APPEND, then a 2-region WRITE-list, verify via PEEK/MAP; measure tool
calls / errors / tokens) — both planner-side delegations. R3 +
loop_log-v2 remain queued behind the bt-v2 wave.

## Lessons
- A staged spec's baseline must be RE-VERIFIED at staging time (the S3
  spec said 297; the measured baseline was 305 post-#102 — the worker
  correctly built against the measured one).
- The edit-fuzzy hint "reason=d-too-high best-d=N" can ride an APPLIED
  edit (NAP edit, d=24) — the hint reads like a rejection; verify the
  file state before retrying (friction entry filed).
