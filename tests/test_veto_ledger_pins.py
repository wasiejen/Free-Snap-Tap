"""F-A9 sim-release veto-leg ledger consult pins (ladder R4, LADDER FINAL RUNG).

Design contract: estate `projects/estate/research/2026-11-16_fst-ticket-ledger.md`
rung R4, and the maintainer ruling GO 2026-11-16 (FST-404 release-ordering area,
the approval the research doc names for this rung). The sim-release veto
consults the ticket ledger FIRST: an OPEN release ticket (ledger semantics:
scheduled|injected) for this vk means the arriving simulated release is a
physical release FST owes -> DELIVER (never suppress) + close at delivery.
No ticket -> every existing veto decision byte-identical.

The named payoff (F-A4 reviewer P1-1, todo_inbox "FST release-veto window"):
`_release_tap_group_holds` releases the hold, opens the release ticket, and
emits; a real pump event that re-arms active_key inside the old window can no
longer make the veto eat the owed release, because the ticket is in the ledger
before any re-arm and the veto consults it before the group-object verdict.

Harness (the file-local rule of tests/test_pump_race_lifecycle_pins.py, same
class): real FST_Keyboard, mocked pynput controllers (conftest kb_env_ns), the
win32 filter called directly, NO live listeners, NO sleeps - every ordering
fact is a threading.Event handshake on a one-shot send seam.
"""
import inspect
import threading
from types import SimpleNamespace

from fst_data_types import (SOURCE_MACRO, TICKET_COMPLETED, TICKET_RELEASE,
                            TICKET_SCHEDULED)
from fst_keyboard import FST_Keyboard
from fst_manager import CONSTANTS
from kb_helpers import build, down

VK_A = 0x41

WM_KEYDOWN = 256
WM_KEYUP = 257
LLKHF_INJECTED = 0x10  # the win32 injected/simulated flag bit (U359 contract)

# bounded waits for POSITIVE markers only (thread reached the seam / joined)
SEAM_WAIT_SECONDS = 2.0

TAP_ONLY = [['(TAP_1)', ['a', 'b']]]


def key_data(vk, t=1000, flags=0):
    """Minimal KBDLLHOOKSTRUCT stand-in for keyboard_win32_event_filter."""
    return SimpleNamespace(vkCode=vk, time=t, flags=flags)


def _arm_hold(kb, vk):
    """arm a real app-level hold on the vk's owner group (product legs only)"""
    group = kb._tap_owner_by_vk[vk]
    group.update_tap_states(vk, True)
    group.set_last_key_send(vk)
    kb.state_manager.set_simulated_key_press_state(vk, True)
    return group


def _release_call_count(kb_mock):
    return sum(1 for c in kb_mock.method_calls if c[0] == 'release')


def fire_injected_release(kb, kb_mock, vk):
    """One simulated KEYUP through the real filter; returns
    (suppress_event_call_count, filter_drops). The P5-pair capture pattern."""
    kb_mock.reset_mock()
    kb._listener.suppress_event.reset_mock()
    drops = []
    kb.report_event_drop = lambda source, vk_code, is_press, is_simulated, \
        is_mouse, exc: drops.append(exc)
    kb.keyboard_win32_event_filter(WM_KEYUP, key_data(vk, 9000, LLKHF_INJECTED))
    return kb._listener.suppress_event.call_count, drops


