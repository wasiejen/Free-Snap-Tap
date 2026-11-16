"""F-A7 pins: ladder R2 task debt + the approved drain-attribution fix.

Design contract: estate `projects/estate/research/2026-11-16_fst-ticket-ledger.md`
(D) R2 - "macro cancel + repeat cancel drain their owed releases from the
ledger before returning; this is where the invariant first becomes TRUE instead
of hopeful" - plus the todo_inbox drain-attribution entry the maintainer
approved (the pinned test-signature edit is part of that approval).

Two lanes, pinned separately:
  L1  attribution is a PARAMETER of the drain calls, not shared keyboard state,
      so two legs on different threads cannot swap labels.
  L2  macro playback tickets are OWNERSHIP records (kind=press) that a cancel
      closes BY EMITTING the owed release; toggle latches get long-lived
      ownership tickets (shadow - the sweep's sends are byte-identical); the
      retire audit CLASSIFIES debt (macro = violation, toggle = expected-until-
      exit).

Harness: the real FST_Keyboard, mocked pynput controllers, the win32 filter
called directly (no live listeners). Deterministic seams only - asyncio Events
and threading Events, no sleeps.
"""
import asyncio
import threading

import pytest

from fst_data_types import (SOURCE_DRAIN, SOURCE_MACRO, SOURCE_TOGGLE,
                            TICKET_COMPLETED, TICKET_PRESS, TICKET_RELEASE,
                            TICKET_SCHEDULED, Ticket_Ledger)
from vk_codes import vk_codes_dict

VK_A = vk_codes_dict['a']
VK_D = vk_codes_dict['d']
VK_S = vk_codes_dict['s']


def _press_mock_releases(kb_mock):
    return [c for c in kb_mock.method_calls if c[0] == 'release']


def _new_tickets(ledger, seen):
    return [t for t in ledger.tickets() if t.seq not in seen]


def _arm_simulated_presses(kb, *vks):
    for vk in vks:
        kb.state_manager.set_simulated_key_press_state(vk, True)


def _zero_delays(kb):
    kb.arg_manager.MACRO_MAX_DELAY_IN_MS = 0
    kb.arg_manager.MACRO_MIN_DELAY_IN_MS = 0


# ===========================================================================
# L1 - drain attribution is a parameter, not shared state
# ===========================================================================

