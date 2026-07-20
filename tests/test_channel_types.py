"""Channel-type resolution and recording-detail preservation.

``infer_channel_type`` is the name-based fallback used only for channels MNE
left as the generic ``eeg`` default. These tests pin that helper and confirm
that reading a recording preserves the source's channel count, names, and
sampling rate.
"""
import pytest

from eeg2bids.iEEG import infer_channel_type, read_raw_recording


@pytest.mark.parametrize('ch_name, expected', [
    ('EEG Fp1', 'eeg'),
    ('EOG left', 'eog'),
    ('ECG', 'ecg'),
    ('EKG', 'ecg'),
    ('LFlex', 'emg'),
    ('Chin', 'emg'),
    ('Trigger', 'stim'),
    ('C3', None),
    ('LAmy1', None),
])
def test_infer_channel_type(ch_name, expected):
    assert infer_channel_type(ch_name) == expected


@pytest.mark.parametrize('name, n_channels, sfreq, first_ch', [
    ('eeg_continuous.edf', 8, 256.0, 'Fp1'),
    ('ieeg_continuous.edf', 6, 512.0, 'LAmy1'),
    ('eeg_embedded.set', 8, 256.0, 'Fp1'),
    ('eeg_split.set', 8, 256.0, 'Fp1'),
])
def test_recording_details_preserved(fixtures_dir, name, n_channels, sfreq,
                                     first_ch):
    raw = read_raw_recording(str(fixtures_dir / name))
    assert len(raw.ch_names) == n_channels
    assert raw.ch_names[0] == first_ch
    assert raw.info['sfreq'] == sfreq
