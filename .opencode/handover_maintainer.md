// created by the maintainer to communicate with sub-agents without direct communication channel
// async and passive - agent needs to check for changed files

# 260910-1122:
- my observation os the autonom run;
  - planner summaries only live in the session log of the lop runner - ok for getting an overview but bad for actually answering questions if not a restart is close. run tim of first planner around 2h45m, second planner 1h40m ... slept way to little xD
    - might be a good idea to instruct the looprunner to append these to an loop_log.md
  - to many changes for me to track afterward what really is happening and what the actual friction points are
  - overwriting of by handover plugin of the handover_task_to_planner file
    - intended design spec was to reduce dubling of summary as write and and last message 
      - solved by worker no doing a final summary message any longer
        - so for worker unneeded
    - honestly i do not know what the handover plugin is actually doing in its current state - need a short rundown

- need feedback collected that pertains to looprunner-planner interaction, planner-worker interaction, handover plugin, ? any more currently: friction points, what error occured or not working as exptected parts of workflow? very generic: stumbling blocks for each agent in this setting loop->planner->worker/explorer

- might be a good idea to collect handover_task and handover_task_to_planner by archiving them for a continues run
  - planner is the best place for this. access to both files, can move a copy of task_to_planner when reading was done and before starting the task the handover_task can be copied to archive.
  - loop can then write out the summary of each planner into the archive itsel?
    - (this is getting complicated with multiple places to maintain this behavior and different agents)
    - better to let planner write out his summary of his session into file
      - loop then reads it (only reference needed) and writes is out into current session as message for the running loop message log and then moves a copy into archive before starting/resuming next task or stopping
  - proposed structure folder structure .opencore/archive/autorun-<date-time>/
    - in this: 
      - ./plan<iteration_#_of_started_planner>_ho_task<running#>.md (copy of handover_task.md)
      - ./plan<iteration_#_of_started_planner>_ho_task_to_planner<running#>.md (copy of handover_task_to_planner.md)
      - ./plan<iteration_#_of_started_planner>_summary.md (copy of session summary - send as reference to loop - thus no copy action by agent loop needed - better!)
      - .maintainer_decisions_needed.md (collect all decisions in one place)
        - needed? can batch it more easily direcly in summary? but this would change the documentation of the run?
        - doubles this current file but here .opencode\handover_maintainer.md better for general information
        - agents needs to check for changes - likely via git, so when i answer in this file the agent will see it and i
  - so everything is maintained as instruction in one place - in the prompt of the planner? but he has no idea which run he currently is? the loop is the initiator. the loop needs to inform each planner what to do - so no saving in context size even if it stays as prompt in loop. so it has to be in the planner prompt. just add an simple instruction to the loop to include status information in the message when starting the agent. e.g. his own session_id, current iteration of planner, how long the last planner ran. such things: what else would the planner need? ask the planner! simple :-)
  - @planner: make a proposal for this idea, you have not do adhere to this structue and only follow the intent behind it. make it efficient and with as little friction for you as possible
    - this proposal at least includes proposed structure with reasoning and a prompt snippet
  - @planner: do we need also a folder for proposals? which one file one proposal with details to the idea and recommendated action
    - easy to decide for maintainer to just add his comments
    - only one idea per file make it easier for me the maintainer to understand and approve
    - discoverable via change of file
      - but fragil because i can not commit it without losing losing the signal function of the change
    - might be a better idea to .opencode\proposals\P<running#>_<short title of proposal content>.md (speaking file)
      - and maintainer can just comment it and move into subfolders /approved /commented /rejected
        - can be commited and an easy file search in folder is all that an agent needs to find files that needs his attention or that he can act on.

- need the check the agent_feedback ... so much.

