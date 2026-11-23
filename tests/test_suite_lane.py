"""ABORT2 pins for the suite lane runner (suite_lane.py).

The lane is the repo's full-suite gate on this platform (the single-process run
aborts natively - the measurement record is in tests/README.md). A gate that
silently drops a test file, passes a chunk that ran nothing, or keeps going
after collection died is worse than an aborting run, so these pins hold the
lane's STRUCTURE: coverage, exactly-once, determinism, the exit-code contract,
the collection-failure path, and the process-safety rule that the runner may
only ever touch the children it spawned itself.
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

    def test_a_module_in_a_test_subdirectory_is_discovered(self, tmp_path):
        # CONTRACT: discovery follows the testpaths=tests tree, not one flat
        # directory - a nested module must not be silently un-gated
        (tmp_path / 'tests' / 'sub').mkdir(parents=True)
        (tmp_path / 'tests' / 'test_top.py').write_text('x', encoding='utf-8')
        (tmp_path / 'tests' / 'sub' / 'test_nested.py').write_text(
            'x', encoding='utf-8')
        found = suite_lane.test_files(tmp_path)
        assert 'tests/test_top.py' in found
        assert 'tests/sub/test_nested.py' in found

    def test_no_chunk_is_empty(self, plan):
        # CONTRACT: an empty chunk hides a chunking bug that would drop files
        _files, chunks = plan
        assert chunks and all(chunk for chunk in chunks)

    def test_the_chunking_is_deterministic(self, plan):
        # CONTRACT: the same repo state always produces the same plan, so a
        # lane failure is reproducible and bisectable
        files, chunks = plan
        counts = {name: 1 for name in files}
        assert suite_lane.build_chunks(files, counts, 12) == chunks

    def test_files_are_discovered_in_sorted_order(self):
        # CONTRACT: the lane runs modules in a stable order (pytest's own
        # order), because this suite's Qt hazard is order-sensitive
        files = suite_lane.test_files(REPO)
        assert files == sorted(files)
        assert any(name.startswith('tests/test_') for name in files)


class TestLaneExitContract:
    def test_only_a_green_chunk_counts_as_ok(self):
        # CONTRACT: pytest exit 5 (nothing collected) is NOT success - a chunk
        # that ran zero tests must fail the gate, not pass it quietly
        assert suite_lane.chunk_is_ok(0)
        for bad in (1, 2, 3, 4, 5, 124, 3221225477):
            assert not suite_lane.chunk_is_ok(bad), bad

    def test_a_timed_out_chunk_fails_the_lane(self, monkeypatch, capsys):
        # CONTRACT: a wedged chunk (timeout -> 124) fails the run and is
        # reported as FAIL, it is never treated as a pass
        monkeypatch.setattr(suite_lane, 'run_chunk',
                            lambda chunk, root, timeout: (124, 'wedged'))
        assert suite_lane.main([]) == 1
        assert 'FAIL' in capsys.readouterr().out

    def test_a_dead_collection_refuses_to_plan_chunks(self, monkeypatch, capsys):
        # CONTRACT: if collection failed, counts are meaningless - the lane
        # must stop rather than fall back to one giant single-process chunk,
        # which is exactly the configuration known to abort
        monkeypatch.setattr(suite_lane, 'collect_counts',
                            lambda root=None: ({}, 2))
        monkeypatch.setattr(suite_lane, 'run_chunk',
                            lambda *args, **kwargs: pytest.fail(
                                'chunks must not run when collection failed'))
        assert suite_lane.main([]) == 2
        assert 'collection did not succeed' in capsys.readouterr().out


class TestCollectionAccounting:
    def test_module_header_lines_are_not_counted_as_tests(self):
        # CONTRACT: the planned chunk sizes are the lane's promise about what it
        # ran - pytest echoes a bare module path per file, and counting those
        # headers over-plans every chunk (measured: 1159 planned vs 1096 run)
        transcript = (
            'tests/test_a.py::test_one\n'
            'tests/test_a.py::Test_Two::test_three\n'
            'tests/test_b.py::test_four\n'
            'tests/test_b.py\n'
            '\n'
            '4 tests collected in 0.10s\n')
        assert suite_lane.parse_collection(transcript) == {
            'tests/test_a.py': 2, 'tests/test_b.py': 1}


class TestLaneProcessSafety:
    SOURCE = inspect.getsource(suite_lane)

    def test_the_runner_never_kills_by_name_or_foreign_pid(self):
        # CONTRACT: only children this module spawned are ever terminated;
        # killing by image name or by an unowned PID can kill unrelated
        # processes on the machine (the reason this rule is pinned)
        for forbidden in ('taskkill', 'psutil', 'os.kill', 'os.system',
                          'ctypes', 'signal.', 'STARTUPINFO', 'win32process'):
            assert forbidden not in self.SOURCE, forbidden

    def test_the_runner_only_touches_its_own_child_handle(self):
        # CONTRACT: a stuck chunk is bounded by a timeout and terminated
        # through the handle we created, then reported
        assert 'child.terminate()' in self.SOURCE
        assert 'child.kill()' in self.SOURCE
        assert 'TimeoutExpired' in self.SOURCE
        assert 'timeout=' in self.SOURCE

    def test_collection_and_chunks_share_one_platform_environment(self):
        # CONTRACT: collection imports Qt-importing modules too, so it must run
        # under the same QT_QPA_PLATFORM as the chunks
        assert self.SOURCE.count('child_env()') >= 3
        assert "QT_QPA_PLATFORM" in self.SOURCE


class TestFb8GuardStaysInPlace:
    def test_the_gc_guard_and_its_sweep_are_still_installed(self):
        # CONTRACT: ABORT2 measured that the F-B8 guard does NOT cover this
        # abort, and the guard still fixes the class it was built for - nobody
        # may delete it to chase this one
        text = (REPO / 'tests' / 'conftest.py').read_text(encoding='utf-8')
        assert 'gc.disable()' in text
        assert 'def pytest_sessionfinish' in text
        assert 'gc_disabled_latch' in text
