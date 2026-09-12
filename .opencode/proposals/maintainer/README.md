# maintainer/ — maintainer→agent messages (the reverse of the proposals flow)

His outbox per P10; the folder name names the addressee. Supersedes the retired
single-file `handover_maintainer.md` (archived 2026-09-10).

- `inbox_planner/` — messages for the planner (scanned at session start, before
  planning; also the `--main` marker source).
- `inbox_worker/` — messages for workers (scanned at task start).
- `done/` — handled files; the addressed agent moves them here, content
  untouched (the move is the read-receipt; handling recorded in NAP/summary).
- `inbox_planner/draft/` — his drafting-session scratch; agents scan it ONLY
  when nothing else is open in their inbox.

Naming is loose (e.g. `M<YYYY-MM-DD_HH-MM>_<slug>.md`; bundling several
messages in one file is fine; the `--planner:`/`--worker:` prefix line stays
the addressing line). Agents never edit his content — replies, if any, are
appended after a `---`.
