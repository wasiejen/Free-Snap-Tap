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


--maintainer: if no actionable item remains in an autorun:
- --wip/--deferred is lifted if it prevents work
    - e.g. proposals are always allowed to write, test implementations as scripts in tmp also
- in general all things you find that might lead to some general improvement or built up of actionable knowledge or helpful tools, etc can be done
  - e.g. research
    - you can go trough ideas feedback, maintainer files, archive log and identify problems/opportunities/things-to-optimise and research them
- use the sessions with nothing to do - do maintenance on your nap and todo
  - e.g. think about how to improve the set of prompts we have. are their ways to better organize them. to make them more succinct and clear. are there redundant instructions or badly worded (only examples)
- you are intelligent - you will find something to do
  - go through my ideas for new research on functions. create a folder in research for each if you find something worthwhile

# include loop.log in your files that are only read sparingly with limit (e.g. to determine current loop number)
  - currently 30000 chars ... around 16k token (lots of numbers and dense strings)
  - easiest was to determine is to just get your session title before trying to read the loop.log?
    - what is the easiest method for the agent? title of session or loop.log careful grep?
    - -> do we need to codify this somewhere? 
    - or include the current iteration number in the starting unit 4 message of a new session? (later maybe)

# fuzzy matching of edit oldstring 
- a very regular problem that an edit fails
  - see # fuzzy_numword fuzzy extension on edit
- could also be solved by a WRITE function of block_transfer

# TODO #97

# fuzzy_numword R8
- R8 (to minimze loop disruptions)
  - repeated accesses outside of sandbox stop everything until I intervene
    - e.g. access to C:\Users\Wasiejen\AppData\Local\Temp instead of the designated C:\Users\Wasiejen\AppData\Local\Temp\opencode 
    - basis for resolution are the "permission.external_directory" and "references" sections of opencode.jsonc


# log tool v2 proposal implementation:
  - found it in implemented and moved back to approved because it is not yet implemented

# block_transfer extension:
  - collection as discussion base: .opencode\maintainer\draft\block_transfer_tool\2026-09-25_15-23-upgrade.md
    - ## what would be needed to make block_transfer as versatile as edit but less prone to oldstring mismatch?

# fuzzy_numword  
- R8 (to minimze loop disruptions)
  - e.g. redirect calls like "C:\Users\Asiejen\AppData\Local\Temp\opencode\brtest.mjs" into the sandbox
    - data for allowed paths is in opencode.json permission.external_directory
- we need a return information in tool call that something was replaced
  - like we add the message content in the compact_memory .. add the information what was replaced as feedback because the agent using the escape cannnot perceive their escape form past tool call anymore - they only see the correction. always check against the intercept.log when in doubt
    - mandatory information for all that are working on this plugin
  - or else the agents will get confused
    - intercept.log 1083 kind=escape scope=content orig=[190:one-nine-zero:-esc-]  value=190 hits=3 | arg | pair-resolved (-esc- dashes added to be not replaced by itself in oldstring)
      - worker thought escape did not work because he could no perceive the change
        - needs feedback
          - and maybe more examples with different values for left and right - my current agent.md only use the same value on both sides
            - add to this that single digit/numwords are save. as normally are adder construction
              - the worker did not try any of it. 
                - result of removel in their system prompt?
- R3 if not already implemented?

# repo split research/proposal (each research should be at least a single run)
- how best to seperate fst and the opencode_test branch into 2 independently trackable git repos
  - goal is to seperate repo files from opencode and agent files
    - in the repo lives only the files that concern the repo - nothing of agents or opencode  (clean for)
- i could imagen to move the opencode part in a parallel folder to FST
  - C:\Users\Wasiejen\Projects\Repos\Opencode|Free-Snap-Tap
    - Opencode would as start just copy the structure we already have without the FST files
    - and giving explicit diretory to C:\Users\Wasiejen\Projects\Repos\ or based on what repos to work on
      - path variable would be an option to make this in general more independent?
    - I would create a copy of the FST repo in github and clone it into this new folder and move the old FST into C:\Users\Wasiejen\Projects\Repos\Free-Snap-Tap (might defer move to not to have to update all the references at once?)


# prompt additions/edits/rewrites:
## safe knowledge when you gained it! 
- motivation: when you e.g. researched how an object is resolved and it is needed for solving a problem, this needs to be documented somewhere -> knowledge base
- addition in the agents.md, that general knowledge - actionable items,code,facts that helped to solve a problem should be send via submit directly after confirming it and it is needed for a problem solution
  - when looking for solutions one of the first things should be to grep the knowledge in the folder for relevant hits (remember to limit outputted lines for first grep call or similar)
    - knowledge folder may need to get keywords? or would a tool with e.g. increasing resolution and window of needle search be useful?


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
