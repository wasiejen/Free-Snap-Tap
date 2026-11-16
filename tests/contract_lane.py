"""F-C1 contract lane - CONFIG TEXT in, INJECTED SEQUENCE out.

The lane is the behavior spine that guards the Phase C refactors (F-C2 one
config parser, F-C3 constraint namespace): every golden in
tests/test_contract_lane.py feeds real config TEXT through the real pipeline
and asserts the ORDERED stream of injected key events. Mirrors the WTD C0
golden approach (architecture review Item 11).

Pipeline covered - all product code, no re-stitched internals:

    config text file
      -> Config_Manager.load_config            (clean comments, Config_Validator)
      -> Focus_Group_Manager                   (sections, default lines, args)
      -> Config_Manager.presort_lines          (category containers)
      -> FST_Keyboard.initialize_groups_from_presorted_lines (Runtime_Snapshot)
      -> FST_Keyboard.keyboard_win32_event_filter  (the pynput hook entry, fed
         SYNTHETIC win32 msg/data event objects - KBDLLHOOKSTRUCT shape)
      -> the emit legs (send_key_event / send_keys_for_tap_group / macro_task)
      -> the Recording_Controllers that REPLACE the pynput controllers.

Capture model. The recorder replaces pynput.keyboard.Controller and
pynput.mouse.Controller (the mock_pynput_controllers pattern from
tests/conftest.py, extended to record press/release in order). No OS input
primitive is ever reached, so the F-B7 test-isolation tripwire stays armed
and green over every lane run. The lane does NOT feed injected events back
into the filter: the OS hook echo is the simulated leg, pinned by the unit
layer (tests/test_filter_simulated.py). The lane asserts the EMIT LEG.

Deterministic clocks and seams:
  - synthetic win32 event times (+1 ms per driven event), FST_Keyboard.TIME_DIFF
    reset per run - the suite never reads wall-clock input timestamps;
  - the zero-delay seam: Output_Manager.get_random_delay returns 0, so the
    macro/tap random delays collapse to a zero-length await (deterministic
    order, no wall-clock waits, no randint nondeterminism);
  - loop quiescence: rebind/tap/macro sends ride the asyncio loop lane
    (U364/#360 pump_lane); the lane pumps that loop to quiescence after every
    driven event, so the emission order is fixed and thread-free;
  - focus legs: the lane mirrors the two Focus_Task decision legs
    (fst_tasks.py, activation and focus-loss branches: FOCUS_APP_NAME +
    update_args_and_groups + the WIN32_FILTER_PAUSED flag) instead of running
    the poll loop - the polling itself is pinned by the unit layer
    (tests/test_focus_task.py, tests/test_focus_poll_contract.py). The
    CLI/toast display legs of those branches do not touch the stream and are
    not mirrored (the toast bridge is unwired in the lane).

Stimuli are built by the module functions below (down/up/tap/combo/focus/
focus_lost) so a golden reads like a sentence: run_contract(config,
[down('a'), up('a')]).
"""
import asyncio
from types import SimpleNamespace

from vk_codes import vk_codes_dict

# win32 keyboard messages (FST_Keyboard.WM_KEYDOWN / WM_KEYUP member lists)
WM_KEYDOWN = 256
WM_KEYUP = 257
# LLKHF_INJECTED flag - 0 keeps every lane stimulus a REAL (non-simulated)
# event, which is what the hook hands the filter for physical input.
FLAGS_REAL = 0

# behavior vocabulary for stimulus labels and stream labels
_KIND_LABELS = {'down': 'down', 'up': 'up'}


def _name_for_vk(vk_code):
    """Best display name of a vk code for stream text (behavior vocabulary).

    Prefers lowercase alphanumeric names from the product's own vk table
    ('a' over 'A'); falls back to 'vk<code>' for unnamed codes."""
    names = [name for name, code in vk_codes_dict.items() if code == vk_code]
    if not names:
        return f"vk{vk_code}"
    preferred = [name for name in names if name.replace('_', '').isalnum()
                 and name.islower()]
    pool = preferred or names
    return min(pool, key=lambda name: (len(name), name))


