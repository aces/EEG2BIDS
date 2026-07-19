"""Shared pytest fixtures for the EEG2BIDS backend suite.

Committed source fixtures live under ``tests/fixtures/`` (small, synthetic,
de-identified inputs; see that directory's README for provenance). Generated
BIDS output always goes to a pytest ``tmp_path`` and is never committed.
"""
from pathlib import Path

import pytest

from eeg2bids.conversion import convert_recording

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="session")
def fixtures_dir():
    """Absolute path to the committed source-fixture directory."""
    return FIXTURES_DIR


@pytest.fixture
def make_convert_data(fixtures_dir, tmp_path):
    """Factory for a complete ``convert_recording`` request payload.

    Fills every field the pipeline (Converter + Modifier) reads with valid
    defaults for a single-run recording, writing output under the test's
    ``tmp_path``. Pass ``modality`` ('eeg'/'ieeg'), ``output_format``, or any
    keyword override; pass ``eeg_runs`` to supply custom run entries (used by
    the events/annotation tests).
    """
    def _make(recording, *, modality="eeg", output_format="auto",
              eeg_runs=None, **overrides):
        path = str(fixtures_dir / recording)
        default_run = {
            "recordingFile": path,
            "eventFile": "",
            "annotationsTSV": "",
            "annotationsJSON": "",
        }
        data = {
            "recordingData": {"files": [{"path": path, "name": recording}]},
            "eegRuns": eeg_runs if eeg_runs is not None else [default_run],
            "modality": modality,
            "taskName": "rest",
            "bids_directory": str(tmp_path / "bids"),
            "participantID": "01",
            "session": "01",
            "read_only": False,
            "line_freq": "60",
            "outputFormat": output_format,
            "preparedBy": "Tester",
            "age": "n/a",
            "sex": "n/a",
            "hand": "n/a",
            "site_id": "S",
            "sub_project_id": "SP",
            "project_id": "P",
            "reference": "n/a",
            "recording_type": "continuous",
            "bidsMetadata": {"metadata": {}, "ignored_keys": []},
        }
        data.update(overrides)
        return data
    return _make


@pytest.fixture
def run_conversion():
    """Run ``convert_recording`` and return ``(result, output_root)``.

    ``output_root`` is the ``output-<timestamp>`` BIDS dataset directory on
    success, or ``None`` when conversion returned an error.
    """
    def _run(data):
        result = convert_recording(data)
        root = None
        if "output_time" in result:
            root = Path(data["bids_directory"]) / result["output_time"]
        return result, root
    return _run
