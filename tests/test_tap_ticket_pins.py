"""F-A10 tap-snap-send release tickets (ladder R4 sibling, the stuck-key fix).

Maintainer live incident 2026-11-16: tap group "a,d", key 'a' stuck pressed.
Forensics + acceptance contract: estate
`projects/estate/research/2026-11-16_fst-tapsend-leak-analysis.md` (Option A,
confirmed; batch-SendInput rejected - not revisited here).

The leak (W1, structural): the tap group's own DOWN/UP emissions are the one
emitter class that was never ticketed. `send_keys_for_tap_group` emits the
ONE-active-key transition release(old)+press(new) on the pump lane; the queued
release(old) re-enters the filter as a simulated release. The sim-release veto
(fst_keyboard.py:1509-1511) eats an injected release of a vk the owner group
still has active, UNLESS an OPEN release ticket exists (the R4 consult). With
no tap ticket, a real DOWN that re-arms active_key before the queued UP lands
makes the veto kill the UP -> the app keeps the key pressed, and the
bookkeeping already moved so no future UP is emitted: stuck until the next tap
of that key. Every TICKETED emitter was immune; the tap path was not.

Fix (Option A): open a release ticket (source_kind=tap, source_id = the group's
key-string list, seq = the ledger's monotonic sequence position) at SCHEDULE
time, before the leg leaves the pump. The R4 consult serves it unchanged
(ticket open => deliver, never suppress); delivery closes it. Mid-sequence
aborts (a dead lane) close owed tickets by emitting the owed UP (the existing
rebind-leg inline-resend pattern, reused).

Harness (the file-local rule of tests/test_veto_ledger_pins.py and
tests/test_pump_race_lifecycle_pins.py): real FST_Keyboard, mocked pynput
controllers (conftest kb_env_ns), the win32 filter called directly, NO live
listeners, NO sleeps - the in-flight leg is the open ticket the mock never
re-feeds, and a real DOWN re-arms live pump state directly.
"""
import asyncio

from fst_data_types import (SOURCE_DRAIN, SOURCE_MACRO, SOURCE_TAP,
                            SOURCE_TOGGLE, TICKET_COMPLETED, TICKET_RELEASE,
                            TICKET_SCHEDULED)
from fst_manager import CONSTANTS
from kb_helpers import build, down, up
from types import SimpleNamespace

VK_A = 0x41  # 'a'
VK_D = 0x44  # 'd'

WM_KEYDOWN = 256
WM_KEYUP = 257
LLKHF_INJECTED = 0x10  # the win32 injected/simulated flag bit (U359 contract)

TAP_AD = [['(TAP_1)', ['a', 'd']]]


def key_data(vk, t=1000, flags=0):
    """Minimal KBDLLHOOKSTRUCT stand-in for keyboard_win32_event_filter."""
    return SimpleNamespace(vkCode=vk, time=t, flags=flags)


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


def _arm_manual_hold(kb, vk):
    """Arm a real app-level hold on the vk's owner group WITHOUT going through
    send_keys_for_tap_group, so no tap ticket is opened (the no-ticket case)."""
    group = kb._tap_owner_by_vk[vk]
    group.update_tap_states(vk, True)
    group.set_last_key_send(vk)
    kb.state_manager.set_simulated_key_press_state(vk, True)
    return group


def _release_count(kb_mock, vk):
    """Count release() calls for one vk on the mocked keyboard controller."""
    from pynput import keyboard as pynput_keyboard
    target = pynput_keyboard.KeyCode.from_vk(vk)
    return sum(1 for c in kb_mock.method_calls
               if c[0] == 'release' and c[1] and c[1][0] == target)


