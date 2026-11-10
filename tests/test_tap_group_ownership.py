"""FST-404 (#404) — tap-group hold ownership pins (Leg 1), pair mode.

Protocol: agent/handover/protocols/protocol_fst-404-multigroup-stuck.md
(estate). Model: Leg 0 F1-F4. Reviewer contract: Decision ledger D3.

Model facts this file pins (verified in Leg 0, re-verified by the reviewer):
- Each Tap_Group owns its app-level hold in `last_key_send`
  (fst_manager.py send_keys_for_tap_group), while
  Input_State_Manager._simulated_key_press_states_dict holds a GLOBAL,
  vk-keyed record of the same fact with NO group ownership.
- The simulated-key veto leg (fst_keyboard.py:1107-1129) suppresses ANY
  injected release of a vk whose owning group still has it as `active_key`.
- F1 (negative result): the exhaustive interleaving scan of two disjoint
  groups ((a,d) x (w,s), 2520 orders, production-shaped hook feedback)
  yields ZERO invariant violations. So the maintainer's exact symptom
  (stuck 's' with both groups active) cannot be reproduced by any
  interleaving in the mock - the final ingredient is a LOST press/release
  (hypotheses H1 hook-chain crash / H2 hook timeout, handover_u301.md),
  which a mocked filter cannot represent. Per spec, the invariant is
  pinned instead.
- F2 (deterministic, reproducible here): the global sweep
  release_all_currently_pressed_simulated_keys() is a SILENT NO-OP for
  every tap-group key - the veto eats each release while reset_states_dicts()
  clears the global record anyway. That is the ownership split
  (three records, one fact, no single owner) and it is what leaves a
  tap key unreleasable once the group is rebuilt or the listeners stop.

Pins (reviewer D3): L1-1 RED repro (sweep silent no-op), L1-2 I1
single-owner agreement, L1-3 I2 one release path per scenario, L1-4
characterization of today's silent acceptance of one vk in two tap groups.
RED pins carry xfail(strict=True) so every checkpoint commit stays green;
the Leg-2 fix commit removes those markers (a strict xfail that starts to
pass fails the Leg-2 run, so the removal is forced).

Harness note: the win32 filter is called directly (no live listeners - repo
gate rule). Every event FST injects through the controller mock is fed back
through the filter as simulated (`is_simulated=True`), which is what the
production low-level hook does; an event is app-visible iff the hook did not
call `suppress_event()` for it.
"""
import pytest
from collections import Counter
from unittest.mock import MagicMock

from kb_helpers import build
from vk_codes import vk_codes_dict

VK_A = vk_codes_dict['a']
VK_D = vk_codes_dict['d']
VK_W = vk_codes_dict['w']
VK_S = vk_codes_dict['s']
VK_Q = vk_codes_dict['q']
VK_E = vk_codes_dict['e']

TWO_GROUPS = [['(TAP_1)', ['a', 'd']], ['(TAP_2)', ['w', 's']]]


class TapModel:
    """Filter + controller mock + hook feedback; counts app-visible events."""

    def __init__(self, kb, kb_mock):
        self.kb = kb
        self.kb_mock = kb_mock
        self.app = Counter()
        self._seen = 0
        self._t = 1000

    def _feed(self, vk, is_press, simulated):
        before = self.kb._listener.suppress_event.call_count
        self.kb._win32_event_filter(vk, self._t, is_press, simulated)
        self._t += 1
        return self.kb._listener.suppress_event.call_count == before

    def _drain(self):
        """Re-inject everything FST emitted since the last drain."""
        calls = list(self.kb_mock.method_calls)
        while self._seen < len(calls):
            c = calls[self._seen]
            self._seen += 1
            if c[0] not in ('press', 'release'):
                continue
            vk, is_press = c.args[0].vk, c[0] == 'press'
            if self._feed(vk, is_press, True):
                self.app[vk] += 1 if is_press else -1

    def press(self, vk):
        if self._feed(vk, True, False):
            self.app[vk] += 1
        self._drain()

    def release(self, vk):
        if self._feed(vk, False, False):
            self.app[vk] -= 1
        self._drain()

    def act(self, action):
        """Run a non-event FST entry point, then drain its injections."""
        action()
        self._drain()

    def app_down(self, vk):
        return self.app[vk]

    def net(self):
        return {vk: n for vk, n in self.app.items() if n}


def _groups_last_send(kb):
    return [tg.get_last_key_send() for tg in kb._tap_groups]


def _group_of(kb, vk):
    for tg in kb._tap_groups:
        if vk in tg.get_vk_codes():
            return tg
    return None


