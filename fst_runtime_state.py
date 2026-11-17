'''F-C4 (plan bullet, review Item 8): the owner map of FST's mutable runtime
state, as an object instead of tribal knowledge.

WHAT THIS IS. One place that names every mutable runtime AREA: which object
holds it, which thread role owns it, which threads may write it, and what the
access rule is. THREADING.md is the prose contract for humans; this module is
the same contract in a form the test suite can check (tests/
test_threading_contract.py fails if a holder is renamed away, if an area
disappears from the map, or if the documented evidence files move). The map is
deliberately machine-readable because the failure mode Item 8 names is the next
contributor (or agent) adding a race silently: "every fix from here on depends
on tribal knowledge about which thread may touch what".

WHAT THIS IS NOT. It is not an actor model and not a lock layer. Item 8's own
caution applies: "a full actor model is not warranted by a 6.7k-line tool -
keep it to one owner + a command queue". So:
  - no thread, lock, or queue is created here (the module must not even import
    threading - pinned, because a lock reachable from the hook pump is the one
    thing the pump hot-path contract forbids),
  - the accessors return the EXISTING holders (identity, not copies), so old
    call sites keep working untouched and new code has one documented door,
  - the areas that already have a marshaled seam (the snapshot swap, the
    lifecycle machine, the toast offload queue, the loop-lane routing) point at
    that seam as the rule; the areas that do not (control flags, input state,
    task registries) are named as multi-writer with the exact reason the
    current writes are safe, so an extension is added knowingly.

Layering: this module imports NOTHING from the product (the holders are reached
through the FST_Keyboard object handed in), so it can never create an import
cycle.
'''

# The documented thread roles (THREADING.md "Thread inventory" is the prose
# version of this list; the names match).
ROLE_KEYBOARD_PUMP = 'keyboard hook pump'
ROLE_MOUSE_PUMP = 'mouse hook pump'
ROLE_LOOP = 'logic loop (asyncio)'
ROLE_QT = 'Qt GUI'