class TestR4VetoConsultRace:
    """The acceptance contract of the todo_inbox release-veto-window entry
    (SUPERSEDED by the ledger ruling, closes as this unit's payoff): a REAL
    pump press on the held vk, concurrent with a drain on ANOTHER thread
    (one-shot seam parks the drain between release_hold+open and the send),
    and the injected release must still reach the app - not be suppressed -
    with the ticket closed at delivery, count-exact."""

    def test_a_pump_rearm_during_a_drain_cannot_eat_the_owed_release(
            self, kb_env_ns):
        """RED-before: on pre-R4 code the drain closes the ticket at send and
        the veto consult does not exist, so the re-armed hold eats the release
        (suppress_event once). Green from R4 on: the ticket outlives the send,
        the veto consults the ledger FIRST, delivers, and closes at delivery."""
        kb = kb_env_ns.kb
        kb_mock = kb_env_ns.kb_mock
        build(kb, taps=TAP_ONLY)
        group = _arm_hold(kb, VK_A)
        ledger = kb._ledger

        # one-shot send seam: the drain thread parks BETWEEN open and the
        # physical send - the exact F-A4 P1-1 window, made drivable (no sleeps)
        om = kb._output_manager
        real_send = om.send_key_event
        entered = threading.Event()
        proceed = threading.Event()
        parked = []

        def seam_send(key_event):
            if not parked:
                parked.append(True)
                entered.set()
                assert proceed.wait(SEAM_WAIT_SECONDS), 'drain never released'
            real_send(key_event)

        om.send_key_event = seam_send
        drain_errors = []

        def drain_thread():
            try:
                kb._release_tap_group_holds()
            except Exception as exc:  # pragma: no cover - failure surfaces below
                drain_errors.append(exc)

        releases_before = _release_call_count(kb_mock)
        worker = threading.Thread(target=drain_thread, name='pin-drain')
        worker.start()
        try:
            assert entered.wait(SEAM_WAIT_SECONDS), 'drain never reached the seam'
            # while the drain is parked, the pump thread handles a REAL press
            # on the held vk: update_tap_states re-arms active_key (the race)
            down(kb, VK_A, 8000)
            assert group.get_active_key() == VK_A, \
                'the pump leg never re-armed the hold - vacuous pin'
            # the ticket for the owed release is open at this instant
            owed = [t for t in ledger.open_tickets(kind=TICKET_RELEASE)
                    if t.vk == VK_A]
            assert len(owed) == 1 and owed[0].state == TICKET_SCHEDULED, owed
            proceed.set()
            worker.join(SEAM_WAIT_SECONDS)
        finally:
            proceed.set()
            om.send_key_event = real_send
            if worker.is_alive():  # pragma: no cover
                worker.join()
        assert drain_errors == []
        assert _release_call_count(kb_mock) == releases_before + 1, \
            'the drain owes exactly one physical release of the held vk'

        # the owed release arrives as a simulated KEYUP while the hold is
        # re-armed: R4 delivers it (never suppresses) and closes the ticket
        suppressed, drops = fire_injected_release(kb, kb_mock, VK_A)
        assert drops == [], drops
        assert suppressed == 0, (
            'the sim-release veto ate the release the drain emitted - the '
            f'F-A4 P1-1 re-arm window is open again ({suppressed})')
        tickets = ledger.tickets(vk=VK_A, kind=TICKET_RELEASE)
        assert len(tickets) == 1, tickets  # count-exact: one owed, one record
        assert tickets[0].state == TICKET_COMPLETED, tickets
        assert tickets[0].source_id == 'tap_group_holds', tickets
        assert ledger.open_tickets() == [], ledger.open_tickets()


