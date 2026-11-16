"""F-C1 CONTRACT GOLDENS - config text in, injected sequence out.

Every test here is a GOLDEN: it locks one user-visible behavior of the whole
pipeline (parse -> validate -> presort -> snapshot -> hook filter -> injected
key stream) as measured by the contract lane (tests/contract_lane.py, fixture
`contract`). The goldens are the immovable reference for the Phase C refactors
(F-C2 one parser, F-C3 constraint namespace): a refactor may change any
internal, these streams may not move.

Each test names the contract in its one-line comment, in behavior vocabulary
- what the app receives, not which dict the filter read.
"""
import ctypes

import pytest

from conftest import TestIsolationViolation
from contract_lane import combo, down, focus, focus_lost, tap, up
from fst_data_types import ConfigError

# one config shared by the foreground goldens: a default rebind (x:y) plus a
# focus section whose own rebind (q:w) only lives while that app is foreground
FOCUS_CONFIG = """
x : y

<focus>game
q : w
"""

# same sections, but the section opts out of the default group lines (#403)
DEFAULT_OFF_CONFIG = """
x : y

<focus>game
<arg>-default_off
q : w
"""

# same sections, default scope asks to stay active when no focus matches
ALWAYS_ACTIVE_CONFIG = """
<arg>-always_active
x : y

<focus>game
q : w
"""


class TestInjectedPressAndRelease:
    """The basic injection contract: what a key tap becomes on the wire."""

    def test_key_rebind_injects_target_press_and_release(self, contract):
        # CONTRACT: tapping a rebound key a (notation 'a : b') makes the app
        # receive press b then release b; the real a never reaches the app.
        stream = contract.run_contract('a : b\n', tap('a'))
        assert stream.text() == 'down b | up b'
        assert stream.suppressed == ['down a', 'up a']

    def test_press_only_rebind_leaves_the_release_unfiltered(self, contract):
        # CONTRACT: a press-only rebind ('-a : -b') injects only press b; the
        # real release of a passes through untouched (not injected, not
        # suppressed).
        stream = contract.run_contract('-a : -b\n', [down('a'), up('a')])
        assert stream.for_stimulus(0) == 'down b'
        assert stream.for_stimulus(1) == ''
        assert stream.suppressed == ['down a']


class TestTapGroupIdealization:
    """The snap-tap core: one held member of the group at a time."""

    def test_tap_group_a_d_idealizes_the_full_down_up_stream(self, contract):
        # CONTRACT: with tap group 'a, d', the app always holds exactly the
        # last-pressed member: pressing a then d streams down a | up a down d
        # | (release d) up d down a | (release a) up a; none of the real a/d
        # events reaches the app.
        stream = contract.run_contract('a, d\n',
                                       [down('a'), down('d'), up('d'), up('a')])
        assert stream.text() == ('down a | up a | down d | '
                                 'up d | down a | up a')
        assert stream.suppressed == ['down a', 'down d', 'up d', 'up a']


class TestConstraintGates:
    """Constraint kinds: a modifier-state trigger gate and a replacement-side
    evaluation gate (WIKI 'Rebinds': a failing replacement constraint still
    swallows the trigger; a failing trigger constraint lets the key pass)."""

    def test_modifier_gate_fires_the_rebind_while_shift_is_held(self, contract):
        # CONTRACT: 'a, -shift : b' fires while shift is physically held:
        # the app receives press b (and the a is swallowed).
        stream = contract.run_contract('a, -shift : b\n',
                                       [down('shift'), down('a')])
        assert stream.for_stimulus(1) == 'down b'
        assert 'down a' in stream.suppressed

    def test_modifier_gate_blocked_lets_the_key_pass(self, contract):
        # CONTRACT: the same line without the gate's modifier is a no-op:
        # nothing is injected and the real a reaches the app (not suppressed).
        stream = contract.run_contract('a, -shift : b\n',
                                       [down('a'), up('a')])
        assert stream.text() == ''
        assert stream.suppressed == []

    def test_replacement_side_gate_blocks_and_still_swallows(self, contract):
        # CONTRACT: 'a : b|(p("shift"))' matches the trigger but the
        # replacement's own gate fails: nothing is injected AND the real a is
        # still swallowed (the documented difference to the trigger-side gate).
        stream = contract.run_contract('a : b|(p("shift"))\n',
                                       [down('a'), up('a')])
        assert stream.text() == ''
        assert stream.suppressed == ['down a', 'up a']
        # ...and the gate opens with the modifier held
        stream = contract.run_contract('a : b|(p("shift"))\n',
                                       [down('shift'), down('a')])
        assert stream.for_stimulus(1) == 'down b'


