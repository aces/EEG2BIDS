"""Shared fixtures. Source inputs live in ``tests/fixtures/`` (see its README)."""
import json
import os
import subprocess
from pathlib import Path
from shutil import which

import pytest

from eeg2bids.conversion import convert_recording

FIXTURES_DIR = Path(__file__).parent / "fixtures"

# Official BIDS Validator CLI, pinned. Required: tests fail, not skip, without it.
BIDS_VALIDATOR_SPEC = "jsr:@bids/validator@3.0.0"


@pytest.fixture(scope="session")
def fixtures_dir():
    return FIXTURES_DIR


@pytest.fixture
def make_convert_data(fixtures_dir, tmp_path):
    """Factory for a valid single-run request; keyword args override fields."""
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
    """Run ``convert_recording``; return ``(result, output_root or None)``."""
    def _run(data):
        result = convert_recording(data)
        root = None
        if "output_time" in result:
            root = Path(data["bids_directory"]) / result["output_time"]
        return result, root
    return _run


def _find_deno():
    extra = [os.path.join(base, "bin") for base in
             (os.environ.get("DENO_INSTALL"), os.path.expanduser("~/.deno"))
             if base]
    return which("deno") or which("deno", path=os.pathsep.join(extra))


@pytest.fixture(scope="session")
def bids_validator():
    """Callable returning a dataset's error-severity validator issues."""
    deno = _find_deno()
    if deno is None:
        pytest.fail(
            "The official BIDS Validator CLI is required but 'deno' was not "
            "found. Install it with: curl -fsSL https://deno.land/install.sh "
            "| sh  (the validator itself is fetched on first use via "
            f"'{BIDS_VALIDATOR_SPEC}').")

    def _validate(dataset_root):
        proc = subprocess.run(
            [deno, "run", "-A", "--node-modules-dir=auto",
             BIDS_VALIDATOR_SPEC, str(dataset_root), "--json"],
            capture_output=True, text=True,
            # Keep deno's node_modules out of the repo's.
            cwd=os.path.dirname(dataset_root))
        try:
            report = json.loads(proc.stdout)
        except json.JSONDecodeError:
            raise RuntimeError(
                "BIDS Validator did not return JSON (exit "
                f"{proc.returncode}).\nstderr tail:\n{proc.stderr[-1500:]}")
        issues = report["issues"]["issues"]
        return [i for i in issues if i.get("severity") == "error"]

    return _validate
