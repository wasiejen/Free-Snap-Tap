# fuzzy-numword — topic folder

Living basis for the fuzzy / numword tool-reliability work. The DECISIONS and
their reasoning live here (`decision-record.md`), plus the staged task specs
(`spec_R*.md`) for the R1-R5 roadmap.

GOES HERE:
- `decision-record.md` — the canonical decision + reasoning (append on new
  rulings; never rewrite history — new dated sections).
- `spec_R<n>_<name>.md` — staged task specs per roadmap stage; the launchable
  one is copied to `.opencode/agent/handover/handover_task.md` at launch.

DOES NOT GO HERE:
- The source research docs, the comment addendum, and the FB file — they stay
  in the parent `../` folder as the immutable record (this folder points at
  them, it does not copy them).
- Implementation notes (loop-folder summaries + git), knowledge (knowledge/).

The rule itself (the short convention agents follow) is destined for
`AGENTS.md` (maintainer paste — draft in `decision-record.md` §4); this folder
is the detailed basis, AGENTS.md the surviving short form.
