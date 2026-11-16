"""F-B4 (review Item 13) - the one-shot status dump: THE bug-report artifact.

What the unit promises, and what these pins hold it to:

- ONE artifact, one path: fst_status.log, the same CWD-relative directory
  convention as fst.log (tests/conftest.py redirects it to tmp_path, so a suite
  run never writes the repo root).
- Written at startup and on every successful config reload; NO hotkey and NO
  numpad trigger (the product ruling restated in the spawn spec: "NO new
  hotkeys without product ruling").
- Rendered on the asyncio loop thread through the F-A4 lane helper, never on
  the hook pump (Item 13's named thread-safety downside).
- The LEDGER section carries the open-ticket table and the [StuckKeyWatch]
  aging detector (design report TOP-3 risk 3: debt that never closes must be
  nameable), with a threshold knob CONSTANTS.STUCK_TICKET_MS (default 5000 ms).
- Tap / hold / toggle state renders the F-B1 TYPED values (vk codes and
  latched bools), never an object repr - Item 13 filed the alt+num5 repr dump
  as the thing a report must not have to read.

No real keyboard, no real time, no Windows APIs: pynput controllers are mocked
by the kb_env fixtures, and every age in these pins is faked through the
render's `now` anchor - no sleeps in the suite.
"""
import asyncio
import inspect
import logging
import threading
from unittest.mock import MagicMock

import pytest

import fst_manager
from fst_keyboard import FST_Keyboard
from kb_helpers import build, down, up
from vk_codes import vk_codes_dict

VK_A = vk_codes_dict['a']
VK_B = vk_codes_dict['b']
VK_SHIFT = vk_codes_dict['shift']

TAP_A_B = ['(TAP_1)', ['a', 'b']]

# every section the artifact must carry, in the order render() emits them
SECTION_MARKERS = (
    '# FST status dump v1',
    '## Effective args (post-validation)',
    '## Lifecycle',
    '## Focus scope',
    '## Group counts',
    '## Tap hold toggle',
    '## Ledger',
    '## Paths',
    '# end of FST status dump v1',
)


def artifact_text():
    """The current artifact, read from wherever the suite redirect points."""
    with open(fst_manager.STATUS_FILE, encoding='utf-8') as handle:
        return handle.read()


def written_stamp(text):
    """The written= header value (identifies WHICH write produced the file)."""
    for line in text.splitlines():
        if line.startswith('written='):
            return line
    raise AssertionError(f'no written= stamp in the artifact:\n{text}')


def write_dump(kb, reason='pin', now=None):
    """Render + atomic overwrite straight through the dump object."""
    return kb._status_dump.write(reason=reason, now=now)


