--wip--defer

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

# 4 codify knowledge gain and how to save it
  e.g. keywords to be easily searchable because the knowledge files could get very big
    specific instruction for retrieval
    - storage would be done in a knowledge inbox with recommendation for keywords
    - dedicated agent with skill knowledge_curator would then go over this and collect it from other places to built up the knowledge files - updates them and dedubles - optimises based on collected feedback of retrieval attempts from agents
    - feedback needs to be again a mandatory step - needs to be easy and frictionless?
      - feedback_tool that just appends to the inbox???


# 3 emergency overwrite of max compact per session option
  - a planner should be able to overwrite the limit for the sessionid of a worker
    - e.g. if sessionID given into the tool is not the current ctx.sessionID then the limits do not apply? or raised by one temporarily?
      - to keep track who starts who is i think to much managerial effort - it is an emergency tool, to be there when needed


  
agents constantly get confused about the nudge ctx (<X>%/<Y>K) and interpret Y as used tokens like the % display the used percentage. we should make this more clear with a bit more speaking output.


idea collection - for discussion in direct session

fuzzy search for reading files per name?
- to medigate the bitshift tendency of some numbers 
- when reading files this is not this dangerous to select the closest match e.g. in the path.

fuzzy search matchin in files to read specific lines?
- this could prevent the number shift also when trying to read specific sections

- instruction if you calculate in head use words and not numbers

is it possible to create a small general function that translates numberwords into numbers as output that is usable from anywhere in the shell or at least in the scope of node or python?
num(five) -> 5, num([five,five]) -> 55
to include in e.g. f-strings in python to convert wordnumbers in real number in instructions?
or part of every scipt that it will automaically replace strings in the input string for e.g. a path to replace <five> with 5 dynamically.

lets remove the verbatim output printout of looprunner. formatting is butchered by the transfer and the token are filling up

--maintainer clarification on compaction usage
reasoning of planner ses_f59d27449ffeEFeV4vaQ6NlqTs:
Cross-compact + resume attempts = starting more work past the line... The stop line says "don't start new work past the line." But this is finishing up the current unit (the worker rescue is in progress, and the alternative is to leave the unit in a broken state). The early handover protocol says to PAUSE the unit and bring the NAP up to date.
- compaction enables further work. stop line no work means no work BEFORE a compaction! this stop line means no work was before compaction was contrallable available.

--comment: was the cross compaction deliberate?
planner ses_f59d27449ffeEFeV4vaQ6NlqTs wanted to self-compact but has done a cross compaction instead of self compaction by providing all values session, provider and modelid
used:
⚙compact_memory [sessionID=ses_f59c0d40affePju49VV2U179cp, providerID=llama-swap, modelID=Gemma4-12B-Q4KXL-MTP-128K]
- self compaction is tool use without parameters
