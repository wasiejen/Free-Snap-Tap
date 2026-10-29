import pytest

from fst_data_types import Key, Key_Event, Key_Group, Macro, Rebind, Tap_Group


class TestKeyEvent:
    def test_press_denoted_with_minus(self):
        assert Key_Event('w', is_press=True).repr_wo_constraints() == '-w'

    def test_release_denoted_with_plus(self):
        assert Key_Event('w', is_press=False).repr_wo_constraints() == '+w'

    def test_opposite_key_event(self):
        released = Key_Event('w').get_opposite_key_event()
        assert released.vk_code == 'w'
        assert released.is_press is False

    def test_repr_with_delay(self):
        assert repr(Key_Event('w', constraints=[100])) == '-w|100'

    def test_repr_with_delay_min_max(self):
        assert repr(Key_Event('w', constraints=[10, 5])) == '-w|10|5'

    def test_repr_with_evaluation(self):
        assert repr(Key_Event('w', constraints=['tr("+space")>500'])) == '-w|(tr("+space")>500)'

    def test_repr_default_constraints_unchanged(self):
        assert repr(Key_Event('w')) == '-w'

    def test_equal_when_same_code_and_state(self):
        assert Key_Event('w') == Key_Event('w')
        assert Key_Event('w') != Key_Event('w', is_press=False)

    def test_equal_key_events_have_equal_hash(self):
        pressed_1 = Key_Event('w', constraints=[100])
        pressed_2 = Key_Event('w', constraints=[100])
        assert pressed_1 == pressed_2
        assert hash(pressed_1) == hash(pressed_2)

    def test_differing_constraints_are_not_equal(self):
        assert Key_Event('w', constraints=[100]) != Key_Event('w', constraints=[200])

    def test_get_key_events_returns_self_twice(self):
        ke = Key_Event('w')
        assert ke.get_key_events() == [ke, ke]


class TestKey:
    def test_non_toggle_yields_press_and_release(self):
        events = Key('w').get_key_events()
        assert events[0].is_press is True
        assert events[1].is_press is False

    def test_toggle_yields_two_presses(self):
        events = Key('c', is_toggle=True).get_key_events()
        assert all(event.is_press for event in events)

    def test_eq_and_hash_based_on_repr(self):
        assert Key('a') == Key('a')
        assert hash(Key('a')) == hash(Key('a'))
        assert Key('a') != Key('a', is_toggle=True)

    def test_hash_differs_for_toggle(self):
        assert hash(Key('a')) != hash(Key('a', is_toggle=True))


class TestKeyGroup:
    def test_single_key_event_wrapped_in_list(self):
        assert len(Key_Group(Key_Event('a'))) == 1

    def test_key_events_property_returns_copy(self):
        kg = Key_Group([Key_Event('a')])
        events = kg.key_events
        events.append(Key_Event('b'))
        assert len(kg) == 1

    def test_get_trigger_returns_first(self):
        kg = Key_Group([Key_Event('a'), Key_Event('b')])
        assert kg.get_trigger() == Key_Event('a')

    def test_equal_same_events(self):
        assert Key_Group([Key_Event('a')]) == Key_Group([Key_Event('a')])

    def test_equal_groups_have_equal_hash(self):
        g1 = Key_Group([Key_Event('a', constraints=[100])])
        g2 = Key_Group([Key_Event('a', constraints=[100])])
        assert g1 == g2
        assert hash(g1) == hash(g2)

    def test_groups_with_different_constraints_are_not_equal(self):
        assert Key_Group([Key_Event('a', constraints=[100])]) != \
            Key_Group([Key_Event('a', constraints=[200])])

    def test_not_equal_on_length_mismatch(self):
        short = Key_Group([Key_Event('a')])
        long = Key_Group([Key_Event('a'), Key_Event('b')])
        assert (short == long) is False

    def test_append(self):
        kg = Key_Group([Key_Event('a')])
        kg.append(Key_Event('b'))
        assert kg.get_key_events() == [Key_Event('a'), Key_Event('b')]

    def test_repr(self):
        assert repr(Key_Group([Key_Event('a')])) == 'KG(-a)'

    def test_get_vk_codes(self):
        kg = Key_Group([Key_Event('a'), Key_Event('b', is_press=False)])
        assert kg.get_vk_codes() == ['a', 'b']


