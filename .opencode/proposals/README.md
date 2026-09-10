# proposals/ — the maintainer decision channel

One file per proposal, one idea per proposal. The planner writes; the maintainer
decides asynchronously.

## Naming
`P<NN>_<short-title>.md` — `NN` = running number within the current looprun
(P01, P02, …; numbers restart per looprun-day, titles carry the meaning).

## File format
- **Proposal** — one sentence, the actionable idea.
- **Context** — why / evidence (TODO / agent_feedback / session references).
- **Proposed action** — the concrete change, pasteable where possible.
- **Impact / risk** — what changes; what breaks if wrong.
- **Verdict:** — the maintainer fills this in OR moves the file (see workflow).

## Workflow
1. Planner creates + commits a proposal file (it shows up in `git status`/log).
2. Maintainer reviews, comments directly in the file if needed, then MOVES it:
   - `proposals/approved/` — the planner acts on it in a later session (it is a task).
   - `proposals/commented/` — the planner reads the comments, revises or closes it.
   - `proposals/rejected/` — done, no further action.
3. Planner checks the subfolders at session start (approved = next task candidates).

## Why "move" instead of "git change signal"
A committed new file loses the "file changed" attention signal, but a file's
LOCATION is a durable, committable state: an easy folder scan is all an agent (or a
human) needs to find what needs attention. Unmoved files in `proposals/` root =
pending.

## Not for here
Repo code bugs (`TODO.md`), product feature ideas, or anything that needs no
maintainer decision.
