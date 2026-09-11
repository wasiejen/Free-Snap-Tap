# EXECUTIVE SUMMARY — TODO #48: mouse filter packed-word equality → bit tests

**Outcome:** DONE — both packed-word equality sites in
`FST_Keyboard.mouse_win32_event_filter` replaced with bit tests per the #42
ruling; 3 new tests pin the invariants; gate green; #48 closed.

## What changed
- `fst_keyboard.py` — mouse `is_simulated_key_event`: `flags == 1` →
  `bool(flags & 1)` (bit 0 = injected; other LLKHF status bits must not matter;
  explicit `bool` keeps the `assert_called_with(…, True/False, …)` pins exact).
- `fst_keyboard.py` — X-button vk mapping (msg 523/524):
  `data.mouseData == 65536/131072` → `(data.mouseData >> 16) == 1` → vk 4,
  `== 2` → vk 5 (identifier = high word; the key-state low word is ignored —
  mirrors the #42 wheel idiom `bool((data.mouseData >> 16) & 0x8000)`). One
  comment added at the site; the `:451-453` doc block left as-is (still accurate
  — it documents the high-word identifiers).
- `tests/test_filter_behavior.py::TestMouseWin32Filter` — 3 new tests:
  - `test_x_buttons_ignores_key_state_low_word` — x1 down (523) / x1 up (524)
    with nonzero low words (`65536 | 0x0010`, `65536 | 0x0101`) → vk 4;
    x2 down `131072 | 0x0101` → vk 5.
  - `test_x_button_other_identifier_suppresses` — x3 identifier (`196608`)
    resolves no vk → `_mouse_listener.suppress_event()` (unchanged behavior,
    regression guard).
  - `test_simulated_flag_bit0_only` — flags `1` and `0x21` classify simulated;
    flags `0` and `0x20` classify real.
- Existing `test_x_buttons_use_mousedata_for_vk` (zero low word) and
  `test_simulated_flag_passthrough` UNCHANGED and green.
- `TODO.md` — #48 collapsed to the one-line close
  `(closed 2026-09-11, first commit after 00bc24f, see todo_records.md)`.
- `todo_records.md` — full #48 record appended (evidence moved verbatim +
  status tail with the measured gate).

## Verification (measured)
- Baseline BEFORE changes: `& .\.venv\Scripts\python.exe -m pytest -q` =
  **448 passed, 1 warning** (the known #10 coroutine warning) — matches the
  task's stated baseline.
- AFTER changes, same command: **451 passed, 1 warning** (448 + 3 new tests;
  same single #10 warning).
- Filter file alone: `pytest tests/test_filter_behavior.py -q` = 43 passed.
- `& .\.venv\Scripts\ruff.exe check --select F .` = **0 findings**.
- `git show --stat` scope of the landing commit = exactly 5 files:
  `fst_keyboard.py`, `tests/test_filter_behavior.py`, `TODO.md`,
  `todo_records.md`, this summary. `opencode.jsonc` NOT staged.

## Commit
- ONE commit: subject **"Mouse filter: packed-word equality → bit tests
  (TODO #48)"**, the first commit after `00bc24f` (verify with
  `git log --oneline 00bc24f..HEAD`).
- NOTE (DoD deviation, flagged): the DoD asked for the commit hash in this
  summary, but a commit cannot contain its own hash (self-referential SHA-1 is
  infeasible — the hash covers the tree that would hold the hash). Per the
  repo convention (cf. the #42/#47 status tails, which cite gate + subject,
  not self-hashes), the commit is cited by date + parent + unique subject.

## TODO entries
- #48 CLOSED (one-line in `TODO.md`; full record in `todo_records.md`).
- No new entries appended; `todo_inbox.md` untouched (no out-of-scope findings
  — the `playground/pynput_mouse_probe.py` duplicate was correctly left out of
  scope per the task, and the filter's other paths are already bit-tested /
  packed-word-free).

## Deliberately NOT done
- `playground/pynput_mouse_probe.py` untouched (maintainer's personal probe —
  out of scope per the task).
- No docs changes (WIKI/README do not document these modifier edges).
- No other filter changes (wheel path already bit-tested by #42; plain-button
  paths have no packed word).
- No live listeners / no real keyboard-mouse; all tests run against the
  mocked `kb_env_ns` fixture.
- The `:451-453` doc comment block was left verbatim (still accurate after the
  change — minimal-diff choice, flagged here in case the planner wants it
  reworded).
