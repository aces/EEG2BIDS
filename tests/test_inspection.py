"""Recording inspection behavior (``conversion.inspect_recording``).

Inspection is format-neutral: every entry point is opened through MNE's generic
``read_raw`` dispatcher, so the same code path serves EDF and EEGLAB SET without
a per-format table. These tests exercise that path and the optional-metadata /
``n/a`` defaults, without writing any BIDS output.
"""
from eeg2bids.conversion import inspect_recording


def _entry(fixtures_dir, name):
    path = fixtures_dir / name
    return {'path': str(path), 'name': name}


def test_inspect_edf_reports_subject_and_date(fixtures_dir):
    result = inspect_recording([_entry(fixtures_dir, 'eeg_continuous.edf')])
    assert 'error' not in result
    # export_raw writes EDF's anonymized subject field ('X'); the fixed
    # synthetic acquisition date is preserved from the header.
    assert result['subjectID'] == 'X'
    assert result['date'] == '2020-01-01 12:00:00'
    assert result['recordingID'] == 'n/a'
    assert len(result['files']) == 1


def test_inspect_set_uses_na_defaults(fixtures_dir):
    # EEGLAB SET carries no subject id or acquisition date, so inspection
    # falls back to 'n/a' / empty rather than raising.
    result = inspect_recording([_entry(fixtures_dir, 'eeg_embedded.set')])
    assert 'error' not in result
    assert result['subjectID'] == 'n/a'
    assert result['recordingID'] == 'n/a'
    assert result['date'] == ''


def test_inspect_split_set_reads_through_fdt(fixtures_dir):
    result = inspect_recording([_entry(fixtures_dir, 'eeg_split.set')])
    assert 'error' not in result
    assert len(result['files']) == 1


def test_inspect_no_files_errors():
    assert inspect_recording([]) == {'error': 'No recording file selected.'}
    assert inspect_recording(None) == {'error': 'No recording file selected.'}


def test_inspect_mismatched_files_are_one_recording(fixtures_dir):
    # Two files with different channel sets are not splits of one recording.
    result = inspect_recording([
        _entry(fixtures_dir, 'eeg_continuous.edf'),
        _entry(fixtures_dir, 'ieeg_continuous.edf'),
    ])
    assert result == {
        'error': 'The files selected contain more than one recording.'
    }
