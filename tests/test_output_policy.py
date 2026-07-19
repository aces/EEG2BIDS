"""Output-format policy helpers (no writing).

Covers which output formats are accepted, the source-preserving default, and
the ``write_raw_bids`` kwargs that implement preserve-vs-convert. ``auto``
preserves the source format; a lazily-read source (EDF, and -- with the current
MNE -- EEGLAB SET) is copied file-as-is (no extra kwargs), while an explicit
format that differs from the source loads the data and re-writes it.
"""
import pytest

from eeg2bids import iEEG


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
    assert iEEG.is_supported_output_format(token) is supported


@pytest.mark.parametrize('source, expected', [
    ('rec.edf', 'EDF'),
    ('rec.set', 'EEGLAB'),
    ('rec.vhdr', 'BrainVision'),
    ('rec.fif', 'FIF'),
    ('rec.unknown', 'EDF'),   # fall back to the "recommend EDF" default
])
def test_default_output_format(source, expected):
    assert iEEG.default_output_format(source) == expected


def _kwargs(fixtures_dir, name, fmt):
    # resolve_write_kwargs may call load_data(), which mutates the Raw; use a
    # fresh read for each resolution.
    raw = iEEG.read_raw_recording(str(fixtures_dir / name))
    return iEEG.resolve_write_kwargs(raw, str(fixtures_dir / name), fmt)


def test_edf_auto_copies_as_is(fixtures_dir):
    assert _kwargs(fixtures_dir, 'eeg_continuous.edf', 'auto') == {}


def test_edf_explicit_edf_copies_as_is(fixtures_dir):
    # Explicit choice already matches the source format -> copy, no conversion.
    assert _kwargs(fixtures_dir, 'eeg_continuous.edf', 'edf') == {}


def test_edf_to_eeglab_converts(fixtures_dir):
    assert _kwargs(fixtures_dir, 'eeg_continuous.edf', 'eeglab') == {
        'allow_preload': True, 'format': 'EEGLAB'}


def test_set_auto_copies_as_is(fixtures_dir):
    # The current MNE reads EEGLAB lazily, so Auto preserves the SET by copying
    # it file-as-is rather than re-encoding.
    assert _kwargs(fixtures_dir, 'eeg_embedded.set', 'auto') == {}


def test_set_explicit_eeglab_copies_as_is(fixtures_dir):
    assert _kwargs(fixtures_dir, 'eeg_embedded.set', 'eeglab') == {}


def test_set_to_edf_converts(fixtures_dir):
    assert _kwargs(fixtures_dir, 'eeg_embedded.set', 'edf') == {
        'allow_preload': True, 'format': 'EDF'}
