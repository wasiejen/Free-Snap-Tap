--wip--defer

# 1 tool description list/prompt that explains the available costum tools to each agent
- session_info
- ctx_gauge
- block_tranfer //when working
- compact_memory

#2 tool erase message from seesion
- a tool to make it possible to remove the tail to a specific message and replace it by e.g. a summary
  - or directly remove a message or a list of messages identified by heir messageID from the session
  - usage: on ingesion of large files -e.g webfetch or log/dump reads summarise the useful parts and then remove it from context
  - could be another great lever to save context space!
- ?? ctx.session contains the messages 
  - ARE these actually the context???
  - and when removed the context is recompiled???

# 3 session messages dump tool
- quite easy - just copy ctx.session into a file and then via default tools like grep it could be iteracted with
  - could it even be used to selectively delecte messages and then reload this into a new session???? grooovy but unlikely to be wo easy anymore

# 4 codify knowledge gain and how to save it
  e.g. keywords to be easily searchable because the knowledge files could get very big
    specific instruction for retrieval
    - storage would be done in a knowledge inbox with recommendation for keywords
    - dedicated agent with skill knowledge_curator would then go over this and collect it from other places to built up the knowledge files - updates them and dedubles - optimises based on collected feedback of retrieval attempts from agents
    - feedback needs to be again a mandatory step - needs to be easy and frictionless?
      - feedback_tool that just appends to the inbox???



20-26-09-14_14-22
--comment: replay to the reaction of a planner to my instruction of preserving the state of the loop folder was "(You told me to preserve that folder, so I didn't guess.)"
my answer to this: your comment is very helpful for me and this is a good example on how i am not certain what even such a simple comment of my will have for consequences in your actions. my instructions are not to be read verbatim in general - you are intelligent and do not have to accept everything what i say as law or rule. these are my best attempts at directing you and the other agents - but sometimes a badly worded line causes an entirely different outcome becomes my words were taken litterally and not the intention behind them. this is good act in the best interpretation of my intention. by preserve the folder i meant to not add to the loop.log, start a new autorun folder or yes generally change anything UNTIL we have discussed some and i have a better idea. but writing takes time for me and sometimes only the beginning of my intention i acutally write out and trust it will be interpreted correctly. (see another idle thought). my goal is collaboration and not blind adherence to what i write/say. you can and should make it obvious if an instruction/prompt is unclear. in direct session i want that you make this clear fast and not work a long time and then discover that my wording had unintented consequences and i got an output i did not want. or have to revert with a slighly reworded prompt to see what i will get.
