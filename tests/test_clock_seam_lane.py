"""15CLOCK - the wall-clock constraint families pinned through the product
clock seam (maintainer decision 15=a, 2026-11-16_decisions.md item 15).

These are CONTRACT GOLDENS for the clock-consuming constraint families:
`last()`, `get_time()`, `date()`, `date_time()`. Before the seam these legs
read the real wall clock while the lane drives synthetic win32 event times,
so no stream golden could pin them (the F-C1 wishlist - the entry filed
2026-11-16_17-41). The seam (fst_manager._wall_ms / _wall_datetime, driven by
the lane's clock(ms) stimulus) pins the product's clock to a fake instant on
the same axis as the synthetic event times, so a golden states what the REAL
clock would give at that instant.

The F-C1 goldens in tests/test_contract_lane.py stay on the production clock
path (they arm no clock); this file owns the clock-driven streams.

Family split (measured at the tip, see the plan-file 15CLOCK STATUS block):
  - stream-pinned here: last() (2 _wall_ms reads), get_time() (_wall_ms),
    date()/date_time() (_wall_datetime);
  - stay unit-only (they read the stored win32 event times the lane already
    drives deterministically - no wall-clock read): tr/ts/ta/cs/csl and dc;
    their unit pins are tests/test_output_manager.py::TestTimingEval.
"""
import datetime
import inspect
import time
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

import fst_manager
from contract_lane import clock, down, up
from fst_data_types import Key_Event

# a threshold the real clock passes today and every fake position near the
# synthetic tick base (1001) fails - one past epoch ms, 2001-09-09
REAL_CLOCK_EPOCH_MS = 1000000000000


@pytest.fixture
def seam_clock():
    """Restore the production real-time providers after every seam test."""
    yield
    fst_manager.reset_clock_for_tests()


@pytest.fixture
def om_env(fake_fst, monkeypatch):
    """A real Output_Manager over the fake FST (the test_output_manager.py
    pattern) - for the direct constraint_evaluation legs of the seam."""
    from fst_manager import Output_Manager
    kb_mock = MagicMock()
    ms_mock = MagicMock()
    monkeypatch.setattr('pynput.keyboard.Controller', lambda: kb_mock)
    monkeypatch.setattr('pynput.mouse.Controller', lambda: ms_mock)
    manager = Output_Manager(fake_fst)
    fake_fst.output_manager = manager
    return SimpleNamespace(om=manager, fst=fake_fst)


def make_ke():
    """A press of 'b' - constraint_evaluation only reads current_ke.vk_code."""
    return Key_Event(0x42, is_press=True)


class TestSeamDefaults:
    """The production path: the seam is never armed, so the providers ARE the
    pre-seam reads and the lane runs on real time."""

    def test_production_providers_are_the_real_time_reads(self):
        # CONTRACT (production default): the un-armed providers are the real
        # time/datetime calls themselves - the pre-seam expressions byte for
        # byte, and they answer the actual wall clock.
        assert fst_manager._wall_ms is fst_manager._real_wall_ms
        assert fst_manager._wall_datetime is fst_manager._real_wall_datetime
        assert 'int(time() * 1000)' in inspect.getsource(
            fst_manager._real_wall_ms)
        assert 'datetime.datetime.now()' in inspect.getsource(
            fst_manager._real_wall_datetime)
        assert abs(fst_manager._wall_ms() - int(time.time() * 1000)) < 5000

    def test_lane_restores_real_time_after_a_pinned_run(self, contract):
        # CONTRACT (lane isolation): a run that armed the fake clock restores
        # the real-time providers for the next run - a pinned clock never
        # leaks into a production-path golden.
        cfg = f'b : c|(get_time() > {REAL_CLOCK_EPOCH_MS})\n'
        pinned = contract.run_contract(cfg, [clock(1001), down('b')])
        assert pinned.text() == ''          # fake 1001 ms: gate closed
        real = contract.run_contract(cfg, [down('b')])
        assert real.text() == 'down c'      # real clock: gate open again


