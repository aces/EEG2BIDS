![EEG2BIDS Wizard](wiki/images/logo/EEG2bIDS_Wizard_(converter_tool).jpg)

# EEG2BIDS Wizard

EEG2BIDS Wizard is a GUI for de-identifying EDF data and converting EEG or
iEEG recordings to BIDS. It can use LORIS credentials to retrieve metadata.
Remove saved credentials after using EEG2BIDS on a shared computer.

## Project status

The development environment is being modernized for Linux in [#135](https://github.com/aces/EEG2BIDS/issues/135), [#137](https://github.com/aces/EEG2BIDS/issues/137), and [#136](https://github.com/aces/EEG2BIDS/issues/136).

Production packages, installers, and embedded Python artifacts are currently
**unsupported**. The former PyInstaller and Electron Builder paths have been
retired; no replacement packaging workflow exists yet. Windows and macOS are
not currently supported development targets.

Frontend dependency versions are defined by `package.json` and
`package-lock.json`. The Python backend is defined solely by `pyproject.toml`
and `uv.lock`; these are the only authoritative Python dependency definitions.

## Backend (Python)

The backend is the first-party `eeg2bids` package. It is managed with
[uv](https://docs.astral.sh/uv/) and targets **Python 3.11+**. There is a
single supported workflow:

```sh
uv sync --frozen          # create ./.venv and install the locked dependencies
uv run python -m eeg2bids # start the local Socket.IO service on 127.0.0.1:7301
```

`uv sync` creates a root `.venv`; there is no virtual environment inside the
package directory. Do not add a `requirements.txt` or install dependencies with
`pip` — change `pyproject.toml` and run `uv lock` instead.

The Socket.IO service runs on the standard-threading runtime (Werkzeug +
`simple-websocket`); the previous eventlet runtime has been removed.

## Development

`npm start` starts the React and Electron development processes. Start the
backend separately with `uv run python -m eeg2bids`. Full process management
that launches the backend from Electron is tracked in #137.

Development documentation that remains applicable is under
[`wiki/dev_notes/`](wiki/dev_notes/README.md).

## Packaging

Production packages, installers, and embedded Python artifacts remain
**unsupported** in this branch. The former PyInstaller and Electron Builder
paths have been retired and are not restored here; a replacement is tracked
separately in #136. The backend is structured to keep that door open: it is a
normal importable package with a single entry point (`python -m eeg2bids`,
also exposed as the `eeg2bids` console script), and PyInstaller is declared as
an optional `packaging` dependency group (`uv sync --group packaging`) so a
future freeze step is not blocked.
