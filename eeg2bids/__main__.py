"""Entry point for the EEG2BIDS backend service.

Run with ``python -m eeg2bids`` (or ``uv run python -m eeg2bids``). This module
is also the single entry point a future packaging step (e.g. PyInstaller) would
freeze into the standalone service binary that the Electron app spawns.
"""
from eeg2bids.server import main

if __name__ == '__main__':
    main()
