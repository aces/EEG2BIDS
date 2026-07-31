# Installing EEG2BIDS

Production packages include Electron, the renderer, and the frozen Python
backend. End users do not need Node, npm, uv, or Python. To build a package see
[Packaging](../README.md#packaging); to run from source see the
[development guide](development.md).

## Supported environments

- **Ubuntu 24.04 LTS or newer, amd64** — primary Linux target.
- **Ubuntu 22.04 LTS, amd64** — supported with the installer's AppArmor
  fallback.
- **Windows 11, x64** — installed per-user with NSIS.
- A graphical desktop session.
- On Linux, GNOME Keyring or KWallet is required to encrypt saved LORIS
  credentials. Without a secret service, the app warns that it can only
  obfuscate them.

Other Debian-family distributions may work but are not verified. Other
architectures, older Windows versions, and macOS are not supported.

## Ubuntu

### Install and launch

```sh
sudo apt install ./eeg2bids_<version>_amd64.deb
eeg2bids
```

Using `apt install ./file.deb` also installs system dependencies. EEG2BIDS is
installed under `/opt/EEG2BIDS/`, with an applications-menu launcher and an
`eeg2bids` command.

Ubuntu 24.04+ restricts the user namespaces Chromium's sandbox uses. The
installer configures the sandbox helper and an AppArmor profile where supported.
Do not manually run `chown`, change AppArmor, or use `--no-sandbox`.

### Upgrade and uninstall

Install a newer `.deb` in the same way. It replaces the previous version and
re-applies sandbox integration.

```sh
sudo apt install ./eeg2bids_<newer-version>_amd64.deb
sudo apt remove eeg2bids
```

Uninstall removes package-owned files, commands, and AppArmor policy.

## Windows 11

Download the x64 NSIS installer and its `SHA256SUMS` from the same successful
`Package` workflow artifact. Verify the checksum before installation, then run
the assisted installer. It installs per-user without administrator access and
adds EEG2BIDS to the Start menu.

The initial Windows installer is unsigned. Windows SmartScreen may identify it
as an unrecognized application. Confirm the file came from the project workflow
and that its checksum matches; the application does not disable or bypass
Windows security controls.

Run a newer installer to upgrade in place. Uninstall EEG2BIDS through Windows
**Settings > Apps > Installed apps**.

See [Windows production packaging](windows-packaging.md) for native build,
workflow, lifecycle, diagnostics, and verification details.

## User data and credentials

Uninstalling on either platform retains personal settings and saved LORIS
credentials:

- Linux: `~/.config/eeg2bids/`
- Windows: `%APPDATA%\eeg2bids\`

Remove saved credentials inside the application before uninstalling, especially
on a shared computer. Delete the corresponding profile directory only when you
intend to remove all retained application data.

## Troubleshooting

- **Backend unavailable:** another program may own `127.0.0.1:7301`, or the
  bundled backend failed to start. Use the status indicator and **Restart
  backend** after addressing the cause.
- **Linux launch failure:** run `eeg2bids` in a terminal to see diagnostics. Do
  not use `--no-sandbox`.
- **Windows launch/backend failure:** inspect
  `%APPDATA%\eeg2bids\logs\main.log`; it records main-process and captured
  backend diagnostics. Sanitize logs before sharing them.
- **Linux credentials only obfuscated:** enable GNOME Keyring or KWallet.
