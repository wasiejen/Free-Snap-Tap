"""suite_lane.py - the durable chunked gate for the FST test suite (ABORT2).

WHY THIS EXISTS. One single-process ``pytest tests -q`` run of this suite dies
natively on this platform: PySide6 6.11.2 / shiboken6 6.11.2 abort the process
(SIGABRT, sometimes SIGSEGV) once the session's Qt object graph is big enough,
inside pytest-qt's event pumps. It is the F-B8 hazard class (upstream), it is
NOW DETERMINISTIC at the tray-fixture teardown (~92 % of the run), and no
in-repo guard removes it: the measurements are recorded in tests/README.md.
Per-chunk runs are reliably green, because a chunk holds a smaller graph.

WHAT IT DOES. Collects once, splits ``tests/**/test_*.py`` (in pytest's own
order) into chunks of about ``--chunk-target`` tests, runs each chunk in its
own pytest process, prints one line per chunk plus an aggregate, and exits
nonzero if any chunk fails, aborts, collects nothing, or times out. This is the
repo's gate command for a full-suite verification.

PROCESS SAFETY (a rule, not a preference, and pinned in
tests/test_suite_lane.py): this module only ever touches the child processes it
spawned itself - ``child.terminate()`` then ``child.kill()`` on its own handle,
guarded by a timeout. It never kills by process name and never kills by a PID
it did not spawn. A stuck chunk is reported, not hunted.
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent


def test_files(root: Path = REPO) -> list[str]:
    """every test module, in the order pytest itself would run them"""
    return sorted(path.relative_to(root).as_posix()
                  for path in (root / 'tests').rglob('test_*.py'))


def parse_collection(text: str) -> dict[str, int]:
    """{module path: collected tests} from a ``-q --collect-only`` transcript.

    A test is a ``file::node`` line. pytest also echoes the bare module path
    once per file, and counting those headers inflates every chunk's planned
    size by one test per file (measured: 1159 planned against 1096 run).
    """
    counts: dict[str, int] = {}
    for line in text.splitlines():
        if '::' not in line:
            continue
        name = line.split('::')[0].strip().replace('\\', '/')
        if name.startswith('tests/') and name.endswith('.py'):
            counts[name] = counts.get(name, 0) + 1
    return counts


def collect_counts(root: Path = REPO) -> tuple[dict[str, int], int]:
    """one collection pass -> ({file: tests collected}, pytest return code)"""
    proc = subprocess.run(
        [sys.executable, '-m', 'pytest', '-q', '--no-header', '-p',
         'no:cacheprovider', '--collect-only'],
        cwd=root, capture_output=True, text=True, timeout=300, check=False,
        env=child_env())
    return parse_collection(proc.stdout + proc.stderr), proc.returncode


def child_env() -> dict[str, str]:
    """chunks AND collection run under the same platform - a Qt-importing
    collection pass must not see a different environment than the tests"""
    return {**os.environ, 'QT_QPA_PLATFORM': os.environ.get(
        'QT_QPA_PLATFORM', 'offscreen')}


def build_chunks(files: list[str], counts: dict[str, int],
                 target: int) -> list[list[str]]:
    """split in run order: close a chunk once it reaches the target size"""
    chunks: list[list[str]] = []
    current: list[str] = []
    size = 0
    for name in files:
        current.append(name)
        size += counts.get(name, 1)
        if size >= target:
            chunks.append(current)
            current, size = [], 0
    if current:
        chunks.append(current)
    return chunks


def summarize(text: str) -> str:
    """the pytest summary line, or the last non-empty line (an abort has none)"""
    for line in reversed(text.strip().splitlines()):
        if 'passed' in line or 'failed' in line or 'error' in line:
            return line.strip()[:80]
    tail = [line for line in text.strip().splitlines() if line.strip()]
    return (tail[-1][:80] if tail else 'no output')


def chunk_is_ok(code: int) -> bool:
    """ONLY a real green chunk counts: pytest exit 5 means the chunk collected
    nothing, which would silently pass a chunk that never ran a single test"""
    return code == 0


def run_chunk(chunk: list[str], root: Path, timeout: int) -> tuple[int, str]:
    """run one chunk in ITS OWN process; only our own handle is ever touched"""
    child = subprocess.Popen(
        [sys.executable, '-m', 'pytest', '-q', '--no-header', '-p',
         'no:cacheprovider'] + chunk,
        cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
        env=child_env())
    try:
        out, _ = child.communicate(timeout=timeout)
        return child.returncode, summarize(out or '')
    except subprocess.TimeoutExpired:
        child.terminate()
        try:
            child.communicate(timeout=30)
        except subprocess.TimeoutExpired:
            child.kill()
            child.communicate()
        return 124, f'CHUNK TIMEOUT after {timeout}s (terminated our own child)'


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--chunk-target', type=int, default=350,
                        help='approximate tests per chunk (default 350)')
    parser.add_argument('--timeout', type=int, default=600,
                        help='per-chunk timeout in seconds (default 600)')
    parser.add_argument('--list', action='store_true',
                        help='print the chunk plan and exit')
    args = parser.parse_args(argv)

    files = test_files()
    counts, code = collect_counts()
    if not files:
        print('lane: FAILED - no test modules found under tests/')
        return 2
    if not counts or code not in (0, 5):
        print(f'lane: FAILED - collection did not succeed (pytest exit {code}, '
              f'{len(counts)} files counted); refusing to plan chunks')
        return 2

    chunks = build_chunks(files, counts, args.chunk_target)
    if args.list:
        for index, chunk in enumerate(chunks, 1):
            total = sum(counts.get(name, 1) for name in chunk)
            print(f'chunk {index}: {len(chunk)} files, {total} tests')
        return 0

    failed = 0
    for index, chunk in enumerate(chunks, 1):
        total = sum(counts.get(name, 1) for name in chunk)
        code, summary = run_chunk(chunk, REPO, args.timeout)
        flag = 'ok' if chunk_is_ok(code) else 'FAIL'
        print(f'chunk {index}/{len(chunks)} ({total} tests): exit={code} '
              f'{flag}: {summary}', flush=True)
        if not chunk_is_ok(code):
            failed += 1
    print(f'lane: {len(chunks)} chunks, {len(chunks) - failed} ok, {failed} failed '
          f'(single process is NOT usable on this platform - see tests/README.md)')
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
