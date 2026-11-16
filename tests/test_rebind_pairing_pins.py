"""F-A8 rebind-pairing pins (ladder R3).

Design contract: estate `projects/estate/research/2026-11-16_fst-ticket-ledger.md`
rung R3 + inventory item 10: the rebind replacement send used to be answerable
only from the scheduling event's locals ("is this replacement in flight?" was
hand-carried and died with the event). R3 moves that answer to the ledger: a
receipt (source_kind=rebind, kind per event) opens at INJECT-SCHEDULE time on
the pump, the lane/inject leg flips ONE state attribute, and the delivery
classification at the tail of the simulated leg closes it.

Single-store protocol (the PARTIAL row in (B)): open is the pump's dict store,
the inject leg is ONE attribute flip, the close is ONE attribute flip - the two
threads that touch the same ticket NEVER read-modify-write it.

Harness: real FST_Keyboard, mocked pynput controllers (conftest kb_env_ns); the
win32 filter is called directly, no live listeners; no sleeps.
"""
import asyncio
from unittest.mock import MagicMock

import pytest
from vk_codes import vk_codes_dict

from fst_data_types import (SOURCE_REBIND, SOURCE_TOGGLE, SOURCE_MACRO,
                            TICKET_COMPLETED, TICKET_INJECTED, TICKET_PRESS,
                            TICKET_RELEASE, TICKET_SCHEDULED)
from kb_helpers import build, down, up

VK_A = vk_codes_dict['a']
VK_B = vk_codes_dict['b']
VK_C = vk_codes_dict['c']
VK_SHIFT = vk_codes_dict['shift']
VK_SCROLL_V = vk_codes_dict['scroll_vert']

# press AND release of c map to press/release of shift: the full synthetic pair
PAIR_REBIND = [['(r)', [['c'], 'shift']]]


def _sim_down(kb, vk, t):
    kb._win32_event_filter(vk, t, True, True)


def _sim_up(kb, vk, t):
    kb._win32_event_filter(vk, t, False, True)


def _open_rebinds(ledger):
    return [t for t in ledger.open_tickets()
            if t.source_kind == SOURCE_REBIND]


def _rebinds(ledger, vk, kind):
    return [t for t in ledger.tickets(vk=vk, kind=kind)
            if t.source_kind == SOURCE_REBIND]


# ===========================================================================
# (a) the receipt opens at inject-SCHEDULE time, fields per contract
# ===========================================================================

class TestReceiptAtSchedule:

    def test_replacement_send_opens_its_receipt_at_schedule(self, kb_env_ns):
        kb = kb_env_ns.kb
        build(kb, rebinds=[['(r)', [['a'], 'b']]])
        ledger = kb._ledger

        down(kb, VK_A, 1000)

        # one receipt for the replacement vk, kind per event, rebind-named
        new = _rebinds(ledger, VK_B, TICKET_PRESS)
        assert len(new) == 1, new
        t = new[0]
        assert t.source_kind == SOURCE_REBIND
        assert t.source_id == 'b', 'source_id = the rebind key name'
        assert t.kind == TICKET_PRESS
        assert t.gen_id == kb._runtime.gen_id
        assert t.seq > 0
        # the inline inject leg already ran: scheduled -> injected, NOT closed
        # (completion belongs to the delivery classification, not to the send)
        assert t.state == TICKET_INJECTED, t
        assert _open_rebinds(ledger) == [t]

    def test_no_send_means_no_receipt(self, kb_env_ns):
        # a rebind to 'suppress' issues no synthetic event -> nothing to pair
        kb = kb_env_ns.kb
        build(kb, rebinds=[['(r)', [['a'], 'suppress']]])
        ledger = kb._ledger
        seen = {t.seq for t in ledger.tickets()}

        down(kb, VK_A, 1000)

        assert [t for t in ledger.tickets()
                if t.seq not in seen] == []

    def test_constraint_not_met_opens_no_receipt(self, kb_env_ns):
        kb = kb_env_ns.kb
        build(kb, rebinds=[['(r)', [['a', '-shift'], 'b']]])
        ledger = kb._ledger
        seen = {t.seq for t in ledger.tickets()}

        down(kb, VK_A, 1000)  # shift not held -> the replacement never fires

        assert [t for t in ledger.tickets()
                if t.seq not in seen] == []


# ===========================================================================
# (b) close at delivery classification - the full synthetic pair
# ===========================================================================