class TestForegroundSections:
    """Focus sections are the foreground gate: which config lines are live."""

    def test_focus_section_activates_its_groups_for_the_foreground_app(self, contract):
        # CONTRACT: outside the foreground section q is a plain key; while the
        # 'game' window is foreground the section's rebind is live (q makes
        # the app receive press w) and the default group stays merged in
        # (x still rebinds to y).
        stream = contract.run_contract(FOCUS_CONFIG, [down('q')])
        assert stream.text() == ''
        stream = contract.drive([focus('game'), down('q'), up('q'), down('x')])
        assert stream.for_stimulus(1) == 'down w'
        assert stream.for_stimulus(2) == 'up w'
        assert stream.for_stimulus(3) == 'down y'

    def test_default_off_section_drops_the_default_groups(self, contract):
        # CONTRACT: a section with -default_off runs ONLY its own lines:
        # while 'game' is foreground q rebinds to w but x is a plain key
        # again (the default group lines are out of the live generation).
        stream = contract.run_contract(DEFAULT_OFF_CONFIG, [focus('game')])
        assert stream.text() == ''
        stream = contract.drive([down('x'), up('x'), down('q')])
        assert stream.for_stimulus(0) == ''
        assert stream.for_stimulus(1) == ''
        assert stream.for_stimulus(2) == 'down w'

    def test_default_always_active_keeps_the_default_stream_after_focus_loss(self, contract):
        # CONTRACT: with -always_active in the default scope, losing the
        # foreground window keeps the default groups live and the filter
        # running: after the focus loss x still makes the app receive y.
        contract.run_contract(ALWAYS_ACTIVE_CONFIG, [focus('game')])
        stream = contract.drive([focus_lost(), down('x')])
        assert stream.for_stimulus(1) == 'down y'
        assert not contract.kb.arg_manager.WIN32_FILTER_PAUSED

    def test_focus_loss_without_always_active_pauses_the_stream(self, contract):
        # CONTRACT: without -always_active, losing the foreground window
        # auto-pauses the filter: nothing is injected anymore and no key is
        # suppressed either - every keystroke reaches the app unfiltered.
        contract.run_contract(FOCUS_CONFIG, [focus('game')])
        stream = contract.drive([focus_lost(), down('x'), up('x')])
        assert stream.text() == ''
        assert stream.suppressed == []
        assert contract.kb.arg_manager.WIN32_FILTER_PAUSED


class TestToggle:
    """A ^Key replacement is a latch, not a momentary key."""

    def test_toggle_rebind_engages_on_first_press_and_releases_on_next(self, contract):
        # CONTRACT: 'c : ^shift' latches shift: first tap of c presses shift
        # (engaged), the tap release is swallowed; the next tap of c releases
        # shift again - the app sees down shift | up shift from two taps.
        stream = contract.run_contract('c : ^shift\n',
                                       [down('c'), up('c'), down('c'), up('c')])
        assert stream.text() == 'down shift | up shift'
        assert stream.suppressed == ['down c', 'up c', 'down c', 'up c']


class TestMacroPlayback:
    """A macro trigger swallows itself and plays its whole sequence."""

    def test_macro_plays_the_whole_key_sequence_and_swallows_the_trigger(self, contract):
        # CONTRACT: 'a :: b, c' on press a makes the app receive press b,
        # release b, press c, release c - in that order - and the real a
        # never reaches the app.
        stream = contract.run_contract('a :: b, c\n', [down('a')])
        assert stream.text() == 'down b | up b | down c | up c'
        assert stream.suppressed == ['down a']

    def test_macro_modifier_sequence_carries_the_modifier_pair(self, contract):
        # CONTRACT: 'a :: -shift, x, +shift' carries the modifier around the
        # payload: the app sees shift down, x pressed and released, shift up -
        # the modifier is held for the payload, never left engaged.
        stream = contract.run_contract('a :: -shift, x, +shift\n', [down('a')])
        assert stream.text() == ('down shift | down x | up x | '
                                 'up shift')
        assert stream.suppressed == ['down a']


