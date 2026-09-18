--wip--defer: can be ignored if it prevents work on autorun: scanning ans proposals/research/feedbacl always allowed
// --comment
// e.g. proposals are always allowed to write, test implementations as scripts in tmp also
// - in general all things you find that might lead to some general improvement or built up of actionable knowledge or helpful tools, etc can be done
//   - e.g. research: you (the planner) can go trough feedback, maintainer folder files, archive log and identify problems/opportunities/things-to-optimise and research them
// this is no priority sorting ... ideas are loosely grouped in topics but might contain crossrelevant snippets


- we might need an information in tool call that something was replaced
  - or else the agents will get confused

26-09-18_11-14:
  - cross compaction seems to invalidate the cache of the session which fires the compaction. why?

  
  - !!! replace looprunner with a plugin that automatically resumes or restarts the planner agent
    - thus i could have infinite direct session and a directer access to the planner. direct questions possible. way more effective and less butterfly effects of unintented or badly worked instructions or instruction relay
      - research agent run with proposal? i think i must give a bit more details
    - auto-continue/opencode-auto-resume is an already existing plugin that solves this
        - is also an already existing plugin, but extremely complex it seems
          - overengineeded for this purpose but may be good to scan it for solutions to
            - how to restart a compacted planner agent without a looprunner
            - how to trigger a compaction on context_limit
            - how to start a new planner when the old signals restart (like the looprunner)
          - "C:\Users\Wasiejen\AppData\Local\Temp\opencode\opencode-auto-resume-master"

 
  - need a dedicated research agent
    - prompt and instruction set/skillset inclusive?
      - analyse how the word with fuzzy_numword was done
        - check the sessions and curate a research guideline. like the tasc_spec in function only describing how best to research a topic and write a comprehensive proposal
        - good starting point the planner created in a dedicated research session was:
          - .opencode\agent\research\fuzzy-numword\drafting\2026-09-16_fuzzy-and-numword-tool-reliability.md
        - then discussion phases and addendum while preserving history
        - and then creating a compresehensive summary with reasoning and draft of Phases
          - Phases based on task_spec in size and strucute
    - ideal working flow. i destribe an intented function, write some thoughts down and an agent checks viability, seaches in the internet (context might be too tight - might need to upgrade gemma to 256K (found a way to do so and gemma is fast)) and creating a comprehensive overview with potential problems, usages, benefits -> an analysis if this is workable, how much work it would need and what we could expect as return in worth (e.g. smoother interaction, less friction with tools,)

  - compact keepMessenges setting must be codified (readme_loop most likely)
    - settings to adjust what to keep in memory to be decided before compaction
    - best time to compact is before big writing and editing work and after the implementation is clear.
      - comprehensive handover and then compact with choosing carefully to retain the reasoning and implementation drafts
      - write yourself a message to get easier started (currently not working but in priority.md # 1 compact_memory additions/fix messages)

  - file size restriction? to seperate long files for coding (testing, gate, smoke) into smaller units that are more focused on each plugin? 
    - i observed one really big file with over 3000 lines but i can not find it anymore. maybe in temp?
      - probes\handover_probe.mjs 
        - correction! now over 4000 lines :-D
          - as long as it is maintainable and clear what sections reference each plugin, so that read can effectively bounded is it not a problem.
  
  - cleanup of agent_feedback
    - get actionable items -> proposal bundle and extract knowledge if present

  - raised internal limit of model 140K to 145K, gauge still based on 140k - buffer as intended did not work before opencode stopped agent at 140k of 145k
    - so limit is a hard bound (what would happen if limit is set higher? rolling context window? need to research myself a bit)

  musings on naming convention
  - 2026_0-9_1-6__1-5_5-0 opencode restarted - (testing some date formats)
    - changed name of the autorun folder. commented it in loop.log
    - 2026 stayed since it seemed not not make problems yet 
      - in doubt drop we could drop the 2026
      - or shorten it to 0-9_1-6 and add the session_id of the looprunner ... but the session_is is AGAIN a dense string ...
      - 0-9_1-6_loop-1 and if started more than one then 0-9_1-6_loop-<number>
    - 2-0-2-6_0-9_1-6__1-5_5-0 is not easily readable for me
      - 2-6_0-9_1-6__1-5_5-0 .. this could work. what do you say?
        - and when appending to a name? autorun_2-6_0-9_1-6__1-5_5-0 underscore to diffeniate is more visually
    - might not be needed anymore with fuzzy numword? redundant information should be in speaking names? 
      - on write the question is more interesting - should we autocorrect references to filenames?

 i could now with reduces kv-cache upgrade model iq3kt to 262k contextsize .. and make 2 slots so they can run parallel :-) mhhhh a workers with each 131k contextwindow
            - question is how fast these are in reality compared to one worker
            
- my quess to path doubling is the double folder Free-Snap-Tap then might induce doubling in the path because of its double existence.

