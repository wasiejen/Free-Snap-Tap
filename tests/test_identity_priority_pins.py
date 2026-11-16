"""F-B1 CHARACTERIZATION pins: who wins when two triggers match one keypress.

D1 ruling (estate proposals/2026-11-15_fst-improvement-plan.md, Decisions
RULED): trigger identity = (vk_code, is_press, constraints); "priority among
multiple simultaneously-matching triggers stays as current dict/presort order
behaves - pin behavior BEFORE touching". These pins lock the current dict-
insertion/scan-order behavior of the rebind and macro lanes; they are green
on the repr-string identity and MUST stay green through the typed-identity
conversion (the suite plus these pins are the firing-order preservation proof).

Lane facts pinned here:
- identical trigger groups (same repr identity): ONE dict entry, last written
  payload wins, at the FIRST occurrence position in the trigger list.
- same (vk, press) with different constraint payloads: distinct entries, both
  stay candidates; the FIRST scan position whose group activates wins (rebinds
  break on the first activation; macros all fire in list order).
- _rebind_repeat_let_through inspects the FIRST base-matching trigger only.
"""
from pynput import keyboard as pynput_keyboard

from fst_keyboard import FST_Keyboard

from kb_helpers import build, down, hold_keys

VK_A = 0x41
VK_B = 0x42
VK_C = 0x43
VK_SHIFT = 160
VK_CTRL = 162  # vk_codes_dict['ctrl'] (generic control, not the 17 LCTRL code)


def recorded_playbacks(monkeypatch):
    '''Patch macro playback to record (alias, [vk_code, ...]) per fired macro,
    in scan order, without spawning playback tasks.'''
    fired = []
    monkeypatch.setattr(
        FST_Keyboard, 'start_macro_playback',
        lambda self, alias, seq: fired.append((alias, [ke.vk_code for ke in seq])))
    return fired


class TestRebindWhoWins:
    def test_identical_trigger_last_written_payload_wins(self, kb_env_ns):
        # Two lines, byte-identical trigger: one dict entry (last write wins),
        # one scan position; the LATER line's replacement fires.
        kb = kb_env_ns.kb
        build(kb, rebinds=[['(r1)', [['a'], 'b']],
                           ['(r2)', [['a'], 'c']]])
        assert len(kb._runtime.rebinds_dict) == 2  # press + release variants
        assert len(kb._runtime.rebind_triggers) == 2
        down(kb, VK_A, 1000)
        kb_env_ns.kb_mock.press.assert_called_once_with(
            pynput_keyboard.KeyCode.from_vk(VK_C))

    def test_different_constraints_first_listed_variant_wins(self, kb_env_ns):
        # Same (vk, press), different constraint payload: distinct triggers,
        # both candidates; the scan reaches r1 first and it activates.
        kb = kb_env_ns.kb
        build(kb, rebinds=[['(r1)', [['a|200'], 'b']],
                           ['(r2)', [['a|300'], 'c']]])
        assert len(kb._runtime.rebinds_dict) == 4  # 2 variants x press/release
        assert len(kb._runtime.rebind_triggers) == 4
        down(kb, VK_A, 1000)
        assert kb_env_ns.kb_mock.press.call_args[0][0].vk == VK_B

    def test_different_constraints_order_swap_swaps_winner(self, kb_env_ns):
        # The priority is list order, not the constraint value: listing the
        # |300 line first makes it fire.
        kb = kb_env_ns.kb
        build(kb, rebinds=[['(r2)', [['a|300'], 'c']],
                           ['(r1)', [['a|200'], 'b']]])
        down(kb, VK_A, 1000)
        assert kb_env_ns.kb_mock.press.call_args[0][0].vk == VK_C

    def test_unactivatable_first_variant_falls_to_next(self, kb_env_ns):
        # The scan continues past a base-match that does not activate:
        # shift missing -> r1 blocked, r2 (ctrl) fires.
        kb = kb_env_ns.kb
        build(kb, rebinds=[['(r1)', [['a', '-shift'], 'b']],
                           ['(r2)', [['a', '-ctrl'], 'c']]])
        hold_keys(kb, VK_CTRL)
        down(kb, VK_A, 1000)
        assert kb_env_ns.kb_mock.press.call_args[0][0].vk == VK_C

    def test_both_variants_activatable_first_wins(self, kb_env_ns):
        # Both modifiers held: both would activate; the first list position
        # wins and the loop breaks.
        kb = kb_env_ns.kb
        build(kb, rebinds=[['(r1)', [['a', '-shift'], 'b']],
                           ['(r2)', [['a', '-ctrl'], 'c']]])
        hold_keys(kb, VK_SHIFT, VK_CTRL)
        down(kb, VK_A, 1000)
        assert kb_env_ns.kb_mock.press.call_args[0][0].vk == VK_B

    def test_repeated_trigger_let_through_inspects_first_match_only(self, kb_env_ns):
        # _rebind_repeat_let_through returns on the FIRST base-matching
        # trigger: the repeat re-fires through r1's payload (both presses
        # target VK_B, never VK_C).
        kb = kb_env_ns.kb
        build(kb, rebinds=[['(r1)', [['a|200'], 'b']],
                           ['(r2)', [['a|300'], 'c']]])
        down(kb, VK_A, 1000)
        down(kb, VK_A, 1500)  # OS auto-repeat of the held trigger
        targets = [c.args[0].vk for c in kb_env_ns.kb_mock.press.call_args_list]
        assert targets == [VK_B, VK_B]


class TestMacroWhoWins:
    def test_same_key_different_constraints_both_fire_in_order(self, kb_env_ns, monkeypatch):
        # Multi-trigger-per-key is the product feature D1 protects: two
        # distinct trigger payloads on one key BOTH fire, in list order
        # (EXEC_ONLY_ONE_TRIGGERED_MACRO defaults to False).
        kb = kb_env_ns.kb
        fired = recorded_playbacks(monkeypatch)
        build(kb, macros=[['(m1)', [['a|200'], ['b']]],
                          ['(m2)', [['a|300'], ['c']]]])
        down(kb, VK_A, 1000)
        assert [alias for alias, _ in fired] == ['m1', 'm2']

    def test_identical_trigger_last_written_macro_wins_once(self, kb_env_ns, monkeypatch):
        # Identical trigger groups collapse to ONE dict entry (last write
        # wins) at the first occurrence position: exactly one playback, of
        # the LATER macro's sequence.
        kb = kb_env_ns.kb
        fired = recorded_playbacks(monkeypatch)
        build(kb, macros=[['(m1)', [['a'], ['b']]],
                          ['(m2)', [['a'], ['c']]]])
        down(kb, VK_A, 1000)
        assert [alias for alias, _ in fired] == ['m2']
        assert [vks for _, vks in fired][0][0] == VK_C

    def test_order_swap_swaps_playback_order(self, kb_env_ns, monkeypatch):
        # Macro scan order = trigger-list order: swapping the lines swaps the
        # playback order.
        kb = kb_env_ns.kb
        fired = recorded_playbacks(monkeypatch)
        build(kb, macros=[['(m2)', [['a|300'], ['c']]],
                          ['(m1)', [['a|200'], ['b']]]])
        down(kb, VK_A, 1000)
        assert [alias for alias, _ in fired] == ['m2', 'm1']
