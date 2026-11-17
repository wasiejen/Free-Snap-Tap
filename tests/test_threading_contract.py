"""F-C4 (review Item 8) pins for the threading and ownership contract.

These are CONTRACT pins about the SHAPE of the runtime, not about behavior -
the behavior spine is the contract lane (tests/test_contract_lane.py). What
this file keeps true is the thing Item 8 says people otherwise lose: which
thread may touch what, and how cheap the hook pump is allowed to stay.
"""
import inspect
import re
from pathlib import Path

import pytest

from contract_lane import tap
from fst_keyboard import FST_Keyboard
from fst_manager import Output_Manager
from fst_runtime_state import AREAS, Runtime_Owner, area

REPO = Path(inspect.getfile(Output_Manager)).parent

# the nine areas the contract names; a rename or a removal is a decision here
DOCUMENTED_AREAS = ['flags', 'containers', 'input_state', 'tickets',
                    'display_posts', 'macro_debt', 'lifecycle', 'loop',
                    'task_registry']

# the code paths that run inside the OS hook callback
PUMP_PATH = (FST_Keyboard._win32_event_filter,
             FST_Keyboard.keyboard_win32_event_filter,
             FST_Keyboard.mouse_win32_event_filter,
             Output_Manager.pump_lane)


def read(name):
    '''a product file by name (the doc cites both root modules and test files)'''
    for candidate in (REPO / name, REPO / 'tests' / name):
        if candidate.exists():
            return candidate.read_text(encoding='utf-8')
    raise AssertionError(f'cited file does not exist: {name}')


class TestOwnerIsTheLiveState:
    '''the owner object is a door onto the runtime, never a copy of it'''

    def test_runtime_owner_is_wired_on_the_keyboard_object(self, contract):
        # CONTRACT: the live runtime object carries the documented door, and it
        # is the documented class
        assert isinstance(contract.kb.runtime_owner, Runtime_Owner)

    def test_each_accessor_returns_the_live_holder(self, contract):
        # CONTRACT: new code and old code see the SAME objects - the owner adds
        # no mirror state that could drift away from the runtime
        owner = contract.kb.runtime_owner
        assert owner.flags is contract.kb.arg_manager
        assert owner.containers() is contract.kb._runtime
        assert owner.input_state is contract.kb.state_manager
        assert owner.tickets is contract.kb._ledger
        assert owner.display_posts is contract.kb._toast_offload
        assert owner.loop is contract.kb.loop
        assert owner.lifecycle is getattr(contract.kb, '_lifecycle', None)
        assert owner.task_registry('macro') is contract.kb._macro_task_dict
        assert (owner.task_registry('repeat')
                is contract.kb.output_manager._repeat_thread_dict)

    def test_the_door_changes_nothing_the_pump_injects(self, contract):
        # CONTRACT: adding the owner changed no behavior - the same config and
        # stimulus still drive the pipeline and inject (the exact streams are
        # the contract lane goldens' job, not this pin's)
        assert contract.run_contract('a, d\n', tap('a')).injected


class TestAreaMap:
    '''the ownership map stays complete, ruled, and true to the source'''

    def test_every_documented_area_is_named(self):
        # CONTRACT: every shared runtime area stays named; dropping one from
        # the map has to be a decision made here, not an accident in a module
        assert [entry['name'] for entry in AREAS] == DOCUMENTED_AREAS

    @pytest.mark.parametrize('name', DOCUMENTED_AREAS)
    def test_each_area_names_its_owner_writers_and_rule(self, name):
        # CONTRACT: one entry tells a reader (or an agent) who owns the area,
        # who may write it, and what the access rule is
        entry = area(name)
        assert entry['holder'] and entry['owner'] and entry['rule']
        assert entry['writers'] and entry['evidence'] and entry['checks']

    @pytest.mark.parametrize('name', DOCUMENTED_AREAS)
    def test_every_citation_resolves_in_the_product_source(self, name):
        # CONTRACT: the map's evidence points at code that is still there. A
        # drift in a citation fails a pin instead of misleading the next fix
        for filename, symbol in area(name)['checks']:
            text = read(filename)
            assert symbol in text, f'{name}: {filename} lost {symbol!r}'

    def test_the_map_cites_only_product_modules(self):
        # CONTRACT: the ownership claims are about the product, not about tests
        for name in DOCUMENTED_AREAS:
            for filename, _symbol in area(name)['checks']:
                assert not filename.startswith('test_'), (name, filename)