class TestTriggerPriority:
    """D1 ruling (2026-11-15): several triggers may share one key; who wins
    stays as the current dict/presort order behaves - pinned here at the
    stream level so the F-C2/C3 refactors cannot move it."""

    def test_two_triggers_one_key_first_listed_wins_when_both_match(self, contract):
        # CONTRACT: with 'a, -shift : b' listed above 'a, -ctrl : c' and BOTH
        # modifiers held, the app receives press b (the first-listed trigger
        # wins; c is not sent).
        stream = contract.run_contract('a, -shift : b\na, -ctrl : c\n',
                                       [down('shift'), down('ctrl'), down('a')])
        assert stream.for_stimulus(2) == 'down b'

    def test_two_triggers_one_key_second_wins_when_first_gate_is_closed(self, contract):
        # CONTRACT: same config, only ctrl held: the first trigger's gate is
        # closed and the scan falls through - the app receives press c.
        stream = contract.run_contract('a, -shift : b\na, -ctrl : c\n',
                                       [down('ctrl'), down('a')])
        assert stream.for_stimulus(1) == 'down c'

    def test_identical_trigger_lines_last_line_wins(self, contract):
        # CONTRACT: two lines with a byte-identical trigger collapse to one
        # entry and the LAST written replacement is the live one: 'a : b' then
        # 'a : c' makes the app receive press c (never b).
        stream = contract.run_contract('a : b\na : c\n', [down('a')])
        assert stream.for_stimulus(0) == 'down c'


class TestRejectedConfig:
    """A rejected config is a documented validator report - and the live
    runtime generation keeps serving (the last accepted config still streams)."""

    def test_unknown_key_rejects_the_load_and_keeps_the_live_stream(self, contract):
        # CONTRACT: config text naming an unknown key is rejected with the
        # validator report (ConfigError); the stream of the last accepted
        # config is unaffected.
        generation = contract.run_contract('a : b\n', []).injected
        assert generation == []
        live_gen = contract.kb._runtime.gen_id
        with pytest.raises(ConfigError) as exc:
            contract.load('q : zzznotakey\n')
        assert 'zzznotakey' in str(exc.value)
        assert contract.kb._runtime.gen_id == live_gen
        stream = contract.drive(tap('a'))
        assert stream.text() == 'down b | up b'

    def test_invalid_structure_rejects_the_load_and_keeps_the_live_stream(self, contract):
        # CONTRACT: a structurally invalid line (multi-key rebind replacement,
        # validator rule 'arity') is rejected the same way and the live stream
        # keeps streaming the last accepted config.
        contract.run_contract('a : b\n', [])
        live_gen = contract.kb._runtime.gen_id
        with pytest.raises(ConfigError):
            contract.load('a : b, c\n')
        assert contract.kb._runtime.gen_id == live_gen
        stream = contract.drive(tap('a'))
        assert stream.text() == 'down b | up b'


class TestLifecyclePause:
    """The alt+delete control combo pauses and resumes the whole stream."""

    def test_pause_combo_blocks_the_stream_and_resume_restores_it(self, contract):
        # CONTRACT: pressing the pause combo (alt+delete) pauses the filter -
        # the rebind stops injecting and the real keys pass through unfiltered;
        # the same combo reloads the config from file and the stream is live
        # again (press b reaches the app).
        stream = contract.run_contract('a : b\n',
                                       [combo('alt', 'delete'),
                                        down('a'), up('a'),
                                        combo('alt', 'delete'),
                                        down('a'), up('a')])
        assert stream.for_stimulus(1) == ''   # paused: nothing injected
        assert stream.for_stimulus(2) == ''
        assert stream.for_stimulus(4) == 'down b'   # resumed via reload
        assert stream.for_stimulus(5) == 'up b'
        # only the resumed pair was swallowed-and-replaced; while paused the
        # real keys reached the app unsuppressed
        assert stream.suppressed == ['down a', 'up a']


class TestLaneGuards:
    """The lane's own reliability pins - they guard the goldens, not FST."""

    def test_same_config_and_stimuli_produce_the_identical_stream(self, contract):
        # LANE CONTRACT: the lane is deterministic - the same config text and
        # the same stimuli twice in a row produce byte-identical streams
        # (no wall clock, no randint, no thread interleaving).
        stimuli = [down('shift'), down('a'), up('a'), up('shift'),
                   down('b'), up('b')]
        config = 'a, -shift : b\nb : c\n'
        first = contract.run_contract(config, stimuli)
        second = contract.run_contract(config, stimuli)
        assert first.vks() == second.vks()
        assert first.text() == second.text()
        assert first.suppressed == second.suppressed
        assert first.text() != ''  # a vacuous empty-stream equality proves nothing

    def test_isolation_tripwire_stays_armed_around_the_lane(self, contract):
        # LANE CONTRACT: the F-B7 desktop tripwire is live while the lane
        # runs - the lane captures injections through the recorder and never
        # reaches an OS input primitive, while a direct SendInput still raises.
        stream = contract.run_contract('a : b\n', tap('a'))
        assert stream.text() == 'down b | up b'
        with pytest.raises(TestIsolationViolation):
            ctypes.windll.user32.SendInput(0, None, None)
