"""End-to-end ``convert_recording`` runs with structural assertions."""
import csv
from datetime import datetime
import json
import shutil

import mne
import pytest


def _datatype_dir(root, datatype):
    return root / "sub-01" / "ses-01" / datatype


def _recording_file(root, datatype):
    """The single written recording file (any format) in the datatype dir."""
    directory = _datatype_dir(root, datatype)
    hits = [p for p in directory.iterdir()
            if p.name.endswith((f"_{datatype}.edf", f"_{datatype}.set"))]
    assert len(hits) == 1, f"expected one recording file, found {hits}"
    return hits[0]


def _channels_tsv(root, datatype):
    directory = _datatype_dir(root, datatype)
    (path,) = directory.glob("*_channels.tsv")
    with open(path) as fd:
        return list(csv.DictReader(fd, delimiter="\t"))


def _sidecar(root, datatype):
    directory = _datatype_dir(root, datatype)
    (path,) = directory.glob(f"*_{datatype}.json")
    with open(path) as fd:
        return json.load(fd)


def test_eeg_conversion(make_convert_data, run_conversion):
    request = make_convert_data("eeg_continuous.edf", reference="FCz")
    original_runs = [run.copy() for run in request["eegRuns"]]
    result, root = run_conversion(request)

    assert "output_time" not in request
    assert request["eegRuns"] == original_runs
    assert "output_time" in result
    assert _recording_file(root, "eeg").suffix == ".edf"
    assert (root / "dataset_description.json").exists()
    assert (root / "participants.tsv").exists()
    assert {row["type"] for row in _channels_tsv(root, "eeg")} == {"EEG"}
    sidecar = _sidecar(root, "eeg")
    assert sidecar["SamplingFrequency"] == 256.0
    assert sidecar["PowerLineFrequency"] == 60.0        # from line_freq '60'
    assert sidecar["RecordingType"] == "continuous"
    assert sidecar["EEGReference"] == "FCz"


def test_ieeg_conversion(make_convert_data, run_conversion):
    result, root = run_conversion(make_convert_data(
        "ieeg_continuous.edf", modality="ieeg", reference="intracranial-ref"))

    assert "output_time" in result
    assert _recording_file(root, "ieeg").suffix == ".edf"
    # Names like 'LAmy1' are not name-inferable, so the selected modality
    # (seeg) is applied to channels MNE left as generic eeg.
    assert {row["type"] for row in _channels_tsv(root, "ieeg")} == {"SEEG"}
    assert _sidecar(root, "ieeg")["iEEGReference"] == "intracranial-ref"


def _edf_identification_fields(path):
    with open(path, "rb") as stream:
        stream.seek(8)
        return tuple(stream.read(80).decode("ascii").strip() for _ in range(2))


def test_anonymization_toggle_controls_edf_identity_and_date(
        fixtures_dir, tmp_path, make_convert_data, run_conversion):
    source = tmp_path / "identified.edf"
    shutil.copyfile(fixtures_dir / "eeg_continuous.edf", source)
    with open(source, "r+b") as stream:
        stream.seek(8)
        stream.write(b"PATIENT-SECRET".ljust(80))
        stream.write(b"RECORDING-SECRET".ljust(80))

    common = {
        "recordingData": {"files": [{"path": str(source), "name": source.name}]},
        "eegRuns": [{"recordingFile": str(source), "eventFile": ""}],
    }

    plain_data = make_convert_data(
        "eeg_continuous.edf", bids_directory=str(tmp_path / "plain"), **common)
    _, plain_root = run_conversion(plain_data)
    plain = _recording_file(plain_root, "eeg")
    assert _edf_identification_fields(plain) == (
        "PATIENT-SECRET", "RECORDING-SECRET")

    anonymous_data = make_convert_data(
        "eeg_continuous.edf", anonymize=True,
        bids_directory=str(tmp_path / "anonymous"), **common)
    _, anonymous_root = run_conversion(anonymous_data)
    anonymous = _recording_file(anonymous_root, "eeg")
    patient, recording = _edf_identification_fields(anonymous)
    assert patient == "X X X X"
    assert recording == "X X X X"
    # EDF's two-digit start-date field bottoms out at 1985; MNE-BIDS stores
    # the true shifted date in scans.tsv.
    raw = mne.io.read_raw_edf(anonymous, verbose="ERROR")
    assert raw.info["meas_date"].year == 1985
    (scans_path,) = anonymous_root.glob("sub-*/ses-*/*_scans.tsv")
    with open(scans_path) as stream:
        (scan,) = csv.DictReader(stream, delimiter="\t")
    shifted = datetime.fromisoformat(scan["acq_time"].replace("Z", "+00:00"))
    assert shifted.year < 1925



@pytest.mark.parametrize("recording, output_format, suffix", [
    ("eeg_embedded.set", "auto", ".set"),
    ("eeg_split.set", "auto", ".set"),
    ("eeg_embedded.set", "edf", ".edf"),
    ("eeg_continuous.edf", "eeglab", ".set"),
])
def test_output_format(make_convert_data, run_conversion, recording,
                       output_format, suffix):
    _, root = run_conversion(
        make_convert_data(recording, output_format=output_format))
    assert _recording_file(root, "eeg").suffix == suffix
