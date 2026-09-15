// maintainer todo list to keep track of what he needs to do
// need a place to collect the items when analysing an autorun to not keep trach
--wip



- need to move or rename the agent folder in .opencode
  - it is picked up as a general agents folder and every md file in it is added as a system prompt for aseperate agent to start
  - maybe enough to rename it _agent?
    - might be prodent to name all new folders with prefix _ to prevent clashes with opencode

260914-1422 (need to update my fst macro for date) it is still outputting the old format

260915-0325: look for models that might better suited for compaction.
- gemma4-12b is a bit dated but still very solid and fast
- tiny3.0 flash
- Qwen3.6 35B A3B - a bit tooo big for my hardware,
- gemma4 26b A4B - higher in articial rating, but larger in overall size
  - what is its context size?
    - Context Length 	256K tokens
    - Vocabulary Size 	262K
    - Expert Count 	8 active / 128 total and 1 shared
- gemma4 12b should have 256k xontext size
  - why does my version only supper 128k?


good compare of gemma4 models
![](image.bmp)

260915-0505: check permissions and tools for looprunner
- he can not see the loop_log tool even if it is enabled
- also very likely he has no access to the compact_memory tool
  - so the fallback of compacting a context_limit sitting planner is not possible atm
- looprunner prompt needs rework
  - inclusion of afk mode 
  - and compaction protokol for in context limit sitting planner

- check if there are better ways to name folders/use dates that do not lead agents into the dense numerical/data trap
  - misreading constantly of 2026-09-11 -> 2026-09-12
  - these are friction points i want feedback in their summaries :-)

260915-1400:
potential models for compaction/text/destillation work
- quant 6 of gemma4-12b might be worthwhile test
-  UD-IQ4_XS 13.6 GB unsloth/gemma-4-26B-A4B-it-GGUF might fit also very well. could be even faster and more intelligent at the same time
  - but low quant might be a problem in MOE architechture of this model
  - MOE works also good with fit and only a part of the experts in the vram 
    - have to test this
- tiny 3.0 in a higher quant maybe? the 4bit quant was not very good. but in general it is seen as very good 
  - so confilicting experience with community exp
  - size?
- unsloth/Qwen3.6-35B-A3B-GGUF or thireus strong candidate - but very big and needs to be offloaded to ram
  - speed? A3B is very small so could be fast non the less
  - prefill will degrade under ram usage i quess - not good for destillation
