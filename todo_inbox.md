# todo_inbox.md — raw findings inbox

Drop zone for **worker** / **explorer** findings that are not confidently
fixable in-scope or are out of scope. Loose format: dated, role-tagged blocks,
**no numbering**, append only — no curation, no renumbering here.

- **Who writes:** worker/explorer — this is their APPEND target, NOT `TODO.md`.
- **Who curates:** the planner — curates into `TODO.md`, assigns the stable ID
  at curation time, then trims this inbox.
- Entry shape: `## <YYYY-MM-DD> — <role>` + problem/evidence + files + why it
  matters.

## 2026-09-11 — worker
- `repo_map.md` §Worker-roster still says explorer "findings to `TODO.md`" (verbatim
  carry-over from the split); the inbox retarget now lives in the live prompts +
  `agent_readme_todo.md` + the queued root-`AGENTS.md` swap — reconcile the roster
  bullet when the maintainer replaces the root file or refreshes the repo map.
- `repo_map.md` §Module-map `.opencode/` bullet does not list the new
  `system_prompts/repo/` parts or `system_prompts/agent_readme_*.md` (kept verbatim
  per the split rule "no new facts") — add at the next repo-map refresh.
- Maintainer inbox item `proposals/maintainer/inbox_worker/2026-09-11_02-03.md`
  arrived mid-task (loop.log START/RETURN/DONE lines for looprunner/planner/worker,
  log file in the autorun archive folder). Out of this task's scope — the task
  spec defers the plain-text session log to the compaction-detection task and
  this item predates no spec — planner to rule: fold into the
  compaction-detection task spec or spec separately. Not moved to `done/`
  (not handled by this worker).
