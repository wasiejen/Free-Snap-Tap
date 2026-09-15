# priority — what I want next (my ordering, top = first)

## My list (active)

<!-- Add numbered lines here: reorder = reprioritize, delete = no longer
     wanted. Entries may name a TODO.md ID, a proposal file, or just a theme. -->

## How this works (for agents — read this, it is the whole convention)

1. The planner reads this file at session start and orders its planning by
   the list: the top item is the next work when it is clear and does not need
   the maintainer to clarify; the list is also the tie-breaker between clear
   `TODO.md` candidates. `TODO.md` stays the detail record; this file is only
   the ordering.
2. You may only EDIT this file for one thing: removing a line you have FULLY
   handled. Never reorder, reword, or add his lines.
3. When you move a handled line, APPEND it to `_past_priorities.md` (same
   folder) with a SHORT reply — one line, e.g.:
   `- attention-keywords proposal — done, implemented (commit 6ef2c4e)`
   `- #37 loop-log anomaly — see TODO.md #37, fixed in plan 3`
   For easy tasks `— done` is enough; for anything with a trail, point at the
   proposal file / commit / TODO ID. Append only — do not re-read or edit the
   old entries.
4. PARTIAL or BLOCKED items stay in the active list; note their status in the
   NAP (not here). The maintainer erases entries in `_past_priorities.md`
   whenever he wants — it is his log.



# 3
- nap size reduction


prompt additions/edits/rewrites:
# 4
- small addition to the planner prompt for a ready made grep command to find maintainer attention markers in repo
  - planner often tries mutliple times to discover discepencies in the command formulation
  - connected to .opencode\maintainer\inbox_planner\snippet_collection.md

# 5
- addition in the agents.md, that general knowledge - actionable items,code,facts that helped to solve a problem should be sorted into the agent/knowledge section - file may be created to fit the general topic
  - when looking for solutions one of the first things should be to grep the knowledge folder for relevant hits (remember to limit outputted lines for first grep call or similar)
    - maybe just an knowledge inbox.md to append to to not reduce cognitive load in analysing where it should go.

# 6
- remember to limit outputted lines for e.g. first grep tools or similar 
  - context is the precious resource everyone needs to protect :-)
    - this should be a general rule. if you know what the relevant sections in large files are and delegate, then communicate the area by lines in it 
    - when reading a large file be smart about it and analyse it first and try as best to only read the relevant sections. grep for keywords might even save the read.
    - m

# 7 small knowledge / use addition - or more likely do-not addition? 
- do we need explicit coding guidelines?
- The edit tool chokes on non-ASCII chars in oldString (planner working on code failed multiple times to use the code due to this an neede to write a script to replace a textstring - tool block_transfer would be a solution for this case)
  - so do not use non-ASCII chars if possible

# 8 test the block_transfer tool:
- does it acutally do what is intended?
- how to improve it to use it effectively?
  - you can freely adapt it to the need
- can it go in live usage?
- writing a usage guide and include it with usage guides to the other tools - i think best place in repo_custom_tools and instrution as other parts to read as needed?
- do what you can without approvel and for the rest make a proposal

# 9 2026-09-14-_14-38
ctx_gauge and inline tool replay gauge runs late 2 tool calls. e.g. ctx_gauge must fired 2 times to show the impact of a large context increas through e.g. reading
- the consequence is that planner and worker consistently misjugdge how close they are to the end of context window and run into the limit.
  - generally 5k lower messure of ctx_gauge
  - the more tool calls with low thinking the more exact the information

# 10 script collection
go throw the temp/opencode folder and check out all the script that were created to interact with different problems/task. e.g. db access
- create an overview of the most useful tools and make some categories to group them
- collect the best ideas and colelct scirpt (not opencode tools) in the repo for direct usage
  - e.g scirpts to intelligently interact with the DB
- create a new readme for scripts. if to many than group them in different folders with each a readme explaining their usage
- general goal is to reduce
