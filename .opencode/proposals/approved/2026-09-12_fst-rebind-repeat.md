# Proposal — FST: let repeated keys through for REBINDS (macro/toggle repeat-prevention stays)
(inbox `fst_rebind_repeat.md` — "check how much work this would be")

## Problem (verified in code, `fst_keyboard.py`)
- A real key PRESS whose press-state is already "pressed" (OS auto-repeat) is checked against
  ALL triggers (`_all_trigger_events`, lines 624–636): if it matches ANY trigger →
  `to_be_suppressed = True`. Rebind handling only runs `if not to_be_suppressed` (line 662).
- Consequence: a REBIND key does NOT auto-repeat its target key (hold the rebind key → target
  key presses once, then silence). The suppression exists for MACROS/TOGGLES (the
  `not real_input_repeated` guard at line 703, "STOP REPEATED KEYS FROM HERE") so a held
  trigger does not fire the macro repeatedly — that part is wanted and stays.
- Tap groups already let repeats through (lines 761–776, "to allow repeated keys from hold") —
  rebinding a tap-group key would be the only path where repeat works today.

## Design
- In the repeat-detection (624–636): distinguish trigger kinds. If the repeated key matches a
  REBIND trigger → do NOT set `to_be_suppressed` (let it through). It then flows into the
  existing rebind loop (665–697) → replacement key event → the macro/toggle section is skipped
  by the existing `real_input_repeated` guard (703) → **no multiple firings** → the replaced
  press is sent at 780–789 on every repeat. Release events are untouched (detection is
  press-only), so the target key release flows normally.
- Edge cases to pin with tests:
  - rebind → `SUPPRESS_CODE` (681): repeat stays suppressed (same as first press).
  - a key that is BOTH a rebind trigger and a macro trigger: first press = rebind (rebind loop
    runs first, unchanged); repeats = target-key repeats only, macro never fires.
  - a rebind-trigger key that is also in a TAP GROUP: the `trigger_key_repeated` flag (735/774)
    currently gates tap-group repeat allowance — decision needed: keep the flag set for
    rebind triggers (tap-group repeat behavior unchanged) — recommended.
  - press-state bookkeeping on repeats (694–695 `remove_key_press_state` + re-add): verify the
    target-key press-state stays consistent across repeats (set semantics make it idempotent).
- Scope: `fst_keyboard.py` only (~10–25 line diff) + pinning tests (3–5) in the keyboard-level
  test file. Gate: pytest 459 + new tests + 1 #10 warning, ruff F=0.

## Work estimate (his question)
- **Small-to-medium, ONE worker session.** Localized change in one function region, the
  mechanism already exists (trigger lists, repeat flag, guards); the risk is the edge cases
  above, which the pinning tests cover. No behavior change outside "rebind key auto-repeats
  its target key".

## Acceptance
- Holding a rebind key produces target-key auto-repeats (new pinning test simulates the
  repeat press sequence).
- Macro/toggle on a held trigger: unchanged (existing tests + the new both-triggers test).
- Full gate green.

## Status
awaiting approval (observable behavior change = maintainer-gated; approval boundary per AGENTS.md)

1. yes macro and togge repeat stay supressed. so if we have 
a : b
-b|(p("shift")) :: c
then holding a should result in repeated b, but as soon as e.g. shift is hold it would fires the macro and then it should no longer be repeating. 1 action results in one macro/toggle triggering.

--deferred until repo split into pure FST and opencode agentic part