class TestCloseAtDeliveryClassification:

    def test_full_synthetic_pair_opens_at_schedule_closes_at_delivery(
            self, kb_env_ns):
        kb = kb_env_ns.kb
        build(kb, rebinds=PAIR_REBIND)
        ledger = kb._ledger

        down(kb, VK_C, 1000)          # swallows real DOWN, issues synthetic DOWN
        press_receipts = _rebinds(ledger, VK_SHIFT, TICKET_PRESS)
        assert len(press_receipts) == 1
        assert press_receipts[0].state in (TICKET_SCHEDULED, TICKET_INJECTED)

        _sim_down(kb, VK_SHIFT, 1500)  # delivery classification of the DOWN
        assert press_receipts[0].state == TICKET_COMPLETED

        up(kb, VK_C, 2000)            # swallows real UP, issues synthetic UP
        release_receipts = _rebinds(ledger, VK_SHIFT, TICKET_RELEASE)
        assert len(release_receipts) == 1
        assert release_receipts[0].state in (TICKET_SCHEDULED, TICKET_INJECTED)

        _sim_up(kb, VK_SHIFT, 2500)   # delivery classification of the UP
        assert release_receipts[0].state == TICKET_COMPLETED

        # pairing closed: nothing owed, each half exactly one receipt
        assert _open_rebinds(ledger) == []
        assert len(_rebinds(ledger, VK_SHIFT, TICKET_PRESS)) == 1
        assert len(_rebinds(ledger, VK_SHIFT, TICKET_RELEASE)) == 1

    def test_a_second_delivery_of_the_same_kind_closes_nothing_more(
            self, kb_env_ns):
        kb = kb_env_ns.kb
        build(kb, rebinds=PAIR_REBIND)
        ledger = kb._ledger

        down(kb, VK_C, 1000)
        _sim_down(kb, VK_SHIFT, 1500)
        open_before = _open_rebinds(ledger)

        _sim_down(kb, VK_SHIFT, 2000)  # unrelated sim leg of the same vk

        assert _open_rebinds(ledger) == open_before == []
        assert len(_rebinds(ledger, VK_SHIFT, TICKET_PRESS)) == 1, \
            'one send -> one receipt, a delivery never invents a second one'

    def test_delivery_closes_a_receipt_still_scheduled(self, kb_env_ns):
        # protocol: close accepts either open state - the hook classification
        # may legitimately arrive while the lane leg has not run its flip yet
        kb = kb_env_ns.kb
        build(kb)
        ledger = kb._ledger
        t = kb.open_rebind_ticket(VK_B, True, 'pin')
        assert t.state == TICKET_SCHEDULED

        _sim_down(kb, VK_B, 2000)

        assert t.state == TICKET_COMPLETED
        assert _open_rebinds(ledger) == []

    def test_two_scheduled_sends_close_fifo_one_per_delivery(self, kb_env_ns):
        kb = kb_env_ns.kb
        ledger = kb._ledger
        first = kb.open_rebind_ticket(VK_B, True, 'pin-1')
        second = kb.open_rebind_ticket(VK_B, True, 'pin-2')

        _sim_down(kb, VK_B, 2000)
        assert first.state == TICKET_COMPLETED
        assert second.state == TICKET_SCHEDULED

        _sim_down(kb, VK_B, 3000)
        assert second.state == TICKET_COMPLETED
        assert _open_rebinds(ledger) == []


# ===========================================================================
# (c) classification reads the TICKET, not locals (instrumented)
# ===========================================================================

