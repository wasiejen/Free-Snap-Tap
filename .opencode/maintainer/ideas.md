--wip--defer

- message value from compact_memory do not arrive in the compacted sesssion. not as part of the summery or later

- removal of loop warning of compaction, or reducing its scope DONE
- perception of models is correct in bitdrift, but they can not generate the value. so not a kv cache (memory) but a generation (weight) problem?
  - "The two strings differ in a way I cannot see (Pattern 5)" see might mean generate? or perceive - but they know the number but can not write it - so generate, in adder construction they can reliably reproduce the number or in numwords. so they know the number -> model weight-problem
- increase default keepMessages to 20 with increaed window size
- ctx needs a session_id and role to better attribute which measurement it is
  - good place to track worker sessions and get session_id if needed
  - only place to check after error of a sub-agent how full his context was
  - add tools.execute.before in watchdog to just trigger ctx.gauge - not change in message to keep it more up to date

would be much more helpful with session_id and role (modelid can drop - is implied with role)
2026-09-16_17-43 Qwen3.8-27B-IQ4KT-140K edit (97% used, 3K left)
2026-09-16_17-46 Qwen3.8-27B-IQ4KT-140K bash (99% used, 1K left)
2026-09-16_17-49 Qwen3.8-27B-IQ4KT-140K ctx_gauge (74% used, 36K left)
2026-09-16_17-50 Qwen3.8-27B-IQ4KT-140K compact_memory (74% used, 35K left)
2026-09-16_17-51 Qwen3.8-27B-IQ4KT-140K bash (75% used, 34K left)
2026-09-16_17-51 Qwen3.8-27B-IQ4KT-140K COMPACT ses_f55463549ffelXphfcDlDGMhPJ tokens=30000 messages=12


# 8 write to buffer option?
- so no direct writes can fail
- if intercepts can not resolve a filepath it is buffered instead - but how to retrieve? special marker in write command? or just dump it into a file and inform agent?

- my quess to path doubling is the double folder Free-Snap-Tap then might induce doubling in the path because of its double existence.

# 1 tool description list/prompt that explains the available costum tools to each agent
- session_info
- ctx_gauge
- block_tranfer //when working
- compact_memory

# 2 tool erase message from seesion
- a tool to make it possible to remove the tail to a specific message and replace it by e.g. a summary
  - or directly remove a message or a list of messages identified by heir messageID from the session
  - usage: on ingesion of large files -e.g webfetch or log/dump reads summarise the useful parts and then remove it from context
  - could be another great lever to save context space!
- ?? ctx.session contains the messages 
  - ARE these actually the context???
  - and when removed the context is recompiled???

# 3 codify knowledge gain and how to save it
  e.g. keywords to be easily searchable because the knowledge files could get very big
    specific instruction for retrieval
    - storage would be done in a knowledge inbox with recommendation for keywords
    - dedicated agent with skill knowledge_curator would then go over this and collect it from other places to built up the knowledge files - updates them and dedubles - optimises based on collected feedback of retrieval attempts from agents
    - feedback needs to be again a mandatory step - needs to be easy and frictionless?
      - feedback_tool that just appends to the inbox???

# 4 emergency overwrite of max compact per session option
  - a planner should be able to overwrite the limit for the sessionid of a worker
    - e.g. if sessionID given into the tool is not the current ctx.sessionID then the limits do not apply? or raised by one temporarily?
      - to keep track who starts who is i think to much managerial effort - it is an emergency tool, to be there when needed

# 5 is it possible to create a small general function that translates numberwords into numbers as output that is usable from anywhere in the shell or at least in the scope of node or python?
num(five) -> 5, num([five,five]) -> 55
to include in e.g. f-strings in python to convert wordnumbers in real number in instructions?
or part of every scipt that it will automaically replace strings in the input string for e.g. a path to replace <five> with 5 dynamically.

