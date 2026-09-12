# proposals/ — the agent→maintainer decision channel

The agent proposes; the maintainer decides asynchronously by MOVING the file —
location IS the state. This tree is the channel to the maintainer (ruling
2026-09-12: no fine-grained maintainer inbox for agent output). One file per
proposal, one idea, named `YYYY-MM-DD_<slug>.md`.

## Flow
root = pending → `commented/` (in-file comments; the planner revises, never
edits his text; back to root) → `approved/` (a task; the `--maintainer:` block
is the ruling) → `implemented/` (verdict note in-file; he removes eventually).
`rejected/` + `unclear_if_implemented/` = closed / needs revisit; `files/` =
his read-only draft test set.

## Not here
maintainer→agent traffic lives one level up in `.opencode/maintainer/` (his
outbox: inboxes, feedback, `priority.md` — see its README). Also NOT for: repo
code bugs (`TODO.md`), product ideas, anything needing no decision.
