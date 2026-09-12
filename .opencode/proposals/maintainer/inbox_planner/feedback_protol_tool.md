#1:deferred:do_later
- the feedback protokol might not work right now due to instruction of early closing to prevent context_limit violations and thus this optional feedback is discarded
  - should make it a nonoptional part of the close down phase (directly before closing message)
  - feedback should be with full date_time
  - to remove friction in doing it and need to look up date might be best to just write a small tool for this, then there is not file interation with the agent_feedback file and accidental reading
- make a proposal
