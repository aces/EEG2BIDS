"""Error paths that must surface actionable messages, not be swallowed.

Covers the reader's continuous-only and missing-companion errors, and the
request validation in ``convert_recording`` that rejects unsupported output
formats and missing required fields before any conversion runs.
"""
import shutil

import pytest

from eeg2bids.conversion import convert_recording
from eeg2bids.converter import ReadError, read_raw_recording


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


def test_convert_rejects_missing_runs_before_writing(make_convert_data):
    request = make_convert_data('eeg_continuous.edf', eeg_runs=[])

    assert convert_recording(request) == {
        'error': ['No recording run(s) to convert.']}


def test_convert_reports_missing_source_at_write_seam(make_convert_data):
    request = make_convert_data('missing.edf')

    result = convert_recording(request)

    assert 'output_time' not in result
    assert result['error'] == [
        'Cannot read file - Recording file not found: '
        + request['eegRuns'][0]['recordingFile']
    ]


def test_convert_rejects_unsupported_output_format(make_convert_data):
    result = convert_recording(
        make_convert_data('eeg_continuous.edf', output_format='fif'))
    assert result == {'error': [
        "Unsupported output format 'fif'. Choose Auto, EDF, BrainVision, "
        'or EEGLAB.']}


def test_convert_reports_all_missing_required_fields():
    result = convert_recording(
        {'recordingData': {'files': []}, 'bids_directory': '', 'session': ''})
    assert 'error' in result
    assert result['error'] == [
        'No recording file(s) to convert.',
        'The BIDS output folder is missing.',
        'The LORIS Visit Label is missing.',
        'No recording run(s) to convert.',
    ]
