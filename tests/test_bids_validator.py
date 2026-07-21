"""Dataset-level validation with the official BIDS Validator CLI.

Converts representative EEG and iEEG recordings through the shared pipeline and
runs the current official Deno-based BIDS Validator (pinned in conftest) over
the generated dataset, asserting there are no error-severity issues. Warnings
(recommended-but-absent keys, missing README) are not validity failures and are
ignored.

The validator is a required part of this suite -- see the ``bids_validator``
fixture; when deno is unavailable these tests fail rather than skip.
"""


def test_generated_eeg_dataset_passes_validator(make_convert_data,
                                                run_conversion, bids_validator):
    _, root = run_conversion(
        make_convert_data("eeg_continuous.edf", age="25", sex="M", hand="R"))
    assert root is not None
    errors = bids_validator(root)
    assert errors == [], [e.get("code") for e in errors]


def test_generated_ieeg_dataset_passes_validator(make_convert_data,
                                                 run_conversion,
                                                 bids_validator):
    _, root = run_conversion(
        make_convert_data("ieeg_continuous.edf", modality="ieeg",
                          age="25", sex="M", hand="R"))
    assert root is not None
    errors = bids_validator(root)
    assert errors == [], [e.get("code") for e in errors]


def test_merged_embedded_and_external_events_pass_validator(
        make_convert_data, run_conversion, bids_validator, fixtures_dir):
    _, root = run_conversion(make_convert_data(
        "eeg_events.set",
        event_file=str(fixtures_dir / "events_custom.tsv"),
        age="25", sex="M", hand="R"))
    assert root is not None
    errors = bids_validator(root)
    assert errors == [], [e.get("code") for e in errors]
