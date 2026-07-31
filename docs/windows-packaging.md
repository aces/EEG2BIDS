# Windows production packaging

The initial supported Windows target is **Windows 11 x64**. The application is
packaged as an unsigned, per-user NSIS installer by electron-builder. Signing is
deferred; Windows SmartScreen may therefore identify the download as an
unrecognized application.

## Build

A Windows package must be built on Windows because PyInstaller produces a
platform-native frozen backend:

```powershell
npm ci
npm run install:electron
npm run dist:windows
```

The installer is written to `dist/electron/`. It includes Electron, the renderer,
and the frozen Python backend; users do not need Node, npm, uv, or Python.

`.github/workflows/package.yml` performs this build on a GitHub-hosted Windows
runner and uploads the installer and `SHA256SUMS` as workflow artifacts. It does
not publish releases. The same workflow builds the Linux `.deb`, giving future
release automation one native build interface to consume.

## Installation lifecycle

- The assisted NSIS installer runs per-user and does not request elevation.
- A newer installer upgrades the application in place because releases retain
  the same application ID.
- Uninstall removes installer-owned application files.
- User settings and credentials are retained on uninstall.
- The initial unsigned installer may trigger a SmartScreen warning. Do not
  disable or bypass Windows security controls programmatically; manual QA records
  the warning and the user-visible path explicitly.

## Verification boundary

CI is responsible for reproducibly building the native artifact from
`package-lock.json` and `uv.lock`, generating its checksum, and retaining both
together. Windows manual QA verifies the interactive installer, SmartScreen,
Start menu integration, installed application workflow, upgrade, shutdown, and
uninstall against that exact checksummed artifact.
