"""FST-E (decision 12) pins: the pending-delay flush invariant.

Ruling: segment delays (``key|<ms>``) stay UNBOUNDED - a macro timeline may
legitimately wait minutes. The price of that ruling is the safety invariant the
maintainer named in the same decision: "flush out queued delayed events on focus
group change". So on every event that ends the CURRENT CONTEXT for a playback -
focus-group change, macro abort, lifecycle pause, config reload - two things
must hold:

  PENDING  the sleeping segment must never fire again (no ghost injection into
           the app that is now in front), and
  OWED     a key the playback already pressed must be released by the event
           itself, not at some later point in a context that no longer exists.

Each pathway is pinned in two states: state A = a press is outstanding when the
event lands (the delay sits after a ``-key`` segment), state B = nothing is owed
(the delay sits after a release segment, so only a pending injection is at risk).

Harness: the real FST_Keyboard on the real asyncio loop, pynput controllers
mocked, the playback started through the product entry point
``start_macro_playback_repeat`` so its handle lands in the registry the flush
walks. The unbounded wait is replaced by a gate Event at the product's own delay
seam - the same blocking-exec seam shape ``tests/test_task_debt_pins.py`` uses -
so "still pending" and "the delay has now elapsed" are exact measured states with
no wall-clock sleeping.
"""
import asyncio
from unittest.mock import MagicMock

import pytest

from fst_data_types import Key_Event
from vk_codes import vk_codes_dict

VK_A = vk_codes_dict['a']
VK_D = vk_codes_dict['d']


def _gate_the_delay(kb, gate):
    '''Seam at the exact instant a real flush would land: the segment event has
    left, the playback parks on the gate instead of sleeping toward the next
    segment. Deliberately not a timer - the pin measures the playback/flush
    interaction, not how long an unbounded wait is.'''
    async def gated_execute_key_event(key_event, delay_times=[], with_delay=False):
        kb._output_manager.send_key_event(key_event)
        await gate.wait()

    kb._output_manager.execute_key_event = gated_execute_key_event


async def _pending_playback(kb, first_event):
    '''Start a real playback through the product entry point: first_event goes
    out, then the timeline parks in its delay.

    key_group = [first_event, press of d] - that second segment is the ghost
    injection to watch for once the gate opens.
    '''
    kb.loop = asyncio.get_running_loop()
    handle = kb.start_macro_playback_repeat('e_alias',
                                            [first_event, Key_Event(VK_D, True)])
    for _ in range(4):
        await asyncio.sleep(0)   # let the task send first_event and reach the gate
    return handle


def _sent(kb_mock):
    '''The injection log of the mocked controller: ('press'|'release', key).
    The key is the object the product hands pynput (a Key value, not always an
    int), so assertions count actions and use the ledger for identity.'''
    return [(call[0], str(call.args[0]) if call.args else None)
            for call in kb_mock.method_calls
            if call[0] in ('press', 'release')]


async def _ghosts_after_the_gate_opens(kb_mock, gate):
    '''Open the delay gate and give the loop its chance - a playback that the
    event failed to end would now inject its remaining segments. Returns only
    what was sent AFTER the gate opened, so callers assert on ghosts alone.'''
    before = len(_sent(kb_mock))
    gate.set()
    for _ in range(8):
        await asyncio.sleep(0)
    return _sent(kb_mock)[before:]


class TestFocusGroupChangeFlushes:
    @pytest.mark.asyncio
    async def test_group_change_releases_a_key_the_delay_still_owes(
            self, kb_env_ns, monkeypatch):
        # CONTRACT: a focus change does not leave a macro key down while the
        # playback sleeps toward its next segment
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        _gate_the_delay(kb, gate := asyncio.Event())
        handle = await _pending_playback(kb, Key_Event(VK_A, True))
        kb_mock.reset_mock()

        kb.update_args_and_groups('', startup=False)
        for _ in range(8):
            await asyncio.sleep(0)

        assert handle.done(), 'the pending playback must be ended'
        releases = [item for item in _sent(kb_mock) if item[0] == 'release']
        assert len(releases) == 1, _sent(kb_mock)   # exactly the owed key goes up
        assert kb._macro_held == {}, kb._macro_held
        assert kb._ledger.open_tickets() == [], kb._ledger.open_tickets()
        assert [item for item in await _ghosts_after_the_gate_opens(kb_mock, gate)
                if item[0] == 'press'] == []

    @pytest.mark.asyncio
    async def test_group_change_drops_a_pending_segment_injection(
            self, kb_env_ns, monkeypatch):
        # CONTRACT: nothing is owed here (the delay follows a release), so the
        # only risk is the ghost injection - and that must not happen either
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        _gate_the_delay(kb, gate := asyncio.Event())
        handle = await _pending_playback(kb, Key_Event(VK_A, False))
        kb_mock.reset_mock()

        kb.update_args_and_groups('', startup=False)
        for _ in range(8):
            await asyncio.sleep(0)

        assert handle.done(), 'the pending playback must be ended'
        assert [item for item in await _ghosts_after_the_gate_opens(kb_mock, gate)
                if item[0] == 'press'] == []