class Stimulus:
    """One driven lane input: a synthetic win32 event group or a focus leg.

    kind: 'key'   - one keyboard event (press or release of vk_name)
          'combo' - press each key in order, release in reverse (control keys)
          'focus' - foreground window matches a config focus section
          'focus_lost' - foreground window matches no focus section"""

    def __init__(self, kind, keys=(), is_press=True, name=None):
        self.kind = kind
        self.keys = list(keys)
        self.is_press = is_press
        self.name = name

    @property
    def label(self):
        if self.kind == 'key':
            return f"{_KIND_LABELS['down' if self.is_press else 'up']} {self.keys[0]}"
        if self.kind == 'combo':
            return 'combo ' + ' '.join(self.keys)
        if self.kind == 'focus':
            return f"focus {self.name}"
        return 'focus lost'

    def __repr__(self):
        return f"Stimulus({self.label})"


def down(key):
    """Press one key (synthetic WM_KEYDOWN at the hook entry)."""
    return Stimulus('key', [key], is_press=True)


def up(key):
    """Release one key (synthetic WM_KEYUP at the hook entry)."""
    return Stimulus('key', [key], is_press=False)


def tap(key):
    """Press and release one key."""
    return [down(key), up(key)]


def combo(*keys):
    """Press each key in order, then release in reverse (a control combo such
    as the alt+delete pause toggle). Fires the product's control legs."""
    return Stimulus('combo', list(keys))


def focus(name):
    """The foreground window matches the config section '<focus>name'
    (mirrors the Focus_Task activation leg)."""
    return Stimulus('focus', name=name)


def focus_lost():
    """The foreground window matches no focus section (mirrors the
    Focus_Task focus-loss leg, including the ALWAYS_ACTIVE branch)."""
    return Stimulus('focus_lost')


class InjectedEventStream:
    """The ordered injected events a stimulus sequence produced, plus which
    stimuli the filter suppressed on the way in."""

    def __init__(self):
        self.injected = []      # [(kind, vk_code, stimulus_index), ...]
        self.suppressed = []    # labels of stimuli with >=1 suppression
        self.stimulus_labels = []

    def text(self):
        """Readable whole-stream form in behavior vocabulary:
        'down b | up b' - the shape a maintainer reads a golden by."""
        return ' | '.join(f"{kind} {_name_for_vk(vk)}"
                          for kind, vk, _ in self.injected)

    def vks(self):
        """(kind, vk_code) pairs - for exact assertions without label lookup."""
        return [(kind, vk) for kind, vk, _ in self.injected]

    def for_stimulus(self, index):
        """Text of the injection a single stimulus (by position) produced."""
        return ' | '.join(f"{kind} {_name_for_vk(vk)}"
                          for kind, vk, i in self.injected if i == index)

    def __repr__(self):
        return f"InjectedEventStream({self.text()!r})"


class Recording_Controller:
    """Stand-in for a pynput Controller: records press/release/scroll calls
    in order. Replacing the Controller class is the lane's capture seam - the
    product emit legs call press()/release() exactly as against a desktop."""

    def __init__(self, sink):
        self._sink = sink

    @staticmethod
    def _vk(key):
        vk = getattr(key, 'vk', None)          # pynput win32 KeyCode
        if vk is None:
            value = getattr(key, 'value', key)  # Key enum -> its vk value
            vk = getattr(value, 'value', value)
        return vk

    def press(self, key):
        self._sink.append(('down', self._vk(key)))

    def release(self, key):
        self._sink.append(('up', self._vk(key)))

    def scroll(self, dx, dy):
        self._sink.append(('scroll', (dx, dy)))


