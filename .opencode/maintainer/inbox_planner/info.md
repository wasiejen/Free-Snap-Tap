# schedule a todo to add this in the prompt of the worker and planner

agents consistently run into the context limit because they will not stop despide knowing they are over 95%. they try non the less and act way to late to make a compaction
- one equalled compaction with complete restart and continuation from commit state. this is wrong assumptions. this needs to be clearer. compactin is a reduction of old history. the current messages stay intact, a summary is auto created.
- like your current worker SESSION=ses_f594ba57effeJP9cGt9BI15iDt
- tldr compaction is not BAD. it enables resuming with last messages and a summary of the history intakt. the only thing dropped are mostly read and tool calls in your history and your thinking blocks are summarised but still there. you only need to reread the dropped repo and task specific files because these are at the beginning of your context window and thus dropped.
- abouve 90% -> emergency handover and commit and self-compact if budget is available
- above 95% -> commit current status and self compact. do not deliberate if you should. as long as you have budget do it. the keepMessages parameter even lets the model choose how many of the last messages in their session are important and they will be kept completely intact

# i try to increase context limit as a test - but might increase instability of agents - needs to be observed
 - new inofficial ceiling is 145K (experimental)
  - did not restart opencode, so still 120k in setting as limit and in name of model
    - will observe what happens if they cross the line again, 

# also do not try to calc in your hand, by eye or in your head with numbers. try to use numwords instead
  - fourtyfour is as clear as 44
  - all the workers struggled with the old 94/94 line and had trouble with it ninetyfour/ninetyfour is also ok
  - maybe add <ninetyfour> to make it easier for later automatic replacement in all the files via replace
