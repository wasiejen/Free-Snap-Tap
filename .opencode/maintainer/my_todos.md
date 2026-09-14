// maintainer todo list to keep track of what he needs to do
// need a place to collect the items when analysing an autorun to not keep trach
--wip

- llama swap check context shift setting on models esp iq3kt, enable to all
  - checked. all enabled
  - limits sets correctly and same to llama-swap
    - might be worth it to test to set limit in opencode higher or lower
      - ctx-gauge then must fall back on model info


▣  Looprunner_Q4_120k · Qwen3.8-27B-IQ4KT:chat · 5h 40m (--comment: after iter 4 current loop)
What I need from you
I'm restricted to launching planner_Q4_120K, and both fresh launches are failing at the host context level, so I cannot drive the loop further on my own. Options:
1. Fix the host context config for planner_Q4_120K (the "context shift is disabled" + a fresh session overflowing suggests the window/shift setting is wrong), then tell me to resume — I'll relaunch iteration 4.
2. Approve a different planner/worker model for the launch (I'll use whatever you specify), or
3. Wait and retry if you believe it's transient.


1. --context-shift 1 - is active for all Qwen3.8 models
  - resolution 1 : enable looprunner to compact planner, and planner to compact worker
  - res 2: emergency compaction on context limit option
2. stays the same - stable Planner_Q4_120K - the planner can delegate to other models if needed and because he knows what is to do
3. no this is never transient.
  - skteched possible solution in priority


--wip
--comment excerpt from summary of current looprun
"
need to check:
  Summary: .opencode/loop/autorun-2026-09-13_04-27/plan2_summary.md
  - Resumed the same session at the stop line (86%/16K). Confirmed this session was NOT actually compacted — the post-compaction protocol was applied only as a precaution (triggered by plan1's content).
- it was not compacted? did the agent run the comaction?
"
- so compaction did not work - need more detail



- need to move or rename the agent folder in .opencode
  - it is picked up as a general agents folder and every md file in it is added as a system prompt for aseperate agent to start
  - maybe enough to rename it _agent?
    - might be prodent to name all new folders with prefix _ to prevent clashes with opencode

260914-1422 (need to update my fst macro for date) it is still outputting the old format
