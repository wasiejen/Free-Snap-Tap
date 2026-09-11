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

## Maintainer inbox channel
- `proposals/maintainer/inbox_planner/` and `proposals/maintainer/inbox_worker/`
  — each role scans its own inbox at session start; handle an item, then move
  it to `proposals/maintainer/done/` with a `---` + `replier:` block appended.
- NEVER edit the maintainer's text — replies are appended after a `---`.
- `proposals/maintainer/feedback/` — maintainer feedback notes; read-only input
  for the next session.
- `proposals/files/` — the maintainer's draft test set; READ-ONLY unless a task
  explicitly says otherwise.
