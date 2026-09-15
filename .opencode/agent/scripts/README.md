# agent/scripts

Curated, documented, tested helper scripts for agents — REUSE these instead
of re-deriving throwaway one-shots. Plain node (v24, built-in
`node:sqlite`/`node:fs`, no deps). Machine-specific paths are env-overridable
with the current host value as default, and DB/log access is READ-ONLY.

Adapt, don't edit: if you need a variant, COPY the script first (maintainer
ruling, `analyse_helper_scripts.md`).

## Categories

- [`binary/`](binary/README.md) — string search in big binaries (needle windows,
  offsets, hit lists) without reading the binary into context.
- [`db/`](db/README.md) — read-only inspectors for the live opencode DB
  (schema, sessions, message slim dumps, compaction summary, corpus dump).
- [`log/`](log/README.md) — bounded context windows around needle lines in big logs.

Env overrides: `OPENCODE_EXE`, `OPENCODE_DB`, `OPENCODE_LOG`
(see each category README).

## grep_snippets.md

[grep_snippets.md](grep_snippets.md) — ready-made, output-limited
grep/navigation commands for big files/folders (incl. the maintainer-marker
sweep).

## Scratchpad inventory

[INVENTORY.md](INVENTORY.md) — the machine-generated inventory of the
scratchpad (`~\AppData\Local\Temp\opencode\`) the collection was curated
from: file list + one-line purpose. Originals are NOT deleted (maintainer's
call).

## Dump before compaction

When the context gauge hits ~85-90% or just before `compact_memory`, dump the
current session (id from your `ctx:` line) so the fine-grained context that
compaction destroys is preserved in the corpus:
`node .opencode/agent/scripts/db/dump_session.cjs <sessionID>`
