# Modernization handoff from issue #138

This records the audits performed before removing obsolete infrastructure. It
is not a new packaging or development specification.

## Vendored Python package audit

The removed directories identified themselves as:

| Removed directory | Apparent upstream release | Dependency declaration |
| --- | --- | --- |
| `python/libs/mne/` | MNE 1.0.3 (`mne/_version.py`) | `mne==1.0.3` |
| `python/libs/mne_bids/` | MNE-BIDS 0.10 (`mne_bids/__init__.py`) | `mne-bids~=0.8` |
| `python/libs/bids_validator/` | bids-validator 1.9.3, revision `fd78d856d5b3785456a9eb4659c223f5a15bc512` | `bids-validator==1.9.3` |

Each committed tree was compared byte-for-byte, by relative path, with the
corresponding wheel downloaded from PyPI (`mne==1.0.3`, `mne-bids==0.10`, and
`bids-validator==1.9.3`). Every file was present in its wheel and every file
matched. No local modifications need to be ported. Issue #135 should reconcile
the looser MNE-BIDS declaration with the audited 0.10 code when it creates the
new authoritative Python manifest and lock file.

The first-party modules and `python/libs/edfrw/` remain in place for #135 to
reorganize.

## Dead dependency and scaffolding audit

- `mne-features`: no imports or usage existed outside its requirement entry;
  removed from `requirements.txt`.
- `electron-log`: no source imports or usage existed; removed.
- `src/serviceWorker.js`: only imported to call `unregister()`; both the CRA
  scaffold and call were removed.
- `src/Settings.js` and `react-color`: the only UI entry point was commented
  out and the page contained placeholder text and a color picker with no saved
  or application-visible effect; removed. The obsolete settings-window IPC in
  Electron remains coupled to the runtime and can be retired with #137.
- `src/jsx/socket.io/`: actively imported by `src/App.js`; retained. Issue #136
  should replace or modernize this copied wrapper rather than deleting it.

## Follow-up boundaries

- **#135 (Python):** introduce the supported uv workflow; reconcile and update
  Python dependencies; reorganize first-party conversion modules.
- **#137 (Electron):** replace frozen-backend process startup, obsolete settings
  IPC, `@electron/remote`, `keytar`, preload behavior, and development process
  management before removing those runtime integrations.
- **#136 (renderer):** decide how to replace the copied Socket.IO React wrapper
  during frontend modernization.

Production packages, installers, and embedded Python artifacts remain
unsupported until a packaging design is introduced in a future issue.
