"""Error paths that must surface actionable messages, not be swallowed.

Covers the reader's continuous-only and missing-companion errors, and the
request validation in ``convert_recording`` that rejects unsupported output
formats and missing required fields before any conversion runs.
"""
import shutil

import pytest

from eeg2bids.conversion import convert_recording
from eeg2bids.iEEG import ReadError, read_raw_recording


def test_epoched_set_reports_continuous_only(fixtures_dir):
    with pytest.raises(ReadError) as excinfo:
        read_raw_recording(str(fixtures_dir / 'eeg_epoched.set'))
    message = str(excinfo.value)
    assert 'continuous' in message
    assert 'epoched' in message


def test_missing_fdt_companion_reports_actionable_error(fixtures_dir, tmp_path):
    # Copy only the .set (not its .fdt data companion) so the companion is
    # genuinely absent; the reader must name the missing file.
    orphan = tmp_path / 'eeg_split.set'
    shutil.copy(fixtures_dir / 'eeg_split.set', orphan)
    with pytest.raises(ReadError) as excinfo:
        read_raw_recording(str(orphan))
    assert '.fdt' in str(excinfo.value)


def test_convert_rejects_unsupported_output_format(fixtures_dir):
    data = {
        'recordingData': {'files': [
            {'path': str(fixtures_dir / 'eeg_continuous.edf'), 'name': 'e.edf'},
        ]},
        'bids_directory': str(fixtures_dir),  # never written to: rejected first
        'session': '01',
        'outputFormat': 'fif',
    }
    result = convert_recording(data)
    assert 'error' in result
    assert any('Unsupported output format' in m for m in result['error'])


def test_convert_reports_all_missing_required_fields():
    result = convert_recording(
        {'recordingData': {'files': []}, 'bids_directory': '', 'session': ''})
    assert 'error' in result
    assert len(result['error']) == 3