class TestArtifactSurface:
    """The artifact itself: section markers, identity header, atomic write."""

    def test_dump_written_at_startup_carries_every_section(self, kb_env_plain):
        """The bug-report artifact exists and is complete: a reporter attaches
        ONE file and reads what the filter was in."""
        kb = kb_env_plain
        path = write_dump(kb, reason='startup')

        text = artifact_text()
        for marker in SECTION_MARKERS:
            assert marker in text, f'missing section marker: {marker}'
        # identity: which run, which moment, which leg wrote it
        assert path.endswith('fst_status.log')
        assert f"pid={fst_manager.os.getpid()}" in text
        assert 'thread=' in text
        assert "reason='startup'" in text
        # the paths a reporter has to attach
        for key in ('status_file=', 'log_file=', 'flow_log=', 'drop_log=',
                    'config_file=', 'cwd='):
            assert key in text, f'missing path line: {key}'

    def test_atomic_overwrite_leaves_no_temp_residue(self, kb_env_plain,
                                                     tmp_path):
        """tmp + os.replace: the directory only ever holds the artifact, never
        a half-written sibling a reporter could attach."""
        kb = kb_env_plain
        write_dump(kb, reason='startup')
        write_dump(kb, reason='reload')

        assert [p.name for p in tmp_path.iterdir()] == ['fst_status.log']

    def test_failed_overwrite_keeps_the_previous_artifact(self, kb_env_plain,
                                                          monkeypatch,
                                                          tmp_path):
        """A locked or unwritable target must not cost the reporter the last
        good snapshot: the temp goes away, the old file stays, and the failure
        is named (the F-A4 leg rule - a failed leg is named, never a silent
        scheduled-ok)."""
        kb = kb_env_plain
        write_dump(kb, reason='good')
        before = artifact_text()

        def locked(src, dst):
            raise PermissionError(13, 'locked by another process', dst)

        monkeypatch.setattr(fst_manager.os, 'replace', locked)
        with pytest.raises(OSError):
            write_dump(kb, reason='bad')

        assert artifact_text() == before
        assert [p.name for p in tmp_path.iterdir()] == ['fst_status.log']

    def test_request_status_dump_returns_the_path_when_no_loop_is_wired(
            self, kb_env_plain):
        """No loop wired (tests, legacy headless before wiring): the F-A4
        contract runs the leg inline, so the caller gets the path back."""
        kb = kb_env_plain
        assert kb.loop is None

        path = kb.request_status_dump('startup')

        assert path == fst_manager.os.path.abspath(fst_manager.STATUS_FILE)
        assert "reason='startup'" in artifact_text()

    def test_dump_failure_never_breaks_the_leg_that_asked_for_it(
            self, kb_env_plain, caplog, monkeypatch):
        """A diagnostic artifact must never abort a startup or a reload: the
        wrapper catches, names it, and the caller's leg completes."""
        kb = kb_env_plain

        def broken(reason='startup', now=None):
            raise OSError(5, 'disk gone')

        monkeypatch.setattr(kb._status_dump, 'write', broken)
        with caplog.at_level(logging.WARNING, logger='fst'):
            assert kb.request_status_dump('startup') is None

        assert '[StatusDump] dump failed reason=startup' in caplog.text
        assert 'disk gone' in caplog.text

    def test_broken_section_is_named_and_the_rest_still_lands(self, kb_env_plain,
                                                              monkeypatch):
        """The artifact exists for the broken case most of all: a section that
        raises renders its own name and the remaining sections still write."""
        kb = kb_env_plain

        def boom(self):
            raise RuntimeError('state gone')

        monkeypatch.setattr(fst_manager.Status_Dump, '_lifecycle_lines', boom)
        write_dump(kb, reason='startup')

        text = artifact_text()
        assert 'unavailable: RuntimeError:' in text
        for marker in SECTION_MARKERS:
            assert marker in text, f'section lost: {marker}'