class TestMacroAbortFlushes:
    @pytest.mark.asyncio
    async def test_abort_releases_the_owed_key(self, kb_env_ns, monkeypatch):
        # CONTRACT: the F-A7 abort semantics, re-pinned inside this invariant
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        _gate_the_delay(kb, gate := asyncio.Event())
        handle = await _pending_playback(kb, Key_Event(VK_A, True))
        kb_mock.reset_mock()

        kb.interrupt_macro_by_name('e_alias')
        for _ in range(8):
            await asyncio.sleep(0)

        assert handle.done()
        releases = [item for item in _sent(kb_mock) if item[0] == 'release']
        assert len(releases) == 1, _sent(kb_mock)   # exactly the owed key goes up
        assert kb._ledger.open_tickets() == [], kb._ledger.open_tickets()
        assert [item for item in await _ghosts_after_the_gate_opens(kb_mock, gate)
                if item[0] == 'press'] == []

    @pytest.mark.asyncio
    async def test_abort_drops_a_pending_segment_injection(
            self, kb_env_ns, monkeypatch):
        # CONTRACT: an aborted playback owes nothing here, and still must not
        # inject later
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        _gate_the_delay(kb, gate := asyncio.Event())
        handle = await _pending_playback(kb, Key_Event(VK_A, False))
        kb_mock.reset_mock()

        kb.interrupt_macro_by_name('e_alias')
        for _ in range(8):
            await asyncio.sleep(0)

        assert handle.done()
        assert [item for item in await _ghosts_after_the_gate_opens(kb_mock, gate)
                if item[0] == 'press'] == []


class TestPauseFlushes:
    @pytest.mark.asyncio
    async def test_pause_releases_a_key_the_delay_still_owes(
            self, kb_env_ns, monkeypatch):
        # CONTRACT: pausing must not leave a macro key down
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        _gate_the_delay(kb, gate := asyncio.Event())
        handle = await _pending_playback(kb, Key_Event(VK_A, True))
        kb_mock.reset_mock()

        kb.control_toggle_pause()
        for _ in range(8):
            await asyncio.sleep(0)

        assert handle.done(), 'the pending playback must be ended'
        releases = [item for item in _sent(kb_mock) if item[0] == 'release']
        assert len(releases) == 1, _sent(kb_mock)   # exactly the owed key goes up
        assert kb.arg_manager.MANUAL_PAUSED is True
        assert [item for item in await _ghosts_after_the_gate_opens(kb_mock, gate)
                if item[0] == 'press'] == []

    @pytest.mark.asyncio
    async def test_pause_drops_a_pending_segment_injection(
            self, kb_env_ns, monkeypatch):
        # CONTRACT: while FST is paused no queued macro segment may fire - a
        # paused product injects nothing, whatever a timeline decided earlier
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        _gate_the_delay(kb, gate := asyncio.Event())
        handle = await _pending_playback(kb, Key_Event(VK_A, False))
        kb_mock.reset_mock()

        kb.control_toggle_pause()
        for _ in range(8):
            await asyncio.sleep(0)

        assert handle.done(), 'the pending playback must be ended'
        assert [item for item in await _ghosts_after_the_gate_opens(kb_mock, gate)
                if item[0] == 'press'] == []


