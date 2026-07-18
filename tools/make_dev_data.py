"""Generate synthetic, non-sensitive development fixtures for EEG2BIDS.

This produces representative inputs and outputs for local debugging without
any real clinical data. Everything is deterministic (fixed RNG seed) and
small. The generated ``dev-data/`` directory is gitignored.

The EDF/EEGLAB export backends it uses (edfio, eeglabio) are regular runtime
dependencies, so a plain sync is all that is needed:

    uv sync --frozen
    uv run python tools/make_dev_data.py

Outputs (under ``dev-data/`` by default):

    eeg_sample.edf        synthetic scalp-EEG recording (input)
    eeg_metadata.json     representative EEG sidecar parameters
    ieeg_sample.edf       synthetic intracranial-EEG recording (input)
    ieeg_metadata.json    representative iEEG sidecar parameters
    bids_valid/           a known-valid BIDS dataset (built with mne-bids)
    bids_invalid/         a copy of bids_valid with one non-BIDS filename
"""
import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import mne
import numpy as np
from mne_bids import BIDSPath, write_raw_bids

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = REPO_ROOT / 'templates'

SEED = 42
SFREQ_EEG = 256.0
SFREQ_IEEG = 512.0
DURATION_S = 10.0
LINE_FREQ = 60
# A fixed, obviously-synthetic acquisition date keeps output reproducible.
MEAS_DATE = datetime(2020, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

EEG_CHANNELS = ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4', 'O1', 'O2']
IEEG_CHANNELS = ['LAmy1', 'LAmy2', 'LHip1', 'LHip2', 'RAmy1', 'RAmy2']


def _synthetic_raw(ch_names, ch_type, sfreq, amplitude_v):
    """Build a deterministic RawArray of sine waves plus a little noise."""
    rng = np.random.default_rng(SEED)
    n_samples = int(sfreq * DURATION_S)
    times = np.arange(n_samples) / sfreq
    data = np.empty((len(ch_names), n_samples))
    for i in range(len(ch_names)):
        freq = 5.0 + i  # a distinct rhythm per channel
        signal = np.sin(2 * np.pi * freq * times)
        noise = rng.standard_normal(n_samples) * 0.1
        data[i] = (signal + noise) * amplitude_v
    info = mne.create_info(ch_names, sfreq, ch_types=ch_type)
    raw = mne.io.RawArray(data, info, verbose='ERROR')
    raw.set_meas_date(MEAS_DATE)
    raw.info['line_freq'] = LINE_FREQ
    return raw


def _write_metadata(template_name, out_path, overrides):
    """Fill a parameters template with representative values."""
    with open(TEMPLATES / template_name) as fd:
        metadata = json.load(fd)
    metadata.update(overrides)
    with open(out_path, 'w') as fd:
        json.dump(metadata, fd, indent=2)


def _write_valid_bids(edf_path, bids_root):
    """Convert an EDF to a valid BIDS dataset the way the app does."""
    if bids_root.exists():
        shutil.rmtree(bids_root)
    raw = mne.io.read_raw_edf(edf_path, verbose='ERROR')
    raw.info['line_freq'] = LINE_FREQ
    bids_path = BIDSPath(
        subject='01', session='01', task='rest',
        datatype='eeg', root=bids_root,
    )
    write_raw_bids(raw, bids_path, overwrite=True, verbose=False,
                   allow_preload=True, format='EDF')


def _write_invalid_bids(valid_root, invalid_root):
    """Copy a valid dataset, then plant one non-BIDS-named file.

    The app validates each file's path against the BIDS naming spec
    (eeg2bids/BIDS.py), so a single mis-named file makes the dataset report
    a validation failure — a known-invalid fixture for the failure path.
    """
    if invalid_root.exists():
        shutil.rmtree(invalid_root)
    shutil.copytree(valid_root, invalid_root)
    stray = (invalid_root / 'sub-01' / 'ses-01' / 'eeg' /
             'not_a_valid_bids_name.txt')
    stray.write_text('This filename is intentionally not BIDS-compliant.\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        '--out', type=Path, default=REPO_ROOT / 'dev-data',
        help='output directory (default: ./dev-data)',
    )
    args = parser.parse_args()
    out = args.out
    out.mkdir(parents=True, exist_ok=True)

    # Inputs: synthetic EEG and iEEG recordings, exported to EDF.
    eeg_raw = _synthetic_raw(EEG_CHANNELS, 'eeg', SFREQ_EEG, 50e-6)
    eeg_edf = out / 'eeg_sample.edf'
    mne.export.export_raw(eeg_edf, eeg_raw, fmt='edf', overwrite=True)

    ieeg_raw = _synthetic_raw(IEEG_CHANNELS, 'seeg', SFREQ_IEEG, 200e-6)
    ieeg_edf = out / 'ieeg_sample.edf'
    mne.export.export_raw(ieeg_edf, ieeg_raw, fmt='edf', overwrite=True)

    # Representative metadata sidecars.
    _write_metadata('eeg_parameters_TEMPLATE.json', out / 'eeg_metadata.json', {
        'InstitutionName': 'EEG2BIDS Dev Fixture',
        'Manufacturer': 'Synthetic',
        'ManufacturersModelName': 'make_dev_data',
        'TaskDescription': 'Synthetic resting-state fixture (not real data).',
        'EEGPlacementScheme': '10-20',
        'EEGGround': 'Fpz',
    })
    _write_metadata(
        'ieeg_parameters_TEMPLATE.json', out / 'ieeg_metadata.json', {
            'InstitutionName': 'EEG2BIDS Dev Fixture',
            'Manufacturer': 'Synthetic',
            'ManufacturersModelName': 'make_dev_data',
            'TaskDescription': 'Synthetic iEEG fixture (not real data).',
        })

    # Outputs: a known-valid and a known-invalid BIDS dataset.
    bids_valid = out / 'bids_valid'
    bids_invalid = out / 'bids_invalid'
    _write_valid_bids(eeg_edf, bids_valid)
    _write_invalid_bids(bids_valid, bids_invalid)

    print('Development fixtures written to', out)
    print()
    print('Expected characteristics:')
    print(f'  eeg_sample.edf   {len(EEG_CHANNELS)} EEG ch, '
          f'{SFREQ_EEG:.0f} Hz, {DURATION_S:.0f}s, ~50 uV, line {LINE_FREQ} Hz')
    print(f'  ieeg_sample.edf  {len(IEEG_CHANNELS)} sEEG ch, '
          f'{SFREQ_IEEG:.0f} Hz, {DURATION_S:.0f}s, ~200 uV, '
          f'line {LINE_FREQ} Hz')
    print('  bids_valid/      sub-01 ses-01 task-rest eeg — all files '
          'BIDS-compliant')
    print('  bids_invalid/    same, plus one non-BIDS-named file that fails '
          'validation')


if __name__ == '__main__':
    main()
