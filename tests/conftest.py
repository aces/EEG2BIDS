"""Shared pytest fixtures for the EEG2BIDS backend suite.

Committed source fixtures live under ``tests/fixtures/`` (small, synthetic,
de-identified inputs; see that directory's README for provenance). Generated
BIDS output always goes to a pytest ``tmp_path`` and is never committed.
"""
from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="session")
def fixtures_dir():
    """Absolute path to the committed source-fixture directory."""
    return FIXTURES_DIR