class TestOwnerAddsNoSynchronization:
    '''Item 8: one owner plus the seams that already exist - not a lock layer'''

    def test_the_owner_module_starts_no_thread_lock_or_queue(self):
        # CONTRACT: the ownership map must never turn into a lock or a queue a
        # pump thread can reach - that is exactly what the hot-path rule forbids
        text = inspect.getsource(inspect.getmodule(Runtime_Owner))
        for forbidden in ('import threading', 'Lock(', 'acquire(', 'Thread(',
                          'deque(', 'Event('):
            assert forbidden not in text, forbidden


class TestPumpHotPathContract:
    '''the rule the Phase A hunts bought, kept in force by the suite'''

    def test_the_filter_binds_the_generation_once_per_event(self):
        # CONTRACT: the filter reads the live generation exactly ONCE per event
        # - that read is the bind - and every container access below goes
        # through the local, so a rebuild on another thread can never split one
        # event across two generations (counting all reads, not just the ones
        # after the bind, is what makes an aliased early read fail here too)
        text = inspect.getsource(FST_Keyboard._win32_event_filter)
        reads = [line.strip() for line in text.splitlines()
                 if 'self._runtime' in line and not line.strip().startswith('#')]
        assert len(reads) == 1, reads
        assert 'rt = self._runtime' in reads[0], reads

    @pytest.mark.parametrize('leg', PUMP_PATH, ids=lambda f: f.__name__)
    def test_the_pump_path_takes_no_lock(self, leg):
        # CONTRACT: no lock acquisition on the hook-pump path. A callback that
        # waits past LowLevelHooksTimeout gets the hook removed and the events
        # that follow arrive UNFILTERED
        text = inspect.getsource(leg)
        for forbidden in ('acquire(', 'Lock(', '_reload_lock',
                          'run_until_complete'):
            assert forbidden not in text, f'{leg.__name__} uses {forbidden}'

    def test_the_reload_lock_stays_off_the_read_path(self):
        # CONTRACT: the reload guard lives in the reload lane legs only (it
        # coalesces at most one pending request) - never in a filter or pump leg
        lines = inspect.getsource(FST_Keyboard).splitlines()
        current = None
        users = []
        for line in lines:
            stripped = line.strip()
            if stripped.startswith('def '):
                current = stripped.split('(')[0][4:].strip()
            if 'with self._reload_lock' in line:
                users.append(current)
        assert users, 'the reload coalescing guard disappeared'
        assert set(users) <= {'_schedule_reload', '_reload_lane', '_reload_now'}, users


class TestThreadingDoc:
    '''THREADING.md is the human half of the contract, so it is pinned too'''

    def test_the_document_exists_is_ascii_and_names_every_area(self):
        # CONTRACT: one contract document, plain text, covering every area the
        # machine-readable map covers
        path = REPO / 'THREADING.md'
        raw = path.read_bytes()
        assert all(byte < 128 for byte in raw), 'THREADING.md must stay ASCII'
        text = raw.decode('utf-8')
        for name in DOCUMENTED_AREAS:
            assert f'`{name}`' in text, f'THREADING.md lost the {name} row'
        for heading in ('Thread inventory', 'The mutable areas',
                        'The pump hot-path contract', 'Named follow-ups'):
            assert heading in text, heading

    def test_every_product_file_the_doc_cites_exists(self):
        # CONTRACT: the doc cannot point at a module that has been renamed away
        text = (REPO / 'THREADING.md').read_text(encoding='utf-8')
        names = set(re.findall(r'[a-z_]+\.py', text))
        assert {'fst_keyboard.py', 'fst_manager.py', 'fst_runtime_state.py',
                'free_snap_tap.py', 'fst_overlay.py', 'fst_tasks.py',
                'fst_data_types.py'} <= names, names
        for filename in names:
            read(filename)
