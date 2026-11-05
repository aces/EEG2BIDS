"""Backend entry point: ``python -m eeg2bids`` (also what PyInstaller freezes)."""
from eeg2bids.server import main

if __name__ == '__main__':
    main()