class TestWA1Repro:
    """(a) THE repro pin + the double-tap parity, RED-before on pre-F-A10 tip."""

    def test_w1_interleaved_rearm_delivers_every_owed_up(self, kb_env_ns):
        """THE repro pin (acceptance (a)). Real multi-key tap group "a,d"; the
        snap-cycle switch releases are emitted on the pump (loop None -> inline)
        but the mock never re-feeds them, so they sit as the in-flight owed UPs;
        a real DOWN re-arms active_key on the first vk mid-flight (the W1
        pump-ahead-of-lane window). Draining the queued legs as the simulated
        releases that reach the app: every key must end released.

        RED-before (tip): the tap emitter opens no release ticket, so the
        in-flight UP(a) arrives with active_key=='a' and owed_release None ->
        the sim-release veto eats it (fst_keyboard.py:1509-1511), 'a' stays
        pressed (suppress_event once). GREEN (F-A10): the ticket is open before
        the re-arm, the R4 consult serves it -> delivered, never suppressed, and
        the ledger shows tap open->closed."""
        kb = kb_env_ns.kb
        build(kb, taps=TAP_AD)
        group = kb._tap_groups[0]
        ledger = kb._ledger

        down(kb, VK_A, 1000)   # L0 press(a)
        down(kb, VK_D, 1100)   # L1 switch: release(a)+press(d)  -> owed UP(a)
        up(kb, VK_D, 1200)     # L2 switch: release(d)+press(a)  -> owed UP(d)
        down(kb, VK_A, 1300)   # interleaved real DOWN re-arms active_key='a'
        assert group.get_active_key() == VK_A, \
            'the mid-flight re-arm never happened - vacuous pin'

        # the in-flight switch UP(a) arrives while the hold is re-armed
        s_a, drops_a = fire_injected_release(kb, kb_env_ns.kb_mock, VK_A)
        assert s_a == 0, (
            'the sim-release veto ate the tap-emitted UP(a) under the mid-flight '
            're-arm - the W1 stuck-key window (fst_keyboard.py:1509-1511): '
            f'{s_a} suppressed')
        assert drops_a == [], drops_a

        # the queued UP(d) reaches the app too -> every key ends released
        s_d, drops_d = fire_injected_release(kb, kb_env_ns.kb_mock, VK_D)
        assert s_d == 0 and drops_d == [], (s_d, drops_d)

        # ledger shows tap open->closed (count-exact, no lingering debt)
        assert ledger.open_tickets() == [], ledger.open_tickets()
        tap_releases = [t for t in ledger.tickets(kind=TICKET_RELEASE)
                        if t.source_kind == SOURCE_TAP]
        assert {t.vk for t in tap_releases} == {VK_A, VK_D}, tap_releases
        assert all(t.state == TICKET_COMPLETED for t in tap_releases), tap_releases

    def test_double_tap_under_lane_hold_keeps_even_down_up_parity(
            self, kb_env_ns):
        """Acceptance (a) second pin: a re-entrant double tap of 'a' under a
        held lane leaves TWO owed UP(a) (re-entrancy during flight); draining
        them delivers BOTH and closes them oldest-first, so the app's DOWN/UP
        count for vk 'a' stays even - no net imbalance that strands a press.

        RED-before (tip): neither UP(a) has a ticket; the first simulated UP(a)
        arrives with active_key=='a' -> the veto eats it (parity breaks)."""
        kb = kb_env_ns.kb
        build(kb, taps=TAP_AD)
        ledger = kb._ledger

        down(kb, VK_A, 1000)   # press(a), lk=a
        down(kb, VK_D, 1100)   # rel a (T_a1) press d, lk=d, active=d
        up(kb, VK_D, 1200)     # rel d press a, lk=a, active=a
        down(kb, VK_D, 1300)   # re-entrant: rel a (T_a2) press d, lk=d
        up(kb, VK_D, 1400)     # rel d press a, lk=a, active=a
        owed_a = [t for t in ledger.open_tickets(kind=TICKET_RELEASE)
                  if t.vk == VK_A and t.source_kind == SOURCE_TAP]
        assert len(owed_a) == 2, owed_a
        first, second = owed_a[0].seq, owed_a[1].seq

        s1, _ = fire_injected_release(kb, kb_env_ns.kb_mock, VK_A)
        assert s1 == 0, f'the first owed UP(a) was eaten ({s1}) - parity breaks'
        closed = [t.seq for t in ledger.tickets(vk=VK_A, kind=TICKET_RELEASE)
                  if t.state == TICKET_COMPLETED]
        assert closed == [first], (closed, first, second)

        s2, _ = fire_injected_release(kb, kb_env_ns.kb_mock, VK_A)
        assert s2 == 0, f'the second owed UP(a) was eaten ({s2})'
        # drain the two owed UP(d) the d->a settle legs also emitted, so the
        # whole tap cycle leaves no open debt (both keys end released)
        for _ in range(2):
            s_d, _ = fire_injected_release(kb, kb_env_ns.kb_mock, VK_D)
            assert s_d == 0, s_d
        assert ledger.open_tickets() == [], ledger.open_tickets()


