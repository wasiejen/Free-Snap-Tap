# Task spec — plan11 / #78 scoping: dump completeness (READ-ONLY research)

Goal: scope TODO #78 (dump completeness) with bounded measurements — no code edits.
Worker: `explore` (research/audit; always re-verified by the planner).
Definition of done: the findings file below exists with every DoD bullet satisfied;
the handover summary is written; the repo tree is otherwise UNCHANGED.

## Context (planner-verified facts — do not re-derive)

- TODO #78 (in `TODO.md`, entry "## 78."): maintainer --info (2026-09-21): the
  session dumps "seemed to not include any thinking, writing or other parts at
  all" (his example: `.opencode/archive/sessions/ses_f5aefe9e1ffemgTiq9GELiqaGL.md`);
  "dumpings in general should be complete … if they are in json maybe it is best
  to just dump this directly as it is to preserve the structure"; filtering tool
  calls = a script concern on demand. Live evidence #2 (already in the entry): the
  compact pre-dump hook `DUMP-FAIL … spawnSync node ETIMEDOUT` on a ~90 % session
  while a small session dumped in 76 ms — the spawn timeout does not scale with
  session size.
- The dump script is `.opencode/agent/scripts/db/dump_session.cjs` (245 lines —
  you may read the WHOLE file; it is small). Its header claims: single-session
  mode = "full-detail dump … every message with its text/reasoning"; `--all`
  backfill is SLIM by default; `--out <relpath>` writes OUT_DIR/<relpath> (OUT_DIR
  = `<repo>/.opencode/archive/sessions`).
- Curated read-only DB helpers (USE THESE, never raw SQL against the live DB):
  `node .opencode/agent/scripts/db/sesdata.cjs <sid>` (slim JSON per message) and
  `node .opencode/agent/scripts/db/sesinspect.cjs [sid]` (session row + last 14
  messages). Both open the host DB `C:/Users/Wasiejen/.local/share/opencode/opencode.db`
  with `readOnly: true` (env `OPENCODE_DB` overrides).
- The hook call site is in `.opencode/plugin/compact_memory.ts` — BOUNDED grep
  only (`preCompactionDump`, `execFileSync`, `timeout`, `DUMP-OK`, `DUMP-FAIL`
  with `| head -30`); do NOT read the whole file.

## Findings to produce (the DoD — all five, in this order)

Write ONE findings file:
`.opencode/loop/autorun-2026-09-21_15-33/plan11_78_scope.md`

1. **Exclusion list (code):** for the single-session full mode of
   dump_session.cjs — enumerate the DB message `parts` types the script
   handles and the ones it DROPS, each with a line reference in the script
   (e.g. "type reasoning: emitted at L__" / "type tool: DROPPED (no case)" ).
   Also: what `--all`/slim mode emits vs full mode (one compact table).
2. **Empirical check (his example + one current session):**
   a) Re-dump `ses_f5aefe9e1ffemgTiq9GELiqaGL` via
      `node .opencode/agent/scripts/db/dump_session.cjs ses_f5aefe9e1ffemgTiq9GELiqaGL --out scratch_78/check.md`
      (the file lands in `.opencode/archive/sessions/scratch_78/check.md`),
      compare its part coverage against `sesdata.cjs` output for the same sid,
      then DELETE the generated file and verify `git status --short` shows no
      corpus residue (the corpus .md files are tracked; an untracked scratch
      file must be removed). Note: the on-disk corpus file for this sid is a
      PRE-2026-09-21 backfill dump — state whether the CURRENT script would
      now include what that old file lacks (the maintainer's complaint may be
      stale — say so explicitly with evidence).
   b) Pick ONE recently updated session that has reasoning parts (use
      `sesinspect.cjs` no-arg list to choose; bounded reads). Same comparison.
3. **Timeout behavior (measure, don't guess):** the fixed timeout value at the
   hook call site (from the bounded grep of compact_memory.ts) + a measured
   timing table: wall-time of a single-session dump for (i) a SMALL session
   (< ~100 messages) and (ii) a LARGE session (most messages in the DB —
   pick via the sesinspect list), via `time node …` (or node `Date.now()`
   before/after in a one-liner) into `--out scratch_78/…` (DELETE both after,
   git-status-clean). State whether a ~90 %-size session can exceed the hook
   timeout, with the measured ratio.
4. **Raw-JSON mode:** answer yes/no — does any current mode dump the parts as
   raw JSON as-is? (Header says no; `sesdata.cjs` emits slim JSON LINES —
   reference it as the closest existing thing + what it omits.)
5. **Recommendation (ranked, 2-4 options):** aligned with his lean
   ("dump raw as it is"; markdown filtering on demand): e.g. (1) add a
   `--json` raw-mode to dump_session.cjs (all parts, no filtering — the
   default for the hook? his call), (2) fix the hook timeout (scale / raise /
   stream), (3) keep markdown full-completeness. Each option: what changes,
   which file, effort (S/M/L). NO implementation — scoping only.

## Hard rules

- READ-ONLY repo: no edits to any tracked file; the ONLY writable targets are
  the findings file (new) + `handover_task_to_planner.md`.
- Scratch dumps: ONLY via `--out scratch_78/<name>.md`, ALWAYS deleted before
  close; finish with `git status --short` proving the tree is clean apart from
  the two new files.
- Bounded output discipline: every grep carries `| head -30` (or an explicit
  line range); never read a DB dump / corpus .md whole — grep/slice it
  (AGENTS.md pattern 2); the sesdata/sesinspect outputs are already slim —
  do not pipe them through anything that dumps more.
- The maintainer's live files (`.opencode/maintainer/**`, `opencode.jsonc`,
  `ideas/**`) — read the cited files only if the task names them; never edit.
- Context budget: if you approach your stop line (gauge ~90 % or the ctx: nudge
  says REM <= 15k), STOP at the last complete findings section, write the
  handover with what is done + what remains, and end the session cleanly there
  (the planner decides the resume).

## Verification (planner, after your return)

- Findings file exists, all five sections present, claims carry line refs /
  measured numbers.
- `git status --short` clean apart from the two new files.
- The planner re-checks the exclusion list against dump_session.cjs himself
  (bounded re-read of the cited lines) before acting on it.

## Handover

Write `.opencode/agent/handover/handover_task_to_planner.md`: executive summary
(what was found, the headline recommendation, measured numbers), the findings
file path, any deliberately-not-done remainder, and your final message = a
short pointer to the handover file (never a re-dump).
