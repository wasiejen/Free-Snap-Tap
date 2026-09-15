# archive/sessions - opencode session corpus

One `.md` file per opencode session, dumped READ-ONLY from the live host DB by
`.opencode/agent/scripts/dump_session.cjs` (the DB is opened `readOnly: true`).
A readable, grep-friendly record of every agent session in this repo
(memory recall / consolidation input; pre-compaction preservation).

Format: `#`-prefixed session-metadata header, then one slim JSON line per
message (slim, the default here) or per-message sections with text and
reasoning parts (full, opt-in).

Build / refresh: `node .opencode/agent/scripts/dump_session.cjs --all`
(slim, ~2 MB for 137 sessions; re-running overwrites, `--full` for detail).
Backfilled 2026-09-15: 137 sessions.
