# handover_task_to_planner — worker_Q4_120K (DONE — final)

Task: helper-script collection per spec 4a72c30 (maintainer #10 + #4 inbox).
Session ses_f59f7cff0ffer37uRICTRFiyS0, iter-3 launch.

## Result: COMPLETE — all acceptance criteria met, gate green

### Commits (on `fst_work2`, see below for the branch discrepancy)
| commit | content |
|---|---|
| `2933dd0` | unit 1: 8 curated scripts in `binary/` `db/` `log/` + `dump_session.cjs` moved into `db/` (git mv, content unchanged) |
| `7f7f61c` | fix: `dump_session.cjs` OUT_DIR after the db/ move (the idempotency test caught a stray write to `.opencode/agent/archive/`; stray file removed) |
| `b3a34d8` | unit 2: top-level README (rewritten), per-category READMEs, `grep_snippets.md`, machine-generated `INVENTORY.md` |
| final | this file + `todo_inbox.md` findings |

### Collection (`.opencode/agent/scripts/`)
- `binary/`: `binwin.cjs` (needle→context window, ≤3 hits/needle),
  `binhits.cjs` (all offsets + tiny context, cap 60), `binoff.cjs` (raw
  offset window). exe: `--exe` flag > env `OPENCODE_EXE` > host default.
- `db/`: `probe_schema.cjs` (columns+counts, no data; now enumerates ALL
  tables instead of a hardcoded list), `sesinspect.cjs` (recent sessions /
  session+last 14 msgs), `sesdata.cjs` (slim per-message JSON lines),
  `compact_dir.cjs` (compaction summary + parts, 4000-char cap),
  `dump_session.cjs` (corpus dump, moved here). DB: env `OPENCODE_DB` >
  host default; all `readOnly: true`.
- `log/`: `logctx.cjs` (±3-line window/380-char lines per hit; needle +
  maxHits now argv, log via env `OPENCODE_LOG`).
- Not promoted (dedup/superseded, recorded in INVENTORY.md): `findbin.ps1`
  (PowerShell twin of binwin), `find_ctx*.mjs` (superseded by binary/),
  `dump_session.py` (python twin of db/dump_session.cjs).
- One deliberate deviation, documented in `db/README.md`: `sesinspect.cjs`
  slim lines now parse `message.data` (the scratchpad original read the slim
  keys off the DB row, matching only id/timestamps — near-empty output).

### Verification (measured, 2026-09-15, from repo root)
- Every script: exit 0 + expected output shape (test command + result per
  script in its category README). Notable: binwin/binhits hit-path proven
  on the live opencode.exe (179 982 488 bytes); logctx against the live
  log (20 hits capped, 64193 lines); compact_dir hit-path on a
  compacted session (8 compaction msgs); probe_schema all-tables (21).
- Gate: `pytest -q` → **459 passed, 1 warning** (baseline match);
  `ruff check --select F .` → **All checks passed (F=0)** (baseline match);
  `node .opencode/plugin/probes/handover_probe.mjs` → **99/99 PASS**
  (baseline match — the probe is named in the launch baseline; it is NOT
  in the spec's gate commands nor in repo_commands.md, flagged in
  todo_inbox).
- dump_session idempotency test: re-dump of an existing corpus session
  showed session GROWTH (59→65 msgs, final tool status
  running→completed), not script drift → the script is correct; the corpus
  file is stale (see todo_inbox). I reverted the re-dump (out of scope).

### Acceptance checklist
- [x] Scratchpad inventory documented — `INVENTORY.md` (140 scripts +
  purpose, 7 dirs, 45 non-script files), machine-generated.
- [x] Every selected script: in repo, generalized (no hardcoded host paths
  beyond env-overridable defaults), tested from the repo, command+result
  in its README.
- [x] `grep_snippets.md`: marker sweep (verbatim from planner prompt
  §maintainer calls/decisions) + 7 output-limited navigation recipes.
- [x] No product code touched; no `.opencode/agent/prompts/**` touched
  (no edit-deny block hit — I never attempted it); no scratchpad original
  deleted.
- [x] Standard gate green, numbers above.

### Deliberately NOT done
- Scratchpad originals left in place (maintainer's call per spec).
- No prompt edits (the one-line "look here for helper scripts" role-prompt
  pointers are planner-side per the spec Notes).
- Corpus refresh (stale `ses_f5d03802...` + general backfill cadence) —
  flagged in `todo_inbox.md`, planner/maintainer call.
- `TODO.md` untouched: no maintainer-calls or blocked items found; the
  three findings went to `todo_inbox.md` (branch-name mismatch in the
  launch message, stale corpus, "probe 99/99" gate-definition gap).
