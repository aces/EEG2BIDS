["Click Here" to return to the project README.md](../../README.md)

["Click Here" to read React Development](react/README.md)

# Development Introduction

 * EEG2BIDS/src - contains the renderer code:
   * React.js used for GUI components, built with Vite.
   * Socket.io used for messages to python.
 * EEG2BIDS/electron - contains the Electron code:
   * electron/main - the main process (lifecycle, windows, IPC, credentials,
     backend process ownership, external-link policy).
   * electron/preload - the `window.eeg2bids` context bridge, the only
     interface between renderer and main process.
 * EEG2BIDS/eeg2bids - contains the backend code:
   * The service entry point is `python -m eeg2bids` (server.py).
     * EEG to BIDS libraries used.
     * APIs to a LORIS instance.
   * Socket.io used for messages to the GUI.

## LORIS authentication

 * The main process stores a user's LORIS credentials encrypted with
   Electron [safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)
   under the application userData directory. On Linux this needs a secret
   service (GNOME Keyring or KWallet) to be securely encrypted.
 * The frontend passes the credentials to python and where they can be reused for refreshing the user's auth token before making LORIS API requests.

## Things to remember:

 * The development goal is to maintain simple code for new developers to understand and be able to contribute as well.
 * Please comment your code when necessary and possible changes can be requested before merging into the core codebase.
 * Let's build a useful tool together! :)