class TestTriggers:
    """When the artifact is (re)written - startup and reload only."""

    def test_startup_writes_once_on_the_loop_thread(self, monkeypatch):
        """MainLogic._start_listening is the startup leg: it runs on the loop
        thread with the new generation bound, so it asks for the artifact
        there - the reason names the leg, the thread proves the lane."""
        from free_snap_tap import MainLogic

        class _AfterFirstPark(Exception):
            pass

        kb = _stub_keyboard()
        seen = {}

        def record(reason='startup'):
            seen['reason'] = reason
            seen['thread'] = threading.current_thread().name
            return 'stub'

        kb.request_status_dump.side_effect = record

        async def fake_park(self, observed):
            raise _AfterFirstPark()

        monkeypatch.setattr(MainLogic, '_park', fake_park)
        logic = MainLogic(kb)
        loop = logic.loop
        try:
            with pytest.raises(_AfterFirstPark):
                loop.run_until_complete(loop.create_task(logic.run()))
        finally:
            _cancel_and_close(loop)

        # run() IS the loop task: the dump leg ran on the thread that runs it
        assert seen.get('reason') == 'startup'
        assert seen.get('thread') == threading.current_thread().name

    def test_menu_reentry_asks_for_the_dump_with_its_own_reason(self, monkeypatch):
        """The return-to-menu pass starts a NEW listening pass, so it refreshes
        the artifact with the reason that says so."""
        from free_snap_tap import MainLogic

        class _AfterFirstPark(Exception):
            pass

        kb = _stub_keyboard()
        kb.arg_manager.MENU_ENABLED = True  # the startup-wish flag edge -> MENU
        reasons = []
        kb.request_status_dump.side_effect = lambda reason='startup': reasons.append(reason)

        parks = []

        async def fake_park(self, observed):
            # bounded: a lost call site lands a named red, never a hang
            parks.append(observed)
            if reasons or len(parks) >= 3:
                raise _AfterFirstPark()

        monkeypatch.setattr(MainLogic, '_park', fake_park)
        logic = MainLogic(kb)
        loop = logic.loop
        try:
            with pytest.raises(_AfterFirstPark):
                loop.run_until_complete(loop.create_task(logic.run()))
        finally:
            _cancel_and_close(loop)

        assert reasons[:1] == ['menu_restart']

    def test_reload_rewrites_the_artifact_with_a_new_timestamp(
            self, kb_env_plain, tmp_path):
        """Every successful config reload re-writes the artifact: the two
        written= stamps differ, so a report can tell before from after."""
        kb = kb_env_plain
        kb.config_manager.file_name = _write_config(tmp_path, 'a, b\n')

        kb._reload_now()
        first = artifact_text()
        assert "reason='reload'" in first

        kb._reload_now()
        second = artifact_text()
        assert "reason='reload'" in second
        assert written_stamp(second) != written_stamp(first), (
            'the reload re-write did not land a new timestamp')

    def test_reload_from_file_asks_for_the_dump_with_its_own_reason(
            self, kb_env_plain, tmp_path):
        """The tray/menu 'Reload from file' leg refreshes the artifact too,
        with a reason that names which leg wrote it."""
        kb = kb_env_plain
        kb.config_manager.file_name = _write_config(tmp_path, 'a, b\n')

        kb.reload_from_file()

        assert "reason='reload_from_file'" in artifact_text()

    def test_no_hotkey_or_numpad_trigger_exists_for_the_dump(self):
        """The ruling: NO new hotkey. The control/numpad surfaces that own
        every existing alt+* gesture must not reference the dump at all."""
        src = (inspect.getsource(FST_Keyboard.check_control_actions)
               + inspect.getsource(FST_Keyboard.check_debug_numpad_actions))
        assert 'status_dump' not in src
        assert 'Status_Dump' not in src

    def test_the_pump_never_writes_the_artifact(self, kb_env_ns, monkeypatch):
        """The F-A4 thread rule, measured at the pump: driving real filter
        events performs no dump write (file I/O off the hook pump, always)."""
        kb = kb_env_ns.kb
        write_dump(kb, reason='before_pump')
        before = artifact_text()

        calls = []
        monkeypatch.setattr(kb._status_dump, 'write',
                            lambda *a, **k: calls.append(a))
        down(kb, VK_A, 1)
        up(kb, VK_A, 2)
        down(kb, VK_SHIFT, 3)
        up(kb, VK_SHIFT, 4)

        assert calls == []
        assert artifact_text() == before


