# scripts/db — read-only inspectors for the live opencode DB

The host DB is LIVE and big (~1.9 GB). Every script here opens it
`readOnly: true` and NEVER writes. **DB resolution (all):** env
`OPENCODE_DB` > host default
`C:/Users/Wasiejen/.local/share/opencode/opencode.db`.

| script | what it does | tested (2026-09-15, from repo root) |
|---|---|---|
| `probe_schema.cjs` | bounded schema probe: columns + row counts per table, NO row data | `node .opencode/agent/scripts/db/probe_schema.cjs` → 21 tables `name n=.. cols=..`, exit 0 |
| `sesinspect.cjs` | no arg → message/session columns + 10 most recent sessions; `<sid>` → session row + last 14 messages (slim) | `node .opencode/agent/scripts/db/sesinspect.cjs ses_f59f7cff0ffer37uRICTRFiyS0` → `SESSION: {...}` + `message count: 43` + slim lines, exit 0 |
| `sesdata.cjs` | `<sid>` → session row + one slim JSON line per message (role/mode/agent/summary/finish/error/tokens/modelID/providerID) | `node .opencode/agent/scripts/db/sesdata.cjs ses_f59f7cff0ffer37uRICTRFiyS0` → `SESSION: {...}` + `message count: 43` + slim lines, exit 0 |
| `compact_dir.cjs` | `<sid>` → compaction markers: assistant `mode=compaction` summary + user summary message (full data) + parts (4000-char cap) | `node .opencode/agent/scripts/db/compact_dir.cjs ses_f6819fba7ffehzefuX23UIM11O` → `=== message ... ===` blocks, exit 0 |
| `dump_session.cjs` | `<sid>` → LOSSLESS full-detail dump into the repo corpus `.opencode/archive/sessions/<sid>.md` (tool `state.input`/`state.output` verbatim, no caps — #78); `<sid> --lite` → filtered markdown dump (text/reasoning verbatim, tool header-only, step-start/step-finish skipped); `<sid> --json` → RAW JSON dump (`<sid>.json`; `--out <relpath>` appends `.json` when the relpath has no extension); `<sid> --out <relpath>` → single-session dump to `OUT_DIR/<relpath>` (relpath must be relative, no `..`, safe chars — else exit 2); `--all [--slim\|--full]` corpus backfill. **Writes repo files** (corpus), read-only on the DB | `node .opencode/agent/scripts/db/dump_session.cjs ses_f5d03802affekevrhzPdvLFaHQ` → `dumped ... messages=65 parts=304 mode=full`, exit 0 |

Usage examples (one each):

```
node .opencode/agent/scripts/db/probe_schema.cjs session part     # or: no args = all tables
node .opencode/agent/scripts/db/sesinspect.cjs                    # recent sessions overview
node .opencode/agent/scripts/db/sesdata.cjs ses_f59f7cff0ffer37uRICTRFiyS0
node .opencode/agent/scripts/db/compact_dir.cjs ses_f6819fba7ffehzefuX23UIM11O
node .opencode/agent/scripts/db/dump_session.cjs <sessionID>      # pre-compaction corpus dump
node .opencode/agent/scripts/db/dump_session.cjs <sessionID> --out compaction_dumps/ses_x_c0.md   # to a custom relpath
```

Note (2026-09-15, the dump-hook build): the single-session `<sid>` mode keeps
its plain "current state" semantics — re-dumping refreshes (may overwrite)
`<sid>.md`. The compaction-aware no-overwrite naming lives in the PLUGIN hook
(`compact_memory.ts` `preCompactionDump` → the `compaction_dumps/` namespace,
see `knowledge_tools.md`), not in this script.

Note: `sesinspect.cjs` slim lines are parsed from `message.data` JSON (the
scratchpad original read the slim keys off the DB row, which only matched
`id`/timestamps — the curated version parses `data` like `sesdata.cjs`).
