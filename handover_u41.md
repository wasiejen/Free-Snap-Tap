# U41 — Free-Snap-Tap test gate (publish-readiness evidence)

Date: 2026-10-29. Branch: `fst_work3`. Worker: worker_FlashNext.

## G1 — Suite run

Command: `.venv/Scripts/python.exe -m pytest tests -q`
(`--timeout=120` dropped: `pytest-timeout` is not installed in `.venv`; no `-x` used.)

Result: **474 passed, 0 failed, 0 skipped in 2.07s**.
1 warning: `RuntimeWarning: coroutine 'Output_Manager.execute_key_event' was never awaited`
raised from `tests/test_extraction_filter_edges.py::TestFilterEdges::test_mouse_rebind_schedule_error_is_logged`
via `fst_keyboard.py:799` (error-logging path intentionally drops the coroutine; cosmetic warning only).

No hang observed — no input-path test needed exclusion. Full output:
`%TEMP%/opencode/u41_suite_full.txt` (scratch, outside repo).

## G2 — Failure classification

None. No fixes needed, no fixes committed.

## G3/G4 — Summary + tree state

This file is the summary, committed at the repo root.

`git log --oneline -3` after the final commit:

```text
HEAD U41: test-gate summary - 474 passed, 0 failed on fst_work3
cd0f3a2 #131: error-documentation fixes - check_result restored, config/eval errors logged to file
cac6704 #131: per-flag dispositions - ~80 print sites converted to area-loggers, DEBUG1-3 flags die
```
