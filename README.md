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

Dependency versions are defined by `package.json`, `package-lock.json`, and
`requirements.txt`. The Python manifest is transitional and will be replaced
as part of #135.

## Development

There is not yet a complete supported development startup workflow. `npm start`
starts the React and Electron development processes, but backend startup still
requires the process-management work tracked in #135 and #137. Do not use the
removed packaging scripts as a development environment.

Development documentation that remains applicable is under
[`wiki/dev_notes/`](wiki/dev_notes/README.md).
