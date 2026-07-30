# Installing EEG2BIDS (Linux)

This guide is for **installing and running** the EEG2BIDS desktop application
from a production `.deb` package. It requires no development tooling — Node,
npm, uv, and Python do **not** need to be installed. To build the `.deb`
yourself see [Packaging](../README.md#packaging); to run from a source checkout
see the [development guide](development.md).

## Supported environment

- **Ubuntu 24.04 LTS or newer, amd64** — the primary supported target.
- **Ubuntu 22.04 LTS, amd64** — supported. (The AppArmor sandbox profile the
  installer ships targets a newer AppArmor and is automatically skipped here;
  the app still runs correctly.)
- A **graphical desktop session** (X11 or Wayland).
- A **secret service** — GNOME Keyring or KWallet — if you use the LORIS
  integration. Credentials are encrypted through it; without one the app still
  runs but can only obfuscate saved credentials and will warn you.

Other Debian-family distributions may work but are not verified. Non-amd64
architectures, Windows, and macOS are not yet supported (Windows and macOS are
tracked in #188 and #189).

## Install

```sh
sudo apt install ./eeg2bids_<version>_amd64.deb
```

Using `apt install ./file.deb` (rather than `dpkg -i`) also pulls in any system
dependencies. The application installs to `/opt/EEG2BIDS/`, adds a launcher to
your applications menu, and creates the command `eeg2bids` on your `PATH`.

### The Chromium sandbox is handled for you

Ubuntu 24.04+ restricts the unprivileged user namespaces that Chromium's
sandbox relies on. The installer resolves this during installation — it enables
a setuid sandbox helper only on systems that need it, and installs an AppArmor
profile where supported. **You do not need to run `chown`, `chmod`, edit
AppArmor, or launch with `--no-sandbox`.** The application runs fully sandboxed.

## Launch

From your applications menu (search "EEG2BIDS"), or from a terminal:

```sh
eeg2bids
```

## Upgrade

Install a newer `.deb` the same way; it replaces the previous version and
re-applies the sandbox integration automatically:

```sh
sudo apt install ./eeg2bids_<newer-version>_amd64.deb
```

## Uninstall

```sh
sudo apt remove eeg2bids
```

This removes the installed application under `/opt/EEG2BIDS/`, the `PATH`
command, and the AppArmor profile the installer added (unloading it from the
running kernel).

### Your data is kept

Uninstalling does **not** delete your personal data — your settings and any
saved LORIS credentials live in your user profile
(`~/.config/eeg2bids/`, credentials encrypted via the secret service), not in
the installed package. Remove them yourself if you want a clean slate:

```sh
rm -rf ~/.config/eeg2bids
```

On a **shared computer**, remove saved LORIS credentials from within the app
(or delete `~/.config/eeg2bids/`) after use.

## Troubleshooting

- **The window does not appear / the app exits immediately.** Launch from a
  terminal (`eeg2bids`) to see diagnostics. Sandbox-related failures are logged
  with actionable guidance. Do not work around them with `--no-sandbox`.
- **"Backend unavailable" in the app.** The bundled backend failed to start;
  the status area and terminal output describe why. The backend listens on
  `127.0.0.1:7301`; if another program already uses that port the app assumes an
  externally managed backend.
- **Credentials only obfuscated, not encrypted.** No secret service is
  available in your session; install/enable GNOME Keyring or KWallet.
