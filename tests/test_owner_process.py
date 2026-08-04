"""Cross-platform tests for the packaged backend owner watchdog."""
from unittest.mock import patch

from eeg2bids import server


def test_posix_owner_probe_reports_live_process():
    with patch.object(server.sys, 'platform', 'linux'), \
            patch.object(server.os, 'kill') as kill:
        assert server._owner_process_is_alive(1234)
        kill.assert_called_once_with(1234, 0)


def test_posix_owner_probe_reports_missing_process():
    with patch.object(server.sys, 'platform', 'linux'), \
            patch.object(server.os, 'kill', side_effect=ProcessLookupError):
        assert not server._owner_process_is_alive(1234)


def test_windows_owner_probe_uses_native_check():
    with patch.object(server.sys, 'platform', 'win32'), \
            patch.object(server, '_windows_process_is_alive',
                         return_value=True) as probe, \
            patch.object(server.os, 'kill') as kill:
        assert server._owner_process_is_alive(1234)
        probe.assert_called_once_with(1234)
        kill.assert_not_called()