class TestLedgerSection:
    """The LEDGER section: current ledger state + the [StuckKeyWatch] aging."""

    def test_open_and_unclosed_ticket_shows_in_the_table(self, kb_env_plain):
        """An opened, never-closed ticket is visible with the fields a report
        needs: vk, source_kind, source_id, seq, age_ms."""
        kb = kb_env_plain
        ticket = kb.open_press_ticket(VK_A, 'tap', 'TAP_1')

        write_dump(kb, reason='pin', now=ticket.created_at + 1.0)
        text = artifact_text()
        row = f"  {ticket.seq} {VK_A} press scheduled tap 'TAP_1' "

        assert any(line.startswith(row) for line in text.splitlines()), (
            f'no table row for the open ticket: {ticket!r}')
        assert any(line.startswith(row) and line.endswith(' 1000')
                   for line in text.splitlines()), 'age_ms did not match the anchor'
        assert 'open=1' in text
        assert f'high_seq={ticket.seq}' in text
        assert 'counts_open_by_source=tap=1' in text
        # the state tally renders sorted, so a report can diff two artifacts
        assert 'counts_state=completed=0 injected=0 scheduled=1' in text

    def test_closed_ticket_leaves_the_open_table(self, kb_env_plain):
        """The section shows the CURRENT ledger state, not history: a closed
        ticket is counted, not listed as owed."""
        kb = kb_env_plain
        ticket = kb.open_release_ticket(VK_B, 'drain', 'pin_drain')
        kb.close_ticket(ticket)

        write_dump(kb, reason='pin', now=ticket.created_at + 9.0)
        text = artifact_text()

        assert 'open=0' in text
        assert 'total=1' in text
        assert '  none' in text
        assert '[StuckKeyWatch]' not in text

    def test_stuck_key_watch_fires_past_the_threshold_without_sleeping(
            self, kb_env_plain, caplog):
        """The detector of design report TOP-3 risk 3: an open ticket older
        than the threshold gets a [StuckKeyWatch] line in the artifact AND in
        the log at WARNING. The clock is faked through the render anchor -
        nothing sleeps in this suite."""
        kb = kb_env_plain
        ticket = kb.open_press_ticket(VK_SHIFT, 'toggle', f'toggle:{VK_SHIFT}')
        assert ticket.state == 'scheduled'  # opened and never closed

        with caplog.at_level(logging.WARNING, logger='fst'):
            write_dump(kb, reason='pin', now=ticket.created_at + 6.0)  # 6000 ms
        text = artifact_text()

        expected = (f"[StuckKeyWatch] seq={ticket.seq} vk={VK_SHIFT} "
                    f"kind=press state=scheduled source_kind=toggle "
                    f"source_id='toggle:{VK_SHIFT}' gen={ticket.gen_id} "
                    f"age_ms=6000 threshold_ms=5000")
        assert expected in text
        assert expected in caplog.text

    def test_stuck_key_watch_silent_below_the_threshold(self, kb_env_plain,
                                                        caplog):
        """The watch is a threshold, not a permanent alarm: fresh debt is just
        a table row."""
        kb = kb_env_plain
        ticket = kb.open_press_ticket(VK_A, 'macro', 'm1')

        with caplog.at_level(logging.WARNING, logger='fst'):
            write_dump(kb, reason='pin', now=ticket.created_at + 0.5)
        text = artifact_text()

        assert '[StuckKeyWatch]' not in text
        assert '[StuckKeyWatch]' not in caplog.text
        assert f"  {ticket.seq} {VK_A} press scheduled macro 'm1' " in text

    def test_threshold_is_configurable(self, kb_env_plain, monkeypatch):
        """CONSTANTS.STUCK_TICKET_MS is the knob (the suite's autouse
        restore_constants fixture puts it back): lower it and a fresh ticket
        already warns."""
        kb = kb_env_plain
        monkeypatch.setattr(fst_manager.CONSTANTS, 'STUCK_TICKET_MS', 100)
        ticket = kb.open_press_ticket(VK_A, 'rebind', 'r1')

        write_dump(kb, reason='pin', now=ticket.created_at + 0.5)  # 500 ms

        text = artifact_text()
        assert 'threshold_ms=100' in text
        assert 'age_ms=500' in text
        assert '[StuckKeyWatch]' in text

    def test_no_ledger_object_renders_as_none(self, kb_env_plain, monkeypatch):
        """A partially built keyboard still produces the artifact: the ledger
        section names its absence instead of raising."""
        kb = kb_env_plain
        monkeypatch.setattr(kb, '_ledger', None)

        write_dump(kb, reason='pin')

        assert 'ledger: none' in artifact_text()


