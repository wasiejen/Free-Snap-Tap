# knowledge/opencode-plugins/

Reference analysis of external opencode plugins, kept as **recipes for building our
own plugins** (problem → solution → where → working-example pointer → fit for our
stack).

- What goes here: verified maps / recipe files derived from copied plugin repos
  (currently: `auto-resume-map.md` — feature-index map of `opencode-auto-resume`,
  planner-verified; plus the deep-dive recipe files of the same plugin repo:
  `auto-resume-deepdive-A.md` (consolidated 2026-09-18, run
  `handover_task_to_planner.md`) and `auto-resume-deepdive-B.md`
  (planner-consolidated 2026-09-21 from the three complete test runs
  handovers _5 (Q3XS), _6 (Q3S — base), _7_1 (Q2S, parallel)) and `auto-resume-deepdive-C.md`
(planner-verified + vendored 2026-09-21, worker_Q3S_160K session
ses_f3e0a156bffeQYDNsR9B4AfIbb)). Source repos stay in the scratchpad; we quote, we don't vendor.
- What does NOT go here: raw plugin source code, general opencode knowledge (that is
  `knowledge_tools.md` / `knowledge_plugins.md`), unverified speculation (unverified
  findings wait in `knowledge_inbox.md`).
- Provenance rule: every file names its source repo + the verifying session/date.
