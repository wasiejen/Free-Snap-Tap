"""F-A6 ticket-ledger seed pins (ladder R0 + R1 as scoped for this unit).

Design contract: estate
`projects/estate/research/2026-11-16_fst-ticket-ledger.md` (shape {vk: [Ticket]}
on FST_Keyboard as a sibling of `_runtime`, the six reserved fields, the
generation-independence rule, the single-store discipline, the ladder).

This unit is SHADOW MODE: the ledger is written, NEVER read by a decision, and
no release semantics move. The four drain paths of the task spec get ticket
open/close recording around their existing emissions - hold-release drain
(`_release_tap_group_holds`), the simulated-key sweep and the toggle sweep the
control legs run (named by drain context: pause_toggle / return_to_menu /
exit_program), and the macro-abort exit (which emits nothing - pinned as the
honest gap R2 inherits).

Harness: the real FST_Keyboard with mocked pynput controllers (conftest
kb_env_ns); the win32 filter is called directly, no live listeners (repo gate
rule). No sleeps anywhere.
"""
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from vk_codes import vk_codes_dict

from fst_data_types import (SOURCE_DRAIN, SOURCE_TOGGLE, TICKET_COMPLETED,
                            TICKET_INJECTED, TICKET_RELEASE, TICKET_SCHEDULED,
                            Ticket, Ticket_Ledger)
from kb_helpers import build, down

VK_A = vk_codes_dict['a']
VK_D = vk_codes_dict['d']
VK_W = vk_codes_dict['w']
VK_S = vk_codes_dict['s']

TWO_GROUPS = [['(TAP_1)', ['a', 'd']], ['(TAP_2)', ['w', 's']]]


def _all_tickets(ledger):
    return ledger.tickets()


def _new_since(ledger, seen_seqs):
    return [t for t in _all_tickets(ledger) if t.seq not in seen_seqs]


def _released_vks(kb_mock):
    """the vk codes that actually reached the controller as releases"""
    return [call.args[0].vk for call in kb_mock.method_calls
            if call[0] == 'release']


def _arm_tap_holds(kb, *vks):
    """arm a real app-level hold per group through the product's own legs"""
    for vk in vks:
        group = kb._tap_owner_by_vk[vk]
        group.update_tap_states(vk, True)
        group.set_last_key_send(vk)
        kb.state_manager.set_simulated_key_press_state(vk, True)


WM_KEYUP = 257
LLKHF_INJECTED = 0x10  # the win32 injected/simulated flag bit (U359 contract)


def _fire_injected_release(kb, vk):
    """One simulated KEYUP of `vk` through the real filter: the physical
    DELIVERY of an owed release ticket (F-A9/R4 closes at this instant)."""
    kb.keyboard_win32_event_filter(
        WM_KEYUP, SimpleNamespace(vkCode=vk, time=9000,
                                  flags=LLKHF_INJECTED))


def _arm_simulated_presses(kb, *vks):
    for vk in vks:
        kb.state_manager.set_simulated_key_press_state(vk, True)


# ===========================================================================
# (a) ticket open/close pairing, count-exact, per drain path
# ===========================================================================