## copied in summary by the first planner of this autonom run:

  Planner session 4 — closing report (autonomous run)

  Safety check first: clean tree at start, no interrupted worker/planner state to recover.
  Done this session (all planner-verified, final state green: probe 52/52, pytest 434/434, ruff F=0):
  1. #39 CLOSED — the Looprunner v2 smoke-test cycle ran clean (this session was the clean restart; routing + action protocol verified).
  2. T2 #30/#31 nudge ladder LANDED (70434c8, worker worker_Q4_120K via the Task tool — first real depth-2 delegation, works): per-session gauge read + v2.6 ladder (rungs 50/70/80/90/5k, per-rung dedup, promptAsync synthetic delivery, kind:"nudge" evidence only) + probe S8 (52/52). Residual: production evidence after your next restart (first kind:"nudge" line in .opencode/plugin.log).
  3. Audit 3a LANDED (66d2cd6, Q3 explorer, strict scope): TODO #42 (multi-notch wheel-delta untested — the filter pins wheel phase on single-notch equality) + TODO #43 (kb_env fixture copy-pasted across 6 files with drifted helpers). Leads (a)/(c) confirmed and folded into #41/#1 only.
  4. Audit 3b LANDED (b9c7db5, Q3 explorer): TODO #44 (stale/unknown focus name → uncaught KeyError in apply_focus_groups — config reloaded before the lookup; 3 uncaught paths incl. the win32 hot path) + extended #1 (check_for_combination is another implicit-None vk-resolution site). The 3a residual skim added nothing. The audit standing goal is now substantially complete.
  5. Housekeeping: TODO numbering → #45, NAP session-4 block, agent_feedback (2 entries: the Task-tool result channel overwrites the worker summary file post-commit — happened twice, restored both times; the session-3 NAP rewrite lost the design blocks TODO #30 referenced).

  Nudge-mechanism observation (your task): the ctx: line reached this session's first message with my own session id and no db-error → the production read + chat.message post work (reconfirms #37). The ladder is built and probed; expect its first real kind:"nudge" evidence after your next restart, in a session that crosses 50 % context. The Q3 explorer under strict scope + gauge discipline delivered verified findings twice — the scoping caution paid off.

  Maintainer decisions accumulated (bundled, by priority):
  1. #41 fix approval (recommended: singular remove_all_callback() call at fst_manager.py:578 + 2 test refs — mechanical, ready).
  2. Audit-batch fix semantics: #42 (generalize wheel gating to mouseData >> 16 magnitudes vs. keep single-notch), #43 (test-only dedup — effectively pre-approved if behavior-neutral), #42 #43 #43 #42 → #44 (stale-focus KeyError: degrade to defaults vs. user-visible error — changes observable error behavior, needs your ruling).
  3. Low-priority residuals: #40 gemma-agent rename, #34 doc refs, the #1/#7/#8/#9 behavior batch (deferred per schedule).
  Tree is clean; nothing pushed (push is yours).
  action: restart

## for me relevant: 
- nudge ladder built -> so restart opencode: done
- #41 fix: I do not know: need to check todo.md (i start to write down my thoughts like a model ... strange - but might be helpful for the model. focus!)
  - sounds ok
  - lets test fst in general first to see if it at least starts: still runs - no deeper tests done - just tested default group - tap group as expected, toast on middle click, crolling via arrow keys - i have not naga2 key right now here to test.
  - approved
- #42 explanation for you:
  - the both number 65536 131072 are most likly just a binary information in the place of a row of binaries that change exactly in 2 places
    - $\log_2(65536) = 16$
    - $\log_2(131072) = 17$
  - so the information about each direction sits on bit 16 and 17.
  - question is now what happens when any of the other bits change - then this direct compare to a number is wrong or will not trigger
  - we have to apply a binary mask or shift it to recognise it when any other bit is 1
  - when that was meant by that then is is approved. 
  - an all other places with a likewise behavior or interpretation that compare to a single bit in a series of maybe status bits it to be reported back but implicitly approved
