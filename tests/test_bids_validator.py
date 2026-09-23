"""Dataset-level validation with the official BIDS Validator CLI.

Converts representative EEG and iEEG recordings through the shared pipeline and
runs the current official Deno-based BIDS Validator (pinned in conftest) over
the generated dataset, asserting there are no error-severity issues. Warnings
(recommended-but-absent keys, missing README) are not validity failures and are
ignored.

The validator is a required part of this suite -- see the ``bids_validator``
fixture; when deno is unavailable these tests fail rather than skip.
"""

import pytest


@pytest.mark.parametrize("recording, extra", [
    ("eeg_continuous.edf", {}),
    ("ieeg_continuous.edf", {"modality": "ieeg"}),
    ("eeg_events.set", {"event_file": "events_custom.tsv"}),
], ids=["eeg", "ieeg", "merged-events"])
def test_generated_dataset_passes_validator(recording, extra, make_convert_data,
                                            run_conversion, bids_validator,
                                            fixtures_dir):
    if "event_file" in extra:
        extra = {**extra, "event_file": str(fixtures_dir / extra["event_file"])}
    _, root = run_conversion(make_convert_data(
        recording, age="25", sex="M", hand="R", **extra))
    assert root is not None
    errors = bids_validator(root)
    assert errors == [], [e.get("code") for e in errors]