class TestR1DrainPairing:

    def test_tap_hold_drain_opens_tickets_the_delivery_closes(self,
                                                              kb_env_ns):
        """Open-at-emit, close-at-DELIVERY (F-A9, ladder R4, maintainer ruling
        GO 2026-11-16). Pre-R4 this pin asserted COMPLETED straight after the
        drain call - the shadow-mode (R0) bookkeeping the ruling superseded:
        the hold-drain ticket must stay OPEN across the send, that is what lets
        the sim-release veto consult see the owed release (the named payoff,
        closing the F-A4 P1-1 re-arm window). The arriving simulated release of
        the vk is the ticket's completion, count-exact."""
        kb = kb_env_ns.kb
        build(kb, taps=TWO_GROUPS)
        _arm_tap_holds(kb, VK_A, VK_W)
        ledger = kb._ledger
        seen = {t.seq for t in _all_tickets(ledger)}
        kb_mock = kb_env_ns.kb_mock
        kb_mock.reset_mock()

        kb._release_tap_group_holds()

        new = _new_since(ledger, seen)
        releases = _released_vks(kb_mock)
        assert len(new) == len(releases) == 2, (new, releases)
        # open-at-emit: the owed release outlives the send until it is delivered
        assert [t.state for t in new] == [TICKET_SCHEDULED] * 2, new
        assert sorted(t.vk for t in new) == sorted(releases) == [VK_A, VK_W]
        assert all(t.kind == TICKET_RELEASE for t in new)
        assert all(t.source_kind == SOURCE_DRAIN for t in new)
        assert all(t.source_id == 'tap_group_holds' for t in new)
        assert len(ledger.open_tickets()) == 2, ledger.open_tickets()

        # delivery is the close: each owed release re-enters the filter and the
        # veto-leg consult settles exactly one ticket (FIFO, count-exact)
        for vk in (VK_A, VK_W):
            _fire_injected_release(kb, vk)
        assert all(t.state == TICKET_COMPLETED for t in new), new
        assert ledger.open_tickets() == [], ledger.open_tickets()

    def test_a_group_without_a_hold_opens_no_ticket(self, kb_env_ns):
        kb = kb_env_ns.kb
        build(kb, taps=TWO_GROUPS)
        ledger = kb._ledger
        seen = {t.seq for t in _all_tickets(ledger)}

        kb._release_tap_group_holds()

        assert _new_since(ledger, seen) == [], 'no hold -> no debt recorded'

    def test_simulated_sweep_pairs_tickets_with_the_releases_it_emits(
            self, kb_env_ns):
        kb = kb_env_ns.kb
        _arm_simulated_presses(kb, VK_A, VK_D, VK_W)
        ledger = kb._ledger
        seen = {t.seq for t in _all_tickets(ledger)}
        kb_env_ns.kb_mock.reset_mock()

        kb.state_manager.release_all_currently_pressed_simulated_keys()

        new = _new_since(ledger, seen)
        releases = _released_vks(kb_env_ns.kb_mock)
        assert len(new) == len(releases), (new, releases)
        assert sorted(t.vk for t in new) == sorted(releases)
        assert all(t.state == TICKET_COMPLETED for t in new), new
        assert all(t.source_kind == SOURCE_DRAIN for t in new)
        assert all(t.source_id == 'simulated_sweep' for t in new)
        assert ledger.open_tickets() == []

    def test_a_press_that_is_not_down_opens_no_ticket(self, kb_env_ns):
        """count-exact in the negative direction too: the sweep emits for the
        keys it believes are down, and the ledger records exactly those."""
        kb = kb_env_ns.kb
        _arm_simulated_presses(kb, VK_A)
        ledger = kb._ledger
        seen = {t.seq for t in _all_tickets(ledger)}

        kb.state_manager.release_all_currently_pressed_simulated_keys()

        new = _new_since(ledger, seen)
        assert [t.vk for t in new] == [VK_A], new

    def test_toggle_sweep_pairs_tickets_as_toggle_source(self, kb_env_ns):
        kb = kb_env_ns.kb
        sm = kb.state_manager
        sm.set_toggle_state(VK_S, True)
        sm._toggle_states_dict_keys = [VK_S]
        ledger = kb._ledger
        seen = {t.seq for t in _all_tickets(ledger)}
        kb_env_ns.kb_mock.reset_mock()

        sm.release_all_toggles()

        new = _new_since(ledger, seen)
        releases = _released_vks(kb_env_ns.kb_mock)
        assert [t.vk for t in new] == releases == [VK_S], (new, releases)
        assert new[0].source_kind == SOURCE_TOGGLE
        assert new[0].source_id == 'toggle_sweep'
        assert new[0].state == TICKET_COMPLETED
        assert ledger.open_tickets() == []

    def test_each_control_drain_leg_names_itself_in_its_tickets(self,
                                                                kb_env_plain):
        """The delegation's attribution: the pause leg, the return-to-menu leg
        and the STOPPING teardown leg each get their own source_id, so the
        ledger can answer WHICH leg owed a release. kb_env_plain (both
        listeners mocked) because these legs also order the listener stops."""
        kb = kb_env_plain
        ledger = kb._ledger

        expected = []
        for leg, label in ((kb.control_toggle_pause, 'pause_toggle'),
                           (kb.control_return_to_menu, 'return_to_menu'),
                           (kb.control_exit_program, 'exit_program')):
            if label == 'pause_toggle':
                # kb_env_plain leaves the flags as constructed; the PAUSE leg is
                # the one that runs the release drain, so enter it unpaused
                kb.arg_manager.WIN32_FILTER_PAUSED = False
                kb.arg_manager.MANUAL_PAUSED = False
            _arm_simulated_presses(kb, VK_A)
            seen = {t.seq for t in _all_tickets(ledger)}
            leg()
            new = _new_since(ledger, seen)
            ids = {t.source_id for t in new}
            # the id carries both halves: "<leg>.<sweep>" (or the bare sweep
            # when no leg label is set), so the ledger answers which leg asked
            # and which emission it caused
            assert any(t_id == label or t_id.startswith(label + '.')
                       for t_id in ids), (label, ids)
            assert all(t.state == TICKET_COMPLETED for t in new), new
            expected.append(label)

        assert ledger.open_tickets() == [], ledger.open_tickets()

    def test_the_reload_lane_itself_opens_no_tickets(self, kb_env_ns):
        """Honest scope fact (recorded, not assumed): F-A4's reload body
        `_reload_now` emits no releases at all, so it owes nothing and opens
        nothing - the alt+DELETE drain is the pause leg above."""
        kb = kb_env_ns.kb
        ledger = kb._ledger
        seen = {t.seq for t in _all_tickets(ledger)}

        kb._reload_now()

        assert _new_since(ledger, seen) == []


