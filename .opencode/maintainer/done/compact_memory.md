--comment if you start work on the tool then try to include (ignore items that are already in there):

emergency compact on context limit
- or at least auto stop of worker in context limit to prevent 5-6 retries
  - and maybe eventual interruption of the whole loop

automatic compact aware dumping in compact_memory on compact and on context limit or error? 
- maybe issue a stop for the parent agent to analyse the situation then instead of automatically compact?

if a session id is giving it means cross compact. the default model is already set in the opencode.json so it could be prefilled with this, prodiver hat the same source - the opencode config.
- so providerID and modelID get optional for cross compact
- 
opencode.json section for definion of default compaction model:
line 117-121:
  "agent": {
    "compaction": {
      "model": "llama-swap/Gemma4-12B-Q4KXL-MTP-128K",
      "temperature": 0.1
    },


sooo big question: is the plan to make the script compact aware OR only the plugin?
- if only the plugin and someone uses the dump script, then might it happen that an already existing session will be overwritten when called from inside a compacted version of the session?
