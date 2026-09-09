# EXECUTIVE SUMMARY — T1 continuation 2 (de-peek: node:sqlite core + v2.5 wiring + probe rebuild)

**Commit:** this summary rides along in the task commit (one commit: code + TODO.md + this file).
Build scope COMPLETE. Worker stopped at the context stop-line immediately after committing
(self-gauge at stop ≈85–89 % of the 120k window).

## What changed (one commit)
- `.opencode/ctxgauge/gauge.mjs` — read mechanic REBUILT on built-in `node:sqlite`
  (`DatabaseSync`, `readOnly: true`, `PRAGMA busy_timeout=2500` via exec + ONE retry on
  busy/locked). The sqlite3.exe spawn code is GONE — only the node:sqlite path remains.
  `parseWindow` / `parseModelId` / `formatGauge` and the result contract
  (`readGauge(dbPath?)` async → `{sid, modelId, ctx, total, window, ok}`, kinds
  ok / no-total / db-error) kept byte-identical. `node:sqlite` is imported DYNAMICALLY
  inside `readGauge` — a host without the module gets kind `db-error`, never a broken
  plugin import (the never-throw contract). Structured single-row `prepare().get()`
  queries replace the marker-SQL rows (worker's call per the ruling); json_extract stays
  in SQL — the `data` JSON is never fetched.
- `.opencode/plugin/handover_v2.4.ts` — v2.5 wiring (single live plugin file, edited in
  place): imports the core; chat.message readout = native gauge (NO shell); MATCH-ONLY
  post (`g.sid !== input.sessionID` ⇒ silent return — no post, no gauge line; the
  per-fire `kind:"chatmsg"` evidence line is still logged and GAINS the `sess` field);
  on match ANY valid form posts (known-window / unknown-window / `CTX=notAvailable`);
  failure vocabulary = `db-error` (capped preview) + unchanged `parts-not-array` +
  `invalid-messageID`; shell-era reasons GONE; dead `$`/ShellLike/GAUGE_TIMEOUT/
  withTimeout/gaugePreviewOf/gaugeReadout machinery DELETED; v2.5 header block added
  above the v2.4.1 notes; v2.4.1 part-schema mechanics (prt-/msg- ids, messageID
  sourcing) untouched. Historical header notes reworded minimally so the file is
  grep-clean (no literal `peek.py` / `python.exe`).
- `.opencode/plugin/probes/handover_probe.mjs` — REBUILT (the old one targeted the
  deleted `handover.ts` + the voided transform hook + fake-$ shells). Sandboxed-init
  design kept (temp sandbox, real-file byte-identity S5, zero writes outside sandbox);
  temp fixture sqlite DBs BUILT BY THE PROBE with `node:sqlite` (opencode-like schema,
  no python / no sqlite3.exe / no live DB). Sections: S1 preflight (3), S2 gates (4),
  S3 mirror (5), S4 chat.message shapes (8: ok-match byte-exact / unknown-window /
  notAvailable / mismatch-silent / db-error byte-exact / parts-not-array /
  invalid-messageID / no-throw), S6 gauge core shapes (8: known/unknown/notAvailable
  byte-exact / missing-db db-error / SESSION= prefix / parseWindow incl. no-match +
  `256K` / parseModelId / setDbPath plumbing), S5 hygiene (5).
- `.opencode/ctxgauge/peek.py` — DELETED (maintainer-approved).
- `TODO.md` — #30 status advanced (landed this cycle; bun host-proxy PASS recorded);
  #35 status advanced (build scope complete, tail = log-profile re-baseline + #34
  residual refs); header numbering line corrected (up to #36, next #37 — it said #35
  though #36 existed; pre-existing staleness).
- `.opencode/ctxgauge/peek.mjs` — comment-only update (backend is node:sqlite, not a
  spawn); import surface unchanged.

## Verification (measured, repo root, pwsh)
- `node .opencode\plugin\probes\handover_probe.mjs` → **`PROBE handover: 33/33 PASS`**,
  exit 0 (one transient failure during development: probe check 23 expected the no-total
  result to carry the session model; the committed core contract carries `modelId:""`
  when no finished step row exists — probe expectation corrected to the contract).
- `node .opencode\ctxgauge\peek.mjs` → live line (exact):
  `SESSION=ses_f77ab4609ffe0L9BsH1E90VnMW CTX=68831 (57%) REM=51169`
- **bun 1.4.2 host-proxy check: PASS** — `bun run` of a temp import+read script
  (scratchpad) against the REAL db read-only printed
  `SESSION=ses_f77ab4609ffe0L9BsH1E90VnMW CTX=106080 (88%) REM=13920` +
  `bun-host-check kind=ok`. `node:sqlite` works under bun 1.4.2 — the bun-compiled
  opencode.exe host risk is still guarded by the db-error fallback (production
  evidence = maintainer restart + one-shot log read, call 1).
- `& .\.venv\Scripts\python.exe -m pytest -q` → **434 passed** (1 warning, known
  coroutine-warning profile), 2.61s.
- `& .\.venv\Scripts\ruff.exe check --select F .` → **All checks passed!** (0 findings).
- `git ls-files .opencode/ctxgauge/` after deletion → `gauge.mjs`, `peek.mjs`
  (peek.py gone from disk + staged in the commit).
- Grep plugin + probe + core for `peek.py` / `python.exe` / `sqlite3.exe` / spawn
  identifiers (execFile/exePath) → zero hits in the three live files.

## Remaining `peek.py` references (out of scope — triage list)
- `agents_repo.md` 122, 164 — maintainer-owned; tracked in #34.
- `.opencode/handover_planner.md` 29, 54, 69 — planner-owned (NAP update).
- `.opencode/prompt_agent_planner.md` / `prompt_agent_task.md` — DENIED to workers
  (`.opencode/prompt_**`); planner handles per #34.
- `.opencode/plugin/deactivated/handover.ts` 27, 36, 310 — frozen dead copy (removal
  = maintainer call, per #34).
- `playground/outline_rework_prompts.md` 131, 168, 239, 343 — maintainer rework draft
  (per #34).
- `TODO.md` (#30/#34/#35 entries), `.opencode/handover_task.md` (the spec itself),
  `todo_records.md` 21/24, `.opencode/archive/260908-phase5-coverage.md` 147 —
  historical (keep).
- `SCRATCH_PAD.md` — maintainer WIP, untouched.

## Deliberately NOT done
- `agents_repo.md`, root `AGENTS.md`, `opencode.jsonc`, `SCRATCH_PAD.md`,
  `prompt_agent_*.md` — approval-boundary / deny / maintainer-owned (flagged only).
- `.opencode/plugin/tools/sqlite3.exe` — NOT deleted (maintainer-placed, now unused by
  the core — flagged here per the ruling).
- No FST python touched at all (suite run = no-regression proof only).
- No `plugin.log` content read (S5 byte-identity snapshot only — the accepted exception).
- No new numbered TODO entries needed: the bun check PASSED (a TODO line is required
  only on failure), and every stale-doc reference found is already tracked in #34 —
  duplicating would violate the dedup discipline.

## Notes for the planner
- The `agents_repo.md` gauge command (the AGENTS.md post-commit context check) now
  points at the deleted python CLI — until the maintainer updates it, use
  `node .opencode\ctxgauge\peek.mjs` (this worker did).
- The live plugin now posts `ctx: SESSION=… …` (the SESSION= prefix is part of the
  posted text, per the ruling).
- Ready for: maintainer restart → one-shot log read (call 1) for the v1.3
  log-profile re-baseline + #34 prompt/doc updates + T2 nudge ladder.
