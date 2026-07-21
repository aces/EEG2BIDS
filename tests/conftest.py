"""Shared pytest fixtures for the EEG2BIDS backend suite.

Committed source fixtures live under ``tests/fixtures/`` (small, synthetic,
de-identified inputs; see that directory's README for provenance). Generated
BIDS output always goes to a pytest ``tmp_path`` and is never committed.
"""
import json
import os
import subprocess
from pathlib import Path
from shutil import which

import pytest

from eeg2bids.conversion import convert_recording

FIXTURES_DIR = Path(__file__).parent / "fixtures"

# The current official dataset-level BIDS Validator is the Deno CLI, pinned here
# for reproducibility. It is a required part of the suite: the validator tests
# fail (not skip) when it cannot be run, so a missing validator is a visible
# failure rather than silently-skipped coverage.
BIDS_VALIDATOR_SPEC = "jsr:@bids/validator@3.0.0"


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
    keyword override; pass ``eeg_runs`` to supply custom run entries used by
    the events tests.
    """
    def _make(recording, *, modality="eeg", output_format="auto",
              eeg_runs=None, event_file="", **overrides):
        path = str(fixtures_dir / recording)
        default_run = {
            "recordingFile": path,
            "eventFile": event_file,
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


def _find_deno():
    """Locate the deno executable, on PATH or in the default install dir."""
    found = which("deno")
    if found:
        return found
    for base in (os.environ.get("DENO_INSTALL"), os.path.expanduser("~/.deno")):
        if base:
            candidate = os.path.join(base, "bin", "deno")
            if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
                return candidate
    return None


@pytest.fixture(scope="session")
def bids_validator():
    """Return a callable that runs the official BIDS Validator on a dataset.

    The callable returns the list of error-severity issues (empty when the
    dataset is valid; warnings are ignored). Required: fails with an actionable
    message when deno is unavailable rather than skipping.
    """
    deno = _find_deno()
    if deno is None:
        pytest.fail(
            "The official BIDS Validator CLI is required but 'deno' was not "
            "found. Install it with: curl -fsSL https://deno.land/install.sh "
            "| sh  (the validator itself is fetched on first use via "
            f"'{BIDS_VALIDATOR_SPEC}').")

    def _validate(dataset_root):
        proc = subprocess.run(
            [deno, "run", "-A", BIDS_VALIDATOR_SPEC, str(dataset_root),
             "--json"],
            capture_output=True, text=True)
        try:
            report = json.loads(proc.stdout)
        except json.JSONDecodeError:
            raise RuntimeError(
                "BIDS Validator did not return JSON (exit "
                f"{proc.returncode}).\nstderr tail:\n{proc.stderr[-1500:]}")
        issues = report["issues"]["issues"]
        return [i for i in issues if i.get("severity") == "error"]

    return _validate
