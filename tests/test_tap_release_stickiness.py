"""Stuck-release xfail pin (U301, #291).

Maintainer real-keyboard analysis 2026-11-02
(maintainer/done/fst_tap_hardening.md): on real keyboards the FIRST key
stops emitting its auto-repeat signal as soon as the second tap-group key
goes down (tested with FST off) - the repeat-signal premise of the removed
2026-10-31 tap-reconcile hardening has NO real-keyboard signal, so that
hardening never fired. The stuck key class is a dropped-release-event issue:
cause hunt = evidence map + hypothesis list in
`projects/Free-Snap-Tap/handover_u301.md` (estate).

This file pins the DESIRED end behavior as xfail (documented, NOT
green-forcing): a tap key whose real release event was dropped must not
keep emitting. The mocked harness (kb_env_ns / FakeFST, no live listeners -
gate rule) cannot observe any real-keyboard repeat signal at all, so the
pin is xfail BY DESIGN; the fix and its hardware acceptance are
pending-maintainer (#291).
"""
import pytest
from unittest.mock import call
from pynput import keyboard as pynput_keyboard

from kb_helpers import build, down, up
from vk_codes import vk_codes_dict

VK_A = vk_codes_dict['a']
VK_B = vk_codes_dict['b']


@pytest.mark.xfail(
    strict=False,
    reason="hardening premise falsified on real keyboards (maintainer "
           "2026-11-02): no repeat signal exists to heal, and the mocked "
           "harness can never carry one; dropped-release healing requires "
           "the cause fix (hypotheses H1-H5, handover_u301.md) - "
           "pending-maintainer hardware acceptance (#291)",
)
def test_dropped_release_must_not_keep_key_emitting(kb_env_ns):
    """Real-keyboard scenario scripted (maintainer observation): hold a+b,
    b's release is dropped - on a real keyboard no repeat-down of b ever
    follows (the first key's repeat stopped when b went down). Desired: the
    released b must never keep emitting. Current (post-reversal) event-stream
    behavior: b stays pressed=1 and each a-cycle re-presses b - the stuck
    alternating cycle the maintainer reported."""
    kb = kb_env_ns.kb
    kb_mock = kb_env_ns.kb_mock
    build(kb, taps=[['(TAP_1)', ['a', 'b']]])
    down(kb, VK_A, 1000)
    down(kb, VK_B, 2000)
    up(kb, VK_A, 3000)  # b's real release never arrives (dropped event)

    tg = kb._tap_groups[0]
    # desired: a physically released key is not active and emits no more
    assert tg.get_states()[VK_B] == 0
    assert tg.get_active_key() is None

    code = pynput_keyboard.KeyCode.from_vk
    # re-releasing a must not re-press the already-released b: b is pressed
    # exactly once (its tap idealization when b went down); the stuck cycle
    # re-presses it on every a-cycle (maintainer symptom)
    presses_b = [c for c in kb_mock.method_calls
                 if c == call.press(code(VK_B))]
    assert len(presses_b) == 1
