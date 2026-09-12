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

# 1 compact_memory plugin that also exposes a tool 
  - agents need the ability to self compact if context limit is too small
  - add a differiating on allowed compacts per session_id for models based on its quant
    - CPU models excluded from compaction for now
    - pattern for Qwen3.8 models
      - quant 4 models allowed to compact 3 times 
        - IQ4 or Q4 notation in name
      - quant 3 models only 1 time (or may be excluded in future)
        - IQ3 or Q3 notation in name
    - for all other models for now allow 1 compaction prelimiary
  - important is to get the tool working to enabled longer unsupervised runs - compact_memory tool as priority to emergency plugin function right now
  - let us include an optional field for direct instruction after compaction - this will replace the default set message and may include more specific instructions what files to load back into context. e.g. explude nap or only read nap line 500-600, so preserve context window.

# 2
- when compact_memory tool works need a guideline for its usage. e.g. in readme_compact_memory.md and to read as needed?
  - or replace/add/rewrite the direct threadhold section in the agent prompts to enable compacting and know what that means and its limited application enforced by the tool 
  - does compacting currently have a return value to signal the number of compactions to the sesseion it has compacted? maybe with a reference to the max allowed compaction for its model: e.g. COMPACTION: 2/3 ...
    - needed for agents to help identify their last run
  - need to define if an emergency compaction can extend the max compaction?


# 3
- nap size reduction


# smoke harness and all the files that are needed to test the plugins and tools should be saved in the repo.
  - just read the comment from a worker that is only lives in the scatchpad - mind have been my decision but it extended in scope it is an acnhor of functionality.
  - make a proposal to save them in a good place in the repo (plugin|tools/tests?) and rewire as needed.
    - the files should be easily attributable to the tested tools - so same name convention
    - on shared code create a base testing file (choose appropiate name - just an example)

# 4
- small addition to the planner prompt for a ready made grep command to find maintainer attention markers in repo
  - planner often tries mutliple times to discover discepencies in the command formulation
  - connected to # 7

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

# 7 make a collection of ready made grep snippets (or other tools to navigate, find string, in files and folders)
- for easier reference and less testing out the specific parameters