class TestTypedStateRendering:
    """Item 13 against the F-B1 typed model: vk codes and latched bools."""

    def test_tap_hold_and_toggle_states_render_from_typed_values(
            self, kb_env_plain):
        """A tap group's declared keys are F-B1 Key objects; the artifact
        renders their vk codes and the 0/1 states, plus the hold the group owns
        and the latched toggles."""
        kb = kb_env_plain
        build(kb, taps=[TAP_A_B])
        group = kb._runtime.tap_groups[0]
        assert type(group.keys[0]).__name__ == 'Key'  # the F-B1 typed members

        group.update_tap_states(VK_A, True)
        group.update_tap_states(VK_B, True)
        group.set_last_key_send(VK_B)
        kb.state_manager.set_toggle_state(VK_SHIFT, True)

        write_dump(kb, reason='pin')
        text = artifact_text()

        assert f'keys={VK_A},{VK_B}' in text
        assert f'states={VK_A}:1,{VK_B}:1' in text
        assert f'last_pressed={VK_B}' in text
        assert f'hold_send={VK_B}' in text
        assert f'active_key={VK_B}' in text
        assert f'toggle_latched={VK_SHIFT}' in text
        assert 'toggle_tracked=1' in text

    def test_no_object_repr_leaks_into_the_artifact(self, kb_env_plain):
        """The point of Item 13 over alt+num5: a report reads typed values,
        not repr trees or memory addresses."""
        kb = kb_env_plain
        build(kb, taps=[TAP_A_B], rebinds=[['(REB_1)', ['a', 'b']]])
        kb._runtime.tap_groups[0].update_tap_states(VK_A, True)
        kb.open_press_ticket(VK_A, 'tap', 'TAP_1')

        write_dump(kb, reason='pin')
        text = artifact_text()

        for token in ('Key_Event(', 'Tap_Group(', 'Key(', 'Rebind(',
                      'object at 0x', '<fst_data_types', '<MagicMock'):
            assert token not in text, f'repr leaked: {token}'
        # the tap rows are vk ints, so a repr constraint pipe can never appear
        assert '|' not in text


class TestThreadContract:
    """The F-A4/F-A5 thread rule for the dump leg."""

    def test_dump_renders_on_the_loop_thread_not_the_calling_thread(
            self, kb_env_plain):
        """Called from another thread with a loop wired, the leg is posted to
        the loop (FIFO): the artifact names the LOOP thread as its writer."""
        kb = kb_env_plain
        loop = asyncio.new_event_loop()
        started = threading.Event()
        errors = []

        def run_loop():
            asyncio.set_event_loop(loop)
            started.set()
            try:
                loop.run_forever()
            except Exception as error:
                errors.append(error)

        worker = threading.Thread(target=run_loop, name='fst-loop-under-test')
        worker.start()
        assert started.wait(timeout=5)
        try:
            kb.loop = loop
            assert threading.current_thread() is not worker  # caller differs
            # FIFO on the loop ready queue: the dump lands BEFORE the stop, so
            # the joined worker proves the leg ran on the lane (no sleeps)
            kb.request_status_dump('thread_pin')
            loop.call_soon_threadsafe(loop.stop)
            worker.join(timeout=5)
        finally:
            if not worker.is_alive():
                _cancel_and_close(loop)
            else:
                worker.join(timeout=5)

        assert worker.is_alive() is False
        assert errors == []
        text = artifact_text()
        assert "thread='fst-loop-under-test'" in text
        assert "reason='thread_pin'" in text


