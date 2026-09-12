# PROPOSAL — FST behavior batch: 5 semantics decisions (2026-09-11, planner)

Oldest open work (tabled 2026-09-06..08). One ruling per item unblocks a
delegation-ready build. Details live in `TODO.md` #1/#7/#8/#9/#4+#6 —
pointers below, each with my recommendation.

## 1. #1 — unknown keys must surface to the user (RECOMMEND: build)
- **Where:** `fst_keyboard.py:146-150` (`convert_to_vk_code` numeric branch
  swallows out-of-range → implicit `None`; the `<= 0` check at ≈224 then
  crashes `TypeError`), `fst_keyboard.py:906-912` (`check_for_combination`
  silent state poisoning via `get_real_key_press_state(None)`),
  `fst_manager.py` `constraint_evaluation` (fail-closed but console-only).
- **Decision needed:** confirm the general solution shape — ONE raised,
  user-visible error at every vk-resolution site (P08-style ConfigError →
  toast/console surfacing), constraint path reusing it.
- **Recommendation:** yes — build it (latent crash + silent poisoning paths,
  high user value).

## 2. #7 — empty macro: comment vs behavior (RECOMMEND: behavior wins)
- **Where:** `fst_keyboard.py` ≈697/707 — `alias_fired = True` is set BEFORE
  the empty check, so an empty key group DOES suppress the trigger; the
  comment claims it does not.
- **Recommendation:** keep the behavior (suppression = an empty group can't
  fire a stray trigger — the safe side), reword the comment, pin the
  semantics with a test.

## 3. #8 — `ap`/`ar` "all keys incl simulated": union or last-write? (RECOMMEND: union)
- **Where:** `fst_manager.py` ≈1611-1632 — real/simulated setters both write
  the shared `_all_key_press_states_dict` last-write-wins; a release from
  either side clears `all` while the other press is still active (so `ap`
  can behave as neither real-OR-simulated); the real-setter also lacks the
  `vk_code > 0` guard the other two have.
- **Recommendation:** union semantics (real OR simulated) per the docs; fix
  the dict handling + make the guard symmetric; pin with a test.

## 4. #9 — repeat-constraint excepts too narrow (RECOMMEND: harden)
- **Where:** `fst_manager.py` ≈301-365 — `toggle_repeat`/`is_repeat_active`/
  `reset_repeat` catch `(KeyError, AttributeError)`, `stop_all_repeat` only
  `AttributeError`; a non-2-tuple entry raises uncaught `ValueError`.
- **Recommendation:** harden (add `ValueError` to the four methods + a test)
  — cheap insurance for a hot path.

## 5. #4 + #6 — dead code deletion (RECOMMEND: delete both)
- **Where:** `fst_manager.py:116-117` ("None → pass" unreachable — `None` is
  normalized to `True` upstream); `fst_keyboard.py:302-303` (mixed-Key
  rebind conversion unreachable — proven uncovered at `fffea8b`).
- **Recommendation:** delete both (they are provably unreachable; the
  triage reclassification in `COVERAGE_TRIAGE.md` is your file — I won't
  touch it).

**Acceptance (all):** your rulings recorded here; each sub-build lands
green (suite 451 + ruff F=0 at last baseline) with the pinning tests.

**Status:** awaiting maintainer rulings (batch, ≤3 items per message if you
prefer split presentation).

## 1 Recommendation (Rec) approved
## 2 Rec approved
## 3 Rec approved
## 4 Rec approved
## 5 Rec approved without removing `fst_keyboard.py:302-303` (mixed Key rebind conversion - keep this until I can test a bit more)