class TestClassificationReadsLedger:

    def test_delivery_leg_consults_the_ledger_for_the_receipt(
            self, kb_env_ns, monkeypatch):
        kb = kb_env_ns.kb
        build(kb, rebinds=PAIR_REBIND)
        ledger = kb._ledger
        consulted = []
        real_lookup = kb.record_rebind_delivery

        def spy(vk, is_press):
            consulted.append((vk, is_press))
            return real_lookup(vk, is_press)

        monkeypatch.setattr(kb, 'record_rebind_delivery', spy)

        down(kb, VK_C, 1000)
        consulted.clear()               # only the delivery leg below matters
        _sim_down(kb, VK_SHIFT, 1500)

        assert consulted == [(VK_SHIFT, True)], \
            'the close must be a ledger lookup keyed by the arriving event'
        assert _rebinds(ledger, VK_SHIFT, TICKET_PRESS)[0].state == \
            TICKET_COMPLETED
        # the scheduling event's locals died with its call: a fresh sim event
        # still found and closed the receipt - the ledger is the pairing truth
        assert _open_rebinds(ledger) == []

    def test_sim_events_without_a_rebind_receipt_are_untouched(
            self, kb_env_ns):
        # tap/macro/drain sim legs share the delivery leg and own no rebind
        # receipt: the lookup is a no-op for them
        kb = kb_env_ns.kb
        build(kb, taps=[['(TAP_1)', ['a', 'd']]])
        ledger = kb._ledger

        _sim_down(kb, VK_A, 1000)
        _sim_up(kb, VK_A, 1500)

        assert _open_rebinds(ledger) == []
        assert [t for t in ledger.tickets()
                if t.source_kind == SOURCE_REBIND] == []


# ===========================================================================
# (d) projection equivalence: the fast-path ticket local == the ledger
# ===========================================================================

class TestProjectionEquivalence:

    def test_captured_projection_equals_the_ledger_at_decision_points(
            self, kb_env_ns, monkeypatch):
        # the closure's captured ticket is a PROJECTION of the ledger entry:
        # same object, same state, at every decision point
        kb = kb_env_ns.kb
        build(kb, rebinds=PAIR_REBIND)
        ledger = kb._ledger
        captured = []
        real_open = kb.open_rebind_ticket

        def opener(vk, is_press, source_id, is_mouse=False):
            t = real_open(vk, is_press, source_id, is_mouse=is_mouse)
            captured.append(t)
            return t

        monkeypatch.setattr(kb, 'open_rebind_ticket', opener)

        down(kb, VK_C, 1000)
        proj = captured[0]
        assert proj is not None
        assert _open_rebinds(ledger) == [proj]          # identity
        assert proj.state == ledger.tickets(vk=proj.vk)[0].state

        _sim_down(kb, VK_SHIFT, 1500)
        assert proj.state == TICKET_COMPLETED            # flip visible on proj
        assert _open_rebinds(ledger) == []               # ...and in the store

    def test_the_ticket_store_api_exposes_only_single_stores(self, kb_env_ns):
        # R3 ships no read-modify-write path either: the helpers use open,
        # mark and close only - never a compound field write on a ticket
        kb = kb_env_ns.kb
        build(kb, rebinds=PAIR_REBIND)
        ledger = kb._ledger
        public = {n for n in dir(ledger) if not n.startswith('_')}
        assert 'open' in public and 'mark' in public and 'close' in public
        t = kb.open_rebind_ticket(VK_B, True, 'probe')
        # the R3 flow leaves the documented trail on one ticket object
        assert t.state == TICKET_SCHEDULED
        ledger.mark(t, TICKET_INJECTED)
        assert t.state == TICKET_INJECTED
        assert kb.record_rebind_delivery(VK_B, True) is t
        assert t.state == TICKET_COMPLETED


# ===========================================================================
# (e) the fast-path local: pump_lane bool + one inject per receipt
# ===========================================================================

class TestFastPathLocal:

    def test_dead_loop_resend_keeps_one_receipt_and_one_send(self, kb_env_ns):
        # P1-4 (never lose a replacement behind a dead loop) stays true, now
        # without a second send-pair truth: the inline resend reuses the SAME
        # closure, so the receipt gets exactly one inject flip
        kb = kb_env_ns.kb
        build(kb, rebinds=[['(r)', [['a'], 'b']]])
        dead = asyncio.new_event_loop()
        dead.close()
        kb.loop = dead
        ledger = kb._ledger
        kb_env_ns.kb_mock.reset_mock()

        down(kb, VK_A, 1000)

        receipts = _rebinds(ledger, VK_B, TICKET_PRESS)
        assert len(receipts) == 1, receipts
        assert receipts[0].state == TICKET_INJECTED
        kb_env_ns.kb_mock.press.assert_called_once()  # exactly one send

    def test_tap_group_owned_replacement_opens_no_rebind_receipt(
            self, kb_env_ns):
        # when the replacement vk sits in a tap group, the tap lane accounts it
        # (key_replaced is dropped, send_keys_for_tap_group owns the send): the
        # rebind block never runs, so no rebind receipt appears
        kb = kb_env_ns.kb
        build(kb, taps=[['(TAP_1)', ['a', 'c']]],
              rebinds=[['(r)', [['a'], 'c']]])
        ledger = kb._ledger

        down(kb, VK_A, 1000)
        down(kb, VK_A, 1500)

        assert [t for t in ledger.tickets()
                if t.source_kind == SOURCE_REBIND] == []


