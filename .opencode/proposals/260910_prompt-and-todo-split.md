# PROPOSAL — prompt/meta instruction split: load only what the session needs (2026-09-10)

**From:** maintainer inbox item `260910-1813` (split usage instructions into
`agent_readme.md` files, possibly split `agents_repo.md` by naming scheme, tie
into the TODO.md size reduction) + `M260910-1346` (NAP bloat / prompt
separation) + `260910-1818#1` (loop-protocol file, on-demand). One structural
change covering all three.

**Problem:** every planner/worker session pays for ALL meta knowledge up front:
the live prompt (planner ~130 lines), `agents_repo.md`, `AGENTS.md`, the full
`TODO.md` (closed entries accumulate in place — #45/#47 still sit in the file),
the NAP (growing iteration blocks), plus feature procedures (proposal
workflow, feedback folder, loop archive) that most sessions never use.
Measured symptom: the planner crosses 70-80% context before finishing a
medium task; compaction at ~50-60% then hits the session (see
`compaction_warning` + `260910_plugin-compaction-detection.md`).

**Proposal (4 parts, each independently approvable):**

1. **Per-feature instruction files** (`agent_readme_*.md`, each ≤ ~50 lines):
   `agent_readme_proposals.md` (proposal workflow + folder flow incl. the new
   feedback folder), `agent_readme_todo.md` (TODO contract, curation, records),
   `agent_readme_loop.md` (loop activity, iteration semantics, interrupt
   handling = the 1818 loop-protocol file). The live prompt keeps only an
   **index** (filename + one-line "read when …" trigger); the agent loads a
   file when the trigger fires. The loop-owned part (iteration number,
   interrupt state) is written BY the loop into `agent_readme_loop.md` —
   planner reads it only on `<|autonom|>`.
2. **Split `agents_repo.md`** into named parts with a clear scheme
   (`repo_map.md`, `repo_commands.md`, `repo_gotchas.md`, `repo_testgate.md`);
   the prompt index lists them; a session reads `repo_commands.md` for gates
   and skips the map when it's mid-task.
3. **TODO.md split:** open items stay in `TODO.md`; CLOSED entries move their
   full text to `todo_records.md` (AGENTS.md already says closed entries live
   there — repo practice kept them in place; this formalizes the move).
   `TODO.md` keeps a one-line "(closed …, see todo_records.md #N)" stub at most.
4. **NAP trim policy:** iteration blocks older than the last 2 are condensed
   to one line each (they are superseded by git log + TODO + records).

**Acceptance:** the planner's first-turn injected context drops measurably
(gauge at session start, before any work — target: prompt+index < half of
today's); every referenced file exists and is ≤ its line budget; one full
looprun iteration completes using only on-demand loads (the NAP records which
files were loaded); gate unaffected (meta-only change).

**Risks / mitigations:** knowledge fragmentation → the index is the single
entry point, one hop max; a session missing a trigger → the index line names
the trigger explicitly ("read when proposing/building/curating TODO").
`AGENTS.md` itself stays monolithic (it is the contract, always needed) —
only the repo- and feature-level knowledge moves.

**Status:** awaiting maintainer approval. Part 3 + 4 are pre-approved-class
(file cleanup / meta) and could ship first; parts 1 + 2 touch the live prompt
(your file) → your edit or explicit go.
