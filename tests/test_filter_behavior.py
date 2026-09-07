"""Behavior tests of the win32 filter hot path (FST_Keyboard._win32_event_filter).

Covers trigger activation, rebind/macro firing, suppression, toggles, alias
expansion, tap-group idealization, sequence cycling and playback interrupt.
All pynput controllers and the listener are mocked - no real input, no live
listeners.
"""
from types import SimpleNamespace
from unittest.mock import MagicMock, call

import asyncio
from pynput import keyboard as pynput_keyboard
import pytest

import fst_manager
from fst_data_types import Key_Event
from fst_keyboard import FST_Keyboard

VK_A = 0x41
VK_B = 0x42
VK_C = 0x43
VK_SHIFT = 160


@pytest.fixture
def kb_env(monkeypatch):
    kb_mock = MagicMock()
    ms_mock = MagicMock()
    monkeypatch.setattr('pynput.keyboard.Controller', lambda: kb_mock)
    monkeypatch.setattr('pynput.mouse.Controller', lambda: ms_mock)
    FST_Keyboard.TIME_DIFF = None
    FST_Keyboard.START_TIME = None
    keyboard = FST_Keyboard()
    keyboard._listener = MagicMock()
    keyboard.arg_manager.WIN32_FILTER_PAUSED = False
    keyboard.arg_manager.ACT_DELAY = False
    keyboard.arg_manager.ACT_CROSSOVER = False
    yield SimpleNamespace(kb=keyboard, kb_mock=kb_mock, mouse_mock=ms_mock)
    FST_Keyboard.TIME_DIFF = None
    FST_Keyboard.START_TIME = None


def build(kb, rebinds=None, macros=None, taps=None, aliases=None):
    cm = kb.config_manager
    cm._tap_groups_hr = taps or []
    cm._rebinds_hr = rebinds or []
    cm._macros_hr = macros or []
    cm._alias_hr = aliases or []
    kb.initialize_groups_from_presorted_lines()


def down(kb, vk, t):
    kb._win32_event_filter(vk, t, True, False)


def up(kb, vk, t):
    kb._win32_event_filter(vk, t, False, False)


class TestRebindFiring:
    def test_replacement_sent_source_suppressed(self, kb_env):
        kb = kb_env.kb
        build(kb, rebinds=[['(r)', [['a'], 'b']]])
        down(kb, VK_A, 1000)
        kb_env.kb_mock.press.assert_called_once_with(pynput_keyboard.KeyCode.from_vk(VK_B))
        assert kb_env.kb_mock.release.call_count == 0
        kb._listener.suppress_event.assert_called_once_with()
        # pressed-keys set tracks the replacement, not the source
        assert kb.state_manager.get_key_press_state(VK_B) is True
        assert kb.state_manager.get_key_press_state(VK_A) is False

    def test_release_without_trigger_passes_through(self, kb_env):
        kb = kb_env.kb
        build(kb, rebinds=[['(r)', [['-a'], '-b']]])  # press-only rebind
        down(kb, VK_A, 1000)
        up(kb, VK_A, 2000)  # no rebind for the release -> passes through
        assert kb_env.kb_mock.press.call_count == 1
        assert kb_env.kb_mock.release.call_count == 0
        assert kb._listener.suppress_event.call_count == 1

    def test_key_pair_rebind_expands_to_press_and_release(self, kb_env):
        kb = kb_env.kb
        build(kb, rebinds=[['(r)', [['c'], 'shift']]])
        down(kb, VK_C, 1000)
        up(kb, VK_C, 2000)
        kb_env.kb_mock.press.assert_called_once_with(pynput_keyboard.KeyCode.from_vk(VK_SHIFT))
        kb_env.kb_mock.release.assert_called_once_with(pynput_keyboard.KeyCode.from_vk(VK_SHIFT))
        assert kb._listener.suppress_event.call_count == 2

    def test_constraint_not_met_neither_fires_nor_suppresses(self, kb_env):
        kb = kb_env.kb
        build(kb, rebinds=[['(r)', [['a', '-shift'], 'b']]])
        down(kb, VK_A, 1000)  # shift not pressed -> no match
        assert kb_env.kb_mock.press.call_count == 0
        assert kb._listener.suppress_event.call_count == 0
        up(kb, VK_A, 2000)
        down(kb, VK_SHIFT, 3000)
        down(kb, VK_A, 4000)  # now constraint holds -> fires
        kb_env.kb_mock.press.assert_called_once_with(pynput_keyboard.KeyCode.from_vk(VK_B))

    def test_trigger_evaluation_constraint(self, kb_env):
        kb = kb_env.kb
        build(kb, rebinds=[['(r)', [['a|(p("shift"))'], 'b']]])
        down(kb, VK_A, 1000)
        assert kb_env.kb_mock.press.call_count == 0
        up(kb, VK_A, 2000)
        down(kb, VK_SHIFT, 3000)
        down(kb, VK_A, 4000)
        kb_env.kb_mock.press.assert_called_once_with(pynput_keyboard.KeyCode.from_vk(VK_B))

    def test_suppress_rebind_sends_nothing(self, kb_env):
        kb = kb_env.kb
        build(kb, rebinds=[['(r)', [['a'], 'suppress']]])
        down(kb, VK_A, 1000)
        assert kb_env.kb_mock.press.call_count == 0
        assert kb_env.kb_mock.release.call_count == 0
        kb._listener.suppress_event.assert_called_once_with()

    def test_repeated_trigger_key_is_suppressed_without_refiring(self, kb_env):
        kb = kb_env.kb
        build(kb, rebinds=[['(r)', [['a'], 'b']]])
        down(kb, VK_A, 1000)
        down(kb, VK_A, 1500)  # OS auto-repeat of an already pressed trigger
        assert kb_env.kb_mock.press.call_count == 1
        assert kb._listener.suppress_event.call_count == 2


