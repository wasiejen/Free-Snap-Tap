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
   - `proposals/implemented/` — moved here after implemention, to be removed by maintainer.
   - `proposals/files/` — proposals for files that are only loaded on restart 
    - e.g. AGENTS.md, agents-repo.md, prompt_agent_*.md, opencode.json
3. Planner checks the subfolders at session start (approved = next task candidates).

## maintainer/ — the reverse direction (maintainer→agent, P10)
- `maintainer/inbox/` — the maintainer drops a file per message (or batches
  several messages into ONE file — bundling is fine, naming is loose, e.g.
  `M<YYMMDD-HHMM>_<slug>.md`; content verbatim, the `--planner:`/`--worker:`
  prefix stays the addressing line).
- `maintainer/done/` — the addressed agent moves a file here after handling ALL
  messages in it (content untouched; the handling is recorded in the NAP/TODO as
  usual). The move = processed (read-receipt).
- Agents scan `inbox/` at session start BEFORE planning; the agent commits the
  moves as bookkeeping (same as the approved/ moves).
- Supersedes the retired single-file `.opencode/handover_maintainer.md`
  (archived, 2026-09-10).

## Why "move" instead of "git change signal"
A committed new file loses the "file changed" attention signal, but a file's
LOCATION is a durable, committable state: an easy folder scan is all an agent (or a
human) needs to find what needs attention. Unmoved files in `proposals/` root =
pending.

## Not for here
Repo code bugs (`TODO.md`), product feature ideas, or anything that needs no
maintainer decision.
