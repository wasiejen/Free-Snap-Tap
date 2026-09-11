# TASK — date-convention sweep (rename + 3 convention lines + AGENTS.md-copy Pattern 5)

FIRST read `AGENTS.md`, `agents_repo.md`, and this file. Source of the sweep:
maintainer inbox `2026-09-10_01-16` (in `maintainer/done/`) — the dense
`YYMMDD-HHMM` convention tokenizes unstably for quantized models and breaks
comparisons; the new convention is `YYYY-MM-DD_HH-MM` (already adopted in the
split build's prompt revision). The scope decision below was recorded by the
planner (NAP iter-2 block). This is **meta-only** work: no FST code, no plugin,
no observable behavior change — pre-approved class.

## Conversion rules (the only rules — do not invent others)
- Dense 6-digit date `26MMDD` (`26` + 4 digits, not adjacent to other digits) →
  `2026-MM-DD`.
- Dense time `HHMM` that follows a converted date across a separator → `_HH-MM`
  (e.g. `260910-2307` → `2026-09-10_23-07`).
- Date + slug in one name: `260908-phase5-coverage.md` →
  `2026-09-08_phase5-coverage.md` (date/slug separator becomes `_`).
- Prefixed form: `M260910-1346_slug` → `M2026-09-10_13-46_slug`.
- Non-date suffixes stay untouched (`autorun-260910-0` → `autorun-2026-09-10-0`).
- If any two source names would map to the SAME target, STOP and report it in
  the summary — do not guess a resolution.

## Part A — RENAME (all via `git mv`; the table is the full scope)
`.opencode/proposals/maintainer/done/` (9 files):
| from | to |
|---|---|
| `260910-1537.md` | `2026-09-10_15-37.md` |
| `260910-1806.md` | `2026-09-10_18-06.md` |
| `260910-1813.md` | `2026-09-10_18-13.md` |
| `260910-1818.md` | `2026-09-10_18-18.md` |
| `260910-2147.md` | `2026-09-10_21-47.md` |
| `260910-2301.md` | `2026-09-10_23-01.md` |
| `260910-2336.md` | `2026-09-10_23-36.md` |
| `260910-0031.md` | `2026-09-10_00-31.md` |
| `M260910-1346_nap-bloat-prompt-separation.md` | `M2026-09-10_13-46_nap-bloat-prompt-separation.md` |

`.opencode/archive/` (4 dirs, contents move with them):
| from | to |
|---|---|
| `autorun-260910` | `autorun-2026-09-10` |
| `autorun-260910-0` | `autorun-2026-09-10-0` |
| `autorun-260910-2307` | `autorun-2026-09-10_23-07` |
| `autorun-260910-2307` | `autorun-2026-09-10_23-07` |

`.opencode/archive/` (2 dated files):
| from | to |
|---|---|
| `260908-phase5-coverage.md` | `2026-09-08_phase5-coverage.md` |
| `260908-v21-session-graph-spec.md` | `2026-09-08_v21-session-graph-spec.md` |

Folders already in the new pattern (e.g. `autorun-2026-09-10_01-29`,
`autorun-2026-09-10_03-05`) are NOT touched — the table is complete.

## Part B — CONTENT (exactly 3 lines + 1 append)
1. `.opencode/proposals/README.md:33` — ``M<YYMMDD-HHMM>_<slug>.md`` →
   ``M<YYYY-MM-DD_HH-MM>_<slug>.md`` (keep the rest of the sentence).
2. `.opencode/proposals/files/agents_repo.md:168` —
   ``.opencode/archive/<YYMMDD>-<slug>.md`` →
   ``.opencode/archive/<YYYY-MM-DD>-<slug>.md``.
3. `.opencode/proposals/files/prompt_agent_planner.md:22` —
   ``autorun-<YYMMDD-HHmm>/`` → ``autorun-<YYYY-MM-DD_HH-MM>/``.
4. `.opencode/proposals/files/AGENTS.md` — append ONE short new example to the
   `## CRITICAL LOOP-BREAKING PROTOCOLS` section, after **Pattern 4** (same
   4-bullet shape, ≤ 8 lines). Draft (minor wording polish allowed, keep it
   short):

   **Pattern 5: The Dense Numeric String**
   * **Symptom:** You are comparing, transcribing, or counting inside long
     unbroken numeric strings (dates like `260910-2307`, session suffixes,
     version numbers).
   * **Why it fails:** dense unbroken numeric strings tokenize unstably — the
     same string reads differently on different passes, so visual comparisons
     silently go wrong.
   * **Required Action:** never compare or retype such strings by eye — let the
     machine do it (compute new names in a script, verify with `git status` /
     a diff, grep for the exact byte sequence).
   * ***Concrete Example:*** renaming dated files: derive the new names with a
     script and verify via `git status` — never retype a date into a command.

   Note: line 118 of that copy (the handover-path line) is ALREADY the fixed
   single path — do NOT touch it.

## EXCLUDED — do not touch (the 01-16 scope decision)
- `WIKI.md` (documents FST OUTPUT naming `save-YYMMDD-HHMMSS` / `date()` — that
  is the app's own format, not the meta convention).
- FST `*.py`, `tests/**`, `built_*.bat`, `playground/`, `SCRATCH_PAD.md`.
- `.opencode/proposals/implemented/*` (history), archive file CONTENTS (Part A
  renames the two archive-ROOT file names; nothing inside archive dirs is
  edited), `COVERAGE_TRIAGE.md`, `handover_maintainer.md` (archive root, no
  date in the name — keep).
- `TODO.md`, `todo_records.md`, `todo_inbox.md`, `.opencode/handover/*`,
  `.opencode/plugin/**`, `opencode.jsonc`, root `AGENTS.md` (agent-read-only).
- The live prompts + repo parts (`.opencode/system_prompts/**`, root
  `agents_repo.md`): the planner verified **0** dense-date hits there. Re-run
  the verification scan (below); if it finds a hit in those files, the
  conversion IS in scope (they are on the content list) — apply it and report
  it as a deviation.

## Definition of done
1. All 15 renames applied with `git mv`; no target collision; `git status`
   shows exactly the Part-A renames + the Part-B file changes (plus your
   summary file; `opencode.jsonc` never staged).
2. Verification scan — regex `\b26\d{4}\b` — returns **0 hits** in:
   `.opencode/proposals/README.md`, `.opencode/proposals/files/*`,
   `.opencode/system_prompts/**`, root `agents_repo.md`, and in the NAMES of
   the files/dirs under `.opencode/archive/` + `.opencode/proposals/maintainer/
   done/` (after the renames). Record the scan command + result in the summary.
3. Part B item 4 present in the AGENTS.md copy (4-bullet shape, after
   Pattern 4, before `## Role & interaction model`).
4. Gate re-run (meta-only, must be unchanged): `& .\.venv\Scripts\python.exe
   -m pytest -q` = **448 passed** + 1 known #10 warning;
   `& .\.venv\Scripts\ruff.exe check --select F .` = **0**.
5. ONE commit: sweep + this task's handover files. Commit message: one-line
   imperative subject.

## Context gauge / stop line
Per AGENTS.md §Context budget — self-gauge `node .opencode\plugin\scripts\peek.mjs`
between chunks and after the commit; stop line `REM ≤ 15k` or `≥ 85 %`.
Findings you cannot fix in scope → APPEND to `todo_inbox.md` (never
`TODO.md`).