class TestL1DrainAttribution:

    def test_no_shared_drain_label_state_exists_anymore(self, kb_env_plain):
        """The F-A6 race had one shared label attribute per keyboard. It is
        gone by construction: no field, no setter, so there is nothing to
        swap between threads."""
        kb = kb_env_plain
        assert not hasattr(kb, '_drain_id')
        assert not hasattr(kb, 'begin_drain')
        assert not hasattr(kb, 'end_drain')

    def test_each_leg_label_reaches_the_tickets_its_own_call_emitted(
            self, kb_env_plain):
        """Every product drain leg passes its label down; the tickets its
        emissions create carry exactly that label (and a leg with no label gets
        the bare sweep name)."""
        kb = kb_env_plain
        ledger = kb._ledger
        cases = (('pause_toggle', 'pause'), ('return_to_menu', 'menu'),
                 ('exit_program', 'exit'), (None, 'bare'))
        for label, _tag in cases:
            kb.state_manager.reset_states_dicts()
            _arm_simulated_presses(kb, VK_A)
            seen = {t.seq for t in ledger.tickets()}
            kb.state_manager.release_all_currently_pressed_simulated_keys(label)
            new = _new_tickets(ledger, seen)
            assert [t.source_id for t in new] == [
                'simulated_sweep' if label is None
                else f'{label}.simulated_sweep'], (label, new)

    def test_two_threads_draining_at_once_keep_their_own_labels(self,
                                                                kb_env_ns):
        """THE race pin (the F-A6 reviewer's cross-thread case, now
        deterministic): leg A on the main thread and leg B on a worker thread
        are both mid-drain at the same instant - A opens its SECOND ticket
        while B's leg is blocked inside its first send. Under a shared label
        A's second ticket would carry B's label; attribution travels with the
        call, so it does not."""
        kb = kb_env_ns.kb
        ledger = kb._ledger
        _arm_simulated_presses(kb, VK_A, VK_D)
        kb_env_ns.kb_mock.reset_mock()

        worker_id = threading.get_ident()
        b_in_send = threading.Event()
        a_opened_second = threading.Event()
        real_send = kb._output_manager.send_key_event

        def seam(key_event):
            in_b = threading.get_ident() == worker_id
            if in_b:
                b_in_send.set()               # B is mid-send, its label active
                assert a_opened_second.wait(5)
            elif key_event.vk_code == VK_D:
                # A is about to emit its SECOND release - this is the instant
                # at which a shared label would have been read
                a_opened_second.set()
                assert b_in_send.wait(5)
            real_send(key_event)

        kb._output_manager.send_key_event = seam

        def leg_b():
            kb.state_manager.release_all_currently_pressed_simulated_keys(
                'return_to_menu')

        thread = threading.Thread(target=leg_b, name='leg_b')
        thread.start()
        kb.state_manager.release_all_currently_pressed_simulated_keys(
            'pause_toggle')
        thread.join(5)
        assert not thread.is_alive()

        labels = {t.source_id for t in ledger.tickets()
                  if t.source_kind == SOURCE_DRAIN}
        assert 'pause_toggle.simulated_sweep' in labels, labels
        assert 'return_to_menu.simulated_sweep' in labels, labels
        # no ticket was ever labelled with the OTHER leg's name by an open that
        # happened while that other leg was mid-send: every A ticket is A's
        a_tickets = [t for t in ledger.tickets()
                     if t.source_id == 'pause_toggle.simulated_sweep']
        b_tickets = [t for t in ledger.tickets()
                     if t.source_id == 'return_to_menu.simulated_sweep']
        assert len(a_tickets) == 2, a_tickets   # both of A's emissions
        assert len(b_tickets) == 2, b_tickets   # both of B's emissions
        assert ledger.open_tickets() == [], ledger.open_tickets()


# ===========================================================================
# L2a - macro task debt (the R2 semantics migration)
# ===========================================================================

