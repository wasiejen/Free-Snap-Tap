# Worker summary — #43: consolidate the kb_env fixtures + shared helpers into ONE location

## What changed
- **NEW `tests/kb_helpers.py`** — plain functions `build`, `down`, `up`,
  `hold_keys`, `mock_control_handlers`, each a byte-identical move of the current
  implementations (the three `build` copies were already identical; only
  `unittest.mock.MagicMock` needed importing for `mock_control_handlers`).
- **`tests/conftest.py`** — added `from fst_keyboard import FST_Keyboard` (same
  `noqa: E402` style as the neighboring imports) and the THREE fixture variants,
  each a verbatim body move with a docstring recording its shape:
  - `kb_env_ns` (shape A): yields `SimpleNamespace(kb, kb_mock, mouse_mock)`,
    `_listener` mocked, arg flags pre-set `WIN32_FILTER_PAUSED/ACT_DELAY/
    ACT_CROSSOVER=False`, NO `_mouse_listener`. Was in
    `test_filter_behavior.py` + `test_extraction_filter_edges.py`.
  - `kb_env_mouse` (shape B): yields the raw `keyboard`, `_listener` AND
    `_mouse_listener` mocked, same three arg flags pre-set. Was in
    `test_filter_simulated.py`.
  - `kb_env_plain` (shape C): yields the raw `keyboard`, `_listener` +
    `_mouse_listener` mocked, NO arg flags. Was in `test_control_actions.py`,
    `test_macro_playback_kbd.py`, `test_facade_wiring.py`.
  - Untouched, as required: `FakeFST`, `restore_constants`, `fake_fst`,
    `mock_pynput_controllers`.
- **The six test files** — deleted the local `def kb_env` + local helper copies
  (`build`/`down`/`up`/`hold_keys`/`mock_control_handlers` per file), re-bound
  every test signature + body reference to the new conftest fixture name
  (`kb_env` → `kb_env_ns` / `kb_env_mouse` / `kb_env_plain`), and removed the
  imports the local fixture had made necessary (per file: `pytest` —
  test_filter_simulated + test_control_actions; `FST_Keyboard` — test_filter_
  simulated, test_control_actions, test_macro_playback_kbd, test_facade_wiring;
  `MagicMock` — test_macro_playback_kbd, test_facade_wiring; `SimpleNamespace` —
  test_extraction_filter_edges). `tests/test_facade_wiring.py::facade_kb`
  (a fixture, kept in the file) now takes `kb_env_plain`.

## Shape chosen + why
Spec design 1+2 exactly: helpers in `tests/kb_helpers.py`, fixtures in conftest.
Sibling import `from kb_helpers import ...` works WITHOUT any sys.path tweak:
`tests/` has no `__init__.py` and pytest.ini sets no import mode, so pytest's
default **prepend** mode inserts `tests/` on `sys.path` when each test module is
imported (verified by a green full-suite run). No conftest sys.path change was
needed. Fixture names taken from the spec's suggestion (`kb_env_ns` /
`kb_env_mouse` / `kb_env_plain`).

## Verification (measured, verbatim)
- Pre-change baseline: `pytest -q` → `434 passed, 1 warning in 2.08s`;
  `ruff check --select F .` → `All checks passed!` (0 findings).
- Post-change: `& .\.venv\Scripts\python.exe -m pytest -q` →
  **`434 passed, 1 warning in 2.05s`** — same count, same single warning (the
  known #10 awaited-coro `RuntimeWarning` in
  `test_extraction_filter_edges.py::TestFilterEdges::
  test_mouse_rebind_schedule_error_is_logged`), zero failed/skipped changes.
- `& .\.venv\Scripts\ruff.exe check --select F .` → **`All checks passed!`** (F = 0).
- DoD grep: no `def kb_env`, `def build`, `def down`, `def up`, `def hold_keys`,
  `def mock_control_handlers` remains in any of the six files (script-verified:
  per-file new-name occurrence count = original `kb_env` count − 1, i.e. exactly
  the deleted `def kb_env(` line; no stray rename tokens).
- `git diff --stat` touches ONLY: `tests/conftest.py`, `tests/kb_helpers.py`
  (new), the six test files (+ `TODO.md` + this summary in the commit).

## Commit
Code + `TODO.md` (#43 status tail, entry NOT closed — the documented-preference
note stays the maintainer's) + this summary file, one commit. No push.
HASH: `1fd669c` — "Consolidate kb_env fixtures + helpers into conftest + kb_helpers (#43)"
(10 files changed, 379 insertions(+), 440 deletions(-)).

## Deliberately NOT done
- Did NOT close TODO #43 (spec: status tail only; the MAINTAINER NOTE on
  per-file-fixture preference stays open for the maintainer's call).
- Did NOT unify the three fixture shapes into one (the variants' differences —
  SimpleNamespace vs. raw yield, `_mouse_listener`, arg-flag pre-sets — are
  preserved verbatim; that unification is the maintainer's documented-preference
  territory per #43's MAINTAINER NOTE).
- No production code touched (tests-only, per the hard rules).

## Deviations / notes
- None from the suggested design. One mechanical note: per-file whole-word
  renames were done as a two-stage token replacement to keep the edit exact;
  in `test_facade_wiring.py` the already-renamed `facade_kb(kb_env_plain, ...)`
  parameter contains `kb_env` as a substring — caught and corrected, final
  state verified by the occurrence-count script above.
- Local helpers `base_events`, `kb_msg_data`, `mouse_msg_data` are NOT in the
  spec's helper list and stay in their files (single-use or file-specific).

## TODO entries recorded
- Appended the #43 status tail (LANDED 2026-09-10 + shape + verification
  numbers). No new TODO entries — the refactor surfaced no new discrepancies.

## Final gauge (verbatim — actually run)
SESSION=ses_f75cdf7d4ffeHi0ELJg1EZeqsY CTX=71353 (59%) REM=48647
