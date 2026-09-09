# Worker summary — shell-doc lab (agents_repo.md `Environment & shell`) 2026-09-09

Executive summary: compacted + corrected the `Environment & shell` section of
`agents_repo.md` to its most effective form, proven by two fresh-worker
first-shot test batteries (identical 10-task T1–T10 covering pwsh + git-bash).

- Round 1 (48-line "verified 2026-09" version): 9/10 first-shot. Only trip:
  `Get-ChildItem -Name` scalar recipe lacked `-File` (dirs listed too).
- Round 2 (compact v2, 48→24 lines incl. the fix): **10/10 first-shot, zero
  retries** — every first-shot command came straight from the doc.
- Post-round-2 polish (tested facts only, no retest needed): one clause —
  `pwd -W` prints forward slashes (`C:/...`, valid Windows path).

Doc deltas vs. the committed pre-lab state:
- removed `ConvertTo-Path` (does not exist in pwsh 7.6 — verified error);
- added: alias-vs-GNU clarification, `-File -Name` idiom, NO_COLOR-useless note,
  bare-`python`=3.14-no-deps trap, `FST` trailing `\`, `pwd -W` slash note;
- dropped: sub-headers, full FST path, bash.exe full path, dated-verification
  clutter (each bullet now maps to a battery task that passed on first shot).

Verification (measured, fresh `worker_120K_mtp` sessions, docs-only context):
- R1: 9/10 first-shot (trip: T3 dirs-in-listing) → fixed via `-File`.
- R2: 10/10 first-shot, 0 retries; suite 434 passed / ruff 0 findings
  (T1/T2 ran as part of the battery, green).

Deliberately NOT done: worker's other doc suggestions (inline ruff finding count,
plain-vs-coverage test-run guidance, scratchpad dir in git-bash bullet) — those
touch the `Run / test` section / are tool-level facts already in the agent's own
tool description; left for the maintainer. Out of scope for this compaction.

Commit: this commit (agents_repo.md + TODO.md #36 + this file). No push.
