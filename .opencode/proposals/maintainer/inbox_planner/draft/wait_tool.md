i could use i tool fo agents that enables agents to wait a specific time and that will trigger an automatic --main/--maintainer and inbox check for the planner. + gauge check. and if non found calls itself again. thus sleeping the agent until a new instruction arrives.
might check in an interval of 1 minute and only give control back to agent when the sweep came bock positive.
- need to check if there is a time limit on a agent run per default.
- a sweep checks the default directory for any mentions of --main or --maintainer in any file and checks if the inbox_planner folder has any new files
- maybe best per git diff?
  - how does the agent do this so fast?