class TestReloadFlushes:
    @pytest.mark.asyncio
    async def test_reload_releases_a_key_the_delay_still_owes(
            self, kb_env_ns, monkeypatch):
        # CONTRACT: a config reload replaces the generation the timeline was
        # built for; a key it still owes must go up at that moment
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        _gate_the_delay(kb, gate := asyncio.Event())
        handle = await _pending_playback(kb, Key_Event(VK_A, True))
        kb_mock.reset_mock()

        kb._reload_now()
        for _ in range(8):
            await asyncio.sleep(0)

        assert handle.done(), 'the pending playback must be ended'
        releases = [item for item in _sent(kb_mock) if item[0] == 'release']
        assert len(releases) == 1, _sent(kb_mock)   # exactly the owed key goes up
        assert kb._ledger.open_tickets() == [], kb._ledger.open_tickets()
        assert [item for item in await _ghosts_after_the_gate_opens(kb_mock, gate)
                if item[0] == 'press'] == []

    @pytest.mark.asyncio
    async def test_reload_drops_a_pending_segment_injection(
            self, kb_env_ns, monkeypatch):
        # CONTRACT: the reloaded config must not be typed into by the old
        # generation's remaining segments
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        _gate_the_delay(kb, gate := asyncio.Event())
        handle = await _pending_playback(kb, Key_Event(VK_A, False))
        kb_mock.reset_mock()

        kb._reload_now()
        for _ in range(8):
            await asyncio.sleep(0)

        assert handle.done(), 'the pending playback must be ended'
        assert [item for item in await _ghosts_after_the_gate_opens(kb_mock, gate)
                if item[0] == 'press'] == []


class TestMenuAndExitAlsoEndTheContext:
    @pytest.mark.asyncio
    async def test_return_to_menu_drops_a_pending_segment_injection(
            self, kb_env_ns, monkeypatch):
        # CONTRACT: the menu is a context end like a focus change - the user is
        # looking at the menu, and whatever is in front must not be typed into
        # by a timeline the menu already replaced (the reviewer measured this
        # press before the flush was added to this leg)
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        kb._mouse_listener = MagicMock()   # these legs stop both listeners
        _gate_the_delay(kb, gate := asyncio.Event())
        handle = await _pending_playback(kb, Key_Event(VK_A, False))
        kb_mock.reset_mock()

        kb.control_return_to_menu()
        for _ in range(8):
            await asyncio.sleep(0)

        assert handle.done(), 'the pending playback must be ended'
        assert await _ghosts_after_the_gate_opens(kb_mock, gate) == []

    @pytest.mark.asyncio
    async def test_exit_program_drops_a_pending_segment_injection(
            self, kb_env_ns, monkeypatch):
        # CONTRACT: a queued segment is never the last thing the process injects
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        kb._mouse_listener = MagicMock()   # these legs stop both listeners
        _gate_the_delay(kb, gate := asyncio.Event())
        handle = await _pending_playback(kb, Key_Event(VK_A, False))
        kb_mock.reset_mock()

        kb.control_exit_program('pin')
        for _ in range(8):
            await asyncio.sleep(0)

        assert handle.done(), 'the pending playback must be ended'
        assert await _ghosts_after_the_gate_opens(kb_mock, gate) == []


class TestTheListenerThreadLaneToo:
    @pytest.mark.asyncio
    async def test_a_playback_started_from_a_listener_thread_is_flushed(
            self, kb_env_ns, monkeypatch):
        # CONTRACT: the flush walks the handle registry, so it must reach the
        # lane the hook pump actually uses - start_macro_playback, whose handle
        # is a concurrent.futures Future, not an asyncio Task
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        _gate_the_delay(kb, gate := asyncio.Event())
        kb.loop = asyncio.get_running_loop()
        handle = kb.start_macro_playback('e_alias',
                                         [Key_Event(VK_A, True),
                                          Key_Event(VK_D, True)])
        for _ in range(6):
            await asyncio.sleep(0)
        kb_mock.reset_mock()

        kb.update_args_and_groups('', startup=False)
        for _ in range(8):
            await asyncio.sleep(0)

        assert handle.done(), 'the pending Future-lane playback must be ended'
        releases = [item for item in _sent(kb_mock) if item[0] == 'release']
        assert len(releases) == 1, _sent(kb_mock)
        assert kb._ledger.open_tickets() == [], kb._ledger.open_tickets()
        assert [item for item in await _ghosts_after_the_gate_opens(kb_mock, gate)
                if item[0] == 'press'] == []
