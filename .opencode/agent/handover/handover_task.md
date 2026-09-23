# TASK SPEC — #78: Dump completeness (options 1+2 + unified 3+4)

Worker: `worker_Q3S_170K`. Branch: stay on the current checkout (`opencode_test`).

## Goal
Per the maintainer's ruling (2026-09-23, planner-12 direct session): make session
dumps complete —
- (A) a `--json` raw-as-is mode in `dump_session.cjs` (option 1);
- (B) lossless full markdown (the tool `state.input`/`state.output` verbatim, caps
  removed) + a `--lite` filtered preset — the "unfiltered vs filtered" toggle
  (unified options 3+4; the maintainer's 3/4 intuition, confirmed by the planner);
- (C) the pre-compaction dump hook: raise the timeout + spawn diagnostics + one
  retry (option 2).

All verified findings + exact line references:
`.opencode/loop/autorun-2026-09-21_15-33/plan11_78_scope.md` — READ IT FIRST
(read-only scoping; its line references were verified at spec time).

## Ordered units (each leaves the repo green; gate once at the end)

### A — `--json` raw mode (`.opencode/agent/scripts/db/dump_session.cjs`)
- New flag `--json`: emit the session row + every message + every part's `data`
  value as RAW JSON — unfiltered, uncapped, structure preserved. Reuse the
  existing queries (L114-121); a new render path. `--out` writes the JSON to
  OUT_DIR/<relpath> (append `.json` if the relpath has no extension).
- Verify: dump `ses_f31a5dee5ffe1DIBxZzEDZF8aF` (58 msgs / 263 parts per scoping
  §2b) to a scratch file; `JSON.parse` it; message + part counts match; spot-check
  one tool part's `state.input` byte-identical to the DB (curated readOnly helpers
  in `.opencode/agent/scripts/db/` — README there). Delete the scratch before close.

### B — Lossless full markdown + `--lite` preset (`dump_session.cjs`, `fullBody` L161-176)
- Full mode (single-session default) becomes lossless: emit the tool
  `state.input` / `state.output` verbatim; remove the 400/600-char caps for known
  part types (text/reasoning are already verbatim; tool, step-start, step-finish,
  patch, meta become uncapped).
- New flag `--lite`: the human-readable filtered preset — text + reasoning
  verbatim, tool calls header-only (name, callID, status — no input/output),
  step-start/step-finish skipped. (The current mid-rendering shape survives as
  the filtered view.)
- Verify: a fresh full dump of the same session shows a known tool-argument
  string byte-identical to the DB; no truncation on known types; the `--lite`
  dump contains no tool input/output. Scratch dumps, deleted before close.

### C — Pre-compaction dump hook (`.opencode/plugin/compact_memory.ts`)
- L359: raise the fixed 60 s timeout to 120 s (measured dump wall-times 64–87 ms
  — scoping §3; the live DUMP-FAIL is a spawn-LEVEL STALL, not budget exhaustion).
- Diagnostics: log the elapsed ms on every dump (the `DUMP-OK` line gains
  `ms=`); on failure, surface the child's stderr + the error text (replace
  `stdio: "ignore"` with pipe capture) + ONE retry (a `DUMP-RETRY=` line), after
  which the `DUMP-FAIL` line carries the captured detail.
- The hook keeps the markdown backup, rendered with the new lossless full mode
  (complete + human-readable); raw JSON stays the on-demand `--json` mode.
- If any smoke/probe pins the DUMP line format: re-pin (the #81 precedent) and
  record the re-pin in your handover.

## DoD
- Units A/B/C as above, each verified by its named checks.
- TODO.md #78 status → LANDED (the hash is recorded in the planner's follow-up
  bookkeeping commit — NOT in your commit).
- Gate green: probe 241/241 (re-pin only if a pinned behavior changed — record
  it), all smokes, pytest 459 passed + 1 warning, ruff F=0.

## DO-NOT-touch
- `.opencode/maintainer/**` (maintainer live files — ideas.md / my_todos.md are
  dirty in the tree — never edit, never stage).
- The live DB: readOnly helpers only; no writes.
- `.opencode/plugin/auto_resume.ts` (the #91 build is live — v=7d2e6207).
- `.opencode/agent/prompts/**` (no edit access — report a block in your handover,
  never circumvent it).

## Commit
One code commit: A+B+C + TODO #78 status + your handover files. Subject:
"dump #78 LANDED: --json raw mode + lossless full markdown + --lite preset + hook
timeout/diagnostic/retry".