AREAS = (
    {
        'name': 'flags',
        'holder': 'FST_Keyboard.arg_manager (Argument_Manager)',
        'owner': ROLE_LOOP,
        'writers': (ROLE_LOOP, ROLE_KEYBOARD_PUMP, ROLE_QT),
        'rule': ('single-word control flags (bool/int). Every write is one '
                 'attribute store, which CPython performs atomically under the '
                 'GIL, so a reader never sees a half-written flag and '
                 'last-writer-wins IS the semantics. Compound '
                 'read-modify-write on these flags is FORBIDDEN without '
                 'marshaling the writer first - that is the follow-up this '
                 'area names. Anything that is a STATE MACHINE, not a flag, '
                 'belongs in the lifecycle area instead.'),
        'evidence': (
            "control_combo legs on the pump, the overlay's Qt slots, the" 
            "focus coroutine and the reload lane - see THREADING.md 'flags'"
        ),
        'checks': (
            ('fst_keyboard.py', 'def check_control_actions'),
            ('fst_keyboard.py', 'self.check_control_actions()'),
            ('fst_overlay.py', 'def toggle_status_indicator'),
            ('fst_overlay.py', 'def toggle_crosshair'),
            ('fst_tasks.py', 'WIN32_FILTER_PAUSED'),
            ('fst_keyboard.py', 'def _reload_lane'),
            ('fst_keyboard.py', 'def _reload_now'),
            ('fst_overlay.py', 'def perform_periodic_update'),
        ),
    },
    {
        'name': 'containers',
        'holder': 'FST_Keyboard._runtime (Runtime_Snapshot)',
        'owner': ROLE_LOOP,
        'writers': (ROLE_LOOP,),
        'rule': ('one complete generation per swap. A writer builds a fresh '
                 'snapshot OFF TO THE SIDE and binds it with ONE attribute '
                 'assignment; it never mutates a live container. A reader '
                 'binds self._runtime ONCE into a local (rt = self._runtime) '
                 'and reads only through that local - dict gets, no lock, no '
                 'second read of the attribute. See Runtime_Snapshot in '
                 'fst_keyboard.py and THREADING.md.'),
        'evidence': (
            'the pump binds the generation once per event; the rebuild binds' 
            "a whole generation - see THREADING.md 'containers' and" 
            'Runtime_Snapshot'
        ),
        'checks': (
            ('fst_keyboard.py', 'rt = self._runtime'),
            ('fst_keyboard.py', 'self._runtime = rt'),
            ('fst_keyboard.py', 'class Runtime_Snapshot'),
            ('fst_keyboard.py', 'def initialize_groups_from_presorted_lines'),
        ),
    },
    {
        'name': 'input_state',
        'holder': 'FST_Keyboard.state_manager (Input_State_Manager)',
        'owner': ROLE_KEYBOARD_PUMP,
        'writers': (ROLE_KEYBOARD_PUMP, ROLE_LOOP),
        'rule': ('per-key press state, toggle state and key times. The pump is '
                 'the normal writer (the filter feeds every event in); the loop '
                 'also writes it from the reset legs a config reload or a '
                 'return-to-menu triggers. Writes are single stores per key; '
                 'do not add a multi-field read-modify-write on a key entry '
                 'without marshaling the two writer threads first.'),
        'evidence': (
            'the pump feeds every event in; the reload and control legs' 
            "reset it - see THREADING.md 'input_state'"
        ),
        'checks': (
            ('fst_keyboard.py', 'get_real_key_press_state'),
            ('fst_manager.py', 'def stop_all_repeating_keys'),
            ('fst_keyboard.py', 'stop_all_repeating_keys()'),
            ('fst_keyboard.py', 'def update_args_and_groups'),
            ('fst_keyboard.py', 'def control_return_to_menu'),
            ('fst_keyboard.py', 'def control_exit_program'),
            ('fst_keyboard.py', 'def control_toggle_pause'),
        ),
    },
    {
        'name': 'tickets',
        'holder': 'FST_Keyboard._ledger (Ticket_Ledger)',
        'owner': ROLE_LOOP,
        'writers': (ROLE_KEYBOARD_PUMP, ROLE_LOOP),
        'rule': ('the ledger is a SIBLING of the snapshot, never part of it: a '
                 'generation swap must not touch a ledger reference. Single-'
                 'store discipline is the rule that keeps hot-path reads '
                 'lock-free - a thread that did not open a ticket must not '
                 'read it, mutate two fields and write it back. See '
                 'Ticket_Ledger in fst_data_types.py.'),
        'evidence': (
            'the ledger is built once, outside any generation, and the' 
            "ticket legs open and close it - see THREADING.md 'tickets' and" 
            'Ticket_Ledger'
        ),
        'checks': (
            ('fst_keyboard.py', 'self._ledger = Ticket_Ledger'),
            ('fst_keyboard.py', 'def open_release_ticket'),
            ('fst_keyboard.py', 'def open_press_ticket'),
            ('fst_data_types.py', 'class Ticket_Ledger'),
            ('fst_data_types.py', 'SINGLE-STORE DISCIPLINE'),
        ),
    },
    {
        'name': 'display_posts',
        'holder': 'FST_Keyboard._toast_offload (Toast_Offload)',
        'owner': ROLE_LOOP,
        'writers': (ROLE_KEYBOARD_PUMP, ROLE_MOUSE_PUMP, ROLE_LOOP, ROLE_QT),
        'rule': ('the designed cross-thread seam: a poster thread does ONE '
                 'deque append (GIL-atomic, no lock, no I/O) and the drain into '
                 'the UI bridge runs on the loop thread only. Overflow drops '
                 'the OLDEST post and the drop counters are best-effort '
                 'diagnostics, not control flow. This is the pattern Item 8 '
                 'tells the rest of the state to follow.'),
        'evidence': (
            'a poster thread appends once, the loop drains - the designed' 
            "cross-thread seam, see THREADING.md 'display_posts'"
        ),
        'checks': (
            ('fst_keyboard.py', 'class Toast_Offload'),
            ('fst_keyboard.py', 'def _post'),
            ('fst_keyboard.py', 'def drain'),
        ),
    },
    {
        'name': 'lifecycle',
        'holder': 'MainLogic.lifecycle (Lifecycle_Machine)',
        'owner': ROLE_LOOP,
        'writers': (ROLE_LOOP,),
        'rule': ('ONE writer: the state attribute is written only by '
                 '_apply, which runs on the loop thread. Other threads call '
                 'post_transition and return; the request is applied on the '
                 'loop via call_soon_threadsafe (inline only when no loop is '
                 'wired or the caller already is the loop thread, and in the '
                 'one deliberate loop-is-gone shutdown case). STOPPING is '
                 'terminal.'),
        'evidence': (
            'one writer on the loop thread, everyone else posts - see' 
            "THREADING.md 'lifecycle' and Lifecycle_Machine"
        ),
        'checks': (
            ('free_snap_tap.py', 'class Lifecycle_Machine'),
            ('free_snap_tap.py', 'def post_transition'),
            ('free_snap_tap.py', 'def _apply'),
            ('fst_keyboard.py', 'def set_lifecycle'),
            ('fst_keyboard.py', 'def post_lifecycle'),
        ),
    },
    {
        'name': 'loop',
        'holder': 'MainLogic.loop (asyncio event loop)',
        'owner': ROLE_LOOP,
        'writers': (ROLE_LOOP,),
        'rule': ('the logic thread creates and runs the loop; every other '
                 'thread schedules ONTO it (call_soon_threadsafe, '
                 'run_coroutine_threadsafe) and never runs loop code itself. '
                 'Blocking legs that the pump must not wait for are routed '
                 'through the same two routers: Output_Manager.pump_lane and '
                 'FST_Keyboard._run_on_loop_or_inline.'),
        'evidence': (
            'the logic thread creates and runs the loop, other threads' 
            "schedule onto it - see THREADING.md 'loop' and the two routers"
        ),
        'checks': (
            ('free_snap_tap.py', 'asyncio.new_event_loop()'),
            ('free_snap_tap.py', 'self.loop.run_forever()'),
            ('free_snap_tap.py', 'start_async_thread'),
            ('fst_manager.py', 'def pump_lane'),
            ('fst_keyboard.py', 'def _run_on_loop_or_inline'),
        ),
    },
    {
        'name': 'task_registry',
        'holder': ('FST_Keyboard._macro_task_dict and '
                   'Output_Manager._repeat_thread_dict'),
        'owner': ROLE_LOOP,
        'writers': (ROLE_KEYBOARD_PUMP, ROLE_LOOP),
        'rule': ('registries of live asyncio tasks and their handles. Entries '
                 'are added where the leg is detected (which can be the pump) '
                 'and cancelled where the task runs (the loop); each is a '
                 'single dict store on the object, so a reader either sees the '
                 'entry or does not. The name "thread_dict" is historical - '
                 'these are asyncio handles, not threads.'),
        'evidence': (
            'task and handle registries written where the leg is detected,' 
            "cancelled on the loop - see THREADING.md 'task_registry'"
        ),
        'checks': (
            ('fst_keyboard.py', 'self._macro_task_dict = {}'),
            ('fst_manager.py', 'self._repeat_thread_dict = {}'),
            ('fst_manager.py', 'def start_repeat'),
            ('fst_manager.py', '_repeat_thread_dict[alias_string] = [repeat_task, _handle]'),
        ),
    },
)


