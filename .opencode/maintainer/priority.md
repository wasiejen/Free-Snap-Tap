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


--info: 
  - raised internal limit of model 140K to 145K, gauge still based on 140k - buffer as intended did not work before opencode stopped agent at 140k of 145k
    - so limit is a hard bound (what would happen if limit is set higher? rolling context window? need to research myself a bit)
  - check # 9 general compaction recommendation/guideline if we should test out mit session compaction. reasoning laid out in the referenced section
    - you can test this out on yourself or on workers :-D
    - generally the planner could use compact on his session more often? suggestion :-)
  - --wip/--deferred if it prevents work can also be ignored when on autorun 
    - e.g. proposals are always allowed to write, test implementations as scripts in tmp also
  - in general all things you find that might lead to some general improvement or built up of actionable knowledge or helpful tools, etc can be done
    - e.g. research
      - you can go trough feedback, maintainer folder files, archive log and identify problems/opportunities/things-to-optimise and research them

  - 2026_0-9_1-6__1-5_5-0 opencode restarted - (testing some date formats)
    - changed name of the autorun folder. commented it in loop.log
    - 2026 stayed since it seemed not not make problems yet 
      - in doubt drop we could drop the 2026
      - or shorten it to 0-9_1-6 and add the session_id of the looprunner ... but the session_is is AGAIN a dense string ...
      - 0-9_1-6_loop-1 and if started more than one then 0-9_1-6_loop-<number>
    - 2-0-2-6_0-9_1-6__1-5_5-0 is not easily readable for me
      - 2-6_0-9_1-6__1-5_5-0 .. this could work. what do you say?
        - and when appending to a name? autorun_2-6_0-9_1-6__1-5_5-0 underscore to diffeniate is more visually


# fuzzy research scripts + plugin
-- see comments in research for direction/approval state
- testing of log function.

# compact_memory tool dump function ## 55 approved
- compact count aware dump
- autocompact on context limit option, toggable via parameter in the budget file
- (1)add a fallback to fetch the providerID and modelID as fallback for cross-session compaction (so only session_id needs to be set) 
  - source is in line 119 of opencode.json defines as agent compaction. (a planner used the wrong modelID for self-compaction)
  - on self-compaction the model should also be resolved from the opencode.json if in doubt. only explicit overwrite of the model will change the compaction model.
    - cross-compaction -> only needs session id of to be compacted session
    - self-compaction -> needs not parameters at all (parameter desciptions in compact_memory are likely descriped badly by me -> needs to reword this so it is clearer)

# repo split research/proposal
- how best to seperate fst and the opencode_test branch into 2 independently trackable git repos
  - goal is to seperate repo files from opencode and agent files
    - in the repo lives only the files that concern the repo - nothing of agents or opencode  (clean for)
- i could imagen to move the opencode part in a parallel folder to FST
  - C:\Users\Wasiejen\Projects\Repos\Opencode|Free-Snap-Tap
    - Opencode would as start just copy the structure we already have without the FST files
    - and giving explicit diretory to C:\Users\Wasiejen\Projects\Repos\ or based on what repos to work on
      - path variable would be an option to make this in general more independent?
    - I would create a copy of the FST repo in github and clone it into this new folder and move the old FST into C:\Users\Wasiejen\Projects\Repos\Free-Snap-Tap (might defer move to not to have to update all the references at once?)

--defer # 3 3 destillation worker runs for now - to much work right now. 
# 3 3
- you are free to test out different destillation workers on some session dumps. try to use the gemma4 worker ... i need to enable this before (worker_gemma_Q4_128K, agent_gemma_Q4_128K are available again)... he is a lot faster. so you can put more workers in the same time and experiment with different goals/tasks more.
  - create some roles/skillsets for this if needed to keep track of them and try to find a wide range of different perspectives that could scan the sessions.
    - you are free to experiment and document what you find
      - e.g. let multiple gemma workers with different settings run over the same session and compare this to a run with qwen model (remember 4 times slower)
        - if the gemma models are underperforming then use other models (agents might be best for testing? your choice)
  - create different tools/scripts to work with the dumps. how to best extract what you and the agents might need and what the workers might need.
- this could also be used to get the last messages of a failed worker to see what happened and to dump them into a new worker (idle though) - but might be just better to just compact and resume them 

- so approved as long as you do not destroy my repo or pc :-)
- ps --comment can be removed if acted on or you have aknowledged it - these are more as explanations to you then for me to keep.
- 

prompt additions/edits/rewrites:
# 5
- addition in the agents.md, that general knowledge - actionable items,code,facts that helped to solve a problem should be sorted into the agent/knowledge section - file may be created to fit the general topic
  - when looking for solutions one of the first things should be to grep the knowledge folder for relevant hits (remember to limit outputted lines for first grep call or similar)
    - maybe just an knowledge inbox.md to append to to not reduce cognitive load in analysing where it should go.

# 7 small knowledge / use addition - or more likely do-not addition? 
- do we need explicit coding guidelines?
- The edit tool chokes on non-ASCII chars in oldString (planner working on code failed multiple times to use the code due to this an neede to write a script to replace a textstring - tool block_transfer would be a solution for this case)
  - so do not use non-ASCII chars if possible

# 8 test the block_transfer tool:
- does it acutally do what is intended?
- how to improve it to use it effectively?
  - you can freely adapt it to the need
- can it go in live usage?
- writing a usage guide and include it with usage guides to the other tools - i think best place in repo_custom_tools and instrution as other parts to read as needed?
- do what you can without approvel and for the rest make a proposal
