"""Cross-platform tests for the packaged backend owner watchdog."""
from unittest.mock import patch

from eeg2bids.runtime import owner_process


def test_posix_owner_probe_reports_live_process():
    with patch.object(owner_process.sys, 'platform', 'linux'), \
            patch.object(owner_process.os, 'kill') as kill:
        assert owner_process._owner_process_is_alive(1234)
        kill.assert_called_once_with(1234, 0)


def test_posix_owner_probe_reports_missing_process():
    with patch.object(owner_process.sys, 'platform', 'linux'), \
            patch.object(owner_process.os, 'kill', side_effect=ProcessLookupError):
        assert not owner_process._owner_process_is_alive(1234)


def test_windows_owner_probe_uses_native_check():
    with patch.object(owner_process.sys, 'platform', 'win32'), \
            patch.object(owner_process, '_windows_process_is_alive',
                         return_value=True) as probe, \
            patch.object(owner_process.os, 'kill') as kill:
        assert owner_process._owner_process_is_alive(1234)
        probe.assert_called_once_with(1234)
        kill.assert_not_called()
