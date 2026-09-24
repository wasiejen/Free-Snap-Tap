# skill/ — skillsets (prompts an agent reads at startup and follows)

One md per skill. Launch = a generic agent (e.g. a Q4-model agent, to avoid
switching the backend model) whose launch message says: read this file first,
follow it. Host quirk: every md under `.opencode/agent/` also auto-registers
as a launchable agent type (`prompts/skill/skill_*`) — that is a side effect,
not the intended launch path.
- `skill_autorun_summary.md` — summarize one autorun run → `_overall_summary.md`
  in the loop run folder (run at end of loop).
- `skill_feedback.md` — collect feedback from runs + `agent_feedback.md` +
  handovers → `maintainer/feedback/` (run regularly).
Does NOT go here: role prompts / repo parts / agent readmes (sibling folders
under `prompts/`), and maintainer memory files (his call — the folder layout
clashes with opencode agent auto-registration, see `maintainer/my_todos.md`).
