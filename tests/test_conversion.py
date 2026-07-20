"""Conversion through the shared application pipeline (``convert_recording``).

Drives the full Converter + Modifier pipeline into a temporary directory for
representative EEG and iEEG recordings and each verified input format. Assertions
are focused and structural (output format, datatype, channel types, key sidecar
metadata) rather than whole-dataset snapshots. These tests own EEG2BIDS
orchestration and output policy; they do not re-test MNE's parsers.
"""
import csv
import json

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


# --- representative EEG / iEEG conversion --------------------------------

def test_eeg_edf_conversion_writes_dataset(make_convert_data, run_conversion):
    result, root = run_conversion(make_convert_data("eeg_continuous.edf"))
    assert "output_time" in result
    assert _recording_file(root, "eeg").suffix == ".edf"
    assert (root / "dataset_description.json").exists()
    assert (root / "participants.tsv").exists()


def test_ieeg_edf_conversion_uses_ieeg_datatype(make_convert_data,
                                                run_conversion):
    result, root = run_conversion(
        make_convert_data("ieeg_continuous.edf", modality="ieeg"))
    assert "output_time" in result
    assert _recording_file(root, "ieeg").suffix == ".edf"


# --- verified input formats through the pipeline -------------------------

def test_embedded_set_auto_preserves_set(make_convert_data, run_conversion):
    _, root = run_conversion(make_convert_data("eeg_embedded.set"))
    assert _recording_file(root, "eeg").suffix == ".set"


def test_split_set_auto_preserves_set(make_convert_data, run_conversion):
    # The SET/FDT source is re-written as an EEGLAB dataset under Auto.
    _, root = run_conversion(make_convert_data("eeg_split.set"))
    assert _recording_file(root, "eeg").suffix == ".set"


# --- explicitly selected output formats ----------------------------------

def test_set_converted_to_edf(make_convert_data, run_conversion):
    _, root = run_conversion(
        make_convert_data("eeg_embedded.set", output_format="edf"))
    assert _recording_file(root, "eeg").suffix == ".edf"


def test_edf_converted_to_eeglab(make_convert_data, run_conversion):
    _, root = run_conversion(
        make_convert_data("eeg_continuous.edf", output_format="eeglab"))
    assert _recording_file(root, "eeg").suffix == ".set"


# --- channel types and metadata ------------------------------------------

def test_eeg_channels_typed_eeg(make_convert_data, run_conversion):
    _, root = run_conversion(make_convert_data("eeg_continuous.edf"))
    types = {row["type"] for row in _channels_tsv(root, "eeg")}
    assert types == {"EEG"}


def test_ieeg_channels_typed_seeg(make_convert_data, run_conversion):
    # Names like 'LAmy1' are not name-inferable, so the selected modality
    # (seeg) is applied to channels MNE left as generic eeg.
    _, root = run_conversion(
        make_convert_data("ieeg_continuous.edf", modality="ieeg"))
    types = {row["type"] for row in _channels_tsv(root, "ieeg")}
    assert types == {"SEEG"}


def test_sidecar_metadata_reflects_recording(make_convert_data, run_conversion):
    _, root = run_conversion(make_convert_data("eeg_continuous.edf"))
    sidecar = _sidecar(root, "eeg")
    assert sidecar["SamplingFrequency"] == 256.0
    assert sidecar["PowerLineFrequency"] == 60.0        # from line_freq '60'
    assert sidecar["RecordingType"] == "continuous"


def test_eeg_reference_written_under_correct_key(make_convert_data,
                                                 run_conversion):
    # The reference goes under 'EEGReference'; guard against the old
    # 'EGGReference' misspelling that left the value under a stray key.
    _, root = run_conversion(
        make_convert_data("eeg_continuous.edf", reference="FCz"))
    sidecar = _sidecar(root, "eeg")
    assert sidecar["EEGReference"] == "FCz"
    assert "EGGReference" not in sidecar


def test_ieeg_reference_written_under_correct_key(make_convert_data,
                                                  run_conversion):
    _, root = run_conversion(
        make_convert_data("ieeg_continuous.edf", modality="ieeg",
                          reference="intracranial-ref"))
    sidecar = _sidecar(root, "ieeg")
    assert sidecar["iEEGReference"] == "intracranial-ref"


# --- failures propagate rather than being swallowed ----------------------

def test_epoched_set_conversion_reports_error(make_convert_data,
                                              run_conversion):
    result, root = run_conversion(make_convert_data("eeg_epoched.set"))
    assert root is None
    assert "error" in result
    assert any("continuous" in m for m in result["error"])