class TestRebind:
    def make_rebind(self):
        return Rebind(Key_Group([Key_Event('a')]), Key_Event('b'))

    def test_trigger_and_replacement(self):
        r = self.make_rebind()
        assert r.trigger_group.get_trigger() == Key_Event('a')
        assert r.replacement == Key_Event('b')

    def test_trigger_type_check(self):
        r = self.make_rebind()
        with pytest.raises(TypeError):
            r.trigger_group = Key_Event('a')

    def test_replacement_type_check(self):
        r = self.make_rebind()
        with pytest.raises(TypeError):
            r.replacement = 'b'

    def test_alias_type_check(self):
        r = self.make_rebind()
        with pytest.raises(TypeError):
            r.alias = 5

    def test_repr_with_alias(self):
        r = self.make_rebind()
        r.alias = 'my_reb'
        assert repr(r) == 'my_reb KG(-a) : -b'

    def test_eq_true_when_matching(self):
        r1 = Rebind(Key_Group([Key_Event('a')]), Key_Event('b'))
        r2 = Rebind(Key_Group([Key_Event('a')]), Key_Event('b'))
        assert r1 == r2


class TestMacro:
    def test_single_sequence_always_same_group(self):
        m = Macro(Key_Group([Key_Event('a')]), [Key_Group([Key_Event('b')])])
        assert m.num_sequences == 1
        assert m.get_key_events_of_current_sequence() == [Key_Event('b')]
        assert m.get_key_events_of_current_sequence() == [Key_Event('b')]

    def test_multi_sequence_cycles(self):
        m = Macro(Key_Group([Key_Event('a')]),
                  [Key_Group([Key_Event(k)]) for k in 'bcd'])
        sequences = [m.get_key_events_of_current_sequence() for _ in range(4)]
        assert sequences == [[Key_Event('b')],
                             [Key_Event('c')],
                             [Key_Event('d')],
                             [Key_Event('b')]]

    def test_reset_sequence_counter(self):
        m = Macro(Key_Group([Key_Event('a')]),
                  [Key_Group([Key_Event('b')])])
        m.get_key_events_of_current_sequence()
        m.reset_sequence_counter()
        assert m.get_sequence_counter() == 0

    def test_no_key_groups_raises(self):
        m = Macro(Key_Group([Key_Event('a')]), [])
        with pytest.raises(ValueError):
            m.get_key_events_of_current_sequence()

    def test_repr_single_sequence(self):
        m = Macro(Key_Group([Key_Event('a')]), [Key_Group([Key_Event('b')])])
        m.alias = 'my_macro'
        assert repr(m) == 'my_macro KG(-a) :: KG(-b)'

    def test_alias_type_check(self):
        m = Macro(Key_Group([Key_Event('a')]), [Key_Group([Key_Event('b')])])
        with pytest.raises(TypeError):
            m.alias = 5

    def test_eq_and_hash_based_on_repr(self):
        m1 = Macro(Key_Group([Key_Event('a')]), [Key_Group([Key_Event('b')])])
        m2 = Macro(Key_Group([Key_Event('a')]), [Key_Group([Key_Event('b')])])
        assert m1 == m2
        assert hash(m1) == hash(m2)
        assert m1 != Macro(Key_Group([Key_Event('c')]), [Key_Group([Key_Event('b')])])


