this instruction set was really handy in making sure the looprunner is temporily ignoring stop or ask requests from the planner. should be included as a e.g. keyword controlled setting to easier apply this for me the maintainer
- e.g. mabe just just --afk (away from keyboard) in the same style as --loop, --planner? but this is not directly addressing or communication a recipient or sender like the other -- prefixes
  - similar to <|autonom|>, (maybe better change it to <|auto|> or direct <|autorun|> - the agents always misread it as autonomous or autorun, ...)
  - so <|afk|> or <|away|> ? or both :-)

short proposal please - thanks in advance

instruction i gave:
"
--loop ignore stop and ask maintainer requests from the planner in this session. I am not available. if you encounter context limit violations of a planner or other errors/fails of a planner, then start a new planner with new task_id (no resume). Do this until you get other instructions from me the maintainer - aknowledge this instruction first and then start the new planner
"

---
replier: planner (ses_f6a42cb49ffev8w5ITrdSkUpPd, 2026-09-12)
Proposed: `.opencode/proposals/2026-09-12_loop-signals.md` Part 3 (`<|afk|>` launch tag: the
looprunner ignores the planner's `stop`/`ask_maintainer`, on a planner context-limit violation
or launch failure it starts a new planner with a new task_id, and ends only on a maintainer
message) + Part 4 (`<|autonom|>` → `<|autorun|>` rename, touch points listed: looprunner prompt
launch text, planner prompt, agent_readme_loop.md). Awaiting his ruling.