class TestR4DeliveryAndExclusion:

    def test_no_ticket_the_veto_suppresses_exactly_as_before(self, kb_env_ns):
        """NO ticket => current suppression behavior UNCHANGED (third-party /
        echo handling preserved exactly): the armed-hold release veto fires as
        it always did. The sibling of the P5 pair, asserted with R4 in place."""
        kb = kb_env_ns.kb
        build(kb, taps=TAP_ONLY)
        group = _arm_hold(kb, VK_A)
        assert kb._ledger.open_tickets() == []

        suppressed, drops = fire_injected_release(kb, kb_env_ns.kb_mock, VK_A)
        assert suppressed == 1 and drops == [], (suppressed, drops)
        assert group.get_active_key() == VK_A

    def test_an_open_PRESS_ticket_never_authorizes_a_release(self, kb_env_ns):
        """The consult filters on kind: an open macro OWNERSHIP press ticket
        (F-A7/R2 shape) says nothing about an owed physical release."""
        kb = kb_env_ns.kb
        build(kb, taps=TAP_ONLY)
        _arm_hold(kb, VK_A)
        owed_press = kb.open_press_ticket(VK_A, SOURCE_MACRO, 'pin_alias')

        suppressed, drops = fire_injected_release(kb, kb_env_ns.kb_mock, VK_A)
        assert suppressed == 1 and drops == [], (suppressed, drops)
        assert owed_press.state == TICKET_SCHEDULED  # not touched

    def test_a_scheduled_rebind_receipt_is_never_the_veto_consults_ticket(
            self, kb_env_ns):
        """The R3 exclusion: a rebind receipt still SCHEDULED stays open
        across a foreign simulated release of (vk, release) - closing it here
        would repeat the F-A8 reviewer P1-1 class (nothing of ours delivered
        before its own inject leg ran). The receipt stays scheduled and the
        veto decision is the plain no-ticket one."""
        kb = kb_env_ns.kb
        build(kb, taps=TAP_ONLY)
        _arm_hold(kb, VK_A)
        receipt = kb.open_rebind_ticket(VK_A, is_press=False,
                                        source_id='pin_rebind')

        suppressed, drops = fire_injected_release(kb, kb_env_ns.kb_mock, VK_A)
        assert suppressed == 1 and drops == [], (suppressed, drops)
        assert receipt.state == TICKET_SCHEDULED, receipt

    def test_delivery_closes_oldest_first_count_exact(self, kb_env_ns):
        """Two drains, one vk, no delivery between: two open tickets. Each
        arriving simulated release closes exactly the OLDEST one (FIFO,
        count-exact), and only the second arrival settles the ledger."""
        kb = kb_env_ns.kb
        build(kb, taps=TAP_ONLY)
        ledger = kb._ledger
        group = _arm_hold(kb, VK_A)
        kb._release_tap_group_holds()
        _arm_hold(kb, VK_A)  # same group re-armed, drain again
        kb._release_tap_group_holds()

        open_now = [t for t in ledger.open_tickets(kind=TICKET_RELEASE)
                    if t.vk == VK_A]
        assert len(open_now) == 2, open_now
        oldest, newest = open_now[0].seq, open_now[1].seq

        suppressed, _ = fire_injected_release(kb, kb_env_ns.kb_mock, VK_A)
        assert suppressed == 0
        closed = [t for t in ledger.tickets(vk=VK_A, kind=TICKET_RELEASE)
                  if t.state == TICKET_COMPLETED]
        assert [t.seq for t in closed] == [oldest], closed
        assert [t.seq for t in ledger.open_tickets(kind=TICKET_RELEASE)
                if t.vk == VK_A] == [newest]

        group.update_tap_states(VK_A, True)  # keep the veto branch exercised
        suppressed, _ = fire_injected_release(kb, kb_env_ns.kb_mock, VK_A)
        assert suppressed == 0
        assert ledger.open_tickets() == [], ledger.open_tickets()


class TestR4LedgerAging:

    def test_a_delivered_release_no_longer_ages_in_the_stuck_key_watch(
            self, kb_env_ns):
        """F-B4's [StuckKeyWatch] ages OPEN tickets from created_at. While the
        owed release is undelivered the dump NAMES it; after delivery (the
        veto-leg close) the same dump shows no watch line for that seq - the
        structural payoff is visible in the bug-report artifact."""
        kb = kb_env_ns.kb
        build(kb, taps=TAP_ONLY)
        _arm_hold(kb, VK_A)
        ledger = kb._ledger
        seen = {t.seq for t in ledger.tickets()}

        kb._release_tap_group_holds()
        owed = [t for t in ledger.tickets() if t.seq not in seen]
        assert len(owed) == 1 and owed[0].state == TICKET_SCHEDULED, owed
        aged = owed[0].created_at + (CONSTANTS.STUCK_TICKET_MS / 1000.0) + 1.0

        dump_before = kb.render_status_dump(reason='pin', now=aged)
        assert f'[StuckKeyWatch] seq={owed[0].seq}' in dump_before, \
            'the undelivered owed release must age in the watch'

        fire_injected_release(kb, kb_env_ns.kb_mock, VK_A)

        dump_after = kb.render_status_dump(reason='pin', now=aged)
        assert f'[StuckKeyWatch] seq={owed[0].seq}' not in dump_after, \
            'the delivered release still ages - it was not closed at delivery'


class TestR4HotPathShape:
    """The research (B) hard constraint: the pump-hot-path consult is a dict
    get over the bounded per-vk bucket. No new lock may ever enter it."""

    def test_the_consult_uses_no_lock_and_no_threading_primitives(self):
        src = inspect.getsource(FST_Keyboard.take_owed_release_ticket)
        for banned in ('Lock', 'acquire', 'threading', 'RLock'):
            assert banned not in src, f'{banned} entered the hot-path consult'