class TestL2MacroTaskDebt:

    def _blocking_exec(self, kb, started):
        """Seam at the exact instant a real cancel lands: the press has left,
        the delay is in progress. Never completes, so the only way out is a
        cancel."""
        never = asyncio.Event()

        async def exec_send_then_block(key_event, delay_times=[], with_delay=False):
            kb._output_manager.send_key_event(key_event)
            started.set()
            await never.wait()

        kb._output_manager.execute_key_event = exec_send_then_block

    @pytest.mark.asyncio
    async def test_cancel_emits_exactly_the_owed_release(self, kb_env_ns):
        """The R2 migration: previously a cancel emitted NOTHING and the app
        kept the key. Now the cancel path drains: one release per held vk, in
        press order, and the press ticket closes."""
        from fst_data_types import Key_Event
        kb = kb_env_ns.kb
        _zero_delays(kb)
        ledger = kb._ledger
        started = asyncio.Event()
        self._blocking_exec(kb, started)
        kb_env_ns.kb_mock.reset_mock()

        task = asyncio.ensure_future(
            kb.macro_task([Key_Event(VK_A, True)], 'debt_alias'))
        await asyncio.wait_for(started.wait(), timeout=5)
        held = ledger.open_tickets(kind=TICKET_PRESS)
        assert [t.vk for t in held] == [VK_A], held
        assert [t.source_kind for t in held] == [SOURCE_MACRO], held
        assert [t.source_id for t in held] == ['debt_alias'], held
        assert len(_press_mock_releases(kb_env_ns.kb_mock)) == 0, 'not yet'

        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

        releases = _press_mock_releases(kb_env_ns.kb_mock)
        assert len(releases) == 1, releases          # exactly the owed release
        assert kb._macro_held == {}, kb._macro_held   # index emptied
        assert ledger.open_tickets() == [], ledger.open_tickets()
        assert ledger.tickets(vk=VK_A)[-1].state == TICKET_COMPLETED

    @pytest.mark.asyncio
    async def test_a_playback_that_releases_what_it_pressed_adds_no_send(
            self, kb_env_ns):
        """Byte-identical for a well-formed playback: press + release leaves
        nothing owed, so R2 adds no release and the ticket closes once."""
        from fst_data_types import Key_Event
        kb = kb_env_ns.kb
        _zero_delays(kb)
        ledger = kb._ledger
        kb_env_ns.kb_mock.reset_mock()

        await kb.macro_task([Key_Event(VK_A, True), Key_Event(VK_A, False)],
                            'clean_alias')

        releases = _press_mock_releases(kb_env_ns.kb_mock)
        assert len(releases) == 1, releases          # only the macro's own
        assert kb._macro_held == {}
        presses = [t for t in ledger.tickets(vk=VK_A) if t.kind == TICKET_PRESS]
        assert [t.state for t in presses] == [TICKET_COMPLETED], presses
        assert ledger.open_tickets() == []

    def test_repeat_cancel_drains_its_alias_debt(self, kb_env_ns):
        """Research (D) R2 names the repeat lane too: cancelling the repeat task
        does not cancel the playback's physical debt, so stop_all_repeating_keys
        drains it before returning."""
        kb = kb_env_ns.kb
        ledger = kb._ledger
        kb._output_manager.repeat_thread_dict = {'ke': (_RepeatStub('rep_alias'),
                                                        _DoneStub())}
        ticket = kb.open_press_ticket(VK_S, SOURCE_MACRO, 'rep_alias')
        kb._macro_held['rep_alias'] = {VK_S: ticket}
        kb_env_ns.kb_mock.reset_mock()

        kb.state_manager.stop_all_repeating_keys()

        assert len(_press_mock_releases(kb_env_ns.kb_mock)) == 1
        assert kb._macro_held == {}
        assert ledger.open_tickets() == []
        assert ticket.state == TICKET_COMPLETED

    def test_quit_legs_drain_every_alias_before_the_sweeps(self, kb_env_plain):
        """The invariant's macro half at teardown: control_exit_program closes
        outstanding macro debt (and the ledger sees zero open tickets after)."""
        kb = kb_env_plain
        ticket = kb.open_press_ticket(VK_D, SOURCE_MACRO, 'any_alias')
        kb._macro_held['any_alias'] = {VK_D: ticket}

        kb.control_exit_program('pin')

        assert ticket.state == TICKET_COMPLETED
        assert kb.ledger_open_count(expected_source_kinds=(SOURCE_TOGGLE,)) == 0
    def test_a_second_drain_of_the_same_alias_is_harmless(self, kb_env_plain):
        """The F-A7 reviewer P1 crash class: two drains racing one alias (a
        macro-cancel drain on the loop thread and a quit/pause drain on the
        pump) must not raise. The drain CLAIMS the alias dict with one pop, so
        the loser simply finds nothing."""
        from unittest.mock import MagicMock
        kb = kb_env_plain
        stub_handle = MagicMock()
        stub_handle.done.return_value = False   # playback still running
        kb._macro_task_dict['al'] = stub_handle
        ticket = kb.open_press_ticket(VK_A, SOURCE_MACRO, 'al')
        kb._macro_held['al'] = {VK_A: ticket}

        first = kb.drain_macro_debt(alias='al')
        second = kb.drain_macro_debt(alias='al')

        assert first == [VK_A] and second == [], (first, second)
        assert ticket.state == TICKET_COMPLETED
        assert kb._macro_held == {}

    def test_a_press_recorded_after_a_claim_stays_tracked(self, kb_env_plain):
        """The other half of the same race: a playback that records a press
        while a drain is claiming the alias must not have its new debt dropped
        (the pre-fix version popped entries in place and could orphan them)."""
        from fst_data_types import Key_Event
        from unittest.mock import MagicMock
        kb = kb_env_plain
        stub_handle = MagicMock()
        stub_handle.done.return_value = False   # playback still running
        kb._macro_task_dict['al'] = stub_handle
        kb._macro_held['al'] = {VK_A: kb.open_press_ticket(VK_A, SOURCE_MACRO, 'al')}

        kb.drain_macro_debt(alias='al')                       # claims
        kb._macro_press_recorded('al', Key_Event(VK_D, True))  # concurrent leg
        assert 'al' in kb._macro_held and list(kb._macro_held['al']) == [VK_D]

        assert kb.drain_macro_debt(alias='al') == [VK_D]
        assert kb.ledger_open_count() == 0

    def test_the_quit_drain_cancels_the_playback_it_drains(self, kb_env_plain):
        """Reviewer P2-2: `send_key_event` has no release veto, so a playback
        left running could add its own release after the drain's. The drain
        interrupts the playback first."""
        from unittest.mock import MagicMock
        kb = kb_env_plain
        handle = MagicMock()
        handle.done.return_value = False   # the playback is still running
        kb._macro_task_dict['al'] = handle
        ticket = kb.open_press_ticket(VK_D, SOURCE_MACRO, 'al')
        kb._macro_held['al'] = {VK_D: ticket}

        kb.control_exit_program('pin')

        assert handle.cancel.called
        assert ticket.state == TICKET_COMPLETED

    def test_a_drain_that_re_enters_during_a_send_does_not_raise(
            self, kb_env_plain):
        """The reviewer's P1 class, made deterministic without threads: a second
        drain for the same alias runs while the first one is inside its release
        send (the loop-thread cancel drain and a pump-thread quit drain look
        exactly like this). Under the pre-cure code the second drain popped the
        shared inner dict from under the first one -> KeyError, which escaped
        macro_task's CancelledError handler (the task ended NOT-cancelled) and
        aborted control_exit_program before STOPPED. The claim-then-iterate
        design cannot hit it."""
        from unittest.mock import MagicMock
        kb = kb_env_plain
        handle = MagicMock()
        handle.done.return_value = False   # playback still running
        kb._macro_task_dict['al'] = handle
        ticket = kb.open_press_ticket(VK_A, SOURCE_MACRO, 'al')
        kb._macro_held['al'] = {VK_A: ticket,
                                VK_D: kb.open_press_ticket(VK_D, SOURCE_MACRO, 'al')}
        real_send = kb._output_manager.send_key_event
        state = {'done': False}

        def seam(key_event):
            if not state['done']:
                state['done'] = True
                kb.drain_macro_debt(alias='al')   # the racing drain, mid-send
            real_send(key_event)

        kb._output_manager.send_key_event = seam

        released = kb.drain_macro_debt(alias='al')

        # the outer drain keeps its own claimed view and finishes both releases;
        # under the pre-cure code the inner drain had already popped VK_D out of
        # the shared dict and the outer's `held.pop(VK_D)` raised KeyError
        assert released == [VK_A, VK_D], released
        assert ticket.state == TICKET_COMPLETED
        assert kb._macro_held == {}, 'the re-entrant drain left the index dirty'