class TestToggle:
    def test_toggle_rebind_presses_then_releases_on_next_press(self, kb_env):
        kb = kb_env.kb
        build(kb, rebinds=[['(t)', [['c'], '^shift']]])
        down(kb, VK_C, 1000)  # first press -> -shift
        kb_env.kb_mock.press.assert_called_once_with(pynput_keyboard.KeyCode.from_vk(VK_SHIFT))
        up(kb, VK_C, 2000)  # key release of a toggle is suppressed, no second toggle
        assert kb_env.kb_mock.release.call_count == 0
        down(kb, VK_C, 3000)  # second press -> +shift
        kb_env.kb_mock.release.assert_called_once_with(pynput_keyboard.KeyCode.from_vk(VK_SHIFT))
        assert kb.state_manager.get_toggle_state(VK_SHIFT) is False


class TestMacroFiring:
    def test_macro_trigger_fires_and_suppresses(self, kb_env, monkeypatch):
        kb = kb_env.kb
        fired = []
        monkeypatch.setattr(FST_Keyboard, 'start_macro_playback',
                            lambda self, alias, seq: fired.append((alias, seq)))
        build(kb, macros=[['(m)', [['a'], ['b']]]])
        down(kb, VK_A, 1000)
        # bare key in a played group expands to a press + release pair
        assert fired == [('m', [Key_Event(VK_B), Key_Event(VK_B, is_press=False)])]
        kb._listener.suppress_event.assert_called_once_with()

    def test_sequence_cycles_and_wraps_groups(self, kb_env, monkeypatch):
        kb = kb_env.kb
        fired = []
        monkeypatch.setattr(FST_Keyboard, 'start_macro_playback',
                            lambda self, alias, seq: fired.append((alias, seq)))
        build(kb, macros=[['(seq)', [['a'], ['b'], ['c']]]])
        for i in range(3):
            down(kb, VK_A, 1000 + i * 1000)
            up(kb, VK_A, 1500 + i * 1000)
        assert [alias for alias, _ in fired] == ['seq', 'seq', 'seq']
        assert fired[0][1] == [Key_Event(VK_B), Key_Event(VK_B, is_press=False)]
        assert fired[1][1] == [Key_Event(VK_C), Key_Event(VK_C, is_press=False)]
        # auto-reset after the last group: third trigger plays group 1 again
        assert fired[2][1] == [Key_Event(VK_B), Key_Event(VK_B, is_press=False)]

    def test_alias_expanded_in_macro_key_group(self, kb_env, monkeypatch):
        kb = kb_env.kb
        fired = []
        monkeypatch.setattr(FST_Keyboard, 'start_macro_playback',
                            lambda self, alias, seq: fired.append((alias, seq)))
        build(kb, aliases=[['<world>', ['-shift', 'a', '+shift']]],
              macros=[['(m)', [['b'], ['<world>', 'c']]]])
        down(kb, VK_B, 1000)
        expected = [Key_Event(VK_SHIFT),
                    Key_Event(VK_A), Key_Event(VK_A, is_press=False),
                    Key_Event(VK_SHIFT, is_press=False),
                    Key_Event(VK_C), Key_Event(VK_C, is_press=False)]
        assert fired == [('m', expected)]

    def test_unknown_alias_raises_at_build(self, kb_env):
        kb = kb_env.kb
        with pytest.raises(Exception):
            build(kb, macros=[['(m)', [['a'], ['<nope>']]]])

    def test_reset_macro_sequence_by_name(self, kb_env):
        kb = kb_env.kb
        build(kb, macros=[['(seq)', [['a'], ['b'], ['c']]]])
        macro = kb._macros_alias_dict['seq']
        macro.get_key_events_of_current_sequence()  # counter -> 1
        kb.reset_macro_sequence_by_name('seq')
        assert macro.get_sequence_counter() == 0
        # unknown name: prints, no raise
        kb.reset_macro_sequence_by_name('nope')

    def test_interrupt_macro_by_name(self, kb_env):
        kb = kb_env.kb
        handle = MagicMock()
        handle.done.return_value = False
        kb.macro_thread_dict['m'] = handle
        kb.interrupt_macro_by_name('m')
        handle.cancel.assert_called_once_with()
        kb.interrupt_macro_by_name('unknown')  # no raise


