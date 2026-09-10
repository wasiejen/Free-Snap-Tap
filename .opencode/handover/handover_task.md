# TASK — TODO.md split: closed entries → todo_records.md (split proposal, part 3)

FIRST read `AGENTS.md`, `agents_repo.md`, and this file. The source proposal is
`.opencode/proposals/commented/260910_prompt-and-todo-split.md` (it moved to
`commented/` after the maintainer added design questions — the maintainer's
launch message confirms part 3 still stands as specified; your task is **part 3
only**, pre-approved class: meta/file cleanup). Parts 1+2 are NOT yours.
NOTE (2026-09-10, planner path fix): the handover files now live in
`.opencode/handover/` — your summary file is
`.opencode/handover/handover_task_to_planner.md` (NOT `.opencode/handover_task_to_planner.md`;
that path no longer exists).

## Goal
Slim `TODO.md` (≈890 lines): every unambiguously closed entry moves its FULL TEXT
to `todo_records.md`; `TODO.md` keeps a one-line stub per moved entry. Open
entries stay, byte-identical (section relocations excepted). No FST code, no
behavior change.

## State at HEAD (2026-09-10 — verify against the live files)
- `TODO.md` sections: "Maintainer calls (open, in order)" (a numbered list — NOT
  entry blocks), "FST behavior decisions (open…)", "Docs & misc (open)", "Loop &
  coordination (open)", "Plugin & gauge (open)", and "Closed entries" (a dumping
  section mixing closed and one misfiled open entry).
- `todo_records.md` exists (≈35 lines): flat one-line records, format
  `## N. Title — CLOSED (…) — one-line result`. KEEP its existing lines as-is;
  only APPEND.
- Numbering header in TODO.md: new entries start at #49 — you add NO entries.

## Decision table (planner pre-rulings — apply exactly)
- **MOVE (closed):** #47, #45, #39, #37, #38, #34, #36, #43, #44
  - #47 and #38 already have one-line records in `todo_records.md` — keep those
    lines and ALSO append the full text (duplicated heading is acceptable).
- **LEAVE OPEN (no text change):** #1, #7, #8, #9, #4, #6, #11, #17, #30, #3
- **YOU JUDGE (report each decision + one-line evidence in the summary):**
  #46, #41, #42, #40, #35
  - Rule: an entry is closed ONLY if its goal/acceptance is fully met AND the
    entry contains no open sub-work or maintainer call. A "LANDED" status tail
    does NOT close an entry whose scope is broader than what LANDED (e.g. a
    standing docs rework) — leave it open and say why.
- **Misfiled open entry:** #48 (open, sitting under "Closed entries") → move its
  block to "FST behavior decisions (open — maintainer calls unless noted)" (it is
  the #42 report-back, implicitly approved). If the "Closed entries" section
  holds nothing after all moves, delete the heading; if anything open remains
  there, rename the section to make the mismatch visible and report it.

## Stub format (TODO.md, one line replacing the whole entry block)
`## N. (closed <YYYY-MM-DD>, see todo_records.md) — <original title>`
Date = the closure date stated inside the entry (else 2026-09-10).

## Moving format (todo_records.md, appended at the END of the file)
Per moved entry, one block:
- heading line: `## N. Title (closed <date>, full text moved from TODO.md)` —
  the original title, date as in the stub.
- then the entry's ORIGINAL BODY verbatim (everything that followed the original
  `## N.` heading line in TODO.md, unmodified).

## Scope
- `TODO.md` + `todo_records.md` (the ONLY repo files you edit) +
  `.opencode/handover/handover_task_to_planner.md` (your executive summary).
- The "Maintainer calls (open, in order)" list: DO NOT EDIT (even if a line
  references a now-closed entry — report stale refs in the summary instead).
- Meta files (`agents_repo.md`, prompts, proposals, NAP) READ-ONLY — flag in the
  summary if anything looked off.

## Definition of done
1. Every MOVE-list entry: full text appended to `todo_records.md`; TODO.md holds
   ONLY its one-line stub. Grep-verifiable: the entry's title appears exactly
   twice (stub + records) and no full body remains in TODO.md.
2. Open entries byte-identical (except #48's section move); the maintainer-calls
   list unmodified.
3. Summary lists: each moved entry; each judged entry (#46/#41/#42/#40/#35) with
   decision + one-line evidence; any stale refs / oddities found.
4. Commit scope (`git show --stat`): exactly `TODO.md` + `todo_records.md` +
   `handover_task_to_planner.md`.
5. ONE commit, green, subject e.g.
   "TODO split part 3: closed entries → todo_records.md, stubs in TODO.md".
   No gate run needed (meta-only) — but NEVER commit red.
6. Final gauge line VERBATIM from `node .opencode\plugin\scripts\peek.mjs` at the
   end
   of the summary.

## Protocol
- pwsh for git/gauge; file tools for all writes (no `>` redirection).
- Read `TODO.md` fully BEFORE editing; when moving blocks, match exact original
  strings (the edit tool), re-grep after each move to confirm the body is gone.
- NEVER silently delete open/unresolved content — when unsure, LEAVE the entry
  and report the doubt.
- NEVER stage `opencode.jsonc` (modified by design — leave it in the tree).
- Stop line: `REM ≤ 15k` or usage `≥ 85 %` → stop at a clean committed point and
  finish the summary. Check the gauge between chunks (this task is read-heavy —
  the 890-line file plus per-move greps add up).
- NEVER parallel-edit the same file (sequential edits only).
