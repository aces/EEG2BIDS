"""Backend package import smoke test.

Confirms the backend package and its submodules import cleanly under the
uv-managed environment before any behavioral coverage runs. This is the
minimal guard that ``uv run pytest`` executes the suite end to end.
"""


def test_package_imports():
    import eeg2bids  # noqa: F401


def test_submodules_import():
    from eeg2bids import BIDS, Modifier, conversion, converter, server  # noqa: F401
