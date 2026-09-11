# repo_testgate.md — test gate part of `agents_repo.md` (split 2026-09-11)

Sections moved verbatim from the root `agents_repo.md`; the root file is now a
thin index pointing at the parts.

## Safety limits (repo-specific)
- **Never run the live listeners in tests.** Always mock pynput controllers
  (mocked-`FakeFST` pattern in `tests/conftest.py`). This is the live/destructive
  probe restriction referenced from `AGENTS.md` — live listeners are not
  permitted unless explicitly requested by the maintainer.

## Test conventions
- Tests live in `tests/`: pure unit scope + offscreen GUI (pytest-qt 4.5.0,
  `QT_QPA_PLATFORM=offscreen` pinned in `tests/conftest.py`). No real keyboard,
  no real time, no Windows APIs.
- Desired-but-not-yet-true behavior goes into a dedicated **xfail** file (the
  original `tests/test_known_issues.py` is fully resolved/accepted and no longer
  exists — recreate the pattern if needed). When a fix lands, move the test into
  a normal file and keep it green.
- Suite size is a moving baseline — see `.opencode/handover/handover_planner.md`
  for the current expected count. Do not hard-code test-count assumptions here.
