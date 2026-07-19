"""Regression tests for historical defects.

Each test names the issue it guards and asserts the corrected behavior, so a
reintroduction of the defect fails the suite.
"""
import csv


def _participants(root):
    with open(root / "participants.tsv") as fd:
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
