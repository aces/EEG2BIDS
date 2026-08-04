# Linux packaging: clean-machine verification procedure

A repeatable procedure to verify a built EEG2BIDS `.deb` on a **clean** Ubuntu
machine — one with none of Node, npm, uv, or a managed Python ever installed.
Each step maps to an acceptance criterion of
[#170](https://github.com/aces/EEG2BIDS/issues/170). Run it before promoting a
build (e.g. a pre-release) to a supported artifact.

## Test environment

- A **fresh Ubuntu 24.04 LTS (amd64)** virtual machine or container with a
  graphical session — no development tooling installed. A throwaway VM is ideal
  because install, AppArmor, and uninstall changes are then trivially discarded.
- Also run once on **Ubuntu 22.04 (amd64)** to confirm graceful AppArmor
  fallback.
- Copy in only the `.deb` under test (`eeg2bids_<version>_amd64.deb`) and a
  sample EDF recording.

Record the build version and both OS versions with the results.

## Procedure

### 1. Preconditions — the machine is genuinely clean
```sh
command -v node npm uv python3   # expect: no node/npm/uv (python3 may exist)
```
- [ ] Node, npm, and uv are absent.

### 2. Install (criteria: install without dev tooling; no manual sandbox steps)
```sh
sudo apt install ./eeg2bids_<version>_amd64.deb
```
- [ ] Install completes with no error from the post-install script.
- [ ] `/opt/EEG2BIDS/eeg2bids` and `/opt/EEG2BIDS/resources/backend/eeg2bids-backend` exist.
- [ ] `/usr/bin/eeg2bids` resolves.
- [ ] On Ubuntu 24.04: `/etc/apparmor.d/eeg2bids` exists and is loaded
      (`sudo aa-status | grep eeg2bids`). On 22.04: profile skipped, no error.
- [ ] You were **not** asked to run `chown`, `chmod 4755`, or edit AppArmor.

### 3. Launch, sandboxed (criteria: components start; sandbox without `--no-sandbox`)
```sh
eeg2bids          # NO --no-sandbox
```
- [ ] The window opens and renders.
- [ ] The backend status reaches **connected** (the bundled frozen backend
      started — no uv/Python present).
- [ ] The renderer is sandboxed: the process was launched with no `--no-sandbox`
      flag and did not abort with a SUID-sandbox error.

### 4. Convert (criterion: the backend actually works from the install)
- [ ] An EDF→BIDS conversion completes and writes a valid BIDS output.

### 5. No orphaned backend (criterion: clean shutdown)
Close the app window, then:
```sh
pgrep -af eeg2bids-backend    # expect: no output
```
- [ ] No backend process remains after the app exits.

### 6. Upgrade/reinstall keeps the sandbox valid (criterion: upgrade)
Reinstall the same `.deb` (or a newer build) over the existing install:
```sh
sudo apt install --reinstall ./eeg2bids_<version>_amd64.deb
eeg2bids
```
- [ ] Post-install re-runs without error; the AppArmor profile is still present
      and loaded; the app still launches sandboxed and converts.

### 7. Uninstall is clean (criterion: uninstall removes files + security policy)
```sh
sudo apt remove eeg2bids
```
- [ ] `/opt/EEG2BIDS/` is gone.
- [ ] `/usr/bin/eeg2bids` is gone.
- [ ] `/etc/apparmor.d/eeg2bids` is gone and unloaded
      (`sudo aa-status | grep eeg2bids` returns nothing).
- [ ] User data under `~/.config/eeg2bids/` is **retained** (documented policy —
      see the [installation guide](installation.md)).

### 8. Stated limitations hold
- [ ] Behavior on 22.04 matches the documented AppArmor-fallback note.
- [ ] Any environment-specific limitation encountered is recorded and, if new,
      added to the [installation guide](installation.md).

## Result

Record: build version, Ubuntu versions tested, pass/fail per step, and any
deviations. All boxes checked on a clean 24.04 machine (plus the 22.04 fallback
check) satisfies the #170 verification criteria.
