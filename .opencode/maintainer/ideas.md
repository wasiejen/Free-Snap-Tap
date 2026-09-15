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



# 2 adding emergency compaction option to the tool that automatically trigger on context_limit
  - optional toggable via the same json file that stores the compaction numbers for each sessionID

# 3 emergency overwrite of max compact per session option
  - a planner should be able to overwrite the limit for the sessionid of a worker
    - e.g. if sessionID given into the tool is not the current ctx.sessionID then the limits do not apply? or raised by one temporarily?
      - to keep track who starts who is i think to much managerial effort - it is an emergency tool, to be there when needed