class TestWindowTable:
    """(b) the per-window pins for the ranked windows the tickets must cover."""

    def test_w3_dead_lane_still_emits_the_owed_up(self, kb_env_ns):
        """W3 (schedule-lost): with the loop lane gone (closed loop) pump_lane
        returns False and the tap release leg would be dropped (the bookkeeping
        still advances -> permanent stuck). F-A10 mirrors the rebind-leg
        inline-resend: the owed UP is emitted on the spot, and its ticket closes
        at delivery.

        RED-before (tip): pump_lane returns False, no resend -> the controller
        never releases vk 'a' and no ticket names the lost leg."""
        kb = kb_env_ns.kb
        build(kb, taps=TAP_AD)
        ledger = kb._ledger

        dead = asyncio.new_event_loop()
        dead.close()
        kb.set_loop(dead)
        try:
            kb_env_ns.kb_mock.reset_mock()
            down(kb, VK_A, 1000)   # press leg on a dead lane (press class)
            down(kb, VK_D, 1100)   # switch: owed UP(a) - lane gone
        finally:
            kb.set_loop(None)

        # F-A10: the dead-lane switch still owed and emitted the UP of 'a'
        # exactly once (the inline resend runs at most once: pump_lane returns
        # False only when its schedule-failed arm ran no work()).
        assert _release_count(kb_env_ns.kb_mock, VK_A) == 1, (
            'the dead-lane tap switch dropped the owed UP(a) without emitting it '
            '- the W3 permanent-stuck window is open')
        owed = [t for t in ledger.open_tickets(kind=TICKET_RELEASE)
                if t.vk == VK_A and t.source_kind == SOURCE_TAP]
        assert len(owed) == 1 and owed[0].state == TICKET_SCHEDULED, owed

        # delivery closes the named debt
        fire_injected_release(kb, kb_env_ns.kb_mock, VK_A)
        assert ledger.open_tickets() == [], ledger.open_tickets()

    def test_w4_owner_handoff_mid_sequence_releases_the_held_key(
            self, kb_env_ns):
        """W4 (owner handoff / config reload): a reload drains the held key
        against the live generation with a drain ticket while a tap-emitted UP
        from the in-flight switch is still owed; BOTH settle and the key ends
        released. The reload path was already protected - this pin proves the
        tap ticket joins that drain instead of being stranded by it.

        RED-before (tip): no tap ticket exists at the handoff point (only the
        drain's), so the named tap debt this pin asserts never appears."""
        kb = kb_env_ns.kb
        build(kb, taps=TAP_AD)
        ledger = kb._ledger

        down(kb, VK_A, 1000)   # press(a), lk=a
        down(kb, VK_D, 1100)   # rel a (T_a) press d, lk=d, active=d (held key d)
        owed_a = [t for t in ledger.open_tickets(kind=TICKET_RELEASE)
                  if t.vk == VK_A and t.source_kind == SOURCE_TAP]
        assert len(owed_a) == 1, owed_a  # RED-before on tip: empty

        # owner handoff mid-sequence: a rebuild releases the live hold (drain)
        kb.initialize_groups_from_presorted_lines()
        assert _release_count(kb_env_ns.kb_mock, VK_D) >= 1, (
            'the reload drain never emitted the held key release')

        # the in-flight tap UP(a) and the drain UP(d) both reach the app
        fire_injected_release(kb, kb_env_ns.kb_mock, VK_A)
        # the held vk's release (drain) re-enters after the group cleared
        kb._release_tap_group_holds()
        fire_injected_release(kb, kb_env_ns.kb_mock, VK_D)
        # every tap release the group owed is now closed (no stranded tap debt)
        assert [t for t in ledger.open_tickets(kind=TICKET_RELEASE)
                if t.source_kind == SOURCE_TAP] == [], ledger.open_tickets()

    def test_veto_on_tap_up_ticketed_delivery(self, kb_env_ns):
        """(b) veto-on-tap-UP ticketed-delivery, unit level: the R4 consult
        (take_owed_release_ticket) serves a TAP release ticket exactly like a
        drain's - it excludes only rebind receipts and mouse legs. This is a
        contract-lock pin (the consult already exists at tip); paired with
        test_d_no_ticket_veto_unchanged it is non-vacuous.

        No ticket -> the veto eats the re-armed release; a tap ticket -> it is
        served and closed."""
        kb = kb_env_ns.kb
        build(kb, taps=TAP_AD)
        _arm_manual_hold(kb, VK_A)
        assert kb._ledger.open_tickets() == []
        # armed, no ticket: eaten (the default veto)
        s_no, _ = fire_injected_release(kb, kb_env_ns.kb_mock, VK_A)
        assert s_no == 1, s_no

        # re-arm the hold and open a TAP release ticket -> served, not eaten
        _arm_manual_hold(kb, VK_A)
        tk = kb.open_release_ticket(VK_A, SOURCE_TAP, 'a,d')
        s_yes, _ = fire_injected_release(kb, kb_env_ns.kb_mock, VK_A)
        assert s_yes == 0, s_yes
        assert tk.state == TICKET_COMPLETED, tk
        assert tk.source_kind == SOURCE_TAP
        assert kb._ledger.open_tickets() == [], kb._ledger.open_tickets()