def area(name):
    '''the documented area dict by name (KeyError is intentional: an unknown
    area name is a caller bug, not a runtime condition)'''
    for entry in AREAS:
        if entry['name'] == name:
            return entry
    raise KeyError(f'no such runtime area: {name}')


class Runtime_Owner():
    '''The single documented door to the product's mutable runtime state.

    Constructed once by FST_Keyboard (see the wiring comment there) and held as
    FST_Keyboard.runtime_owner. It owns no state itself: each accessor returns
    the existing live holder, and the AREA docstrings say who may write it. New
    code should reach runtime state through this object so the ownership rule
    travels with the read instead of living in a comment.

    THREADING.md is the prose contract; AREAS is the machine-readable one.'''

    AREAS = AREAS

    def __init__(self, fst):
        self._fst = fst

    # -- the areas, in the order AREAS documents them ------------------------

    @property
    def flags(self):
        '''control flags - MULTI-WRITER, single stores (area "flags")'''
        return self._fst.arg_manager

    def containers(self):
        '''the live runtime generation - ONE WRITER (area "containers").

        Read it ONCE into a local and use that local, exactly like the hook
        pump does (rt = self._runtime); reading the attribute twice in one
        operation can pair two generations.'''
        return self._fst._runtime

    @property
    def input_state(self):
        '''per-key input state - pump writer, loop reset legs (area "input_state")'''
        return self._fst.state_manager

    @property
    def tickets(self):
        '''the release/press ticket ledger - a snapshot-swap sibling (area "tickets")'''
        return self._fst._ledger

    @property
    def display_posts(self):
        '''the toast post queue - append on any thread, drain on the loop
        (area "display_posts")'''
        return self._fst._toast_offload

    @property
    def lifecycle(self):
        '''the lifecycle machine, or None while unwired (area "lifecycle")'''
        return getattr(self._fst, '_lifecycle', None)

    @property
    def loop(self):
        '''the asyncio loop the logic thread runs (area "loop")'''
        return self._fst.loop

    def task_registry(self, kind='macro'):
        '''the live-task registry: 'macro' on FST_Keyboard, 'repeat' on the
        Output_Manager (area "task_registry")'''
        if kind == 'macro':
            return self._fst._macro_task_dict
        if kind == 'repeat':
            return self._fst.output_manager._repeat_thread_dict
        raise KeyError(f'no such task registry: {kind}')
