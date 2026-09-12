# Proposal — attention keywords: priority markers that do not interrupt running work
(inbox `attention_keywords.md` + the `--todo` in `maintainer/README.md`)

## Problem (evidence)
- Only `--main`/`--maintainer` exists (top-priority, interrupt-level). Anything else the
  maintainer writes gets the same urgency or gets missed — no way to say "remember this" or
  "not for now" without implying "do it now".
- Already in use, uncodified: `--todo` (`maintainer/README.md:1`), `deferred:do_later`
  (`inbox_planner/feedback_protol_tool.md:1`). Codify what he already does.
- Inbox handling is too immediate — it disrupts the current task (maintainer's explicit goal:
  "reduce interrupting of running tasks").

## Design (independently approvable)
- **Part 1 — keyword set** (marker line anywhere in a repo file; scanned at session start,
  same grep as the `--main` sweep):
  | marker | meaning | action |
  |---|---|---|
  | `--maintainer` / `--main` (existing) | top priority | act FIRST, before other queued work; may interrupt |
  | `--now` | important, but the current unit finishes first | act before other queued work, after the current verified unit |
  | `--todo` | capture | add a self-contained entry to `TODO.md` (next ID), no immediate work |
  | `--deferred` (alias `--defer`) | not for now | deferred `TODO.md` entry; picked up only when nothing else is open |
  | (no marker) | background | queue; small items may be done inline, larger ones in priority order |
- **Part 2 — priority ladder** (planner prompt, both direct + autonomous sections):
  direct maintainer message in a primary session > `--maintainer`/`--main` > `--now` >
  unmarked inbox items (small first) > `--todo` capture > `--deferred`.
- **Part 3 — inbox cadence:** inbox items are handled when nothing more important is pending —
  NOT at the top of every session before other work; small items (≤ a few lines of effect) may
  be handled inline. The existing "scan at session start" stays (the scan = triage by ladder,
  not execution).
- **Part 4 — prompt additions:** planner prompt (autonomous: replace the bare "scan inbox" with
  the ladder; direct: the same ladder) + looprunner prompt routing section (one line: markers
  ride verbatim with the messages, the looprunner does not interpret them).

## Acceptance
- After landing: a test set of marked/unmarked inbox files is triaged in one session exactly per
  the ladder (verified in the session's summary + NAP).
- `--todo` marker produces a TODO entry with the standard fields; `--deferred` produces a
  DEFERRED-flagged entry (same as today's #53).

## Status
awaiting approval (prompt change = maintainer-gated)
