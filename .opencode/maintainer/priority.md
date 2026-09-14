# priority — what I want next (my ordering, top = first)

## My list (active)

<!-- Add numbered lines here: reorder = reprioritize, delete = no longer
     wanted. Entries may name a TODO.md ID, a proposal file, or just a theme. -->

## How this works (for agents — read this, it is the whole convention)

1. The planner reads this file at session start and orders its planning by
   the list: the top item is the next work when it is clear and does not need
   the maintainer to clarify; the list is also the tie-breaker between clear
   `TODO.md` candidates. `TODO.md` stays the detail record; this file is only
   the ordering.
2. You may only EDIT this file for one thing: removing a line you have FULLY
   handled. Never reorder, reword, or add his lines.
3. When you move a handled line, APPEND it to `_past_priorities.md` (same
   folder) with a SHORT reply — one line, e.g.:
   `- attention-keywords proposal — done, implemented (commit 6ef2c4e)`
   `- #37 loop-log anomaly — see TODO.md #37, fixed in plan 3`
   For easy tasks `— done` is enough; for anything with a trail, point at the
   proposal file / commit / TODO ID. Append only — do not re-read or edit the
   old entries.
4. PARTIAL or BLOCKED items stay in the active list; note their status in the
   NAP (not here). The maintainer erases entries in `_past_priorities.md`
   whenever he wants — it is his log.

# 01 cleanup

move items that are resolved to _past_priority, with comment about resolution

- create a feeback agent skillset (prompt to read at startup by agent and to be followed) to inform an agent about how best to collect the feedback from the autoruns and possibly other sources, like agent_feedback
  
  - goal is to run this regularly to collect feedback in one place maintainer/feedback
    - he can keep track of what he already analysed in a file in maintainer/feedback or let us create a new folder in 
      - agent/prompt/skill - this startup prompt in here
      - agent/memory/skill_<skillname>/
        - and this his storage for his memory files
  - (do you as planner want your own memory folder and files? :-) could be your nap in another form - honest question if you would want his or could use it - even for other things like saving file paths for some external files so you do not need to always search for them ... just a stray/idle thought. like a reference base)

- create a autorun_summary skillset
  - example output in loop\autorun-2026-09-13_04-27\_overall_summary.md (prompt used for first testing "summarize for me what was done in the last autorun in the .opencode/loop folder. summarize for me what was done and what feedback there was given. collect questions to maintainer or decisions to be done (generally at the end of the summaries. do not change files. only read")
    - should have more detail. feedback section a bit lacking - but might just be no prompt for feedback in planner and worker prompt ... yeah no longer a feedback section (ties into ideas.md # 4 codify knowledge gain and how to save it)
  - agent was sitting at 30k tokens after this scan run - so comfortably to use
  - \_overall_summary.md should be placed in loop run
- should be run by the looprunner at end of a loop e.g. via a Agent_Q4_120k (just to not switch models in the backend)

lets codify "--comment" to signify that I the maintainer commented this
when using "--maintainer" to show that i have done something - it implies that i instruct this or even when commenting on something that i wrote it

comment on compact tool flow in the last loop:
- i honestly like that the worker automatically ends its session and returns a summery on compaction - the control flow is very clean and the decision is in the hand of the planner to resume the worker - that makes the progress until this point very clear and lets the planner direct the worker on next resume
  - the planner also has the ability to compact the worker if needed (context limit violation)
    - honest we need to tes this out
- also the looprunner can act as a failsafe for a failing planner (e.g. looping, corruption etc)

# 02 use the skill autorun_summary again on the current autorun



# 1 
- additions to prompts
  - --planner the planner is the decider when to resume a worker
    - the planner has the ability to compact a worker via the compact tool and task_id=sessionID of worker
  - --looprunner automatically will resume if the summery does not contain mentions of continued looping and or repetition behavior or hintsof corruption or instability
    - need to include the option to first try to compact the planner via compact tool and task_id=sessionID of planner and then resume this planner

# 2 looprunner prompt rework 
general rework of looprunner prompt to better handle compaction and actually use the loop_log tool. might need to remove agents.md from his auto loading to not confuse him in his scope/task
- might need a very clear task discription and explicit formatulation on how to act
  - make a proposal what you deem as effective and frictionless for you (as planner) to work
helpful prompt i used for last autorun for context:
"
ctx: SESSION=ses_f6773737bffeo1FjRSf6bx7lDd CTX=notAvailable

--loop to write in the loop.log use the loop_log tool. this is the only way to write in it for you. the tool will create a new folder, so run it before delegation to the planner

--loop you are to resume the planner with the same sessionID if in his return message is get any information of a compaction and or the use of the compact_memory - in this case instruct him to "follow post compaction protocol and read (.opencode\agent\prompts\agent_readme_post_compaction.md") instruct your worker in the same way". this is valid for all iterations. act according to your prompt when encountering the keyword ending words of planners session end. (when in doubt resume)

