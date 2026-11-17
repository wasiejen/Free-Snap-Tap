# Tests - how to run them, and the one hazard to know

## The gate command (use this)

```bash
.venv/Scripts/python.exe suite_lane.py
```

Exit code 0 means green. The runner collects once, splits `tests/test_*.py`
into chunks of about 350 tests (in pytest's own order), runs each chunk in its
own process, and prints one line per chunk plus an aggregate. Typical output
(measured 5 consecutive runs at the ABORT2 review-fix tip, all exit 0; the
numbers move as the suite grows, and `suite_lane.py --list` prints the plan
without running anything):

```
chunk 1/3 (359 tests): exit=0 ok: 358 passed, 1 skipped in 1.55s
chunk 2/3 (431 tests): exit=0 ok: 431 passed, 3 warnings in 3.91s
chunk 3/3 (307 tests): exit=0 ok: 306 passed, 1 xfailed, 2 warnings in 3.10s
lane: 3 chunks, 3 ok, 0 failed
```

That is **1095 passed, 1 skipped, 1 xfailed**. The planned `(N tests)` figure
comes from a real collection pass and matches what the chunk runs - pytest's
per-file header line is never counted as a test (pinned).

The lane fails the run on any chunk that fails, aborts, collects nothing
(pytest exit 5) or times out; if the collection pass itself fails it refuses to
plan chunks at all (exit 2), because the fallback - one chunk holding every
file - is exactly the known-fatal single-process run. Collection runs under the
same `QT_QPA_PLATFORM` as the chunks.

A single file or a single directory works exactly as before for focused work:
`.venv/Scripts/python.exe -m pytest tests/test_foo.py -q`.

`QT_QPA_PLATFORM=offscreen` is set by the lane for every chunk; set it yourself
for manual single-file runs (the widget tests need it on a headless session).

## Why not one `pytest -q` run (the ABORT2 record, 2026-11-17)

One single-process run of the whole suite **aborts the Python process natively**
before printing a summary. This is the F-B8 hazard class (upstream Qt/shiboken,
see the `F-B8 suite-abort guard` block in `tests/conftest.py`), re-measured in
full on tip `e2c9e02`. Everything below was measured on that tip, not inferred.

Environment: Python 3.12.9, PySide6 6.11.2, shiboken6 6.11.2, pytest 9.1.1,
pytest-qt 4.5.0, Windows 11, `QT_QPA_PLATFORM=offscreen`.

What the abort looks like:

- `Fatal Python error: Aborted`, exit code 3; one run in eight died as
  SIGSEGV (exit `3221225477`) with no dump body.
- Position is now **deterministic**: 8 of 8 runs died at `[ 92%]`.
- Stack (current thread), 8/8 identical:
  `pytestqt/qt_compat.py:160 exec` <- `pytestqt/wait_signal.py:58 wait` <-
  `pytestqt/qtbot.py:503 wait` <- `tests/test_tray_icon.py:18 in tray` <-
  `_pytest/fixtures.py:1014 _teardown_yield_fixture`. That is the `tray`
  fixture's teardown: `deleteLater()` then `qtbot.wait(50)`, i.e. a deferred
  C++ delete destroyed inside a nested `QEventLoop`, with the whole session's
  Qt object graph alive behind it.
- No test failed: 1024+ tests passed in the aborted runs; the process, not a
  test, is what dies.

What does NOT fix it (each measured, not reasoned):

| probe | result |
|---|---|
| 8 x full single-process run at the tip | 8/8 abort at 92% |
| `tray` fixture without the `qtbot.wait` pump | 1/2 runs printed the full green 1082 summary and then died anyway |
| `tray` fixture with `dispose()` instead of `deleteLater` + wait | 2/2 abort |
| `tray` fixture with an empty teardown | 1/2 printed green, then died |
| F-B8 guard's session-finish `gc.collect()` removed | 4/4 abort |
| that sweep narrowed to gen-0 only | 4/4 abort |
| that sweep moved to `pytest_unconfigure` | 4/4 abort |

Measured conclusions: the tray teardown is where the death becomes visible,
not the cause (empty-teardown and no-pump variants still die, sometimes after
the green summary), and the guard's session-finish sweep is not the cause
either (removed, narrowed, and relocated all still abort).

What is INFERRED, and labelled as such: the mechanism is most likely the
session-wide Qt object graph being destroyed while Qt frames are live
(pytest-qt 4.5 pumps the event loop at five sites per test and runs nested
loops in `wait()`). Two levers were probed - the tray fixture and the
session-finish sweep. Others were NOT (for example a conftest-level
QApplication lifetime change), so "unfixable from in here" is scoped honestly
to: not fixable through the levers measured, and not the guard's fault. What
is measured regardless of mechanism: sessions with a smaller Qt graph do not
die - every single module, both alphabetical halves, and all three lane chunks
are reliably green.

What DOES work, measured:

- alphabetical halves (`tests/test_[a-i]*.py`, `tests/test_[j-z]*.py`): green
  repeatedly across units (681 + 401 tests), zero aborts.
- the lane above, 3 chunks: **5 consecutive lane runs, 5/5 exit 0**
  (1082 passed, 1 skipped, 1 xfailed each time).

Minimality status (why there is no 2-file upstream repro yet): the abort is
NOT reproducible by any pair. Every other test module in the suite was run
beside `tests/test_tray_icon.py`, one at a time - **63/63 probes green** (36 in
the alphabetical range `[a-i]` first, the remaining 27 afterwards, so the sweep
is exhaustive, not a sample). Yet run-order modules 1..58 plus the tray module
do abort (`prefix=58` green with 1056 passed, `prefix=59` aborts). So the
lethal condition is cumulative in the Qt graph, not a pair, and no minimal
pair exists to report. A ddmin shrink over the file set reached about 20-22
modules before its driver stalled on a wedged child (see the process-safety
rule in `suite_lane.py`); resuming that minimization is the next step if an
upstream report is ever filed.

What already exists upstream-side: the F-B8 unit recorded ITS repro recipe in
the estate inbox (`tests/conftest.py` says "repro recorded via todo_inbox
2026-11-16") for the GC-during-Qt-event-window class. **No issue has been
filed with PySide6 or shiboken6** - neither for that class nor for this
graph-teardown variant, which this record covers.

Reproduce it yourself:

```bash
# the abort (expect: Fatal Python error: Aborted, no summary, exit 3)
QT_QPA_PLATFORM=offscreen ./.venv/Scripts/python.exe -m pytest -q -p no:cacheprovider
# the green gate (expect: exit 0, 3 chunks)
QT_QPA_PLATFORM=offscreen ./.venv/Scripts/python.exe suite_lane.py
```

## Scope of the F-B8 guard (do not delete it over this)

`tests/conftest.py` disables automatic GC for the run and sweeps at safe
points. ABORT2 measured that it does **not** prevent the abort recorded above
(falsified above by removing, narrowing, and relocating its sweep). It does
prevent the class it was built for: a GC sweep landing inside a Qt event
window, which the F-B8 unit discriminated at 6/6 pre-guard aborts. Keep it;
`tests/test_suite_gc_pin.py` and `tests/test_suite_lane.py` both pin it in
place.

## Process safety rule for any suite tooling you add

Kill only processes you spawned, through your own handle, under a timeout.
Never kill by image name and never kill a PID you did not create - on this
machine that is how a maintainer's inference backend got killed during
ABORT2's forensics. `tests/test_suite_lane.py` pins the rule for the lane
runner.
