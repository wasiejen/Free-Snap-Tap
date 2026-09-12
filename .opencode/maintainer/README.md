# maintainer/ — the maintainer→agent exchange area (P10 + priorities)

His outbox and standing instructions, directly under `.opencode/` (lifted out
of `proposals/` 2026-09-12 — his space is not nested under the proposals
flow). The folder name names the addressee direction: maintainer → agents.
Supersedes the retired single-file `handover_maintainer.md` (archived 2026-09-10).

- `inbox_planner/` — messages for the planner (scanned at session start, before
  planning; also the `--main` marker source).
- `inbox_worker/` — messages for workers (scanned at task start).
- `done/` — handled files; the addressed agent moves them here, content
  untouched (the move is the read-receipt; handling recorded in NAP/summary).
- `inbox_planner/draft/` — his drafting-session scratch; agents scan it ONLY
  when nothing else is open in their inbox.
- `feedback/` — his notes on agent behavior; read-only input for the next
  session (moved in from `proposals/feedback/`).
- `priority.md` — PERSISTENT (never moves to done/): his simple ordered list
  of what he wants next; the planner reads it at session start and uses it to
  order planning. Agents are read-only on it — he adds/reorders/deletes lines.

Naming for inbox messages is loose (e.g. `M<YYYY-MM-DD_HH-MM>_<slug>.md`;
bundling several messages in one file is fine; the `--planner:`/`--worker:`
prefix line stays the addressing line). Agents never edit his content —
replies, if any, are appended after a `---`.
