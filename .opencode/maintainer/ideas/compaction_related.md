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

# 4 emergency overwrite of max compact per session option
  - a planner should be able to overwrite the limit for the sessionid of a worker
    - e.g. if sessionID given into the tool is not the current ctx.sessionID then the limits do not apply? or raised by one temporarily?
      - to keep track who starts who is i think to much managerial effort - it is an emergency tool, to be there when needed