class _RepeatStub:
    def __init__(self, alias_name):
        self.alias_name = alias_name

    def cancel_playback(self):
        pass


class _DoneStub:
    def done(self):
        return True


async def _noop_coro():
    return None




# ===========================================================================
# L2b - toggle ownership tickets (shadow: the sweep is byte-identical)
# ===========================================================================

class TestL2ToggleOwnership:

    def _engage(self, kb, vk):
        kb.state_manager.set_toggle_state(vk, True)

    def test_engage_opens_and_release_closes_the_ownership_ticket(
            self, kb_env_plain):
        kb = kb_env_plain
        ledger = kb._ledger
        seen = {t.seq for t in ledger.tickets()}

        self._engage(kb, VK_S)
        opened = _new_tickets(ledger, seen)
        assert [t.kind for t in opened] == [TICKET_PRESS], opened
        assert [t.source_kind for t in opened] == [SOURCE_TOGGLE], opened
        assert [t.source_id for t in opened] == [f'toggle:{VK_S}'], opened
        assert ledger.open_presses()[0].vk == VK_S

        kb.state_manager.set_toggle_state(VK_S, False)
        assert ledger.open_tickets() == [], ledger.open_tickets()

    def test_a_rewritten_true_latch_does_not_mint_a_second_owner(
            self, kb_env_plain):
        kb = kb_env_plain
        ledger = kb._ledger
        seen = {t.seq for t in ledger.tickets()}

        for _ in range(3):
            self._engage(kb, VK_S)
        assert len(_new_tickets(ledger, seen)) == 1, _new_tickets(ledger, seen)

    def test_the_quit_sweep_closes_toggle_tickets_and_sends_the_same_count(
            self, kb_env_plain):
        """Shadow discipline for toggles: the release BEHAVIOR is unchanged
        (exactly one release per latched key), the ledger only gains the
        ownership record - and clean exit proves completeness."""
        kb = kb_env_plain
        ledger = kb._ledger
        seen = {t.seq for t in ledger.tickets()}
        self._engage(kb, VK_S)
        kb.state_manager._toggle_states_dict_keys = [VK_S]
        before = sum(1 for c in _controller_calls(kb) if c[0] == 'release')

        kb.state_manager.release_all_toggles('exit_program')

        after = sum(1 for c in _controller_calls(kb) if c[0] == 'release')
        assert after - before == 1, (before, after)   # exactly the latch release
        assert ledger.open_tickets() == [], ledger.open_tickets()
        ids = sorted({t.source_id for t in _new_tickets(ledger, seen)})
        assert ids == ['exit_program.toggle_sweep', f'toggle:{VK_S}'], ids

    def test_the_toggle_sweep_inherits_the_label_of_the_facade_call(self,
                                                                    kb_env_plain):
        """Reviewer P2-3: the quit leg reaches the toggle sweep THROUGH the
        simulated-key facade, so the leg label must be threaded the whole way
        (F-A6 composed these ids; a lost label is an attribution regression)."""
        kb = kb_env_plain
        ledger = kb._ledger
        self._engage(kb, VK_S)
        kb.state_manager._toggle_states_dict_keys = [VK_S]

        kb.release_all_currently_pressed_simulated_keys('exit_program')

        ids = {t.source_id for t in ledger.tickets()
               if t.source_kind == SOURCE_TOGGLE
               and t.kind == TICKET_RELEASE}
        assert ids == {'exit_program.toggle_sweep'}, ids

    def test_clean_exit_closes_toggle_debt_too(self, kb_env_plain):
        kb = kb_env_plain
        self._engage(kb, VK_S)
        kb.state_manager._toggle_states_dict_keys = [VK_S]

        kb.control_exit_program('pin')

        assert kb._ledger.open_tickets() == [], kb._ledger.open_tickets()
        # and the invariant classifies it correctly even if a latch survived:
        assert kb._ledger.open_presses() == []


