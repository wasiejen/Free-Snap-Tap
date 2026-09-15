# Proposal — loop signaling: unambiguous restart/resume words, counter mismatch, AFK mode
(inbox `restart_resume.md` + `looprunner_afk_directive.md`)

## Problem (evidence)
- `restart` / `resume` are semantically close → misinterpreted, wrong action applied (maintainer
  report). Measured instances: loop log `--INFO--` lines of planner-8 (counter not incremented
  after planner-7) and planner-13 ("launch says iteration 13 but the log's last session is
  planner-10+1"); the `<|autonom|>` tag "always misread as autonomous or autorun" (maintainer).
- No defined resolution when the looprunner's iteration number and the planner's disagree
  (file-clobber risk on `plan<N>_*`).
- The maintainer's ad-hoc AFK instruction (looprunner ignores stop/ask while he is away) worked
  well and is worth a keyword-controlled form.

## Design (independently approvable)
- **Part 1 — two distinct action words** (replacing `restart`/`resume` in AGENTS.md
  §Interaction-contract + looprunner prompt + planner prompt + `agent_readme_loop.md`):
  - `action: continue` — relaunch with the OLD task_id (same planner continues). Planner rules:
    do NOT advance the iteration number; if a summary already exists AND the repo is in a safe
    (committed, green) state → end the session requesting a new session (emit `fresh`).
  - `action: fresh` — (DEFAULT) entirely new session, new task_id, new planner; the looprunner
    advances the iteration number ONLY on this word.
  - Missing/unclear action line → fall back to `fresh` (covers compaction-truncated closings).
- **Part 2 — counter mismatch resolution:** when the launch N differs from the last `planner-N`
  in the loop log: **keep the bigger number** (never clobber `plan<N>_*` files); the planner
  notes it in a `--INFO--` loop line + its summary. Direct channel: `--request:` lines — a
  `--request:` line in the planner's closing message is addressed to the looprunner; a
  `--request:` line in the launch message is the looprunner addressing the planner (both
  verbatim, no interpretation). (Extends the existing `--planner`/`--loop` routing in the
  looprunner prompt.)
- **Part 3 — AFK mode:** launch-message tag `<|afk|>` (usable alongside the autonomous tag):
  looprunner IGNORES the planner's `stop` / `ask_maintainer` actions and keeps driving; on a
  planner context-limit violation or launch failure → new planner with new task_id (no resume);
  ends only on a maintainer message. The launch text carries the tag; no repo file change needed
  per session — the tag rides the launch message like today's `--loop` directives.
- **Part 4 — tag rename:** `<|autonom|>` → `<|autorun|>` (the word the loop actually uses;
  removes the autonomous/autorun misread). Touch points: looprunner prompt (launch text),
  planner prompt (autonomous-mode section), `agent_readme_loop.md`, AGENTS.md if it references it.

## Acceptance
- After landing, one looprun demonstrates: a `continue` relaunch (same task_id, same N), a
  `fresh` relaunch (N advanced), and a missing action line → `fresh`.
- Counter-mismatch drill: launch with a wrong (smaller) N → loop keeps the bigger, files not
  clobbered, `--request:` exchange visible in launch/closing messages.
- AFK drill: planner emits `stop` mid-run with `<|afk|>` active → loop continues.

## Status
awaiting approval (prompt/protocol change = maintainer-gated)


Planner note (2026-09-15, plan2): Part 3 (AFK) SUPERSEDED - the maintainer's 09-15
looprunner rework shipped AFK in a different form (afk on/off, immediate
effect, --loop status blocks). Parts 1/2/4 unimplemented. Open ruling bundled
in proposals/2026-09-15_backlog-decisions.md (Decision 2).


Maintainer ruling (2026-09-15, D2): "1 drop, 2 approved" — Parts 1 + 4 RETIRED (superseded by the current state machine + the 09-15 looprunner rework); Part 2 APPROVED for build (counter mismatch: keep the bigger iteration number, never clobber plan<N>_* files; the --request: lines between planner and looprunner). Closed to implemented/ once the Part 2 prompt edits land.


Landed (2026-09-15, plan2 iter-2 resume): Part 2 prompt edits in all three files (looprunner Launch, planner autonomous mode, agent_readme_loop.md Iteration semantics). Parts 1+4 retired per the D2 ruling. Done.
