the traded signaling words restart and resume are sometimes not intreprested correctly by the looprunner and applied wrong. for me the maintainer these 2 words are semantically extreme close and might thus also be for the looprunner
- change the exchanged code words to 2 ver destinct and clear words that:
  - signal to start the task with the old task_id and thus continue the same planner again
    - --planner: if you are started again, do not advance your interation number
    - if their is a summary already there and the repo is in a safe state then end your session with request for a new sesseion with new task id
  - signal to start an antirely new session with a new task_id and thus new planner (default)
    - only advance iteration number on this (looprunner instruction)
- create a proposal that makes this signal trading safe and clear for both sides
  - if the ending signal is not appended by the planner, fall back to default (could be a consequence oflikely compaction)

if the iteration number of looprunner and planner are not the same their has to be a clear path of resolving it. e.g. keep the bigger number, to not overwrite autorun handover files. this has to be clear to both. the planner can directly communicat with the loopruner via his closing message and the looprunner via session start message.
- make it clear who is the intendec recipient.
  - everything not "--main"/"--maintainer" prefixed is implicitly clear who is the source so both can you the same prefix to adress each other directly
    - "--request" and then they can communicate e.g. interation number or correction to each other
