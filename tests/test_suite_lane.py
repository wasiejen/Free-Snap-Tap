"""ABORT2 pins for the suite lane runner (suite_lane.py).

The lane is the repo's full-suite gate on this platform (the single-process run
aborts natively - the measurement record is in tests/README.md). A gate that
silently drops a test file is worse than an aborting one, so these pins hold
the lane's STRUCTURE: coverage, exactly-once, determinism, bounded chunks, and
the process-safety rule that the runner may only ever touch the children it
spawned itself.
"""
import inspect
from pathlib import Path

import pytest

import suite_lane

REPO = Path(suite_lane.__file__).resolve().parent


@pytest.fixture(scope='module')
def plan():
    files = suite_lane.test_files(REPO)
    counts = {name: 1 for name in files}          # structure only, no collection
    return files, suite_lane.build_chunks(files, counts, 12)


class TestLaneCoversTheSuite:
    def test_every_test_module_runs_in_exactly_one_chunk(self, plan):
        # CONTRACT: the lane is a gate, not a filter - no test file may be
        # skipped by the chunking, and none may run twice
        files, chunks = plan
        flat = [name for chunk in chunks for name in chunk]
        assert sorted(flat) == sorted(files)
        assert len(flat) == len(set(flat))

    def test_no_chunk_is_empty(self, plan):
        # CONTRACT: an empty chunk hides a chunking bug that would drop files
        _files, chunks = plan
        assert chunks and all(chunk for chunk in chunks)

    def test_the_chunking_is_deterministic(self, plan):
        # CONTRACT: the same repo state always produces the same plan, so a
        # lane failure is reproducible and bisectable
        files, chunks = plan
        counts = {name: 1 for name in files}
        again = suite_lane.build_chunks(files, counts, 12)
        assert again == chunks

    def test_files_are_discovered_in_sorted_order(self):
        # CONTRACT: the lane runs modules in a stable order (pytest's own
        # order), because this suite's Qt hazard is order-sensitive
        files = suite_lane.test_files(REPO)
        assert files == sorted(files)
        assert any(name.startswith('tests/test_') for name in files)


class TestLaneProcessSafety:
    SOURCE = inspect.getsource(suite_lane)

    def test_the_runner_never_kills_by_name_or_foreign_pid(self):
        # CONTRACT: only children this module spawned are ever terminated;
        # killing by image name or by an unowned PID can kill unrelated
        # processes on the machine (the reason this rule is pinned)
        for forbidden in ('taskkill', 'psutil', 'os.kill', 'subprocess.Popen('
                          'name', 'STARTUPINFO'):
            assert forbidden not in self.SOURCE, forbidden

    def test_the_runner_only_touches_its_own_child_handle(self):
        # CONTRACT: a stuck chunk is bounded by a timeout and terminated
        # through the handle we created, then reported
        assert 'child.terminate()' in self.SOURCE
        assert 'child.kill()' in self.SOURCE
        assert 'TimeoutExpired' in self.SOURCE
        assert 'timeout=' in self.SOURCE


class TestFb8GuardStaysInPlace:
    def test_the_gc_guard_and_its_sweep_are_still_installed(self):
        # CONTRACT: ABORT2 measured that the F-B8 guard does NOT cover this
        # abort, and the guard still fixes the class it was built for - nobody
        # may delete it to chase this one
        text = (REPO / 'tests' / 'conftest.py').read_text(encoding='utf-8')
        assert 'gc.disable()' in text
        assert 'def pytest_sessionfinish' in text
        assert 'gc_disabled_latch' in text
