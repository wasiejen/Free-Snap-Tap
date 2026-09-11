# PROPOSAL — #11 contradiction block: final decision (2026-09-11, planner)

HOLDING since 2026-09-08 on your LIVE test — the `XXX 241016-1101` pin at
`fst_keyboard.py` ≈791 is your find-marker (I will not remove or reword it
on your behalf).

**State:** the 793-803 contradiction block of `_win32_event_filter` no
longer suppresses (`to_be_suppressed` is not set); the Phase-5 tests
(`tests/test_filter_simulated.py`) now PIN the non-suppression behavior.

**Options:**
- **A. Keep OFF, make it a documented decision** (RECOMMENDED if the live
  test is done): reword the "disabled to test" comment into an intentional-
  decision line (the `XXX 241016-1101` marker stays, I only change the
  "to test" wording), keep the tests as the semantic pin, close #11.
- **B. Re-enable:** the block starts suppressing again — the pinning tests
  flip, and the hot-path behavior changes (needs a re-test pass).

**Recommendation:** A — the non-suppression has been the live behavior
throughout the test era and the tests pin it; if you ever want it back it
is a one-line flip.

**Acceptance:** your choice recorded; A → comment reworded (marker
untouched) + #11 closed; B → block restored + tests re-pinned + suite
green.

**Status:** awaiting maintainer ruling (your live test is the deciding
input).
