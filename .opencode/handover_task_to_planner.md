# EXECUTIVE SUMMARY — v2.2.1: persistent offline probe harness + stale v2 comments (TODO #19 resolved, #20 recorded)

Commit: `Persist handover plugin probe harness and fix stale v2 comments (#19/#20)`
(subject + file set per AGENTS.md two-party routine; the hash exists only after the
commit lands — reported in the worker's final handover message).

## What changed (files + why)

- `.opencode/plugin/probes/handover_probe.mjs` (NEW — permanent tooling, TODO #20) —
  one self-contained offline probe, rebuilt to the v2.2 final surface and frozen:
  S1–S3 byte-for-byte (pre-flight warn: spec present → no warn / renamed away →
  exactly one byte-exact warn + byte-exact restore / emptied spec → one warn;
  non-handover invisible: no warn, no mirror write, no throw; mirror: verbatim
  OVERWRITE / exact TRUNCATED trailer / empty → untouched / exactly 3 tool.after
  lines) + S4 four transform shapes (LIVE no-agent → exactly one
  `ctx: CTX=12345 (10%) REM=100000` appended with prior items verbatim;
  `agent:"worker_120K_mtp"` → appended, no gate; junk shell → omitted, no throw;
  no shell → omitted, no throw — 4 `kind:"transform"` evidence lines total) +
  S5 hygiene (every sandbox log line JSON-parseable, ≤2000 chars, ISO ts + kind;
  exact kind tallies; real files byte-identical + zero co-appended probe lines;
  sandbox isolation via `.opencode` listing + `git status` before/after).
  23 checks total. Header carries the COMPLETE recipe: the exact run command,
  the pinned executable `%LOCALAPPDATA%\Programs\@opencode-aidesktop\OpenCode.exe`
  (DO-NOT-HUNT rule — if the path is ever wrong, report, do not re-hunt),
  `ELECTRON_RUN_AS_NODE=1` = Node 24.15.0, expected output summary. The probe
  itself errors out with that report rule when the pinned exe is absent.
  `before`/`after` modes (identical expectations — a comment-only cycle has
  nothing to differ on; any drift IS the finding).
- `.opencode/plugin/handover.ts` (B, TODO #19) — COMMENT-ONLY: the two stale v2
  passages (header v2 bullet + the note above `onSystemTransform`) now say
  injection runs on EVERY transform (maintainer "both" call 2026-09-08, TODO #18);
  the evidence-logging sentence and the `#14` pointer kept in BOTH places;
  every other byte untouched. `git diff --stat`:
  `handover.ts | 18 +++++++++++-------  11 insertions(+), 7 deletions(-)` —
  diff-verified: every +/- line is a `//` comment.
- `.opencode/handover_task.md` — planner's v2.2.1 spec (unchanged working copy,
  committed with the handover, same pattern as v2.2).
- `TODO.md` — appended **#20** (mandated exact text: persistent probe + pinned
  executable + #19 resolved).
- This file (overwrites the v2.2 cycle record — the latest EXECUTIVE SUMMARY wins).

## Verification (strict order — measured)

1. A: harness built + at its committed path; run on CURRENT code, mode `before`
   → **23/23 PASS** (S1=5 S2=4 S3=5 S4=4 S5=5) — BEFORE baseline.
2. B: comment-only edit (git diff verified).
3. Re-run the SAME persisted harness, mode `after` → **23/23 PASS** — behavior
   byte-identical (comment-only edit confirmed by probe).
4. `& .\.venv\Scripts\python.exe -m pytest -q` → **434 passed** (13 warnings —
   baseline); `& .\.venv\Scripts\ruff.exe check --select F .` → **6 findings**
   (baseline).

## Probe design note (S5 check #22 — maintainer may want on record)

While the probe runs INSIDE a live opencode session (bash tool invocation), the
LIVE plugin legitimately appends its own tool lines to the real `plugin.log` —
that is not a probe write. "Zero co-appended live lines" is therefore enforced as:
real handover files byte-identical + `plugin.log` append-only + none of the probe's
fingerprint ids (`s1–4`, `c1–6`, `d1–3`, `t1–4`) appear in the appended tail — the
probe instance is structurally sandbox-bound (all inits `directory=<sandbox>`), and
the fingerprint rule catches any regression to a real-path write.

## NOT done (by instruction / on purpose)

- No behavior/hook changes anywhere — the plugin stays v2.2 final + comment-only.
- No opencode restart/reconfiguration; NAP, `opencode.jsonc`, `AGENTS.md`,
  playground, `plugin.log` untouched and NOT committed.
- v2.2's LIVE-PROOF-PENDING-START item (post-restart planner confirms its own
  `ctx:` line; delegated worker quotes its own) remains the planner's post-restart
  check — nothing changed that alters its state.
- Executable behavior unchanged: probe evidence for v2.2's "reached nobody"
  (dead gate) vs v2.2.2+ is now S4's four shapes — rerunnable any time without
  rebuild.
