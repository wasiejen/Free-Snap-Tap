# DRAFT P4 — looprunner: digest instead of full-summary relay (approved in maintainer comment4, 2026-09-18)

Failure anchor: the looprunner's own stop line is 85% and "you cannot restart yourself"
(prompt_agent_looprunner.md §Loop hygiene) — the driver window is the loop's single point
of failure, and it currently shrinks every iteration by the FULL closing summary text.
The committed `plan<N>_summary.md` is already canonical (AGENTS.md §Interaction-contract),
so the full print duplicates a file instead of referencing it.

One surface: `agents/prompt_agent_looprunner.md`, §Communication, the iteration-close block.

Old:
```
   -- iteration <N> closed --
   planner:  <session_id> (<model>)
   action:   <the action line, verbatim>
   summary:  <path to plan<N>_summary.md>
   <the FULL closing summary content — print it in full, not abridged: this is
    the maintainer's first look when returning to a run>
   next:     <launch planner / resume / stop / wait for maintainer>
```
New:
```
   -- iteration <N> closed --
   planner:  <session_id> (<model>)
   action:   <the action line, verbatim>
   summary:  <path to plan<N>_summary.md>
   digest:   <3-5 lines: what was done, key decisions, what's next — the maintainer's
    first look when returning to a run; full text in the summary file>
   next:     <launch planner / resume / stop / wait for maintainer>
```
Plus one sentence added right after the fixed-block definition:
```
The digest replaces the full print — if the maintainer asks for an iteration's full
summary, read that iteration's plan<N>_summary.md and print it in full, on demand.
```

Everything else in the section (loop-start line, failure WARNING readout, maintainer-
message ack line) is unchanged.

## Verification (D10, minimal)
Over the next looprun: count looprunner context growth per iteration (gauge readout in
its ctx nudge) before vs. after. Expected delta: per-iteration burn drops by the full
summary length; the looprunner survives the same number of iterations or more before
hitting its 85% line. If the maintainer reports the digest is too thin for his "first
look", the on-demand full print is the documented fallback — no prompt change needed
to restore it (he just asks).

## Deliberately not done
- No change to what the PLANNER writes (plan<N>_summary.md content stays as-is — the
  file is the maintainer's archive copy; only the relayed print changes).