-  perception of models is correct in bitdrift, but they can not generate the value. so not a kv cache (memory) but a generation (weight) problem?
  - "The two strings differ in a way I cannot see (Pattern 5)" see might mean generate? or perceive - but they know the number but can not write it - so generate, in adder construction they can reliably reproduce the number or in numwords. so they know the number -> model weight-problem
  - 
- increase default keepMessages to 20 with increaed window size
  - better teach agents to set the value themselfes
    - keepTokens is then need to set lower to allow the keepMessages to stick and not be overwritten by 30000 keepTokens
    
- ctx needs a session_id and role to better attribute which measurement it is
  - good place to track worker sessions and get session_id if needed
  - only place to check after error of a sub-agent how full his context was
  - add tools.execute.before in watchdog to just trigger ctx.gauge update in the log - not change in message to keep it more up to date
    - is there a trigger for every message? just to trigger the ctx.gauge update in the log
      - normally the provider sends with EVERY return message the ctx info

  - would be much more helpful with session_id and role (modelid can drop - is implied with role)
    2026-09-16_17-43 Qwen3.8-27B-IQ4KT-140K edit (97% used, 3K left)
    2026-09-16_17-46 Qwen3.8-27B-IQ4KT-140K bash (99% used, 1K left)
    2026-09-16_17-49 Qwen3.8-27B-IQ4KT-140K ctx_gauge (74% used, 36K left)
    2026-09-16_17-50 Qwen3.8-27B-IQ4KT-140K compact_memory (74% used, 35K left)
    2026-09-16_17-51 Qwen3.8-27B-IQ4KT-140K bash (75% used, 34K left)
    2026-09-16_17-51 Qwen3.8-27B-IQ4KT-140K COMPACT ses_f55463549ffelXphfcDlDGMhPJ tokens=30000 messages=12

  - Line 4881: 2026-09-16_23-59 DUMP-FAIL ses_f5409e7a5ffeHFuZxFFuWovscO spawnSync node ETIMEDOUT

- using event hook messages.updated instead we might calculate the real token fill in real time!
  - this needs to be checked
    - apparently its the way the opencode TUI does this


# 8 write to buffer option?
- so no direct writes can fail
- if intercepts can not resolve a filepath it is buffered instead - but how to retrieve? special marker in write command? or just dump it into a file and inform agent?
Refer to R6 in fuzzy_numword as sketch for a cheap dump file for every edit and write tool call, 
- to prevent rewrite cost (rewrites take time and stay in context - copy with block_tansfer from the editlog or writelog is way cheaper and faster)
  - .opencode/temp/journal_write.log
  - .opencode/temp/journal_edit.log
- but also to use anchor points to scan for low density parts of oldstring in the destination file to identify candidates and then fuzzy check these only and if one match is found replace oldstring with it to have no failed edit action
  - path correction for edit should be in R1 already

## what would be needed to make block_transfer as versatile as edit but less prone to oldstring mismatch?
  - write option to write into the selected block?
  - multiple writes per tool call
  - stability by providing markers 
    - markers not only for line but for specific text (best combined with a line reference for closet search) + fuzzy matching in this area
    - applied from highest line number to lowest to not shift lines

## tool description list/prompt that explains the available costum tools to each agent
- session_info
- ctx_gauge
- block_tranfer //when working
- compact_memory

## tool erase message from seesion
- a tool to make it possible to remove the tail to a specific message and replace it by e.g. a summary
  - or directly remove a message or a list of messages identified by heir messageID from the session
  - usage: on ingesion of large files -e.g webfetch or log/dump reads summarise the useful parts and then remove it from context
  - could be another great lever to save context space!
- ?? ctx.session contains the messages 
  - ARE these actually the context???
  - and when removed the context is recompiled???

## codify knowledge gain and how to save it
  e.g. keywords to be easily searchable because the knowledge files could get very big
    specific instruction for retrieval
    - storage would be done in a knowledge inbox with recommendation for keywords
    - dedicated agent with skill knowledge_curator would then go over this and collect it from other places to built up the knowledge files - updates them and dedubles - optimises based on collected feedback of retrieval attempts from agents
    - feedback needs to be again a mandatory step - needs to be easy and frictionless?
      - feedback_tool that just appends to the inbox???


## lets remove the verbatim output printout of looprunner. formatting is butchered by the transfer and the token are filling up

## prompt example of rmaintence --info instruction in priority 
- but you may as well do some maintenance and curation on knowledge files. repo prompt files, nap, explore new script we could need, ... :-) if you are bored look in my ideas and make some proposels or research how to do this. fuzzy search on read or when searching in files. or num_to_word autoreplace as intercept plugin on hook.execute.before to combine both and make tools calls more reliable even with bitshifts in numbers. worthwhile thing to research. but dont save research in your nap. make e.g. a agent/research folder if you want.