# ===========================================================================
# (b) the ledger is a generation-independent SIBLING of _runtime
# ===========================================================================

class TestR0LedgerSurvivesSwap:

    def test_the_ledger_object_identity_survives_a_snapshot_swap(self, kb_env_ns):
        kb = kb_env_ns.kb
        build(kb, taps=TWO_GROUPS)
        ledger_before = kb._ledger
        gen_before = kb._runtime.gen_id
        _arm_tap_holds(kb, VK_A)
        # a debt opened under the OLD generation, deliberately left open
        owed = kb._ledger.open(VK_A, SOURCE_DRAIN, 'pin_open_debt',
                               TICKET_RELEASE, kb.current_gen_id())
        seen = {t.seq for t in _all_tickets(kb._ledger)}

        build(kb, taps=TWO_GROUPS)          # a full snapshot swap

        assert kb._ledger is ledger_before, 'the swap must not touch the ledger'
        assert kb._runtime.gen_id != gen_before, 'the swap did not happen'
        still = kb._ledger.tickets()
        assert any(t.seq == owed.seq for t in still), 'cross-generation debt lost'
        survived = [t for t in still if t.seq == owed.seq][0]
        assert survived.gen_id == gen_before, survived
        assert survived.state == TICKET_SCHEDULED
        # the tickets the swap's own hold drain emitted are new; since F-A9
        # (R4) a released hold stays SCHEDULED until its delivery arrives
        # (open-until-delivered is the R4 lifecycle - tests/
        # test_veto_ledger_pins.py), so that class is expected-open here
        new = [t for t in _new_since(kb._ledger, seen) if t.seq != owed.seq]
        assert all(t.gen_id == kb._runtime.gen_id
                   or t.state == TICKET_COMPLETED
                   or (t.kind == TICKET_RELEASE
                       and t.source_kind == SOURCE_DRAIN)
                   for t in new), new

    def test_the_ledger_is_a_sibling_not_part_of_a_generation(self, kb_env_ns):
        """Structural proof of the ownership rule: the snapshot cannot hold a
        ledger reference (__slots__ has no such field), and the runtime's
        ledger is not any snapshot's attribute."""
        from fst_keyboard import Runtime_Snapshot
        kb = kb_env_ns.kb
        slots = list(Runtime_Snapshot.__slots__)
        assert not any('ledger' in name.lower() for name in slots), slots
        assert kb._ledger is not kb._runtime
        assert getattr(kb._runtime, '_ledger', None) is not kb._ledger

    def test_the_retiring_generation_is_audited_not_repaired(self, kb_env_ns):
        """Shadow mode: the swap NAMES a generation that dies owing tickets and
        changes nothing - the debt stays open for the next consumer (R2+)."""
        kb = kb_env_ns.kb
        build(kb, taps=TWO_GROUPS)
        gen_dying = kb._runtime.gen_id
        kb._ledger.open(VK_D, SOURCE_DRAIN, 'pin_dying_gen', TICKET_RELEASE,
                        gen_dying)
        seen_before = {t.seq for t in _all_tickets(kb._ledger)}

        build(kb, taps=TWO_GROUPS)

        open_of_dying = kb._ledger.open_tickets(gen_id=gen_dying)
        assert [t.vk for t in open_of_dying] == [VK_D], open_of_dying
        assert kb._ledger.audit('pin', gen_id=gen_dying) == 1
        assert {t.seq for t in _all_tickets(kb._ledger)} >= seen_before