class TestLastFamilyStream:
    """last() - time since a key's last press, on the event-time axis."""

    def test_last_gate_closed_below_the_threshold(self, contract):
        # CONTRACT: press a at the tick base, arm the clock 40 ms later:
        # (last("-a") > 40) is False, the app receives nothing and the real
        # b is swallowed by the matched-but-blocked replacement leg.
        stream = contract.run_contract(
            'b : c|(last("-a") > 40)\n',
            [clock(1001), down('a'), up('a'), clock(1041), down('b')])
        assert stream.text() == ''
        assert stream.suppressed == ['down b']

    def test_last_gate_opens_above_the_threshold(self, contract):
        # CONTRACT: the same stream with the clock armed 1 ms further:
        # (last("-a") > 40) is True, the app receives press c.
        stream = contract.run_contract(
            'b : c|(last("-a") > 40)\n',
            [clock(1001), down('a'), up('a'), clock(1042), down('b')])
        assert stream.text() == 'down c'

    def test_seam_pins_the_time_diff_domain_calibration(self, contract):
        # CONTRACT (boundary leg): the one-time TIME_DIFF calibration the
        # pump performs on the first hook event (the axis last() measures on)
        # reads the SAME seam - arming the clock at the tick base leaves the
        # domain offset at 0, so last() answers fake_now minus the stored
        # event time with no wall-clock residue.
        from fst_keyboard import FST_Keyboard
        stream = contract.run_contract(
            'b : c|(last("-a") > 40)\n',
            [clock(1001), down('a'), up('a'), clock(1041), down('b')])
        assert FST_Keyboard.TIME_DIFF == 0
        assert stream.text() == ''


class TestGetTimeFamilyStream:
    """get_time() - the epoch-ms clock itself, as a gate."""

    def test_get_time_gate_closed_at_the_pinned_instant(self, contract):
        # CONTRACT: (get_time() > 1000) at the pinned instant 1000 ms: False,
        # nothing is injected and the b is swallowed.
        stream = contract.run_contract(
            'b : c|(get_time() > 1000)\n', [clock(1000), down('b')])
        assert stream.text() == ''
        assert stream.suppressed == ['down b']

    def test_get_time_gate_opens_one_ms_later(self, contract):
        # CONTRACT: the same line 1 ms later in the pinned clock: True, the
        # app receives press c.
        stream = contract.run_contract(
            'b : c|(get_time() > 1000)\n', [clock(1001), down('b')])
        assert stream.text() == 'down c'


class TestDateFamilyStream:
    """date() - the %y%m%d string the date-writing macros stamp."""

    def _at(self, dt):
        return int(dt.timestamp() * 1000)

    def test_date_gate_matches_the_pinned_local_date(self, contract):
        # CONTRACT: with the clock armed inside 2026-01-01 (local - a date
        # the real clock stopped answering long ago, so this leg cannot pass
        # on wall time), (date() == "260101") is True: press c is injected.
        dt = datetime.datetime(2026, 1, 1, 23, 59)
        gate = 'b : c|(date() == "%s")\n' % dt.strftime('%y%m%d')
        stream = contract.run_contract(gate, [clock(self._at(dt)), down('b')])
        assert stream.text() == 'down c'

    def test_date_gate_breaks_at_the_midnight_rollover(self, contract):
        # CONTRACT: the same stream one minute later, across local midnight:
        # the date string moved, the gate is False, nothing is injected and
        # the b is swallowed - a stream outcome only the fake clock makes
        # pinnable (this golden would flip by itself on a real clock).
        dt = datetime.datetime(2026, 1, 1, 23, 59)
        later = dt + datetime.timedelta(minutes=1)
        gate = 'b : c|(date() == "%s")\n' % dt.strftime('%y%m%d')
        stream = contract.run_contract(gate, [clock(self._at(later)),
                                              down('b')])
        assert stream.text() == ''
        assert stream.suppressed == ['down b']


