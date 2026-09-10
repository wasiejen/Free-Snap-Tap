# P09 — make the "<|autonom|> Mode" statement an option, not an always-true fact

**Proposal:** reword the embedded task text in `prompt_looprunner.md` (lines 14-16) so
autonomous mode is stated CONDITIONALLY on the `<|autonom|>` marker, and delete the
maintainer's XXX note (line 14).

**Context:** the XXX note in `prompt_looprunner.md` says "make autnonom an option
instead as stating it as an always true fact." `prompt_agent_planner.md` (L10-13)
already defines the marker conditionally ("When you encounter the special String
<|autonom|> you know that you run autonomiously ..."); the looprunner task text
contradicts it by stating the mode as fact for every launch.

**Proposed replacement (paste, replaces lines 14-16):**
```
If your launch message carries the marker '<|autonom|>', you run autonomously: no
direct questions to the maintainer are possible mid-run and you will be restarted by
the Looprunner on stopping — so stop early if needed. The Looprunner prints your
closing messages so the maintainer has a log. (General goal: improve the general
state of the repo.)
```

**Impact / risk:** doc-only; the same task text then works for interactive AND
autonomous launches.

**Verdict:**