# ===========================================================================
# (c) the teardown invariant: nothing dies owing an open ticket
# ===========================================================================

class TestR1TeardownInvariant:

    def test_clean_exit_program_teardown_leaves_only_undeliverable_holds(
            self, kb_env_plain):
        """The F-A6 invariant, restated for the R4 lifecycle (maintainer
        ruling GO 2026-11-16): after the STOPPING teardown drain the sweep and
        toggle tickets are all COMPLETED (they close at send, untouched by
        R4), and the only open tickets are exactly the tap_group_holds
        releases - under open-until-delivered their delivery never comes in
        this harness shape (the exit stops the listeners, so no simulated
        callback re-enters the filter). In production the delivery usually
        still arrives before the stop lands; an undelivered one stays open as
        NAMED, [StuckKeyWatch]-aging scheduled debt (the research TOP-3 risk-3
        class with the filed drain-side compaction), never silently closed.
        Pre-R4 this pin asserted zero open tickets - the close-at-send
        bookkeeping the ruling superseded."""
        kb = kb_env_plain
        build(kb, taps=TWO_GROUPS)
        _arm_tap_holds(kb, VK_A, VK_W)
        _arm_simulated_presses(kb, VK_S)

        kb.control_exit_program('pin')

        open_now = kb._ledger.open_tickets()
        assert sorted(t.vk for t in open_now) == [VK_A, VK_W], open_now
        assert all(t.source_id.endswith('tap_group_holds')
                   and t.state == TICKET_SCHEDULED for t in open_now), open_now
        assert kb._ledger.open_presses() == []
        assert kb.ledger_open_count() == 2
        tally = kb._ledger.counts()
        assert tally[TICKET_INJECTED] == 0
        # the sweep emits only for VK_S (the hold drain cleared the simulated
        # press states of VK_A/VK_W first, as before R4) and closes it at send
        assert tally[TICKET_COMPLETED] == 1, tally

    def test_a_rebuild_retires_a_generation_that_owes_nothing(self, kb_env_ns):
        """The generation-side half of the invariant, asserted in the teardown
        shape the product actually has: a rebuild drains the holds of the
        generation it retires. Under the R4 lifecycle those hold releases stay
        open until DELIVERED, so the pin drives the deliveries through the
        filter and only then asks the question - once delivered, the retiring
        generation owes nothing (F-A9, maintainer ruling 2026-11-16)."""
        kb = kb_env_ns.kb
        build(kb, taps=TWO_GROUPS)
        gen_before = kb._runtime.gen_id
        _arm_tap_holds(kb, VK_A, VK_S)

        build(kb, taps=TWO_GROUPS)
        for vk in (VK_A, VK_S):
            _fire_injected_release(kb, vk)

        assert kb._ledger.open_tickets(gen_id=gen_before) == [], \
            'a generation died owning open tickets'

    def test_the_invariant_can_name_debt_when_it_is_broken(self, kb_env_ns):
        """The check must be able to FAIL: an un-closed release stays visible
        (this is what makes the R2 drain work possible)."""
        kb = kb_env_ns.kb
        build(kb, taps=TWO_GROUPS)
        owed = kb._ledger.open(VK_W, SOURCE_DRAIN, 'pin_broken', TICKET_RELEASE,
                               kb.current_gen_id())

        assert kb.ledger_open_count() == 1
        assert kb._ledger.open_tickets()[0].seq == owed.seq
        kb._ledger.close(owed)
        assert kb.ledger_open_count() == 0


# ===========================================================================
# (d) the R4 veto-consult contract, and no read-modify-write path
# ===========================================================================

