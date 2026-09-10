# TASK — #43: consolidate the kb_env fixtures + shared helpers into ONE location

FIRST read `AGENTS.md`, `agents_repo.md`, this file, and TODO.md entry #43.
Repo root = the directory containing `agents_repo.md`.

## Goal
`tests/conftest.py` becomes the single home for the `kb_env`-class fixtures and
the config-build / filter-event helpers, so a fixture bug fix is applied ONCE
instead of 6×. Pure test refactor — **no observable behavior change, no
production code touched**.

## What exists today (verified 2026-09-10)
Three drifted shape-classes of a `kb_env` fixture, six copies:
- **A** (yields `SimpleNamespace(kb, kb_mock, mouse_mock)`; pre-sets
  `WIN32_FILTER_PAUSED=False`, `ACT_DELAY=False`, `ACT_CROSSOVER=False`; NO
  `_mouse_listener`): `tests/test_filter_behavior.py:26-41`,
  `tests/test_extraction_filter_edges.py:25-40`.
- **B** (yields the raw `keyboard`; pre-sets the same three flags AND
  `_mouse_listener`): `tests/test_filter_simulated.py:22-38`.
- **C** (yields the raw `keyboard`; `_listener` + `_mouse_listener` mocked; NO
  arg flags): `tests/test_control_actions.py:16-29`,
  `tests/test_macro_playback_kbd.py:17-30`,
  `tests/test_facade_wiring.py:14-27`.
Helpers triplicated/duplicated: `build(kb, rebinds=None, macros=None, taps=None,
aliases=None)` at `test_filter_behavior.py:44`, `test_extraction_filter_edges.py:43`,
`test_filter_simulated.py:41`; `down(kb, vk, t)` / `up(kb, vk, t)` at
`test_filter_behavior.py:59/63` (+ a `down` at `test_extraction_filter_edges.py:52`);
`hold_keys(kb, *vks)` / `mock_control_handlers(kb)` at `test_filter_behavior.py:290/295`.

## Design (suggested — refine if you find a cleaner shape, but keep the invariants)
1. New module `tests/kb_helpers.py` (or similar name) holding the plain
   FUNCTIONS `build`, `down`, `up`, `hold_keys`, `mock_control_handlers` —
   defined ONCE, byte-identical to the current implementations. Test files
   import them (`from kb_helpers import build, down, up` — the conftest already
   puts the project root on `sys.path`; check whether `tests/` itself lands on
   the import path for plain sibling imports, and if not, do the minimal
   sys.path tweak in `tests/conftest.py`).
2. `tests/conftest.py` holds the THREE fixture variants, defined once each, with
   stable names (e.g. `kb_env_ns` for A, `kb_env_mouse` for B, `kb_env_plain`
   for C — your naming call). Each is a verbatim move of the corresponding
   current body (A yields the SimpleNamespace with the mocks so tests keep
   referencing `kb_env.kb` / `kb_mock` / `mouse_mock`).
3. The six files delete their local `def kb_env` + local helper copies; test
   signatures take the matching conftest fixture name instead (e.g. a class-A
   test's `(self, kb_env)` → `(self, kb_env_ns)`), and where the test body then
   references `kb_env.kb` etc., update to the new binding. **Behavior of every
   existing test must be byte-identical** — same mocks, same flags, same teardown.

## Invariants (hard rules)
- Production files (`*.py` at repo root, `playground/`) are READ-ONLY for you.
- Do NOT touch `FakeFST` / `restore_constants` / `fake_fst` /
  `mock_pynput_controllers` in conftest (other entries own them — #41 especially).
- Do NOT change any test's assertions, names, count, or order.
- Do NOT touch `TODO.md` numbering; you will only append the #43 status tail.
- If the `from kb_helpers import ...` shape fights pytest's import mode, the
  alternative is defining the helpers inside `conftest.py` and having the test
  files grab them via a conftest import — your call, document it in the summary.

## Definition of done + verification
1. `& .\.venv\Scripts\python.exe -m pytest -q` → **434 passed** (count
   unchanged, zero failed/skipped changes), no warnings new vs. the single
   known `#10` profile warning.
2. `& .\.venv\Scripts\ruff.exe check --select F .` → F = 0.
3. No local `def kb_env`, `def build`, `def down`, `def up`, `def hold_keys`,
   `def mock_control_handlers` remains in any of the six files (verify by grep).
4. `git diff --stat` touches ONLY: `tests/conftest.py`, the new helper module,
   the six test files, `TODO.md`, the handover files.

## TODO + commit (per AGENTS.md)
- Append a status tail to TODO.md #43: "LANDED (date): one-line description +
  the chosen shape + verification numbers". Do NOT close the entry (the
  maintainer's documented-preference note stays his; landing the entry's stated
  outcome is done when DoD holds).
- Commit code + TODO.md + `.opencode/handover_task_to_planner.md` (your
  EXECUTIVE SUMMARY — write it there AND return it as your final message):
  what changed, the shape chosen, measured verification (pytest/ruff output
  lines), commit hash, deviations, what you deliberately did NOT do.
- End with your verbatim self-gauge line (`node .opencode\ctxgauge\peek.mjs`).

## Approval boundary
- Pre-approved: everything above (tests-only, behavior-neutral).
- STOP and flag in the summary (do not decide): any need to touch production
  code, any test that cannot be moved behavior-identically (report which + why),
  any conftest fixture beyond the three variants needing changes.

## Context discipline
- These are all small files (< 600 lines). Full reads of the six files +
  conftest are fine. Check the gauge between the conftest write and the final
  verification; if REM ≤ 20k, finish the commit routine and stop at a clean
  committed point, noting the remainder.
