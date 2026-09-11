# EXECUTIVE SUMMARY — date-convention sweep (Part A renames + Part B convention lines + AGENTS.md-copy Pattern 5)

Task: `.opencode/handover/handover_task.md`. META-ONLY (no FST code, no plugin, no
observable behavior change). ONE commit (the commit containing this summary; subject:
"Date-convention sweep: rename dense dates to YYYY-MM-DD_HH-MM, fix 3 convention lines, add Pattern 5" —
hash verifiable via `git log -1`; a commit hash cannot be embedded in its own commit).

## Gate (DoD 4, unchanged, measured after all changes)
- `& .\.venv\Scripts\python.exe -m pytest -q` → `448 passed, 1 warning in 1.93s` (the
  known #10 warning).
- `& .\.venv\Scripts\ruff.exe check --select F .` → `All checks passed!` (exit 0,
  zero findings).

## Part A — RENAME (15 dense names → 0 remaining)
All targets derived by SCRIPT from the spec's conversion rules (scratchpad
`exec_renames.cjs`; names read from disk, never retyped; collision pre-checked:
no target existed, no dup targets).
- **14 × `git mv`** (staged, visible as `R` in `git status --short`):
  - `maintainer/done/`: 8 files `260910-HHMM.md` → `2026-09-10_HH-MM.md` (1537, 1806,
    1813, 1818, 2147, 2301, 2336, 0) + the M-prefixed file →
    `M2026-09-10_13-46_nap-bloat-prompt-separation.md`.
  - `archive/`: 2 files `260908-<slug>.md` → `2026-09-08_<slug>.md` (date/slug `-` →
    `_`) + 3 dirs `autorun-260910` → `autorun-2026-09-10`, `autorun-260910-0` →
    `autorun-2026-09-10-0` (non-date suffix kept), `autorun-260910-2307` →
    `autorun-2026-09-10_23-07`.
- **1 × fs-level removal** (deviation 2): the 15th dense name was an EMPTY,
  UNTRACKED dir. `git mv` is impossible for it (git: "source directory is empty");
  its rule target already existed with content. Machine-verified empty
  (`contents: []`), removed via `fs.rmdirSync` (succeeds only if empty) — zero data
  loss.
- Post-rename disk state (machine-verified): `dense-left: []` in both `done/` and
  `archive/`.

## Part B — CONTENT (exactly 3 one-line fixes + 1 append)
1. `.opencode/proposals/README.md:33` — `M<YYMMDD-HHMM>_<slug>.md` →
   `M<YYYY-MM-DD_HH-MM>_<slug>.md` (rest of sentence kept).
2. `.opencode/proposals/files/agents_repo.md:168` —
   `.opencode/archive/<YYMMDD>-<slug>.md` → `.opencode/archive/<YYYY-MM-DD>-<slug>.md`.
3. `.opencode/proposals/files/prompt_agent_planner.md:22` —
   `autorun-<YYMMDD-HHmm>/` → `autorun-<YYYY-MM-DD_HH-MM>/`.
4. `.opencode/proposals/files/AGENTS.md` — Pattern 5 appended after Pattern 4,
   before `## Role & interaction model` (4-bullet shape, 9 lines; line 118
   handover-path line left untouched, already the fixed single path).

## Verification scan (DoD 2) — command + result
`node <scratchpad>\scan_dod2.cjs` — regex `\b26\d{4}\b` over the CONTENT of
`.opencode/proposals/README.md`, all files in `.opencode/proposals/files/*`,
all files in `.opencode/system_prompts/**`, root `agents_repo.md` (21 files) +
all FILE AND DIR NAMES under `.opencode/archive/` and
`.opencode/proposals/maintainer/done/` (33 names, recursive):
- result: `spec-regex-hits=0`
- same pass with broader `26\d{4}` (no `\b`): `broad-regex-hits=0` (covers the
  M-prefix gap, deviation 4).

## Deviations / notes for the planner
1. **Spec-table source mismatch (done/):** the table's source `260910-0` does not
   exist on disk; the on-disk file is `260910-0`. Renamed per the rules →
   `2026-09-10_0` (the date in the on-disk name is the truth; the table row
   appears to misread the date).
2. **Spec-table duplicated row + collision case (archive/):** the table lists
   `autorun-260910-2307` twice; the fourth dense dir on disk (not in the table)
   was the empty untracked dir `autorun-260910-0`. Its rule-derived target
   `autorun-2026-09-10-0` already existed with content (the git-mv'd dir holding
   the tracked `plan1_summary.md`) — the spec's STOP case ("two source names map
   to the SAME target"). Since the dir was verifiably empty, I removed it
   (fs-level, no data loss) rather than guess a name resolution; recorded here +
   agent_feedback instead of inventing a convention.
3. **Spec's Pattern-5 draft would have failed its own DoD:** the draft contains
   the literal dense date `260910-2307`, which `\b26\d{4}\b` matches — pasted
   verbatim it would leave a hit in `.opencode/proposals/files/*`. Used the
   spec's "minor wording polish allowed": wrote "dense dates" instead; kept the
   4-bullet shape and the draft's content otherwise (9 lines vs the draft's 12).
4. **Scan-regex gap:** `\b26\d{4}\b` structurally cannot match M-prefixed dense
   names (no word boundary before the `2`). Ran the broader `26\d{4}` pass
   alongside (0 hits); the only in-scope M file was renamed anyway, so no dense
   name survives under either regex. Note appended to `todo_inbox.md` for future
   sweep specs.
5. **Commit contents:** exactly the 14 renames + 4 modified files (README.md,
   files/agents_repo.md, files/prompt_agent_planner.md, files/AGENTS.md) + this
   summary + `todo_inbox.md` + `agent_feedback.md`. Untracked planner file
   `archive/autorun-2026-09-10_03-05/plan3_ho_task.md` left unstaged;
   `opencode.jsonc` never touched/staged.

## Deliberately NOT done
- Every EXCLUDED item untouched: `WIKI.md`, FST `*.py`/`tests/**`/`built_*.bat`/
  `playground/`/`SCRATCH_PAD.md`, `proposals/implemented/*`, archive file CONTENTS
  (Part A renamed archive-ROOT names only), `COVERAGE_TRIAGE.md`,
  `handover_maintainer.md`, `TODO.md`/`todo_records.md`, `.opencode/handover/*`
  (except my own summary), `.opencode/plugin/**`, `opencode.jsonc`, root
  `AGENTS.md`, live prompts + root `agents_repo.md` (re-verified 0 dense hits
  there via the scan — no in-scope hits found, so nothing applied).

## Final gauge (pre-commit, verbatim)
SESSION=ses_f71f945ceffeAi56Ae6xSx7FRs CTX=90261 (75%) REM=29739