class TestR4VetoConsultContract:

    def test_an_open_release_ticket_flips_the_release_veto_and_is_consumed(
            self, kb_env_ns):
        """The R4 consult contract (F-A9, maintainer ruling GO 2026-11-16).
        This pin RETIRES the R0 shadow proof at exactly this leg ("an open
        ticket changes no filter decision" - the ruling's whole point was that
        the veto's DATA SOURCE moves to the ledger, last rung, pinned). With
        an open release ticket for the very vk the veto leg decides about, the
        decision FLIPS (delivered, not suppressed) and the consult closes the
        ticket - one arrival, one ticket, completed. Without the ticket the
        decision is the pre-R4 one, so the two un-probed runs bracket the
        flipped probe run as an inequality, not a coincidence."""
        kb = kb_env_ns.kb
        results = []
        for probe in (False, True, False):
            build(kb, taps=[['(TAP_1)', ['a']]])
            down(kb, VK_A, 1000)
            # the rebuild above drained the PREVIOUS run's armed hold, and
            # since R4 that release sits open until delivered - deliver it from
            # the ledger itself so the measured decision consults exactly the
            # ticket shape this pin states (probe or none)
            _fire_injected_release(kb, VK_A)
            if probe:
                kb._ledger.open(VK_A, SOURCE_DRAIN, 'pin_shadow_probe',
                                TICKET_RELEASE, kb.current_gen_id())
            before = kb._listener.suppress_event.call_count
            kb._win32_event_filter(VK_A, 1001, False, True)
            results.append(kb._listener.suppress_event.call_count > before)
            if probe:
                settled = [t for t in kb._ledger.tickets()
                           if t.source_id == 'pin_shadow_probe']
                assert len(settled) == 1, (
                    'the delivery consult lost the probe ticket')
                assert settled[0].state == TICKET_COMPLETED, settled[0]
        assert results == [True, False, True], results

    def test_high_seq_reports_the_highest_issued_seq(self, kb_env_ns):
        """The status-dump high-water is a tracked value, not the counter's
        private next-value (F-A6 reviewer P2-5)."""
        ledger = kb_env_ns.kb._ledger
        first = ledger.open(VK_A, SOURCE_DRAIN, 'pin_seq', TICKET_RELEASE, 1)
        second = ledger.open(VK_D, SOURCE_DRAIN, 'pin_seq', TICKET_RELEASE, 1)
        assert ledger.high_seq() == second.seq == first.seq + 1

    def test_a_bucket_is_never_rebound_so_a_second_writer_cannot_lose_a_ticket(
            self, kb_env_ns):
        """The F-A6 reviewer P1-1 contract: compaction prunes IN PLACE, so the
        list object a writer holds mid-flight is always the live one, and open
        debt is never the thing that gets dropped."""
        ledger = Ticket_Ledger(max_per_vk=3)
        held = ledger.open(VK_A, SOURCE_DRAIN, 'pin_hold', TICKET_RELEASE, 1)
        bucket_ref = ledger._by_vk[VK_A]
        for _ in range(30):
            ledger.close(ledger.open(VK_A, SOURCE_DRAIN, 'pin_cycle',
                                     TICKET_RELEASE, 1))
        assert ledger._by_vk[VK_A] is bucket_ref, 'the bucket was rebound'
        # a writer that grabbed the list before the 30 prunes still lands its
        # ticket in the live history (that is exactly what the rebind-based
        # prune used to lose):
        late = Ticket(0, SOURCE_DRAIN, 'pin_late_writer', 1, TICKET_RELEASE,
                      99999, TICKET_SCHEDULED, False)
        bucket_ref.append(late)
        assert any(t.source_id == 'pin_late_writer'
                   for t in ledger.tickets(vk=VK_A)), 'the late append was lost'
        assert any(t.seq == held.seq for t in ledger.open_tickets())

    def test_attribution_is_the_callers_parameter_not_leftover_state(
            self, kb_env_plain):
        """F-A7 (L1) replaced the F-A6 shared label: two consecutive legs get
        their own ids and a leg that passes no label gets the bare sweep name -
        so no leg can inherit another leg's attribution."""
        kb = kb_env_plain
        ledger = kb._ledger
        sm = kb.state_manager
        ids = []
        for label in ('outer_leg', None, 'inner_leg'):
            sm.reset_states_dicts()
            sm.set_simulated_key_press_state(VK_A, True)
            seen = {t.seq for t in ledger.tickets()}
            sm.release_all_currently_pressed_simulated_keys(label)
            ids.append([t.source_id for t in _new_since(ledger, seen)])
        assert ids == [['outer_leg.simulated_sweep'], ['simulated_sweep'],
                       ['inner_leg.simulated_sweep']], ids

    def test_the_store_exposes_no_read_modify_write_path(self, kb_env_ns):
        """The single-store discipline, asserted: the public API is only
        open / mark / close / read / audit, every reader hands back a NEW list,
        and no transition takes a second field to update."""
        ledger = kb_env_ns.kb._ledger
        public = {name for name in dir(ledger) if not name.startswith('_')}
        assert public == {'MAX_PER_VK', 'audit', 'close', 'counts', 'high_seq',
                          'log', 'mark', 'open', 'open_presses', 'open_tickets',
                          'tickets'}, public

        ledger.open(VK_A, SOURCE_DRAIN, 'pin_snap', TICKET_RELEASE, 1)
        first = ledger.tickets(vk=VK_A)
        second = ledger.tickets(vk=VK_A)
        assert first is not second
        assert first[0] is second[0]
        first.clear()                      # caller mutation must not reach the store
        assert len(ledger.tickets(vk=VK_A)) == 1

    def test_state_transitions_are_single_attribute_stores(self, kb_env_ns):
        """`mark` flips exactly one field; the ticket object itself is never
        replaced, so a pump reader holding it never sees a torn compound."""
        ledger = kb_env_ns.kb._ledger
        ticket = ledger.open(VK_D, SOURCE_DRAIN, 'pin_store', TICKET_RELEASE, 1)
        assert ticket.state == TICKET_SCHEDULED
        returned = ledger.mark(ticket, TICKET_INJECTED)
        assert returned is ticket
        assert ticket.state == TICKET_INJECTED
        assert ledger.close(ticket) is ticket
        assert ticket.state == TICKET_COMPLETED
        assert ledger.tickets(vk=VK_D)[0] is ticket

    def test_unknown_kind_state_or_source_is_refused(self, kb_env_ns):
        """The reserved vocabulary is enforced at the store, not by convention
        at the call sites (the fields the ladder depends on)."""
        ledger = kb_env_ns.kb._ledger
        with pytest.raises(ValueError):
            ledger.open(VK_A, 'not_a_source', 'x', TICKET_RELEASE, 1)
        with pytest.raises(ValueError):
            ledger.open(VK_A, SOURCE_DRAIN, 'x', 'squeeze', 1)
        ticket = ledger.open(VK_A, SOURCE_DRAIN, 'x', TICKET_RELEASE, 1)
        with pytest.raises(ValueError):
            ledger.mark(ticket, 'gone')

    def test_per_vk_history_is_bounded_without_losing_open_debt(self, kb_env_ns):
        """Design risk 3 (phantom debt) mitigation is pinned: history prunes
        only completed tickets and the per-vk list reaches a steady state,
        while EVERY open ticket survives. The bound is open + MAX_PER_VK,
        because a ticket opened inside a drain is still open (in-flight) when
        the compaction runs."""
        ledger = Ticket_Ledger(max_per_vk=4)
        open_ones = [ledger.open(VK_A, SOURCE_DRAIN, 'pin_bound',
                                 TICKET_RELEASE, 1) for _ in range(2)]
        lengths = []
        for _ in range(30):
            ledger.close(ledger.open(VK_A, SOURCE_DRAIN, 'pin_bound_done',
                                     TICKET_RELEASE, 1))
            lengths.append(len(ledger.tickets(vk=VK_A)))
        assert max(lengths) <= 2 + 1 + 4, lengths
        assert lengths[-1] <= 2 + 1 + 4, lengths
        assert set(lengths[6:]) == {lengths[-1]}, lengths   # steady, not growing
        assert lengths[0] < lengths[-1], lengths            # it did grow first
        still = ledger.tickets(vk=VK_A)
        assert all(t in still for t in open_ones), 'open debt was pruned'
        assert ledger.open_tickets() == open_ones