--planner "-maintainer compact_memory is active, but ends the session after compaction, if you get any information that the worker used compaction resume himwith the same sessionID. Instruct your worker about the compact_memory tool and on resume with the same sessionID instruct him to follow post compaction protocol and read (.opencode\agent\prompts\agent_readme_post_compaction.md"). good luck. this is an autonom run"
"
quote:
The iteration-4 planner launch failed twice at the host level, so per my loop-hygiene rule ("if a launch fails, retry once, then stop") I'm stopping cleanly. I cannot restart myself.
- rework to start a new planner instead and not start the same planner again. to keep the autorun moving forward is the looprunners duty 
  - -to end the autorun is the decision of the planner (prompt addition)
- the planner must be able to communicate this request for loop end and the looprunner must understand it
  - this should only be done when there is critical error, non recoverable states, danger to files or the repo. changes to the .git .github subfolders in .opencode by any agent. add what you deem necessary
    - the same code of handling must also be followed by the looprunner



# 2 adding emergency compaction option to the tool that automatically trigger on context_limit
  - optional toggable via the same json file that stores the compaction numbers for each sessionID

# 3 emergency overwrite of max compact per session option
  - a planner should be able to overwrite the limit for the sessionid of a worker
    - e.g. if sessionID given into the tool is not the current ctx.sessionID then the limits do not apply? or raised by one temporarily?
      - to keep track who starts who is i think to much managerial effort - it is an emergency tool, to be there when needed



2026-09-13_13-20 ---- what is stale/handled?

# 1 compact_memory plugin that also exposes a tool 
  - agents need the ability to self compact if context limit is too small
  - add a differiating on allowed compacts per session_id for models based on its quant
    - CPU models excluded from compaction for now
    - pattern for Qwen3.8 models
      - quant 4 models allowed to compact 3 times 
        - IQ4 or Q4 notation in name
      - quant 3 models only 1 time (or may be excluded in future)
        - IQ3 or Q3 notation in name
    - for all other models for now allow 1 compaction prelimiary
  - important is to get the tool working to enabled longer unsupervised runs - compact_memory tool as priority to emergency plugin function right now
  - let us include an optional field for direct instruction after compaction - this will replace the default set message and may include more specific instructions what files to load back into context. e.g. explude nap or only read nap line 500-600, so preserve context window.

# 2
- when compact_memory tool works need a guideline for its usage. e.g. in readme_compact_memory.md and to read as needed?
  - or replace/add/rewrite the direct threadhold section in the agent prompts to enable compacting and know what that means and its limited application enforced by the tool 
  - does compacting currently have a return value to signal the number of compactions to the sesseion it has compacted? maybe with a reference to the max allowed compaction for its model: e.g. COMPACTION: 2/3 ...
    - needed for agents to help identify their last run
  - need to define if an emergency compaction can extend the max compaction?

# 3
- nap size reduction

prompt additions/edits/rewrites:
# 4
- small addition to the planner prompt for a ready made grep command to find maintainer attention markers in repo
  - planner often tries mutliple times to discover discepencies in the command formulation
  - connected to .opencode\maintainer\inbox_planner\snippet_collection.md

# 5
- addition in the agents.md, that general knowledge - actionable items,code,facts that helped to solve a problem should be sorted into the agent/knowledge section - file may be created to fit the general topic
  - when looking for solutions one of the first things should be to grep the knowledge folder for relevant hits (remember to limit outputted lines for first grep call or similar)
    - maybe just an knowledge inbox.md to append to to not reduce cognitive load in analysing where it should go.

# 6
- remember to limit outputted lines for e.g. first grep tools or similar 
  - context is the precious resource everyone needs to protect :-)
    - this should be a general rule. if you know what the relevant sections in large files are and delegate, then communicate the area by lines in it 
    - when reading a large file be smart about it and analyse it first and try as best to only read the relevant sections. grep for keywords might even save the read.
    - m

#7 small knowledge / use addition - or more likely do-not addition? 
- do we need explicit coding guidelines?
- The edit tool chokes on non-ASCII chars in oldString (planner working on code failed multiple times to use the code due to this an neede to write a script to replace a textstring - tool block_transfer would be a solution for this case)
  - so do not use non-ASCII chars if possible

#8 test the block_transfer tool:
- does it acutally do what is intended?
- how to improve it to use it effectively?
  - you can freely adapt it to the need
- can it go in live usage?
- writing a usage guide and include it with usage guides to the other tools - i think best place in repo_custom_tools and instrution as other parts to read as needed?
- do what you can without approvel and for the rest make a proposal
