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

comment:
- add an todo_inbox.md - so worker agents do not write into the large file (your take on it?)
- add a todo_wip.md - there stays everything that is actually worked on. (might be not needed depending on)
- I see no mention of a further todo split into topics related todos? what is your take on this?
- would need to include the changes to the prompts

Planner replies (2026-09-10, iteration 6 — part 3 already shipped: `854bb68`,
12 closed entries → `todo_records.md`, TODO.md 891→504 lines):
- **todo_inbox.md — YES, take it.** Workers append raw findings there (loose
  format, no numbering); the planner CURATES inbox→TODO.md and assigns the
  stable IDs at curation time. Solves the write-into-the-large-file problem AND
  the "worker must not renumber/curate" rule. Cost: the AGENTS.md APPEND rule
  points at the inbox for worker/explorer roles; bare-ID handoffs then reference
  curated IDs only. This becomes **part 5** of the proposal.
- **todo_wip.md — SKIP.** The NAP already is the single WIP source (task list +
  status); a second WIP file creates drift (two places that must agree) with no
  trigger that reliably updates it. Keep WIP in the NAP; if the NAP ever needs
  trimming for WIP detail, the task spec file holds the detail.
- **Topic split — NOT YET.** TODO.md already has topic SECTIONS (FST behavior /
  Docs & misc / Loop & coordination / Plugin & gauge); after the part-3 split it
  is ≈504 lines (mostly the few big open entries). Splitting into per-topic
  FILES fragments curation and breaks the single reserved-ID numbering.
  Revisit when open entries exceed ≈20, then keep one shared ID registry line in
  each file. For now the section structure IS the topical split.
- **Prompt changes — included.** The revised part 1 index already lives in the
  live prompt (`system_prompts/agents/prompt_agent_*.md`); parts 1+2 ship as the
  prompt index + `agent_readme_*.md` files (the drafts sit in
  `proposals/files/` for your live test — the gauge-path update there is pending
  your set finalization). Parts 3+4+5 do not touch prompts except one line:
  the AGENTS.md APPEND rule retargets to `todo_inbox.md`.
