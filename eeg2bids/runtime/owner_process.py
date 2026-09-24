"""Stop the backend if the Electron process that launched it disappears."""

import os
import sys
import threading
import time


def _windows_process_is_alive(pid):
    """Probe process existence without sending a signal on Windows."""
    import ctypes
    from ctypes import wintypes

    synchronize = 0x00100000
    wait_timeout = 0x00000102
    error_access_denied = 5
    kernel32 = ctypes.WinDLL('kernel32', use_last_error=True)
    kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL,
                                     wintypes.DWORD]
    kernel32.OpenProcess.restype = wintypes.HANDLE
    kernel32.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
    kernel32.WaitForSingleObject.restype = wintypes.DWORD
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]

    handle = kernel32.OpenProcess(synchronize, False, pid)
    if not handle:
        # Access denied proves that a process occupies the pid.
        return ctypes.get_last_error() == error_access_denied
    try:
        return kernel32.WaitForSingleObject(handle, 0) == wait_timeout
    finally:
        kernel32.CloseHandle(handle)


def _owner_process_is_alive(pid):
    """Return whether the Electron owner process still exists."""
    if sys.platform == 'win32':
        return _windows_process_is_alive(pid)
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def watch_owner_process():
    """Exit when Electron disappears without shutting down its backend.

    Electron normally terminates the backend's process group itself on quit.
    EEG2BIDS_OWNER_PID is the backstop for a hard kill or ungraceful exit.
    """
    owner_pid = os.environ.get('EEG2BIDS_OWNER_PID', '')
    if not owner_pid.isdigit():
        return

    def watch():
        while True:
            time.sleep(2)
            if not _owner_process_is_alive(int(owner_pid)):
                try:
                    print(
                        f'eeg2bids: owner process {owner_pid} exited, '
                        'shutting down',
                        file=sys.stderr,
                    )
                except OSError:
                    pass
                finally:
                    os._exit(0)

    threading.Thread(target=watch, daemon=True).start()
