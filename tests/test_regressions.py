"""Regression tests for historical defects.

Each test names the issue it guards and asserts the corrected behavior, so a
reintroduction of the defect fails the suite.
"""
import csv


def _participants(root):
    with open(root / "participants.tsv") as fd:
        return list(csv.DictReader(fd, delimiter="\t"))


def _events(root):
    (path,) = (root / "sub-01" / "ses-01" / "eeg").glob("*_events.tsv")
    with open(path) as fd:
        return list(csv.DictReader(fd, delimiter="\t"))


def test_participant_metadata_preserved(make_convert_data, run_conversion):
    # #145: modify_participants_tsv unpacked each row into a fixed number of
    # positional columns; mne-bids's actual layout (participant_id, age, sex,
    # hand, weight, height) did not match, so every data row raised ValueError,
    # was skipped, and participants.tsv ended up header-only -- which also made
    # the dataset fail BIDS validation (PARTICIPANT_ID_MISMATCH).
    _, root = run_conversion(make_convert_data(
        "eeg_continuous.edf",
        age="25", sex="M", hand="R",
        site_id="MTL", sub_project_id="SubA", project_id="ProjX"))
    rows = _participants(root)
    assert len(rows) == 1
    row = rows[0]
    assert row["participant_id"] == "sub-01"
    assert row["age"] == "25"
    assert row["sex"] == "M"
    assert row["hand"] == "R"
    assert row["site"] == "MTL"
    assert row["subproject"] == "SubA"
    assert row["project"] == "ProjX"


# --- #79: supplied events.tsv rows must not be silently lost ----------------

def test_wide_events_preserved(make_convert_data, run_conversion, fixtures_dir):
    _, root = run_conversion(make_convert_data(
        "eeg_continuous.edf",
        event_file=str(fixtures_dir / "events_wide.tsv")))
    rows = _events(root)
    assert {r["trial_type"] for r in rows} == {"stimulus/A", "stimulus/B"}
    by_type = {r["trial_type"]: r for r in rows}
    assert by_type["stimulus/A"]["value"] == "1"
    assert by_type["stimulus/A"]["sample"] == "128"


def test_narrow_events_preserved_with_na_padding(make_convert_data,
                                                 run_conversion, fixtures_dir):
    _, root = run_conversion(make_convert_data(
        "eeg_continuous.edf",
        event_file=str(fixtures_dir / "events_narrow.tsv")))
    rows = _events(root)
    assert {r["trial_type"] for r in rows} == {"stimulus/A", "stimulus/B"}
    # The narrow layout has no value/sample; they are filled with 'n/a'.
    for row in rows:
        assert row["value"] == "n/a"
        assert row["sample"] == "n/a"


def test_malformed_events_drop_bad_rows_keep_good(make_convert_data,
                                                  run_conversion, fixtures_dir):
    # Valid 3-/5-column rows survive even when unsupported 2-/6-column rows are
    # present in the same file; only the unsupported rows are dropped.
    _, root = run_conversion(make_convert_data(
        "eeg_continuous.edf",
        event_file=str(fixtures_dir / "events_malformed.tsv")))
    trial_types = {r["trial_type"] for r in _events(root)}
    assert trial_types == {"GOOD_WIDE", "GOOD_NARROW"}
    assert "BAD_TWO_COL" not in trial_types
    assert "BAD_SIX_COL" not in trial_types