# ===========================================================================
# (f) generation independence (R3 shape: the receipt crosses the swap)
# ===========================================================================

class TestGenerationIndependence:

    def test_receipt_survives_a_snapshot_swap_and_closes_cross_generation(
            self, kb_env_ns):
        kb = kb_env_ns.kb
        build(kb, rebinds=PAIR_REBIND)
        ledger = kb._ledger

        down(kb, VK_C, 1000)
        gen_dying = kb._runtime.gen_id
        receipt = _rebinds(ledger, VK_SHIFT, TICKET_PRESS)[0]

        build(kb, rebinds=PAIR_REBIND)  # swaps the generation under the receipt

        assert kb._ledger is ledger, 'the swap must never touch the ledger'
        assert receipt.gen_id == gen_dying
        _sim_down(kb, VK_SHIFT, 2000)   # delivery classified on the NEW gen
        assert receipt.state == TICKET_COMPLETED, \
            'debt is precisely what does not die with a generation'


# ===========================================================================
# (g) retire-audit extension: rebind receipts at generation retire
# ===========================================================================

class TestRetireAuditRebindExtension:

    def test_clean_paths_leave_no_rebind_debt_for_the_retire_audit(
            self, kb_env_ns):
        kb = kb_env_ns.kb
        build(kb, rebinds=PAIR_REBIND)
        ledger = kb._ledger
        gen = kb._runtime.gen_id

        down(kb, VK_C, 1000)
        _sim_down(kb, VK_SHIFT, 1500)
        up(kb, VK_C, 2000)
        _sim_up(kb, VK_SHIFT, 2500)

        # the retire-site class set (fst_keyboard.py swap): no violation class
        assert ledger.audit('pin', gen_id=gen,
                            expected_source_kinds=(SOURCE_TOGGLE,
                                                   SOURCE_MACRO)) == 0

    def test_an_undelivered_rebind_receipt_is_counted_as_debt(self, kb_env_ns):
        kb = kb_env_ns.kb
        build(kb, rebinds=PAIR_REBIND)
        ledger = kb._ledger
        gen = kb._runtime.gen_id

        down(kb, VK_C, 1000)  # scheduled and injected, delivery never arrives

        # rebind is NOT in the expected classes at the retire site: an open
        # receipt is violation-class debt, named by its seq in the audit line
        assert ledger.audit('pin', gen_id=gen,
                            expected_source_kinds=(SOURCE_TOGGLE,
                                                   SOURCE_MACRO)) == 1
        assert ledger.audit('pin', gen_id=gen) == 1


# ===========================================================================
# (h) the mouse-to-mouse rebind leg carries a receipt too
# ===========================================================================

class TestMouseLegReceipt:

    @pytest.mark.asyncio
    async def test_mouse_rebind_opens_a_mouse_receipt_closed_by_delivery(
            self, kb_env_ns, monkeypatch):
        kb = kb_env_ns.kb
        kb.loop = asyncio.get_running_loop()
        kb._mouse_listener = MagicMock()

        async def fake_sleep(t):
            loop = asyncio.get_running_loop()
            future = loop.create_future()
            loop.call_soon(future.set_result, None)
            await future

        monkeypatch.setattr(asyncio, 'sleep', fake_sleep)
        build(kb, rebinds=[['(r)', [['mm'], 'scroll_vert']]])
        ledger = kb._ledger

        kb._win32_event_filter(3, 1000, True, False, True)  # middle down, mouse

        receipts = _rebinds(ledger, VK_SCROLL_V, TICKET_PRESS)
        assert len(receipts) == 1, receipts
        assert receipts[0].is_mouse is True
        assert receipts[0].state == TICKET_SCHEDULED, \
            ('the coroutine hand-off carries no inject mark (execute_key_event '
             'is shared with the macro lane) - the receipt waits open, which '
             'is exactly the scheduled-but-lost debt class the ladder names')

        kb._win32_event_filter(VK_SCROLL_V, 1200, True, True, True)  # delivery
        assert receipts[0].state == TICKET_COMPLETED
        assert _open_rebinds(ledger) == []