# 6 lets remove the verbatim output printout of looprunner. formatting is butchered by the transfer and the token are filling up

# 7 - but you may as well do some maintenance and curation on knowledge files. repo prompt files, nap, explore new script we could need, ... :-) if you are bored look in my ideas and make some proposels or research how to do this. fuzzy search on read or when searching in files. or num_to_word autoreplace as intercept plugin on hook.execute.before to combine both and make tools calls more reliable even with bitshifts in numbers. worthwhile thing to research. but dont save research in your nap. make e.g. a agent/research folder if you want.

# 8 could you add dates to my inbox_planner files i sent to you and which are placed into done?

# 9 general compaction recommendation/guideline
- in general agents should after a lot of reads on e.g. t.s files, webfetches -> write a detailed summery and self-compact after to free up the history

general consensus about bit rot 
- information loses its clarity and the agent loses ability to remember with increasing context fill states
- beginning and ends are nearly always clear ß
  - the middle gets less attention and is increasingly hard to perceive - work with - or remembered
- 100-120k is normally deemed safe
- around 140-150k is the beginning line of this phenonomen 
  - (highly depending on model, model quant and kv cache quant)
    - but the used quant for both is pretty tight on the "lower and it might not be usable anymore" line - or a tight fit :-)
      - iq4_kt and iq3_kt with trellis alrithm correction for model weights and currently Q4/Q4 hadamard supported KV Cache

potential solutions per community (only what i came about - not complete - just general recommendations i came about)
- one solution for this is mid session compaction
- pruning of the read files directly after read and summerization (essentially a targeted compact by removing specific content) close after reading large files
  - essentially the default compaction does the same but over a bigger window 
    - but when triggered to late and reasoning parts and planning messages are outside of keepMessages quality/gained read knowledge is lost
      - so for a compact to be as effective as possible it needs to be large read aware and adapt keepMessages to include all knowledge dense messages after file reads
      - or to be fired a compaction shortly after file reads/research/webfetch and thought, summarising, planning phase
        - best before work starts i guess - plan is intact and then context window for implementation increased

general on compaction in the current state with gemma4 as compaction model
- seem very stable - the compacted sessions show no real sign of increased detoriation 
  - so far as i have observed deterioration - I was not present for the whole of the 140K planner and worker session. so observation is based on 120K models
  - my general ruling would be to use compaction more often - not only in danger of context limit
    - 4 positive results of early compaction
      - mid session compaction frees up context for a lot more work to be done
      - speed up of generation (thus higher efficiency)
        - the fuller the context the slower the generation
          - empty context currently around 47-47 t/s, 50k 35 t/s, 100k 25-26 t/s 140k 21-22 t/s
      - might make a later emergency and thus more lossy compaction unnecessary
      
- emergency compaction on the other hand has higher degradation risk
  - default values for keepMessages loses context awareness
  - emergency is most often caused by a lot of work be done and thus AFTER likely many tool calls, the thinking and planning messages are further back in the history and on emergency compaction more likely to be dropped or compressed
    - based on the idea of dropping messages after keepMessages but i believe (no proof thus far observed) thinking blocks are not dropped but compressed via the compaction model -> it creates not only the summery for

# 10 compaction prompt
it is possible to customize the prompt the compaction model gets to e.g. summarize the session in a specific style, detail
- e.g. what repo files are needed to load again
- e.g. what sections of files to read again
can be set to very verbose

# 11 compaction message
- the message that is added to can be set by the one starting the compaction
  - e.g. action:resume could be written as default to make it clear for the looprunner or planner to continue 
  - further thought could the agent costumize the prompt his compacted self gets via the message
    - the things mentioned in # 10 e.g. would also be possible with this
  - maybe better send as a message and not added to the summarization
    - could we catch the summery and resend via message?
      - the message will be queued and will grap the models attention as soon as the context is loaded in again
        - way more effective then the passive addition in the "thinking block" of the compaction model, than is routinely not registered fully
