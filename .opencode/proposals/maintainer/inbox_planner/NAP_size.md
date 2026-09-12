// generally write proposals to inbox items, if it is not codfied in an easy to find manner already, create a README.md file - does not need to be verbose -> #4 (local readme files)

#1
Your Nap is extremely big and we need to do sth about it without loosing the operational knowledge that it contains.

make a proposal and summarise for me what is in your nap and why it is so big. (put it also into the proposal)

#2
this leads into the question how to preserve task specific knowledge - e.g. when writing a tool lookups are needed and these fill up the context very quickly. the gained knowledge must be searched and collected each time. so an area specific knowledge base for writing tools would be helpful. this can be applied to all areas. we already did something similar in seperating the repo into multiple smaller files that are more specific to a task. this is now an equivalent only with gained knowledge that are not instructions but helpful to agents to complete a task. for tools it could live in .opencode/tools in a knowlede_tools.md file. 

but it might be better in a general knowledge base .opencode/agent/knowledge/
- opencode folder in der tho signify it is knowlegdge associated with opencode

principles for knowledge - question what to keep and what to discard?
- everything that was useful in the past and is actionable
  - with references where is was found to easier find adjacent knowledge in the past
  - key terms for search might be better as references? 
- keeping and collecting knowledge only for knowledges sake is mood, because if an agent can not use to for a task or act on it to solve a problem than it is dead weigt.

readme.de in the knowledge folder eplaining the usage

each planner and worker would be instructed to read from it if he encounters a specific area of problem or task and when gaining knowledge that would speed up things to add to the knowledge file


#3 move the system_prompts folder into the new .opencode/agent folder and rename it into prompts
- agent_feedback.md also moves into /agent folder
- handover also moves there
- we have to fix all the references

#4 generally check if informtion pertaining folders can be stored in local readme files and thus moved out of system prompts with the general instruction to read the readme of the folder.
- the structure of the folders should be an explanation or make it obvious where what has to go or where to find it. the readme then would clarify how to use it. e.g. how already it is there to do proposals
.opencode in itself is normally a program directory for opencode in itself.
  i am not sure we should put so many files here in the first place - we were lucky not to run into some opencode usage convention - or we might just be unaware of
- might e worth to rework proposal folder also
  - in essense it is a communication directory with inboxes, feedback, drafting
  - currently the maintainer does not really have an inbox (is it needed - proposals are the communicate route to the maintainer - is more granuality needed? to much would overwhelm me fast)
- make a general proposal for this for further discussion

#5 fold into #4 if applicable or let it be seperate if it would make the proposal to big
  - should we also contenplate a more complete seperation of how agents run and what is in the repo? e.g. 2 different .gits? a .git repo in the parent directory for the opencode side and the agent side . and plugable into this the repo in this case FST which will only contain the repo specifics of it and is gitignored in the parent .git
  - so 2 channels for commits that are area specific
    - question is where to place handover files that pertain the repo
      - this would then be the .opencode folder in there
  - the opencode base working dir would move to the parent folder and thus agents could be given explicit permission to be able to edit the repo or denied - saver for testing
  -

---
replier: planner (ses_f6b7c5242ffeZpNl0Ar8mILWua, 2026-09-12)
#2 HANDLED: knowledge base created at .opencode/agent/knowledge/ — README.md
(usage + the actionable-only principle + entry format), knowledge_tools.md
(9 verified entries seeded from this session: tool shape/description/channel,
context.sessionID/messageID/agent, context.client undefined, installed SDK
v1/v2 method shapes, HTTP-fallback listener rule, registration domain, sandbox
guard, probe pattern), knowledge_plugins.md (5 entries: plugin-vs-tool context,
compaction hooks, shared gauge core, no node:sqlite, probe gate). Planner +
worker instruction indexes now point to it (read on entering the area, add on
gaining verified knowledge). Note: #3 (move system_prompts -> .opencode/agent/
prompts) will relocate the neighborhood of this folder — the knowledge folder
sits at .opencode/agent/knowledge/ already, consistent with that direction.
#1, #3, #4, #5 remain open.