class TestSweepOwnership:
    """L1-1/L1-2/L1-3(legs): the sweep must release tap holds through the
    owner and must not forget a hold it could not release."""

    def test_sweep_releases_tap_holds_in_both_groups(self, kb_env_ns):
        # RED in Leg 1 (commit 3b3a806, app_down stayed 1 for both keys):
        # the fix makes the owner release its hold first, then emits
        # synchronously so the veto leg cannot eat it
        kb, kb_mock = kb_env_ns.kb, kb_env_ns.kb_mock
        build(kb, taps=TWO_GROUPS)
        m = TapModel(kb, kb_mock)
        m.press(VK_A)   # group 1 holds a down in the app
        m.press(VK_S)   # group 2 holds s down in the app
        assert m.app_down(VK_A) == 1 and m.app_down(VK_S) == 1
        assert kb.state_manager.get_simulated_key_press_state(VK_A) is True
        assert kb.state_manager.get_simulated_key_press_state(VK_S) is True
        assert _groups_last_send(kb) == [VK_A, VK_S]

        m.act(lambda: kb.release_all_currently_pressed_simulated_keys())

        # every tap hold must reach the app as a release
        assert m.app_down(VK_A) == 0
        assert m.app_down(VK_S) == 0
        # and the owner must record that it no longer holds anything
        assert _groups_last_send(kb) == [None, None]

    def test_owner_and_global_record_agree_after_sweep(self, kb_env_ns):
        # RED in Leg 1 (commit 3b3a806, vk 'a': global claim False vs group
        # claim True): after the fix the owner clears its claim as it releases
        kb, kb_mock = kb_env_ns.kb, kb_env_ns.kb_mock
        build(kb, taps=TWO_GROUPS)
        m = TapModel(kb, kb_mock)
        m.press(VK_A)
        m.press(VK_W)
        m.press(VK_S)   # group 2 switches w -> s; app holds a and s
        m.act(lambda: kb.release_all_currently_pressed_simulated_keys())
        # I1: for every vk in a tap group the global claim and the owning
        # group's claim must describe the same app-level hold
        for vk in (VK_A, VK_D, VK_W, VK_S):
            tg = _group_of(kb, vk)
            group_claim = tg.get_last_key_send() == vk
            global_claim = bool(kb.state_manager.get_simulated_key_press_state(vk))
            assert global_claim == group_claim, (vk, global_claim, group_claim)
            assert m.app_down(vk) == 0, vk

    def test_switch_scenario_has_exactly_one_release_path(self, kb_env_ns):
        # I2 green leg: the intra-group switch is the single release path
        kb, kb_mock = kb_env_ns.kb, kb_env_ns.kb_mock
        build(kb, taps=[['(TAP_1)', ['w', 's']]])
        m = TapModel(kb, kb_mock)
        m.press(VK_W)
        m.press(VK_S)
        m.release(VK_W)
        assert m.app_down(VK_W) == 0
        assert m.app_down(VK_S) == 1
        assert _groups_last_send(kb) == [VK_S]

    def test_physical_release_scenario_has_exactly_one_release_path(self, kb_env_ns):
        # I2 green leg: press + physical release -> net-zero, one owner clear
        kb, kb_mock = kb_env_ns.kb, kb_env_ns.kb_mock
        build(kb, taps=TWO_GROUPS)
        m = TapModel(kb, kb_mock)
        m.press(VK_A)
        m.press(VK_S)
        m.release(VK_S)
        m.release(VK_A)
        assert m.net() == {}
        assert _groups_last_send(kb) == [None, None]


class TestRebuildOwnership:
    """D4 forward-looking legs that are already true today (they heal because
    an unowned real release passes the filter unfiltered) - pinned so the
    Leg-2 release-before-drop cannot regress them."""

    def test_release_after_group_rebuild_leaves_no_app_hold(self, kb_env_ns):
        # group-swap entry point (apply_focus_groups -> initialize_groups...):
        # the SAME tap groups are rebuilt, so a new owner exists when the
        # physical release arrives and the tap leg suppresses the duplicate
        kb, kb_mock = kb_env_ns.kb, kb_env_ns.kb_mock
        build(kb, taps=TWO_GROUPS)
        m = TapModel(kb, kb_mock)
        m.press(VK_S)
        m.act(lambda: kb.initialize_groups_from_presorted_lines())
        assert m.app_down(VK_S) == 0
        assert _groups_last_send(kb) == [None, None]
        m.release(VK_S)                            # suppressed by the new owner
        assert m.app_down(VK_S) == 0