class TestAgingAndNoTicket:
    """(c) aging and (d) the no-ticket negative control."""

    def test_c_delivered_tap_up_no_longer_ages_in_the_watch(self, kb_env_ns):
        """(c): an undelivered tap UP ages in [StuckKeyWatch]; after delivery
        (the veto-leg close) the same dump shows no watch line for that seq.
        Pre-F-A10 the stuck tap key produced NO ledger record at all, so the
        watch could not name it - the structural payoff is visible in the bug
        report artifact.

        RED-before (tip): the tap switch opens no ticket, so no [StuckKeyWatch]
        line names the stuck 'a'."""
        kb = kb_env_ns.kb
        build(kb, taps=TAP_AD)
        ledger = kb._ledger

        down(kb, VK_A, 1000)   # press(a)
        down(kb, VK_D, 1100)   # switch -> owed UP(a) (undelivered)
        owed = [t for t in ledger.open_tickets(kind=TICKET_RELEASE)
                if t.vk == VK_A and t.source_kind == SOURCE_TAP]
        assert len(owed) == 1, owed
        aged = owed[0].created_at + (CONSTANTS.STUCK_TICKET_MS / 1000.0) + 1.0

        dump_before = kb.render_status_dump(reason='pin', now=aged)
        assert f'[StuckKeyWatch] seq={owed[0].seq}' in dump_before, (
            'the undelivered tap UP must age in the watch')

        fire_injected_release(kb, kb_env_ns.kb_mock, VK_A)

        dump_after = kb.render_status_dump(reason='pin', now=aged)
        assert f'[StuckKeyWatch] seq={owed[0].seq}' not in dump_after, (
            'the delivered tap UP still ages - it was not closed at delivery')

    def test_d_no_ticket_veto_unchanged(self, kb_env_ns):
        """(d) negative control: an unrelated no-ticket veto behaves byte-
        identical to today. An armed hold with no release ticket -> the injected
        release of the active key is suppressed exactly as it was pre-F-A10
        (the R4 consult returns None). This guards the third-party / echo
        suppression path against any widening of the consult."""
        kb = kb_env_ns.kb
        build(kb, taps=TAP_AD)
        _arm_manual_hold(kb, VK_A)
        assert kb._ledger.open_tickets() == []
        suppressed, drops = fire_injected_release(kb, kb_env_ns.kb_mock, VK_A)
        assert suppressed == 1 and drops == [], (suppressed, drops)


class TestRetireAuditDebt:
    """retire-audit extension: tap sequence debt IS a violation class."""

    def test_open_tap_ticket_is_a_retirement_violation(self, kb_env_ns):
        """A generation retire must not die OWNING an undrained tap UP: the
        retire audit already lists SOURCE_TAP outside its expected-source set
        (the comment at fst_keyboard.py:864-866), so a tap release ticket left
        open at retire is a violation - it names the leak the F-A9 drain
        expected-set would have hidden. The query the retire leg uses:
        expected = (TOGGLE, MACRO, DRAIN), never TAP.

        RED-before (tip): the tap switch opens no ticket, so the violation count
        is 0 and the leak is invisible to the audit."""
        kb = kb_env_ns.kb
        build(kb, taps=TAP_AD)
        ledger = kb._ledger

        down(kb, VK_A, 1000)   # press(a)
        down(kb, VK_D, 1100)   # switch -> owed UP(a) left open (a leaked sequence)
        owed = [t for t in ledger.open_tickets(kind=TICKET_RELEASE)
                if t.vk == VK_A and t.source_kind == SOURCE_TAP]
        assert len(owed) == 1, owed

        retire_expected = (SOURCE_TOGGLE, SOURCE_MACRO, SOURCE_DRAIN)
        # the violation counter the retire leg uses (F-A7 reviewer P2-4)
        assert kb.ledger_open_count(
            expected_source_kinds=retire_expected) == 1, "tap debt not a violation"
        # the classifier the swap runs (fst_keyboard.py:867) - names the debt
        violations = ledger.audit('snapshot_retire', gen_id=kb.runtime.gen_id,
                                  expected_source_kinds=retire_expected)
        assert violations == 1, violations

        # once delivered it is no longer open debt -> no violation
        fire_injected_release(kb, kb_env_ns.kb_mock, VK_A)
        assert kb.ledger_open_count(
            expected_source_kinds=retire_expected) == 0