class Contract_Lane:
    """The lane: one real FST_Keyboard, recorder controllers, a wired asyncio
    loop lane, a tmp config file, deterministic clocks.

    Use via the `contract` fixture in tests/conftest.py:

        stream = contract.run_contract('a : b', tap('a'))
        assert stream.text() == 'down b | up b'
    """

    def __init__(self, monkeypatch, tmp_path):
        # local import keeps conftest import-time free of the lane module
        import fst_manager
        from fst_keyboard import FST_Keyboard
        from unittest.mock import MagicMock

        self._events = []
        self._monkeypatch = monkeypatch
        self._config_path = tmp_path / 'contract_config.txt'

        # capture seam: the pynput controllers the Output_Manager builds at
        # FST_Keyboard() construction become recorders (no OS input exists
        # on this path - the F-B7 tripwire stays armed)
        monkeypatch.setattr('pynput.keyboard.Controller',
                            lambda: Recording_Controller(self._events))
        monkeypatch.setattr('pynput.mouse.Controller',
                            lambda: Recording_Controller(self._events))
        # deterministic clock seam: the random macro/tap delays collapse to 0
        monkeypatch.setattr(fst_manager.Output_Manager, 'get_random_delay',
                            lambda self, max, min=0: 0)

        FST_Keyboard.TIME_DIFF = None
        FST_Keyboard.START_TIME = None
        self.kb = FST_Keyboard()
        # no OS listeners - the filter is fed synthetic msg/data directly
        self.kb._listener = MagicMock()
        self.kb._mouse_listener = MagicMock()
        # the filter-active startup state (kb_env fixture convention)
        self.kb.arg_manager.WIN32_FILTER_PAUSED = False
        self.kb.arg_manager.ACT_DELAY = False
        self.kb.arg_manager.ACT_CROSSOVER = False

        # the loop lane the product routes its sends through (U364/#360)
        self._loop = asyncio.new_event_loop()
        self.kb.set_loop(self._loop)

    def close(self):
        """Release the lane's loop and DRAIN the lane's object graph at this
        safe point (this test's own teardown, no Qt frame on the stack).

        F-B8 doctrine (tests/conftest.py): the upstream shiboken6 hazard is
        Python-object destruction landing inside a Qt event pump. The lane
        builds a big graph per test (a real FST_Keyboard, mock listeners, an
        asyncio loop, ConcurrencyThread handles); leaving its cycles for a
        later sweep or a refcount cascade during a LATER test's pytest-qt
        pump measurably raises the suite-abort rate, so the lane frees its
        own garbage here and sweeps explicitly (a safe point, same rule the
        per-test gc.collect(0) latch follows)."""
        import gc
        for handle in list(getattr(self.kb, '_macro_task_dict', {}).values()):
            try:
                handle.cancel()
            except Exception:
                pass
        # reviewer P2-6: repeat legs (start_repeat/toggle_repeat constraints)
        # ride the same loop - drain their handles too so nothing outlives it
        for repeat_task, handle in list(
                self.kb.output_manager.repeat_thread_dict.values()):
            try:
                repeat_task.cancel_playback()
            except Exception:
                pass
            try:
                handle.cancel()
            except Exception:
                pass
        try:
            self.kb._macro_task_dict.clear()
        except Exception:
            pass
        self._events.clear()
        if not self._loop.is_closed():
            self._loop.close()
        self.kb = None
        self._loop = None
        gc.collect()


    # -- pipeline legs -----------------------------------------------------

    def write_config(self, config_text):
        with open(self._config_path, 'w', encoding='utf-8') as handle:
            handle.write(config_text)
        self.kb.config_manager.file_name = str(self._config_path)

    def load(self, config_text=None):
        """Parse -> validate -> focus dicts -> presort -> snapshot build, via
        the production startup leg update_args_and_groups(''). Raises the
        documented ConfigError report for a rejected config. Returns the live
        generation id (a rejected load does not replace it)."""
        if config_text is not None:
            self.write_config(config_text)
        self.kb.focus_manager.FOCUS_APP_NAME = ''
        self.kb.update_args_and_groups('', startup=True)
        return self.kb._runtime.gen_id

    def run_contract(self, config_text, stimulus_events):
        """The lane API. config text in -> the injected stream out.

        Full fresh state per call: recorder cleared, clock reset, startup
        load of the given config text, then the stimuli driven through the
        real hook entry. Raises ConfigError (the documented validator report)
        when the text is rejected - no stream is produced then."""
        self._events.clear()
        self.kb._listener.suppress_event.reset_mock()
        self._reset_clock()
        self.load(config_text)
        return self.drive(stimulus_events)

    def drive(self, stimulus_events):
        """Drive prepared stimuli through the real filter entry WITHOUT a
        config load (post-load probes, e.g. the rejected-load goldens)."""
        stream = InjectedEventStream()
        base = len(self._events)  # events the load leg already emitted
        for index, stimulus in enumerate(stimulus_events):
            suppress_before = self.kb._listener.suppress_event.call_count
            stream.stimulus_labels.append(stimulus.label)
            if stimulus.kind == 'key':
                self._drive_key(stimulus.keys[0], stimulus.is_press)
            elif stimulus.kind == 'combo':
                for key in stimulus.keys:
                    self._drive_key(key, True)
                for key in reversed(stimulus.keys):
                    self._drive_key(key, False)
            elif stimulus.kind == 'focus':
                self._focus_on(stimulus.name)
            elif stimulus.kind == 'focus_lost':
                self._focus_loss()
            else:
                raise ValueError(f"unknown stimulus kind {stimulus.kind!r}")
            for kind, vk in self._events[base + len(stream.injected):]:
                stream.injected.append((kind, vk, index))
            if self.kb._listener.suppress_event.call_count > suppress_before:
                stream.suppressed.append(stimulus.label)
        return stream

    # -- internals ----------------------------------------------------------

    def _reset_clock(self):
        from fst_keyboard import FST_Keyboard
        FST_Keyboard.TIME_DIFF = None
        FST_Keyboard.START_TIME = None
        self._time_ms = 1000  # synthetic win32 tick counter

    def _next_time(self):
        self._time_ms += 1
        return self._time_ms

    def _drive_key(self, key, is_press):
        """One synthetic KBDLLHOOKSTRUCT-shaped event into the pynput entry."""
        # the product's own key resolver - same names and int strings, same
        # ConfigError the config side raises for an unresolvable name
        vk_code = self.kb.convert_to_vk_code(str(key))
        msg = WM_KEYDOWN if is_press else WM_KEYUP
        data = SimpleNamespace(vkCode=vk_code, time=self._next_time(),
                               flags=FLAGS_REAL)
        self.kb.keyboard_win32_event_filter(msg, data)
        self.pump()

    def _focus_on(self, name):
        """Mirror of the Focus_Task activation leg (fst_tasks.py): the
        foreground title matched section 'name'.

        Reviewer P2-1 fidelity: the product rebuilds only when the matched
        section CHANGED (focus_name_changed latch, fst_tasks.py) - a repeated
        same-section stimulus is a no-op here too, so a future golden can
        never pin a rebuild the product does not perform."""
        if self.kb.focus_manager.FOCUS_APP_NAME == name:
            self.pump()  # product: found_valid_focus_name, no change -> pass
            return
        self.kb.focus_manager.FOCUS_APP_NAME = name
        self.kb.update_args_and_groups(name, startup=False)
        self.kb.arg_manager.WIN32_FILTER_PAUSED = False
        self._default_active = False  # product resets the loss latch
        self.pump()

    def _focus_loss(self):
        """Mirror of the Focus_Task focus-loss leg (fst_tasks.py): no section
        matched; ALWAYS_ACTIVE keeps the default groups live (once per loss
        streak - reviewer P2-2 fidelity: the product's default_active latch),
        otherwise the filter auto-pauses (the D-era default-group ruling)."""
        self.kb.focus_manager.FOCUS_APP_NAME = ''
        if self.kb.arg_manager.ALWAYS_ACTIVE:
            if not getattr(self, '_default_active', False):
                self._default_active = True
                self.kb.update_args_and_groups('', startup=False)
                self.kb.arg_manager.WIN32_FILTER_PAUSED = False
        elif not self.kb.arg_manager.WIN32_FILTER_PAUSED:
            self.kb.update_args_and_groups('', startup=False)
            self.kb.arg_manager.WIN32_FILTER_PAUSED = True
        self.pump()

    def pump(self):
        """Run the loop lane to quiescence: every send scheduled by the last
        driven event (rebind inject, tap switch, macro playback) finishes
        before the next stimulus, so the captured order is the product's FIFO
        lane order without any thread or wall-clock timing."""
        # the iteration bound is a generous macro-size cap (reviewer P2-7): a
        # playback longer than the budget shows up as events missing from the
        # LATER for_stimulus() slices - failures stay loud, nothing silently
        # reorders (the loop lane is single FIFO)
        async def _quiesce():
            for _ in range(500):
                await asyncio.sleep(0)
        self._loop.run_until_complete(_quiesce())
