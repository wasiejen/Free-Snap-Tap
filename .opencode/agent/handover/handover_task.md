# Task spec — session dump script + corpus backfill (priority `# 3 2`, URGENT)

**Goal:** a tested, documented, READ-ONLY script that dumps opencode sessions
from the host DB into the repo corpus, usable both for a full backfill and as
a fast pre-compaction dump of one session.

**Worker:** you (worker role; implementation task, ~1 focused build).

## Verified state (planner-measured 2026-09-15 — do NOT re-derive)
- DB: `C:/Users/Wasiejen/.local/share/opencode/opencode.db` (SQLite).
  Tables include `session`, `message`, `part` (+ `session_message` — newer
  schema, explore if needed). Counts at spec time: **136 sessions, 6320
  messages** (they grow while you work — report the count at YOUR run time).
- `session` cols (useful): `id, title, agent, model, parent_id,
  time_created, time_updated, time_compacting, time_archived, tokens_input,
  tokens_output, tokens_reasoning`.
- `message` cols: `id, session_id, time_created, time_updated, data`
  (`data` = JSON blob: role/mode/agent/summary/finish/error/tokens/modelID/
  providerID + content/parts).
- Proven shape to build on (NOT research): the scratchpad scripts
  `C:/Users/Wasiejen/AppData/Local/Temp/opencode/sesdata.cjs` (read-only
  `node:sqlite` + slim JSON line per message) and `sesinspect.cjs` (table
  introspection). Copy/adapt that pattern — do not invent a new stack.
- Corpus target: `.opencode/archive/sessions/` (one file per session; folder
  does not exist yet — create it WITH a README per the `.opencode` folder
  rule).
- The design source is the NAP archive line for `ses_f5df3e30`
  (`.opencode/archive/loop/nap_direct.md` L20-24) — read ONLY those lines if
  you need the design context; do not read more of that file.

## Build
1. `.opencode/agent/scripts/` (new folder + README ≤20 lines) containing:
   - `dump_session.cjs` — single file, no deps beyond `node:sqlite`,
     opened `readOnly: true` (non-negotiable — the DB is live).
     - `node dump_session.cjs <sessionID>` → dump ONE session, FULL detail
       (this is the pre-compaction mode: everything the session holds —
       metadata line + every message with its text; parts via the `part`
       table when joinable).
     - `node dump_session.cjs --all [--slim]` → corpus mode: every session,
       one file each; `--slim` = the sesdata-style slim lines (corpus
       default is YOUR call if it keeps files small and grep-friendly).
     - Output: `.opencode/archive/sessions/<sessionID>.md` (or `.jsonl` —
       your call; the name MUST contain the exact session ID; self-describing
       header: session metadata first line(s); grep-friendly; no binary).
   - README in `archive/sessions/` (≤20 lines: what the corpus is, how it was
     built, how to refresh it).
2. Usage doc: a short "how to dump before compaction" section in the
   `agent/scripts` README (one-liner command + when to use it).

## Definition of done
- `--all` backfill completes: file count in `archive/sessions/` == session
  count at run time (report both numbers).
- Your OWN session (get the id from your `ctx:` line) dumps correctly and the
  dump contains your last messages (freshness proof).
- DB untouched: `git status` clean outside the paths you were told to write;
  script opens the DB read-only (verifiable by reading the one line).
- Gates green: probe `node .opencode/plugin/probes/handover_probe.mjs`
  (99/99), pytest `./.venv/Scripts/python.exe -m pytest -q`
  (459 passed + 1 warning #10), ruff `./.venv/Scripts/ruff.exe check --select F .`
  (F=0).
- One green commit (scripts + READMEs + corpus + TODO.md note if any):
  `session dump script + corpus backfill of all sessions (# 3 2)`.

## DO-NOT-touch
`.opencode/maintainer/**`, `opencode.jsonc`, product code (`fst_*`, `tests/`),
`.opencode/agent/prompts/**`, `knowledge/**`, the NAP
(`handover_planner.md`), the DB in write mode, existing files in
`.opencode/archive/` (add the `sessions/` subfolder only).

## Hard rules
- PIPELINE discipline (the lesson of this session): never read the DB or a
  large dump into your context — explore via scripts, print bounded windows
  (head/tail/grep with limits).
- Non-ASCII: avoid in code/strings where possible (edit-tool constraint).
- If the `part`/`session_message` join turns out to need more than a small
  bounded exploration: implement the message-level dump (proven shape) and
  note the gap in the handover — do NOT expand scope.

## Handover
Write `handover_task_to_planner.md`: run-time session count + file count,
your own-session spot-check (2-3 lines of evidence), format choice + why,
gates, commit hash, the gap notes (if any).
