--wip--defer: can be ignored if it prevents work on autorun: scanning ans proposals/research/feedbacl always allowed
// --comment
// e.g. proposals are always allowed to write, test implementations as scripts in tmp also
// - in general all things you find that might lead to some general improvement or built up of actionable knowledge or helpful tools, etc can be done
//   - e.g. research: you (the planner) can go trough feedback, maintainer folder files, archive log and identify problems/opportunities/things-to-optimise and research them
// this is no priority sorting ... ideas are loosely grouped in topics but might contain crossrelevant snippets

2026-09-23_04-53:
- ctx-gauge should be based on context parameter in openjson and not the number in the name??
  - just for convienience for me ... so not dringend

2026-09-23_04-20:
- marker sweep of a planner took 17k token as result
  - $ grep -rn -- "--main\|--now\|--info\|--todo\|--defer\|--wip\|--comment" --include="*.md" .opencode/ TODO.md README.md WIKI.md 2>/dev/null | grep -v "_past_priorities\|/done/\|agent_feedback\|nap_direct\|archive/"
  - The output of the marker sweep got polluted with plugin.log noise 


2026-09-23_01-18
- so the loopguard is interrupting the sessions and the auto-resume unit 4 did not fire for it
- 70.31.848.027 W slot handle_loop_: id  0 | task 24525 | loop guard force-closing hidden reasoning at token 1152 (interventions=1 token=1558 piece=''): ngram_dominance period=8 coverage=513 score=0.501
- - draft


2026-09-23_00-20
- submit section for memories that explains it usage and appends it into inbox_memory.md of the agent role automatically

2026-09-22_17-53
- might be a good idea to create seperate README.md files for each plugin we have written 
  - general explanation what is does and how it is implemented
  - might contain gotchas encountered - lessons learned not to do

2026-09-22_17-41
- we should move ctx gauge max value not gained from the modelID but from the opencode.jsonc or if their is a field in ctx object to gain the limit directly over it.
  - would allow me to more freely name and rename modelID without needing to update the name in backend AND openconfig to signal the limit via name



2026-09-22_14-30:
"
  4. The compaction question: he reactivated the plugin — which plugin? auto_resume (I assume — "the plugin" = the one we were discussing, the deactivated auto_resume). Also — the compact_memory plugin: his temporary fix (commented-out promptAsync) is still in effect → SELF compact should work. Unverified. I'm at 83% — approaching the 90% stop line. If I need to compact this session, SELF compact_memory should work now (per his temporary fix). But per the triage rule: I should plan the turn to fit without needing to compact. My plan is ~12–15K → end at ~90–92%... hmm, that's tight. The 80% triage rule: "before starting a unit, estimate the remaining tool calls; if the estimate exceeds 10 calls → instead of starting a unit, stop at the last verified checkpoint and fire compact_memory." I'm at 83% with an estimate of 12–14 calls → per the rule, I should compact first (SELF — should work now per his temporary fix, but unverified!).
"
- is there a rule to "But per the triage rule: I should plan the turn to fit without needing to compact."??? compact is the go-to mechanism right now to continue


2026-09-22_12-03:
- commit has inclusion instruction lets every worker stumble on how to do it
  - needs clear instruction or has to be part of the spec
    - maybe a spec template to be filled out? with handles all the not changing parts of the process
      - could be created with an edit marker for easier filling out 

- overhead of small changes are big atm - loosem the 15 diff line convention
  - 2026-09-22_12-41 done - first change to planner prompt

- need more direct interaction - the planner agent is burning its context trying do everything at once - TRIAGE rule (see end priority.md)
  - 2026-09-22_12-42 done - first change to planner prompt

2026-09-22_00-46:
- resume message of auto_resume invalidates the cache? but i observed the same after return from a sub-agent to the planner. might be just the size that is not supported right now - try some fixes in the backend.

2026-09-22_00-25:
- loosen the less than 15 lines diff can do a planner a bit. maybe 50 diff lines? still a small change. and prevents delegating an extra worker with all the turn around

- worker gets confused because he does not know how to include in git hash in his closing commit - this might be needed to declared more specifically - he burned 10k token and 6,5 minutes to decide to look up how other have done it in the existing handover_task_to_planner
 - happens nearly every time... and costs token and a lot of time


- on planner closeup with enough room to the stop line, maybe add feedback integration. look at the current accumulated agent_feedback and decide if and where it should be integrated.

-pathfinder mentality as planner prompt part - when you are in an area (files/folders) and you see something is bad or not current or is easily fixed - leave it in a better state then before.
- but might distract from task. small edits yes, bigger ones todo_inbox?

- we might need an information in tool call that something was replaced
  - or else the agents will get confused

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

  
  - cleanup of agent_feedback
    - get actionable items -> proposal bundle and extract knowledge if present

 i could now with reduces kv-cache upgrade model iq3kt to 262k contextsize .. and make 2 slots so they can run parallel :-) mhhhh a workers with each 131k contextwindow
            - question is how fast these are in reality compared to one worker
            
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
  - stability by providing markers/text anchors that can resolve in the line not only at the start? - might be too much work for small gain. but might be useful for long lines?
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


# prompt and tool description engineering (research) DONE
  https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
  https://www.anthropic.com/engineering/building-effective-agents
  https://www.anthropic.com/engineering/multi-agent-research-system
  https://www.anthropic.com/engineering/writing-tools-for-agents
  - create a comprehensive guide on how to optimise system prompts for out agents, how to structure our added prompts via read and how to optimise tool descriptions for better usage
  - this is the knowledge basis for a prompt engineer skillset
    - hw should get all the knowledge to be able to optimize all the prompts, tool, plugin descriptions - essentially everything that
  - e.g. from writign-tools-for-agents
    - "When writing tool descriptions and specs, think of how you would describe your tool to a new hire on your team. Consider the context that you might implicitly bring—specialized query formats, definitions of niche terminology, relationships between underlying resources—and make it explicit. Avoid ambiguity by clearly describing (and enforcing with strict data models) expected inputs and outputs. In particular, input parameters should be unambiguously named: instead of a parameter named user, try a parameter named user_id"


  # research, analyse the copied repo (a lot of files, so do not try to run it in one session) STARTED/WIP
- "C:\Users\Wasiejen\AppData\Local\Temp\opencode\opencode-auto-resume-master"
- goal: general map the usage and map out what problems and how this plugin solves them
  - identify used solutions for autostarting an agent continuesly
  - how to react to a contextoverflow or errors
  - generally useful implementations
  - enrich our knowledge base with these informations found 
    - like recepies: this problem is solved here in this way
      - as basis to built our own plugins with working examples


  "autoCompact": false,
  "saturationThreshold": 0.95,
  "outputReserve": 5000,
  "keepTokens": 30000,
  "keepMessages": 12,
  "emergencyRecovery": false,
  "model_budget": {
    "Qwen3.8-27B-Q3XS-160K-MTP": 3,
    "Qwen3.8-27B-Q3S-110K-MTP": 3,
    "Qwen3.8-27B-Q2S-128K-x2": 3,
    "Qwen3.8-27B-Q2S-210K-MTP": 3,
    "Qwen3.8-27B-Q3S-160K-MTP-Thireus": 3,
    "Qwen3.8-27B-Q3S-170K": 3,
    "Qwen3.8-27B-Q3S-230K-slow": 3,
    "Qwen3.8-27B-Q3XS-262K": 3,
    "Gemma4-12B-Q4KM-UC-128K": 1,
    "Gemma4-12B-Q4KXL-MTP-128K": 1
  },