class TestR2HandoverMacroAbort:

    def test_macro_abort_opens_no_tickets_because_it_emits_no_releases(
            self, kb_env_ns):
        """SUPERSEDED BY F-A7 (ladder R2), kept as the no-debt half: a repeat
        task whose playback handle is a stub holds nothing, so there is no debt
        and the abort path still emits nothing (no phantom release). The real
        case - cancelling a playback that left a key held - now drains its debt
        and is pinned in tests/test_task_debt_pins.py::TestL2MacroTaskDebt."""
        from fst_tasks import Macro_Repeat_Task
        kb = kb_env_ns.kb
        ledger = kb._ledger
        seen = {t.seq for t in _all_tickets(ledger)}

        handle = MagicMock()
        task = Macro_Repeat_Task('pin_alias', 100, False, kb)
        task._handle = handle
        kb._macro_task_dict['pin_alias'] = handle
        kb_env_ns.kb_mock.reset_mock()

        task.cancel_playback()
        kb.interrupt_macro_by_name('pin_alias')

        assert _new_since(ledger, seen) == [], \
            'the abort leg now emits releases - re-scope: wrap them in tickets'
        assert [c[0] for c in kb_env_ns.kb_mock.method_calls
                if c[0] in ('press', 'release')] == []
        assert handle.cancel.called
