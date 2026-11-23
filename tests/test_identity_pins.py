"""F-B1 IDENTITY pins: typed (vk_code, is_press, constraints) trigger identity.

D1 ruling (estate proposals/2026-11-15_fst-improvement-plan.md): trigger
identity is a typed hashable VALUE, constraints-in-identity, comparison by
value - NOT a repr string. Review Item 6 (estate proposals/
2026-11-14_fst-architecture-review.md): Key/Key_Event/Key_Group/Rebind/Macro/
Tap_Group compared __repr__() strings; the tap-group states dict was keyed by
Key objects while updates wrote int vk codes (dead-weight entries);
Key_Group/Key_Event/Tap_Group carried shared mutable default containers.

These pins are the RED-before set: each fails on the pre-F-B1 code and holds
after the typed-identity conversion. The who-wins characterization pins
(test_identity_priority_pins.py) stay green across the change.
"""
import fst_data_types as dt
from fst_data_types import Key, Key_Event, Key_Group, Tap_Group, Trigger_Key

from kb_helpers import build, down

VK_A = 0x41
VK_C = 0x43
VK_D = 0x44


class TestTypedIdentity:
    def test_trigger_key_is_a_typed_value(self):
        ke = Key_Event(VK_A, True, constraints=[100])
        assert ke.trigger_key == Trigger_Key(VK_A, True, (100,))

    def test_trigger_key_created_once_per_event(self):
        # validate-time payload: the typed value and its constraints tuple
        # are built once at construction, not per comparison or lookup
        ke = Key_Event(VK_A, True, constraints=[100])
        assert ke.trigger_key is ke.trigger_key

    def test_identity_ignores_key_string(self):
        # key_string is display, not identity (D1 tuple names only vk_code,
        # is_press, constraints): the same physical press event spelled by
        # name or by bare vk is ONE trigger value.
        by_name = Key_Event(VK_A, True, key_string='a')
        by_vk = Key_Event(VK_A, True, key_string=None)
        assert by_name == by_vk
        assert hash(by_name) == hash(by_vk)

    def test_constraints_compare_by_value_not_repr_projection(self):
        # the old repr dropped zero and repeat constraints (|50|0 and |50
        # rendered alike); value comparison keeps constraint payloads apart
        assert Key_Event(VK_A, True, constraints=[50, 0]) != \
            Key_Event(VK_A, True, constraints=[50])
        assert hash(Key_Event(VK_A, True, constraints=[50, 0])) != \
            hash(Key_Event(VK_A, True, constraints=[50]))
        assert Key_Event(VK_A, True, constraints=[10, 10]) != \
            Key_Event(VK_A, True, constraints=[10])

    def test_key_group_identity_is_value_based(self):
        # equal groups keep equal hashes; constraint payload separates them
        g1 = Key_Group([Key_Event(VK_A, constraints=[100])])
        g2 = Key_Group([Key_Event(VK_A, constraints=[100])])
        assert g1 == g2
        assert hash(g1) == hash(g2)
        assert g1 != Key_Group([Key_Event(VK_A, constraints=[200])])

    def test_key_identity_includes_constraints(self):
        # D1: constraints are identity - the old Key repr rendered without
        # them, so two constraint-variant Keys shared one trigger identity
        assert Key(VK_A, key_string='a') != \
            Key(VK_A, constraints=[100], key_string='a')
        assert Key(VK_A, key_string='a') == Key(VK_A, key_string='a')
        assert Key(VK_A, key_string='a') != Key(VK_A, is_toggle=True,
                                                key_string='a')


class TestSharedMutableDefaults:
    def test_key_group_default_list_is_per_instance(self):
        assert Key_Group()._key_events is not Key_Group()._key_events

    def test_tap_group_default_list_is_per_instance(self):
        assert Tap_Group().keys is not Tap_Group().keys

    def test_constraint_default_list_is_per_instance(self):
        assert Key_Event(1)._constraints is not Key_Event(2)._constraints


class TestTapStatesSingleKeyed:
    def test_states_are_keyed_by_vk_code(self):
        # Item 6: states used to carry Key-object entries that stayed 0
        # forever while update_tap_states wrote int vk codes alongside
        tg = Tap_Group([Key(VK_A, key_string='a'), Key(VK_D, key_string='d')])
        assert tg.get_states() == {VK_A: 0, VK_D: 0}
        tg.update_tap_states(VK_A, True)
        assert set(tg.get_states()) == {VK_A, VK_D}
        assert tg.get_key_to_send() == VK_A


class TestHotPathIdentityCost:
    def test_fired_keystroke_runs_no_identity_ops(self, kb_env_ns, monkeypatch):
        # One fired keystroke (rebind replacement that arms a macro) must
        # touch no dataclass __hash__ and build no repr inside an identity
        # operation: the old hot path hashed Key_Group per dict get, and the
        # old __hash__ rebuilt a repr string (plus member reprs) every time.
        # Display formatting (flow-log f-strings) stays - it is not identity.
        counts = {'hash': 0, 'ident_repr': 0, 'in_hash': 0, 'window': False}

        def wrap_hash(cls):
            orig = cls.__hash__

            def patched(self):
                if not counts['window']:
                    return orig(self)
                counts['hash'] += 1
                counts['in_hash'] += 1
                try:
                    return orig(self)
                finally:
                    counts['in_hash'] -= 1
            monkeypatch.setattr(cls, '__hash__', patched)

        def wrap_repr(cls):
            orig = cls.__repr__

            def patched(self):
                if counts['window'] and counts['in_hash']:
                    counts['ident_repr'] += 1
                return orig(self)
            monkeypatch.setattr(cls, '__repr__', patched)

        for cls in (dt.Key_Event, dt.Key, dt.Key_Group, dt.Rebind, dt.Macro):
            wrap_hash(cls)
        for cls in (dt.Key_Event, dt.Key, dt.Key_Group):
            wrap_repr(cls)

        kb = kb_env_ns.kb
        build(kb, rebinds=[['(r)', [['a'], 'b']]],
                 macros=[['(m)', [['c'], ['d']]]])

        def no_playback(self, alias, seq):
            return None
        monkeypatch.setattr(type(kb), 'start_macro_playback', no_playback)

        counts['window'] = True
        try:
            down(kb, VK_A, 1000)  # rebind fires: a -> b
            down(kb, VK_C, 2000)  # macro trigger c fires: macros_dict leg
        finally:
            counts['window'] = False
        assert counts['hash'] == 0, \
            f"identity-path hash ops={counts['hash']} " \
            f"identity repr builds={counts['ident_repr']}"
        assert counts['ident_repr'] == 0, \
            f"identity repr builds={counts['ident_repr']}"
        # non-vacuity: rebind replacement pressed AND macro fired
        assert kb_env_ns.kb_mock.press.call_count >= 1
        assert kb._state_manager.get_real_key_press_state(VK_C) is True