class TestDateTimeFamilyStream:
    """date_time() - the %y%m%d-%H%M string."""

    def _at(self, dt):
        return int(dt.timestamp() * 1000)

    def test_date_time_gate_matches_the_pinned_minute(self, contract):
        # CONTRACT: (date_time() == "260101-2359") while the clock is armed
        # in that minute (a minute the real clock left long ago - this leg
        # cannot pass on wall time): True, the app receives press c.
        dt = datetime.datetime(2026, 1, 1, 23, 59, 30)
        gate = 'b : c|(date_time() == "%s")\n' % dt.strftime('%y%m%d-%H%M')
        stream = contract.run_contract(gate, [clock(self._at(dt)), down('b')])
        assert stream.text() == 'down c'

    def test_date_time_gate_breaks_at_the_minute_rollover(self, contract):
        # CONTRACT: one minute later on the fake clock the stamped minute
        # moved, so the same gate is False: nothing injected, b swallowed.
        dt = datetime.datetime(2026, 1, 1, 23, 59, 30)
        later = dt + datetime.timedelta(minutes=1)
        gate = 'b : c|(date_time() == "%s")\n' % dt.strftime('%y%m%d-%H%M')
        stream = contract.run_contract(gate, [clock(self._at(later)),
                                              down('b')])
        assert stream.text() == ''
        assert stream.suppressed == ['down b']


class TestDeterminismAcrossClockPositions:
    """The delegation's determinism core: one stream, the clock the only
    variable, plus repeat stability."""

    def test_same_stream_two_clock_positions_opposite_outcomes(self, contract):
        # CONTRACT: identical config text AND identical stimuli, the armed
        # clock the only difference: at 1041 ms the app receives nothing, at
        # 1042 ms it receives press c - the outcomes the real clock would
        # give at those instants, with no wall-clock residue.
        cfg = 'b : c|(last("-a") > 40)\n'
        below = contract.run_contract(
            cfg, [clock(1001), down('a'), up('a'), clock(1041), down('b')])
        above = contract.run_contract(
            cfg, [clock(1001), down('a'), up('a'), clock(1042), down('b')])
        assert below.text() == ''
        assert above.text() == 'down c'
        assert below.text() != above.text()

    def test_same_clock_twice_gives_the_identical_stream(self, contract):
        # CONTRACT: the lane plus the pinned clock is deterministic - the same
        # config and the same clock twice give byte-identical streams.
        cfg = 'b : c|(get_time() > 1000 and last("-a") > 40)\n'
        first = contract.run_contract(
            cfg, [clock(1001), down('a'), up('a'), clock(1042), down('b')])
        second = contract.run_contract(
            cfg, [clock(1001), down('a'), up('a'), clock(1042), down('b')])
        assert first.text() == 'down c'
        assert first.vks() == second.vks()
        assert first.suppressed == second.suppressed


class TestSeamUnitLegs:
    """The three families that had NO pins at all before 15CLOCK, pinned at
    the seam level too (a fake clock straight into constraint_evaluation)."""

    def test_get_time_and_last_answer_the_pinned_instant(self, om_env,
                                                         seam_clock):
        fst_manager.set_clock_for_tests(500000)
        om_env.fst.TIME_DIFF = 0
        sm = om_env.fst.state_manager
        sm._time_real[0][0x41] = 499000   # pressed 1000 ms before the pin
        assert om_env.om.constraint_evaluation('get_time()', make_ke()) == 500000
        assert om_env.om.constraint_evaluation('last("-a")', make_ke()) == 1000

    def test_date_and_date_time_answer_the_pinned_instant(self, om_env,
                                                          seam_clock):
        dt = datetime.datetime(2026, 1, 1, 23, 59, 30)
        fst_manager.set_clock_for_tests(int(dt.timestamp() * 1000))
        assert om_env.om.constraint_evaluation('date()', make_ke()) == '260101'
        assert (om_env.om.constraint_evaluation('date_time()', make_ke())
                == '260101-2359')