# ===========================================================================
# L2c - the retire audit classifies the debt it finds
# ===========================================================================

class TestL2AuditClasses:

    def _store(self):
        return Ticket_Ledger()

    def test_macro_debt_is_a_violation_toggle_debt_is_expected(self):
        ledger = self._store()
        macro = ledger.open(VK_A, SOURCE_MACRO, 'alias', TICKET_PRESS, 1)
        toggle = ledger.open(VK_S, SOURCE_TOGGLE, f'toggle:{VK_S}',
                             TICKET_PRESS, 1)
        assert ledger.audit('pin', expected_source_kinds=(SOURCE_TOGGLE,)) == 1
        assert macro.state == TICKET_SCHEDULED      # audit repairs nothing
        assert toggle.state == TICKET_SCHEDULED
        ledger.close(toggle)
        assert ledger.audit('pin', expected_source_kinds=(SOURCE_TOGGLE,)) == 1
        ledger.close(macro)
        assert ledger.audit('pin', expected_source_kinds=(SOURCE_TOGGLE,)) == 0

    def test_unclassified_debt_is_always_a_violation(self):
        ledger = self._store()
        ledger.open(VK_D, SOURCE_DRAIN, 'sweep', TICKET_RELEASE, 1)
        assert ledger.audit('pin') == 1
        assert ledger.audit('pin', expected_source_kinds=(SOURCE_TOGGLE,)) == 1


def _controller_calls(kb):
    """every press/release the mocked pynput controllers recorded"""
    calls = []
    for controller in kb._output_manager._controller_dict.values():
        calls.extend(controller.method_calls)
    return calls