- #44: general ruling: uncaught Errors should always be caught.
  - everything that is based on the FST_config/userconfig file should be caught, but signaled to the user with helpful information for finding the error in their config
    - these should not crash the whole program by raising exceptions up to the user but maybe a custom configErrorException that contains the reason and is raised upward until the information can be shown to the user in the cli via print or is a direct stdout possible from the caught exception? i do not know this (but open for suggestion - good place for a concrete propoal)
- #43: general ruling - everything pertaining testing is your job and as long as it does not change program behavior no maintainer involvement needed
- #40 removed the gemma model entirely from the options - switched explorer to Q3_120_MTP for the extra speed. if it fails to often make a proposal to switch to Q4 or when context is the problem and not stability then Q3_210K. might add both if need is there.
- #34 is stale and closed? why ask for decision?

@planner: so enough for now. need to go i will restart the looprunner and you can ask on this file
you are allowed to make proposals freely while you run and i can async answer them when have time.
  - proposals are now my preffered way to give you feedback so check regularly if there was a change in file location or however you decide to implement it. just create a readme for me in the folder for the convention on how to use this.

  thanks and good luck :-)


# copied in last planner run for my information and further decisions when i am available again:

Closing summary — autonomous session 5

Start state: no interrupted work (clean tree at 46c8b39, NAP current) → repo was safe.
Landed + planner-verified this session:
1. #43 kb_env consolidation (1fd669c) — six drifted fixture copies + 5 triplicated helpers consolidated into tests/conftest.py (3 verbatim variants) + tests/kb_helpers.py. Gate 434/434, ruff F=0, DoD grep clean, diff scope = tests only.
2. #3 README/WIKI rework (6c215b1 + adjacent fcc3add) — all 15 decided items (§2×5 + §4×10) reworded per the 2026-09-06 decisions, each code-verified (I spot-checked the reset path :996-1014 + WIKI lines 30/33/84/102/192-203/260 — all true). WIKI.md entered git as a new tracked file (stale wiki.md ignore entry — the maintainer removed that line himself; I recorded it in 28e1865). Entry #3 stays OPEN (residual: §3 undocumented-features docs, a separate larger task).
3. Maintainer message handled (handover_maintainer.md, left untracked as his scratch): "check the work" — done (3× consecutive green gates, scope exact, claims verified); the raw agent's 2 compactions hit only the final-message phase, committed state is complete.
4. TODO housekeeping: #45 (adjacent doc fixes) created+closed by the worker with a one-line record; #46 opened (flaky test_crossover_not_taken_on_low_roll — pre-approved test-only fix, delegation-ready as-is; my 3 consecutive green runs confirm it's intermittent).
Friction (in agent_feedback.md, 9c8b964): the first #3 launch (worker_Q4_120K) died at its first request on context_length_exceeded — opencode assumes a window far smaller than the server's 120k KV (no limit declared in opencode.jsonc); the raw agent_Q4_120K (empty prompt) worked. The summary-file collision from the Task-tool result channel happened a 4th time (restored via git checkout --).
Nudge observation (maintainer task): the ctx: line reached this session with genuine per-session values (cross-checked at 32% and 51%). This session crossed 50% without a nudge arriving — consistent with the #33 design (nudges queue as the next turn at idle; continuous tool work never idles). Final verdict point: next session's first message / a natural idle.
Stop point: 86% used, ~16.6k remaining — stop line reached; handover committed, nothing in flight.
Next session: #46 (delegation-ready from its TODO entry; launch via raw agent_Q4_120K + compact message, or add limit.context to opencode.jsonc first if the maintainer wants). Then the maintainer-call bundle (he's active — good moment): (1) #41 fix approval (recommended: singular remove_all_callback() at fst_manager.py:578 + 2 test refs — mechanical, ready); (2) #42 multi-notch wheel semantics (keep equality gating vs. generalize to magnitudes); (3) #44 stale-focus fallback (silent defaults vs. user-visible error). Plus low-priority: the #43 documented-preference note and the §3 docs task scheduling.
action: restart

- #3 §3 undocumented-features documentation: is approved 260910-1252
- go over the agent_feedback.md without changing it and create proposals for me to act on