class TestTapGroupFilter:
    def test_snap_tap_idealization_sequence(self, kb_env):
        kb = kb_env.kb
        build(kb, taps=[['(TAP_1)', ['a', 'b']]])
        down(kb, VK_A, 1000)
        down(kb, VK_B, 2000)  # switch: release a, press b
        up(kb, VK_B, 3000)    # a still pressed: release b, re-press a
        up(kb, VK_A, 4000)    # nothing left: release a
        code = pynput_keyboard.KeyCode.from_vk
        assert kb_env.kb_mock.method_calls == [
            call.press(code(VK_A)),
            call.release(code(VK_A)), call.press(code(VK_B)),
            call.release(code(VK_B)), call.press(code(VK_A)),
            call.release(code(VK_A)),
        ]
        assert kb._listener.suppress_event.call_count == 4


class TestMacroPlayback:
    @pytest.mark.asyncio
    async def test_macro_task_plays_keys_with_delays(self, kb_env, monkeypatch):
        kb = kb_env.kb
        sleeps = []

        async def fake_sleep(t):
            sleeps.append(t)

        monkeypatch.setattr(asyncio, 'sleep', fake_sleep)
        monkeypatch.setattr(fst_manager, 'randint', lambda lo, hi: (lo + hi) // 2)
        kb.arg_manager.MACRO_MIN_DELAY_IN_MS = 4
        kb.arg_manager.MACRO_MAX_DELAY_IN_MS = 6

        await kb.macro_task([Key_Event(VK_B, constraints=[100])], 'm')

        kb_env.kb_mock.press.assert_called_once_with(pynput_keyboard.KeyCode.from_vk(VK_B))
        assert sleeps == [0.1]

    @pytest.mark.asyncio
    async def test_macro_task_toggle_key_toggles_state(self, kb_env, monkeypatch):
        kb = kb_env.kb

        async def fake_sleep(t):
            pass

        monkeypatch.setattr(asyncio, 'sleep', fake_sleep)
        # first toggle -> press, second -> release (regression: method must live
        # on state_manager, not output_manager)
        await kb.macro_task([Key_Event(VK_SHIFT, is_toggle=True)], 'm')
        kb_env.kb_mock.press.assert_called_once_with(pynput_keyboard.KeyCode.from_vk(VK_SHIFT))
        assert kb.state_manager.get_toggle_state(VK_SHIFT) is True
        await kb.macro_task([Key_Event(VK_SHIFT, is_toggle=True)], 'm')
        kb_env.kb_mock.release.assert_called_once_with(pynput_keyboard.KeyCode.from_vk(VK_SHIFT))
        assert kb.state_manager.get_toggle_state(VK_SHIFT) is False

    @pytest.mark.asyncio
    async def test_interrupt_cancels_running_playback(self, kb_env):
        kb = kb_env.kb
        kb.loop = asyncio.get_running_loop()
        seq = [Key_Event(VK_B, constraints=[500, 500]),
               Key_Event(VK_C, constraints=[500, 500])]
        kb.start_macro_playback_repeat('m', seq)
        await asyncio.sleep(0.01)
        kb.interrupt_macro_by_name('m')
        await asyncio.sleep(0.01)
        # b was sent before the delay; c was cancelled away with the delay
        assert kb_env.kb_mock.press.call_count == 1
        assert kb_env.kb_mock.release.call_count == 0


VK_ALT = 0xA4
VK_END = 0x23
VK_DELETE = 0x2E
VK_PAGE_DOWN = 0x22


def hold_keys(kb, *vks):
    for vk in vks:
        kb.state_manager.set_real_key_press_state(vk, True)


def mock_control_handlers(kb):
    for name in ('control_return_to_menu', 'control_exit_program', 'control_toggle_pause'):
        setattr(kb, name, MagicMock())


class TestControlActions:
    def test_check_for_combination_string_and_int_codes(self, kb_env):
        kb = kb_env.kb
        assert kb.check_for_combination(['alt', 'end']) is False
        hold_keys(kb, VK_ALT, VK_END)
        assert kb.check_for_combination(['alt', 'end']) is True
        assert kb.check_for_combination([VK_ALT, VK_END]) is True
        kb.state_manager.set_real_key_press_state(VK_END, False)
        assert kb.check_for_combination(['alt', 'end']) is False

    def test_alt_end_exits_program(self, kb_env):
        kb = kb_env.kb
        mock_control_handlers(kb)
        hold_keys(kb, VK_ALT, VK_END)
        kb.check_control_actions()
        kb.control_exit_program.assert_called_once_with()
        kb.control_return_to_menu.assert_not_called()
        kb.control_toggle_pause.assert_not_called()

    def test_alt_page_down_returns_to_menu(self, kb_env):
        kb = kb_env.kb
        mock_control_handlers(kb)
        hold_keys(kb, VK_ALT, VK_PAGE_DOWN)
        kb.check_control_actions()
        kb.control_return_to_menu.assert_called_once_with()
        kb.control_exit_program.assert_not_called()
        kb.control_toggle_pause.assert_not_called()

    def test_alt_delete_toggles_pause(self, kb_env):
        kb = kb_env.kb
        mock_control_handlers(kb)
        hold_keys(kb, VK_ALT, VK_DELETE)
        kb.check_control_actions()
        kb.control_toggle_pause.assert_called_once_with()
        kb.control_return_to_menu.assert_not_called()
        kb.control_exit_program.assert_not_called()

    def test_menu_combination_wins_when_multiple_match(self, kb_env):
        kb = kb_env.kb
        mock_control_handlers(kb)
        hold_keys(kb, VK_ALT, VK_END, VK_DELETE, VK_PAGE_DOWN)
        kb.check_control_actions()
        kb.control_return_to_menu.assert_called_once_with()
        kb.control_exit_program.assert_not_called()
        kb.control_toggle_pause.assert_not_called()

    def test_partial_combination_does_nothing(self, kb_env):
        kb = kb_env.kb
        mock_control_handlers(kb)
        hold_keys(kb, VK_ALT)  # modifier alone is no control
        kb.check_control_actions()
        assert not (kb.control_return_to_menu.call_count
                    or kb.control_exit_program.call_count
                    or kb.control_toggle_pause.call_count)

    def test_controls_disabled_gate(self, kb_env):
        kb = kb_env.kb
        mock_control_handlers(kb)
        kb.arg_manager.CONTROLS_ENABLED = False
        hold_keys(kb, VK_ALT, VK_END)
        kb.check_control_actions()
        assert not (kb.control_return_to_menu.call_count
                    or kb.control_exit_program.call_count
                    or kb.control_toggle_pause.call_count)


def mouse_msg_data(mouse_data=0, flags=0, t=1234):
    return SimpleNamespace(pt=SimpleNamespace(x=1, y=2), mouseData=mouse_data,
                           flags=flags, time=t, dwExtraInfo=0)


class TestMouseWin32Filter:
    def patch_filter(self, kb, monkeypatch):
        monkeypatch.setattr(kb, '_win32_event_filter', MagicMock())

    def test_movement_returns_false_and_is_ignored(self, kb_env, monkeypatch):
        kb = kb_env.kb
        self.patch_filter(kb, monkeypatch)
        assert kb.mouse_win32_event_filter(512, mouse_msg_data()) is False
        kb._win32_event_filter.assert_not_called()
        kb._listener.suppress.assert_not_called()

    def test_button_messages_map_to_vk_codes(self, kb_env, monkeypatch):
        kb = kb_env.kb
        self.patch_filter(kb, monkeypatch)
        cases = [(513, 1, True), (514, 1, False),
                 (516, 2, True), (517, 2, False),
                 (519, 3, True), (520, 3, False)]
        for msg, vk, is_press in cases:
            kb.mouse_win32_event_filter(msg, mouse_msg_data())
            kb._win32_event_filter.assert_called_with(vk, 1234, is_press, False, True)

    def test_x_buttons_use_mousedata_for_vk(self, kb_env, monkeypatch):
        kb = kb_env.kb
        self.patch_filter(kb, monkeypatch)
        kb.mouse_win32_event_filter(523, mouse_msg_data(mouse_data=65536))   # x1 down
        kb._win32_event_filter.assert_called_with(4, 1234, True, False, True)
        kb.mouse_win32_event_filter(524, mouse_msg_data(mouse_data=65536))   # x1 up
        kb._win32_event_filter.assert_called_with(4, 1234, False, False, True)
        kb.mouse_win32_event_filter(523, mouse_msg_data(mouse_data=131072))  # x2 down
        kb._win32_event_filter.assert_called_with(5, 1234, True, False, True)

    def test_scroll_messages_map_to_vk_6_and_7(self, kb_env, monkeypatch):
        kb = kb_env.kb
        self.patch_filter(kb, monkeypatch)
        kb.mouse_win32_event_filter(522, mouse_msg_data(mouse_data=4287102976))  # vertical down
        kb._win32_event_filter.assert_called_with(6, 1234, True, False, True)
        kb.mouse_win32_event_filter(522, mouse_msg_data(mouse_data=7864320))     # vertical up
        kb._win32_event_filter.assert_called_with(6, 1234, False, False, True)
        kb.mouse_win32_event_filter(526, mouse_msg_data(mouse_data=4287102976))  # horizontal
        kb._win32_event_filter.assert_called_with(7, 1234, True, False, True)

    def test_simulated_flag_passthrough(self, kb_env, monkeypatch):
        kb = kb_env.kb
        self.patch_filter(kb, monkeypatch)
        kb.mouse_win32_event_filter(513, mouse_msg_data(flags=1))
        kb._win32_event_filter.assert_called_with(1, 1234, True, True, True)
        kb.mouse_win32_event_filter(513, mouse_msg_data(flags=0))
        kb._win32_event_filter.assert_called_with(1, 1234, True, False, True)

    def test_unrecognized_mouse_event_suppresses(self, kb_env, monkeypatch):
        kb = kb_env.kb
        self.patch_filter(kb, monkeypatch)
        kb._mouse_listener = MagicMock()
        # x-button message without x1/x2 mousedata resolves no vk_code
        kb.mouse_win32_event_filter(523, mouse_msg_data(mouse_data=0))
        kb._win32_event_filter.assert_not_called()
        # suppression happens on the mouse listener, not the keyboard one
        kb._mouse_listener.suppress_event.assert_called_once_with()
        kb._listener.suppress_event.assert_not_called()


class TestMouseToMouseRebind:
    @pytest.mark.asyncio
    async def test_replacement_plays_async_not_in_hook_thread(self, kb_env, monkeypatch):
        """Mouse-to-mouse rebinds must not send input synchronously in the
        win32 hook thread: the replacement is scheduled on the asyncio loop."""
        kb = kb_env.kb
        kb.loop = asyncio.get_running_loop()
        kb._mouse_listener = MagicMock()

        async def fake_sleep(t):
            # no real waiting, but yield to the loop so tasks scheduled via
            # run_coroutine_threadsafe get their turn
            loop = asyncio.get_running_loop()
            future = loop.create_future()
            loop.call_soon(future.set_result, None)
            await future

        monkeypatch.setattr(asyncio, 'sleep', fake_sleep)
        build(kb, rebinds=[['(r)', [['mm'], 'scroll_vert']]])

        kb._win32_event_filter(3, 1000, True, False, True)  # middle mouse down, as a mouse event

        # nothing is sent while the hook call is still in flight
        assert kb_env.mouse_mock.scroll.call_count == 0
        for _ in range(5):
            await asyncio.sleep(0)
        assert kb_env.mouse_mock.scroll.call_args_list == [call(0, 1)]  # scroll_vertical press
        assert kb_env.kb_mock.press.call_count == 0
        assert kb_env.kb_mock.release.call_count == 0
        # the original mouse event is suppressed on the mouse listener
        kb._mouse_listener.suppress_event.assert_called_once_with()
        kb._listener.suppress_event.assert_not_called()

        kb._win32_event_filter(3, 1500, False, False, True)  # middle mouse up
        for _ in range(5):
            await asyncio.sleep(0)
        assert kb_env.mouse_mock.scroll.call_args_list == [call(0, 1), call(0, -1)]
        assert kb._mouse_listener.suppress_event.call_count == 2
