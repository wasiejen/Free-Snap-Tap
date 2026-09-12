# loop/ — the CURRENT looprun (one dated folder at a time)

Purpose: bookkeeping of the autonomous loop's current run, in
`loop/autorun-<YYYY-MM-DD_HH-MM>/` (folder name machine-generated):
`loop_log.md` (the append-only event log) + `plan<N>_ho_task.md` /
`plan<N>_ho_task_to_planner.md` (spec/summary copies per delegation) +
`plan<N>_summary.md`. The planner keeps it current per `agent_readme_loop.md`.
At iteration-1 rollover the whole folder moves to `archive/loop/` (frozen).
The `.gitkeep` keeps the folder in git between loopruns.
