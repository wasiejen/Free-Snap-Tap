# agent/scripts

Agent utility scripts (plain node, built-in `node:sqlite` only, no deps).

## dump_session.cjs (READ-ONLY)

Dumps sessions from the live host DB into `.opencode/archive/sessions/<sessionID>.md`.
The DB is opened `readOnly: true` and never written (`env OPENCODE_DB` overrides path).

- `dump_session.cjs <sessionID>` - full dump of one session
- `dump_session.cjs --all [--slim]` - corpus backfill (slim lines are the default)
- `dump_session.cjs --all --full` - corpus backfill, full detail

Format: `#`-metadata header, then one slim JSON line per message (slim) or
per-message sections with text/reasoning parts (full).

## Dump before compaction

When the context gauge hits ~85-90% or just before `compact_memory`, dump the
current session (id from your `ctx:` line) so the fine-grained context that
compaction destroys is preserved in the corpus:
`node .opencode/agent/scripts/dump_session.cjs <sessionID>`
