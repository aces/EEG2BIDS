"""Regression tests for historical defects.

Each test names the issue it guards and asserts the corrected behavior, so a
reintroduction of the defect fails the suite.
"""
import csv
import json


def _participants(root):
    with open(root / "participants.tsv") as fd:
        return list(csv.DictReader(fd, delimiter="\t"))


def _event_path(root, extension=".tsv"):
    (path,) = (root / "sub-01" / "ses-01" / "eeg").glob(
        f"*_events{extension}")
    return path


def _events(root):
    with open(_event_path(root)) as fd:
        reader = csv.DictReader(fd, delimiter="\t")
        return reader.fieldnames, list(reader)


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
    _, rows = _events(root)
    assert {r["trial_type"] for r in rows} == {"stimulus/A", "stimulus/B"}
    by_type = {r["trial_type"]: r for r in rows}
    assert by_type["stimulus/A"]["value"] == "1"
    assert by_type["stimulus/A"]["sample"] == "128"


def test_narrow_events_preserved_with_na_padding(make_convert_data,
                                                 run_conversion, fixtures_dir):
    _, root = run_conversion(make_convert_data(
        "eeg_continuous.edf",
        event_file=str(fixtures_dir / "events_narrow.tsv")))
    _, rows = _events(root)
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
    _, rows = _events(root)
    trial_types = {r["trial_type"] for r in rows}
    assert trial_types == {"GOOD_WIDE", "GOOD_NARROW"}
    assert "BAD_TWO_COL" not in trial_types
    assert "BAD_SIX_COL" not in trial_types


# --- #184: all time-based markers are represented as BIDS events -----------

def test_embedded_recording_markers_are_written_as_events(make_convert_data,
                                                          run_conversion):
    _, root = run_conversion(make_convert_data("eeg_events.set"))

    _, rows = _events(root)
    assert {row["trial_type"] for row in rows} == {
        "embedded/A", "embedded/B",
    }


def test_external_and_embedded_events_merge_without_losing_data(
        make_convert_data, run_conversion, fixtures_dir):
    _, root = run_conversion(make_convert_data(
        "eeg_events.set",
        event_file=str(fixtures_dir / "events_custom.tsv")))

    columns, rows = _events(root)
    assert columns[:2] == ["onset", "duration"]
    assert {"trial_type", "channel", "provenance"}.issubset(columns)
    assert [row["trial_type"] for row in rows] == [
        "embedded/A", "external/A", "embedded/B", "external/B",
    ]

    by_type = {row["trial_type"]: row for row in rows}
    assert by_type["external/A"]["channel"] == "C3"
    assert by_type["external/A"]["provenance"] == "manual-review"
    assert by_type["embedded/A"]["channel"] == "n/a"
    assert by_type["embedded/A"]["provenance"] == "n/a"


def test_additional_event_columns_are_documented(make_convert_data,
                                                  run_conversion,
                                                  fixtures_dir):
    _, root = run_conversion(make_convert_data(
        "eeg_events.set",
        event_file=str(fixtures_dir / "events_custom.tsv")))

    with open(_event_path(root, ".json")) as fd:
        metadata = json.load(fd)

    for column in ("channel", "provenance"):
        assert column in metadata
        assert isinstance(metadata[column].get("Description"), str)
        assert metadata[column]["Description"]


def test_conversion_generates_no_obsolete_annotation_artifacts(
        make_convert_data, run_conversion, fixtures_dir, tmp_path):
    obsolete_json = tmp_path / "obsolete_annotations.json"
    obsolete_json.write_text('{"Description": "obsolete input"}\n')
    data = make_convert_data("eeg_events.set")
    data["eegRuns"][0].update({
        "annotationsTSV": str(fixtures_dir / "events_custom.tsv"),
        "annotationsJSON": str(obsolete_json),
    })

    _, root = run_conversion(data)

    paths = [path.relative_to(root).as_posix() for path in root.rglob("*")]
    assert ".bidsignore" not in paths
    assert not any(
        path.endswith(("_annotations.tsv", "_annotations.json"))
        for path in paths
    )