class TestArtifactValues:
    """The artifact's VALUES, not only its markers: a report that reads
    the wrong value is worse than no report at all."""

    def test_every_reported_arg_resolves_on_a_real_argument_manager(
            self, kb_env_plain):
        """STATUS_ARG_NAMES is the artifact's public surface: a name that
        no longer exists would silently report '=None' and teach the
        reporter the wrong thing."""
        kb = kb_env_plain

        write_dump(kb, reason='pin')
        text = artifact_text()

        assert fst_manager.STATUS_ARG_NAMES, 'the arg surface is empty'
        for name in fst_manager.STATUS_ARG_NAMES:
            key = name.lower() + '='
            assert key in text, f'arg missing from the artifact: {name}'
            assert key + 'None' not in text, (
                f'{name} does not resolve on a real Argument_Manager')

    def test_lifecycle_and_group_counts_are_the_live_values(self, kb_env_plain):
        """The lifecycle line reads the machine, the count lines read the
        live generation - both are pinned against the objects, not literals."""
        from fst_data_types import Lifecycle_State
        from types import SimpleNamespace

        kb = kb_env_plain
        kb._lifecycle = SimpleNamespace(state=Lifecycle_State.PAUSED)
        build(kb, taps=[TAP_A_B])
        rt = kb._runtime

        write_dump(kb, reason='pin')
        text = artifact_text()

        assert 'state=paused' in text
        assert f'gen_id={rt.gen_id}' in text
        assert f'tap_groups={len(rt.tap_groups)}' in text
        assert 'tap_groups=1' in text and 'rebinds=0' in text
        assert f'tap_owned_vks={len(rt.tap_owner_by_vk)}' in text

    def test_the_startup_leg_writes_the_real_artifact(self, kb_env_plain,
                                                     monkeypatch, tmp_path):
        """End to end on the real objects: MainLogic._start_listening (the
        startup leg, off the pump, on the loop thread) is what produces the
        file a reporter attaches - not only the dump object called direct."""
        from free_snap_tap import MainLogic

        class _AfterFirstPark(Exception):
            pass

        kb = kb_env_plain
        kb.arg_manager.WIN32_FILTER_PAUSED = False
        kb.arg_manager.MENU_ENABLED = False  # the -nomenu shape: straight to listening
        kb.config_manager.file_name = _write_config(tmp_path, 'a, b\n')
        monkeypatch.setattr(kb, 'init_listener', lambda: None)
        monkeypatch.setattr(kb, 'start_listener', lambda: None)
        build(kb, taps=[TAP_A_B])

        async def fake_park(self, observed):
            raise _AfterFirstPark()

        monkeypatch.setattr(MainLogic, '_park', fake_park)
        logic = MainLogic(kb)
        loop = logic.loop
        try:
            with pytest.raises(_AfterFirstPark):
                loop.run_until_complete(loop.create_task(logic.run()))
        finally:
            _cancel_and_close(loop)

        text = artifact_text()
        assert "reason='startup'" in text
        assert 'state=running' in text
        assert 'tap_groups=1' in text
        assert f"pid={fst_manager.os.getpid()}" in text


# --- harness -----------------------------------------------------------------

def _stub_keyboard():
    """Stand-in FST_Keyboard for driving MainLogic.run() (same shape as
    tests/test_pump_race_lifecycle_pins.py): a MagicMock keyboard with the few
    legs that must answer a real value."""
    kb = MagicMock()
    kb.arg_manager.STOPPED = False
    kb.arg_manager.MENU_ENABLED = False
    kb.arg_manager.WIN32_FILTER_PAUSED = False
    kb.focus_manager.init_focus_task.return_value = False

    async def fake_toast_pump():
        await asyncio.sleep(0.05)

    kb.toast_pump = MagicMock(side_effect=fake_toast_pump)
    return kb


def _cancel_and_close(loop):
    """Teardown helper (the U375 pattern): cancel pending tasks BEFORE close
    so a parked keep-alive never logs 'Task was destroyed but it is pending'."""
    if loop.is_closed():
        return
    for task in asyncio.all_tasks(loop):
        task.cancel()
    pending = [t for t in asyncio.all_tasks(loop) if not t.done()]
    if pending:
        loop.run_until_complete(asyncio.gather(*pending,
                                               return_exceptions=True))
    loop.close()


def _write_config(tmp_path, body):
    """A minimal config file for a reload leg that reads from disk."""
    path = tmp_path / 'FSTconfig.txt'
    path.write_text(body, encoding='utf-8')
    return str(path)