class TestDuplicateGroupKeyCharacterization:
    """L1-4: today a vk may sit in TWO tap groups with NO validator message
    (fst_manager.py:1417-1427 checks shape + vk resolvability only), while the
    tap section hands the vk to the first group (break, fst_keyboard.py:1071)
    and the veto leg lets every group containing it veto - two owners.
    Characterization pin; the Leg-2 commit adds a WARNING (D1) and this pin
    flips deliberately."""

    def test_duplicate_vk_in_two_tap_groups_warns(self):
        # Leg-1 characterization (commit 3b3a806): no message at all.
        # Leg-2 ruling D1: WARNING + runtime single-owner guard (an ERROR
        # would reject existing user configs = maintainer approval gate).
        from fst_manager import Config_Manager, Config_Validator
        cm = Config_Manager()
        numbered = cm._combine_multilines_numbered(
            cm._clean_comments_numbered('a, d\na, s\n'.splitlines(keepends=True)))
        violations = Config_Validator().validate(numbered)
        errors = [v for v in violations if v.severity == Config_Validator.ERROR]
        warnings = [v for v in violations if v.severity == Config_Validator.WARNING]
        assert errors == []
        assert len(warnings) == 1
        assert warnings[0].rule == 'tap-dup'
        assert warnings[0].line == 2
        assert '(TAP_1)' in warnings[0].message and 'line 1' in warnings[0].message

    def test_disjoint_tap_groups_stay_message_free(self):
        from fst_manager import Config_Manager, Config_Validator
        cm = Config_Manager()
        numbered = cm._combine_multilines_numbered(
            cm._clean_comments_numbered('a, d\nw, s\n'.splitlines(keepends=True)))
        assert Config_Validator().validate(numbered) == []

    def test_duplicate_vk_still_creates_two_groups_today(self, kb_env_ns):
        kb = kb_env_ns.kb
        build(kb, taps=[['(TAP_1)', ['a', 'd']], ['(TAP_2)', ['a', 's']]])
        assert len(kb._tap_groups) == 2
        assert kb._tap_groups[0].get_vk_codes() == [vk_codes_dict['a'], vk_codes_dict['d']]
        assert kb._tap_groups[1].get_vk_codes() == [vk_codes_dict['a'], vk_codes_dict['s']]

    def test_first_group_owns_a_duplicate_vk(self, kb_env_ns):
        # D1 guard: a non-owner group stays inert - the owner accounts the vk
        # and releases it, the duplicate group never double-accounts it
        kb, kb_mock = kb_env_ns.kb, kb_env_ns.kb_mock
        build(kb, taps=[['(TAP_1)', ['a', 'd']], ['(TAP_2)', ['a', 's']]])
        m = TapModel(kb, kb_mock)
        m.press(VK_A)
        m.release(VK_A)
        assert m.net() == {}
        assert _groups_last_send(kb) == [None, None]
        assert kb._tap_owner_by_vk[VK_A] is kb._tap_groups[0]


class TestSweepPerGroupCount:
    """D4: with N active groups each holding one tap key, the sweep must
    release all N holds app-visible and clear all N bookkeeping records."""

    @pytest.mark.parametrize("groups,holds", [
        ([['(TAP_1)', ['w', 's']]], [VK_S]),
        (TWO_GROUPS, [VK_A, VK_S]),
        ([['(TAP_1)', ['a', 'd']], ['(TAP_2)', ['w', 's']],
          ['(TAP_3)', ['q', 'e']]], [VK_A, VK_S, VK_Q]),
    ], ids=["1group", "2groups", "3groups"])
    def test_sweep_releases_every_group_hold(self, kb_env_ns, groups, holds):
        kb, kb_mock = kb_env_ns.kb, kb_env_ns.kb_mock
        build(kb, taps=groups)
        m = TapModel(kb, kb_mock)
        for vk in holds:
            m.press(vk)
        m.act(lambda: kb.release_all_currently_pressed_simulated_keys())
        assert m.net() == {}
        assert _groups_last_send(kb) == [None] * len(groups)


class TestQuitPathOwnership:
    """D2(b): the quit paths stop the listeners right after the sweep, so the
    tap releases must be emitted synchronously BEFORE the listener stops."""

    def test_exit_program_releases_tap_hold_before_listener_stop(self, kb_env_ns):
        kb, kb_mock = kb_env_ns.kb, kb_env_ns.kb_mock
        kb._mouse_listener = MagicMock()
        build(kb, taps=TWO_GROUPS)
        m = TapModel(kb, kb_mock)
        m.press(VK_S)
        emitted_at_stop = []
        kb._listener.stop.side_effect = lambda: emitted_at_stop.append(
            [(c[0], c.args[0].vk) for c in kb_mock.method_calls])
        kb.control_exit_program('pin')
        assert emitted_at_stop, "listener never stopped - pin fixture wrong"
        assert ('release', VK_S) in emitted_at_stop[0]