class TestTapGroup:
    def test_states_initialized_zero(self):
        tg = Tap_Group(keys=['a', 'd'])
        assert tg.get_states() == {'a': 0, 'd': 0}

    def test_single_press(self):
        tg = Tap_Group(keys=['a', 'd'])
        tg.update_tap_states('a', True)
        assert tg.get_key_to_send() == 'a'
        assert tg.get_last_key_pressed() == 'a'

    def test_last_pressed_wins_when_multiple(self):
        tg = Tap_Group(keys=['a', 'd'])
        tg.update_tap_states('a', True)
        tg.update_tap_states('d', True)
        assert tg.get_key_to_send() == 'd'

    def test_release_falls_back_to_other(self):
        tg = Tap_Group(keys=['a', 'd'])
        tg.update_tap_states('a', True)
        tg.update_tap_states('d', True)
        tg.update_tap_states('d', False)
        assert tg.get_key_to_send() == 'a'

    def test_release_all_no_key_sent(self):
        tg = Tap_Group(keys=['a', 'd'])
        tg.update_tap_states('a', True)
        tg.update_tap_states('a', False)
        assert tg.get_key_to_send() is None

    def test_alias_type_check(self):
        tg = Tap_Group(keys=['a', 'd'])
        with pytest.raises(TypeError):
            tg.alias = 100

    def test_get_vk_codes_with_key_objects(self):
        tg = Tap_Group(keys=[Key_Event('a'), Key_Event('d')])
        assert tg.get_vk_codes() == ['a', 'd']

    def test_eq_and_hash_based_on_repr(self):
        tg1 = Tap_Group(keys=['a', 'd'])
        tg2 = Tap_Group(keys=['a', 'd'])
        assert tg1 == tg2
        assert hash(tg1) == hash(tg2)
        assert tg1 != Tap_Group(keys=['a'])


class TestPropertiesAndSetters:
    """Cover the remaining pure property getters and typed setters that the
    equality/hash tests did not exercise."""

    def test_key_event_repr_wo_constraints_with_key_string(self):
        assert Key_Event('w', is_press=True, key_string='w').repr_wo_constraints() == '-w'

    def test_key_is_toggle_property(self):
        assert Key('a').is_toggle is False
        assert Key('a', is_toggle=True).is_toggle is True

    def test_key_repr_without_key_string_uses_vk(self):
        assert repr(Key(0x41, key_string=None)) == '65'

    def test_key_group_key_events_setter(self):
        kg = Key_Group([Key_Event('a')])
        kg.key_events = [Key_Event('b')]
        assert kg.get_key_events() == [Key_Event('b')]

    def test_key_group_add_key_event(self):
        kg = Key_Group([Key_Event('a')])
        kg.add_key_event(Key_Event('b'))
        assert kg.get_key_events() == [Key_Event('a'), Key_Event('b')]

    def test_rebind_alias_getter_and_setter(self):
        r = Rebind(Key_Group([Key_Event('a')]), Key_Event('b'))
        assert r.alias == ''
        r.alias = 'my_reb'
        assert r.alias == 'my_reb'

    def test_rebind_trigger_group_setter(self):
        r = Rebind(Key_Group([Key_Event('a')]), Key_Event('b'))
        r.trigger_group = Key_Group([Key_Event('c')])
        assert r.get_trigger() == Key_Event('c')

    def test_rebind_replacement_setter(self):
        r = Rebind(Key_Group([Key_Event('a')]), Key_Event('b'))
        r.replacement = Key_Event('d')
        assert r.replacement == Key_Event('d')

    def test_rebind_get_trigger(self):
        r = Rebind(Key_Group([Key_Event('a'), Key_Event('b')]), Key_Event('c'))
        assert r.get_trigger() == Key_Event('a')

    def test_rebind_hash(self):
        r1 = Rebind(Key_Group([Key_Event('a')]), Key_Event('b'))
        r2 = Rebind(Key_Group([Key_Event('a')]), Key_Event('b'))
        assert hash(r1) == hash(r2)

    def test_macro_sequence_counter_property(self):
        m = Macro(Key_Group([Key_Event('a')]),
                  [Key_Group([Key_Event('b')]), Key_Group([Key_Event('c')])])
        assert m.sequence_counter == 0
        m.get_key_events_of_current_sequence()
        assert m.sequence_counter == 1

    def test_macro_get_trigger(self):
        m = Macro(Key_Group([Key_Event('a')]), [Key_Group([Key_Event('b')])])
        assert m.get_trigger() == Key_Event('a')

    def test_tap_group_alias_getter_and_setter(self):
        tg = Tap_Group(keys=['a', 'd'])
        assert tg.alias == ''
        tg.alias = 'my_tap'
        assert tg.alias == 'my_tap'
