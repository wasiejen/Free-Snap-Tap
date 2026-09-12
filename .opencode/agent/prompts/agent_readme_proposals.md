# agent_readme_proposals.md — the proposal channel

Read when proposing, revising, or landing a design change.

## Folder flow
1. **Draft** at the `proposals/` root: `proposals/<date>_<slug>.md`.
2. **Maintainer comments in place** — under a `comment:` block in the same file.
3. **`proposals/commented/`** — the commented file moves here while the planner
   revises.
4. **Planner revises** — replies are appended in-file under
   `Planner replies (<date>, <context>):`; NEVER edit the maintainer's text.
5. **Back to the `proposals/` root** for the maintainer's decision.
6. **`proposals/approved/`** — after maintainer approval (the approval line is
   kept at the bottom of the file).
7. **`proposals/implemented/`** — after the change lands, with a planner
   verdict note (what shipped, commit, deviations).
8. **`proposals/rejected/`** — for rejections.

## What a proposal contains
- **Problem** — the pain, with evidence (measured where possible).
- **Design** — the concrete change, split into independently approvable parts.
- **Acceptance** — how to verify it worked.
- **Status** — current state (awaiting approval / approved / implemented).

## maintainer/ — the reverse direction (maintainer→agent, P10)
Lives at `.opencode/maintainer/` — a SIBLING of `proposals/`, not under it
(moved out 2026-09-12; see its README for usage):
- `inbox_planner/` and `inbox_worker/` — each role scans its own inbox at
  session start BEFORE planning/executing; handle an item, then move it to
  `done/` with content UNTOUCHED (the move is the read-receipt; the handling
  is recorded in the NAP/summary/TODO as usual). `inbox_planner/draft/` is
  his drafting scratch — scan it only when nothing else is open.
- `priority.md` — his standing task ordering; read-only for you, it orders
  what you plan next (the planner reads it at session start).
- `feedback/` — his notes on agent behavior; read-only input for the next
  session.
- NEVER edit his text.
- `proposals/files/` — the maintainer's draft test set; READ-ONLY unless a
  task explicitly says otherwise.
