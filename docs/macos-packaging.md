# macOS production packaging

The supported macOS target is **macOS 15 or newer on Apple Silicon (arm64)**.
Intel Macs are not supported. The application is packaged as a drag-to-install
`.dmg` by electron-builder.

The app is **ad-hoc signed and not notarized**. Apple Silicon refuses to run
unsigned code at all, so ad-hoc signing (`mac.identity: "-"`) is the minimum
that launches. It carries no developer identity, so Gatekeeper treats a
downloaded copy as coming from an unidentified developer. Signing with an Apple
Developer ID and notarization are deferred until the project has an Apple
Developer account.

## Build

A macOS package must be built on an Apple Silicon Mac because PyInstaller
produces a platform-native frozen backend:

```sh
npm ci
npm run install:electron
npm run dist:mac
```

The `.dmg` is written to `dist/electron/`. It includes Electron, the renderer,
and the frozen Python backend; users do not need Node, npm, uv, or Python.

`.github/workflows/package.yml` performs this build on a GitHub-hosted
`macos-15` (arm64) runner and uploads the `.dmg` and `SHA256SUMS-macos-arm64` as
workflow artifacts. `release-candidate.yml` publishes them with the Linux and
Windows artifacts (see [Releasing](releasing.md)).

## Installation lifecycle

- Install: open the `.dmg` and drag **EEG2BIDS** to **Applications**.
- First launch: macOS blocks the downloaded app because it is not notarized.
  After the warning, open **System Settings > Privacy & Security** and click
  **Open Anyway** for EEG2BIDS. This is needed once per installed version.
- Upgrade: drag the newer app to **Applications** and replace the old one.
- Uninstall: quit EEG2BIDS and move `/Applications/EEG2BIDS.app` to the Trash.
- User settings and credentials are retained on uninstall, in
  `~/Library/Application Support/eeg2bids/`.
- Saved LORIS credentials are encrypted with the macOS Keychain. Because an
  ad-hoc signature changes with every build, macOS may ask once after an upgrade
  whether EEG2BIDS may access its "eeg2bids Safe Storage" Keychain item. Choose
  **Always Allow**.

The application never disables or bypasses Gatekeeper itself.

## Diagnostics

The installed application writes main-process and captured backend output to:

```text
~/Library/Application Support/eeg2bids/logs/main.log
```

Review and sanitize it before sharing; application code must never log
credentials or clinical data.

## Verification boundary

CI builds the `.dmg` from `package-lock.json` and `uv.lock`, copies the app into
`/Applications`, verifies its code signature, launches it, confirms the managed
backend stays available, quits it, checks that no backend process remains,
generates its checksum, and retains the artifact and logs. A CI-built copy is
never quarantined, so CI does not exercise Gatekeeper. Manual QA covers the
downloaded-file Gatekeeper path, the visible workflow, upgrade, and uninstall
against the exact checksummed artifact.
