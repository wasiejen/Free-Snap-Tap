r'''Single-instance guard (maintainer decision 2026-11-16, X-SINGLE unit):
one FST instance at a time - a second start logs ONE notice line and
exits with code 1, never a traceback.

Race-free order (the elevation interplay, pinned in
tests/test_single_instance.py): free_snap_tap.py __main__ runs the
--elevate lane FIRST and calls handle_single_instance_guard() only after
it. The elevation decision can exit 0 (runas relaunch) WITHOUT ever
touching the mutex, so a launcher never holds and releases the mutex in
front of its own elevated child - the worker process (plain run or
elevated relaunch) is the acquire site. A second launch is refused at
its worker, never at its launcher.

Namespace: the mutex name carries the Global prefix - the system-wide
kernel-object namespace. One name is then visible across every terminal
services session including session 0, so the guard is session-context
irrelevant: a service run, a scheduled-task run and an interactive run
all see the same instance. A Local prefix would be per-session and miss
the others.

Privilege: creating a Global object needs SeCreateGlobalPrivilege (the
maintainer machine creates one from a plain run: measured 2026-11-16,
CreateMutexW err=0). A token without the privilege gets a failure
instead - and every mutex API failure FAILS OPEN: one named warning
line and the start continues. The guard must never block a normal start.

Release: no explicit CloseHandle - the handle stays open for the life of
the process and the OS closes all handles at process death, releasing
the mutex (documented Windows behavior). An abnormal death therefore
cannot wedge the guard.

Dev mode: the name is static (not derived from sys.executable), so two
python.exe runs of the script refuse each other exactly like frozen
exes, and a dev run and an exe run share the one mutex (process-scoped
acquisition).
'''
import ctypes
import logging
import os
import sys

# app-root logger; handlers are installed by fst_manager.setup_fst_logging
# at startup, and the console handler shows WARNING+ - the refusal line
# and the fail-open warnings therefore reach BOTH fst.log and the console
logger = logging.getLogger('fst')

# kernel32 failure code: the named object already existed when we asked
ERROR_ALREADY_EXISTS = 183

# one static name per product: Global\<productlower>_<exe scope>; the
# backslash is spelled via chr() (payload-safe, house BS precedent)
MUTEX_NAME = 'Global' + chr(92) + 'fst_free_snap_tap'

# ONE calm console/log line (WARNING = console-visible per the fst tree)
REFUSAL_LINE = '[SingleInstance] another FST is already running - exiting'

# kept open for the life of the process (the OS releases at process death)
_mutex_handle = None


def _kernel32_create_mutexw(name):
    '''the bare ctypes seam for CreateMutexW (tests patch this); returns
    (handle_or_None, last_error). restype is pinned to c_void_p (same rule
    as the elevation lane's ShellExecuteW restype, cross-product polish
    2026-11-16): the return is a HANDLE (pointer-sized), so ctypes'
    default c_int truncates the high dword on x64 and a healthy handle
    could read as a failure'''
    kernel32 = ctypes.windll.kernel32
    kernel32.CreateMutexW.restype = ctypes.c_void_p
    kernel32.CreateMutexW.argtypes = [ctypes.c_void_p, ctypes.c_int,
                                      ctypes.c_wchar_p]
    handle = kernel32.CreateMutexW(None, False, name)
    return handle, ctypes.GetLastError()


def acquire_single_instance_guard(mutex_name=MUTEX_NAME):
    '''claim the named mutex for this process. Returns one of:
    'first'            - this process is THE instance (handle kept)
    'already_running'  - a live process holds it (ERROR_ALREADY_EXISTS)
    'api_error'        - the win32 call itself failed (no handle): fail
                         open, the caller continues the start
    An in-process second call returns 'already_running' (real kernel
    semantics - the suite pins exactly that).'''
    global _mutex_handle
    try:
        handle, last_error = _kernel32_create_mutexw(mutex_name)
    except Exception as error:
        logger.warning(f"[SingleInstance] mutex API failed: {error!r} - "
                       "guard disabled, continuing")
        return 'api_error'
    if not handle:
        # NULL handle (c_void_p arrives as None): an API failure, not a
        # refusal - e.g. a token without SeCreateGlobalPrivilege cannot
        # create the Global object. Fail open.
        logger.warning(f"[SingleInstance] CreateMutexW failed "
                       f"(GetLastError={last_error}) - guard disabled, "
                       "continuing")
        return 'api_error'
    if last_error == ERROR_ALREADY_EXISTS:
        return 'already_running'
    _mutex_handle = handle
    return 'first'


def handle_single_instance_guard():
    '''the startup entry (free_snap_tap.py __main__, right AFTER the
    --elevate lane): a second instance logs ONE notice line and exits 1
    (the documented startup-error code, the ConfigError convention); an
    'api_error' fails open and continues the start.

    FST_ALLOW_MULTI_INSTANCE is a TEST SEAM only (deliberately absent
    from the user docs - prior test-seam non-documentation ruling): when
    set, the guard is skipped entirely.'''
    if os.environ.get('FST_ALLOW_MULTI_INSTANCE'):
        return
    status = acquire_single_instance_guard()
    if status == 'already_running':
        logger.warning(REFUSAL_LINE)
        sys.exit(1)
