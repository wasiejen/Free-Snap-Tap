// created by the maintainer to communicate with sub-agents without direct communication channel
// async and passive - agent needs to check for changed files
// --planner: prefix: means the adressed subagent is the planner and default if not apllied
// --worker: prefix: is a generic for a worker or agent type sub-agent

--planner: 260910-1333:
- you are allowed to create multiple handover_task<number>.md files to plan multiple worker and/or agent settings - just give the worker the reference which to read or switch it out the current to the verson with no number. so the numbered are your planned worklog. (to reduce the overall spec size per worker and thus danger of not finishing)
  - try this out - this is my approval for prelimary adoption

--planner: 260910-1336:
- for future: we might need to codify a lot of the nap entries as part of your system prompt or a different prompt file so seperate the basic worker logic and the repo decision specific logic that a worker does not need to know (e.g should not be in agents_repo.md) make a proposal how to best achieve this (goal is to reduce bloat in your nap and have clear seperation of concern for the system prompt files)
  - it could also work as a kind a Gedächtnis/memory for general quirks (though i think you already use the nap for this already :-))

--planner: 260910-1344:
- lets add a files subfolder in proposals/. there you can iterate on potential system prompt files that are only applied on restart of opencode.
  - agents.md
  - prompt_agent_looprunner.md
    - the other prompts will be applied when you or the worker are restarted (so you can update your prompt ... due to the loop)
  - opencode.json

--planner: 260910-1519:
- we have to debloat the todo. it takes nearly 20000 tokens on read
  - make a proposal how to change that and how to structurally enforce that only needed parts are read in or are available
    - e.g. change the structe to include a WIP folder with subfolders for categories with each a todo_<subcategory>.md that only includes this?
    - referenced in the root todo.md with the instruction to choose a cetagory and try to stick to it for a round
    - you are free to create your own take on it or even design an overarching file structure and how to organize all these md files in a better way
      - .opencode/handover subfolder
      - .opencode/agent subfolder for prompts (and maybe persona later)

// adressed agent moves the read items under the delimination and makes a short comment
# -------
