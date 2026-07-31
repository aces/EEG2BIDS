# Development guide

This guide covers the Linux development workflow for EEG2BIDS: launching the
app from a source checkout, debugging it, generating development data, and the
current manual sanity checks. For installation prerequisites (Node, uv, secret
service) see the [README](../README.md). For the canonical automated test
commands and fixture policy, see [Testing](testing.md).

Linux is the supported development target. To build and install the Linux
production `.deb` see [Packaging](../README.md#packaging) and the
[installation guide](installation.md); Windows and macOS production builds are
not yet available (#188, #189).

## Launching

From a clean checkout:

```sh
uv sync --frozen          # backend deps into ./.venv
npm ci                    # frontend deps from the lockfile
npm run dev               # renderer + Electron + Python backend
```

`npm run dev` is the single launch command (`npm start` is an alias). It runs
the Vite dev server and Electron together and shuts both down together —
including on Ctrl+C — so nothing is left running. Electron owns the Python
backend: it launches `uv run --frozen python -m eeg2bids`, forwards its output
to the terminal, reports availability to the renderer, and terminates the
whole process group on shutdown. If `127.0.0.1:7301` is already in use (for
example a manually started backend) Electron reuses it and owns nothing.

The pieces can also run separately:

```sh
npm run dev:renderer       # Vite dev server only (http://localhost:3000)
npm run electron-start     # Electron only (expects the dev server)
uv run python -m eeg2bids  # backend only (127.0.0.1:7301)
```

### Startup failures

- **Node/uv missing or deps not installed** — `npm run dev` fails fast; if the
  backend cannot be launched, the main process logs `[backend] could not
  launch the backend through uv: … Is uv installed and on PATH?` and the
  backend status shows *unavailable*.
- **Port 3000 in use** — Vite exits with `Port 3000 is already in use` and the
  launch aborts (no orphaned Electron).
- **Port 7301 in use by a non-EEG2BIDS program** — the backend prints
  `Port 7301 is in use by another program` and exits.

## Debugging tools

- **Chromium DevTools** open automatically for each window in development.
- **Renderer source maps** and **hot module replacement** are provided by
  Vite; edits to `src/` reload automatically.
- **Python output** appears in the launching terminal, prefixed (see Logging).
- **Restarting the backend** — use the *Restart backend* button in the
  connection indicator (top-right of the app), or from the DevTools console:
  `await window.eeg2bids.restartBackend()`. Restart is a no-op when the
  backend is externally managed. You can also restart a manual backend
  (`uv run python -m eeg2bids`) in its own terminal.
- **React DevTools** are not auto-installed (deferred; not required).

## Logging

Development output identifies its source by prefix:

| Prefix | Source |
| --- | --- |
| `[electron:main]` | Electron main process (lifecycle, IPC handler failures, renderer load failures) |
| `[backend stdout]` / `[backend stderr]` | forwarded Python output |
| `[backend]` | backend process lifecycle (spawn, exit, restart) |
| `[socket]` | renderer Socket.IO transitions (in the DevTools console) |

Credentials are never logged: LORIS passwords, tokens, and decrypted
credentials are excluded from both the Python and Electron output.

## Backend connection states

The indicator in the top-right corner combines the Electron-owned backend
process state with the renderer's Socket.IO state into one of:

- **starting** — backend launching or socket connecting
- **connected** — socket connected; the backend is usable
- **unavailable** — backend failed to launch or exited
- **disconnected** — socket dropped while the backend was up
- **reconnecting** — socket retrying

Operations that require the backend (convert, validate, package) are blocked
with a visible error when the socket is not connected, rather than silently
appearing to succeed.

## Development data

There is no real clinical data in the repository. Generate synthetic,
non-sensitive fixtures (the EDF/EEGLAB export backends they need are regular
runtime dependencies, so no extra group is required):

```sh
uv sync --frozen
uv run python tools/make_dev_data.py
```

This writes to the gitignored `dev-data/` directory:

| Path | What it is |
| --- | --- |
| `eeg_sample.edf` | 8-channel scalp EEG, 256 Hz, 10 s, ~50 µV, line 60 Hz |
| `ieeg_sample.edf` | 6-channel sEEG, 512 Hz, 10 s, ~200 µV, line 60 Hz |
| `eeg_metadata.json` / `ieeg_metadata.json` | representative sidecar parameters |
| `bids_valid/` | a known-valid BIDS dataset (`sub-01 ses-01 task-rest`) |
| `bids_invalid/` | the same, plus one non-BIDS-named file that fails validation |

The data is synthetic (deterministic RNG seed) and safe to regenerate.

## LORIS is optional

The app launches and converts locally without a LORIS instance. LORIS login
is optional; leaving it blank keeps the app fully usable for conversion and
validation. A failed or unreachable LORIS produces a visible login error
(after a 10-second timeout) and does not crash the backend.

## Manual QA

The former provisional Socket.IO and happy-path checks have been reviewed and
consolidated into [Linux manual QA](manual-qa.md). That guide assigns stable
scenario IDs and covers only human-observable value beyond the automated test
baseline, including development and packaged workflows, anonymization,
connection recovery, process cleanup, and release-candidate reporting.
