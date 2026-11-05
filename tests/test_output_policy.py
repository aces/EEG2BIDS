"""Output-format policy helpers (no writing)."""
import pytest

from eeg2bids import converter


@pytest.mark.parametrize('token, supported', [
    ('auto', True),
    ('AUTO', True),
    ('edf', True),
    ('EDF', True),
    ('brainvision', True),
    ('eeglab', True),
    ('fif', False),   # MEG format, not BIDS-valid for EEG/iEEG
    ('', False),
    (None, False),
    ('bogus', False),
])
def test_is_supported_output_format(token, supported):
    assert converter.is_supported_output_format(token) is supported


@pytest.mark.parametrize('source, expected', [
    ('rec.edf', 'EDF'),
    ('rec.set', 'EEGLAB'),
    ('rec.vhdr', 'BrainVision'),
    ('rec.fif', 'FIF'),
    ('rec.unknown', 'EDF'),   # fall back to the "recommend EDF" default
])
def test_default_output_format(source, expected):
    assert converter.default_output_format(source) == expected


@pytest.mark.parametrize('name, fmt, expected', [
    ('eeg_continuous.edf', 'auto', {}),
    ('eeg_continuous.edf', 'edf', {}),  # already the source format: copy
    ('eeg_continuous.edf', 'eeglab', {'allow_preload': True, 'format': 'EEGLAB'}),
    ('eeg_embedded.set', 'auto', {}),  # MNE reads EEGLAB lazily: copy
    ('eeg_embedded.set', 'eeglab', {}),
    ('eeg_embedded.set', 'edf', {'allow_preload': True, 'format': 'EDF'}),
])
def test_resolve_write_kwargs(fixtures_dir, name, fmt, expected):
    path = str(fixtures_dir / name)
    raw = converter.read_raw_recording(path)
    assert converter.resolve_write_kwargs(raw, path, fmt) == expected
