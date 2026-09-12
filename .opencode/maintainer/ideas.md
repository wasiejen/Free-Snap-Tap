--wip--defer

# tool description list/prompt that explains the available costum tools to each agent
- session_info
- ctx_gauge
- block_tranfer //when working
- compact_memory

# tool erase message from seesion
- a tool to make it possible to remove the tail to a specific message and replace it by e.g. a summary
  - or directly remove a message or a list of messages identified by heir messageID from the session
  - usage: on ingesion of large files -e.g webfetch or log/dump reads summarise the useful parts and then remove it from context
  - could be another great lever to save context space!
- ?? ctx.session contains the messages 
  - ARE these actually the context???
  - and when removed the context is recompiled???

# session messages dump tool
- quite easy - just copy ctx.session into a file and then via default tools like grep it could be iteracted with
  - could it even be used to selectively delecte messages and then reload this into a new session???? grooovy but unlikely to be wo easy anymore
