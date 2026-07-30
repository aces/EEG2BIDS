# Linux production packaging — design draft (issue #170)

**Status:** draft / proposal. Nothing here is committed to yet. This document
exists to pressure-test an approach before we write build config, and to record
*why* each choice was made so the Windows (#188) and macOS (#189) follow-ups can
reuse the reasoning instead of rediscovering it.

Read this alongside the issue text of #170. Where the issue says *what* must be
true, this doc proposes *how*, and argues the trade-offs.

---

## 1. What we're actually building

Today EEG2BIDS only runs from a source checkout. A developer runs `uv sync`,
`npm ci`, `npm run dev`, and Electron launches the Python backend with
`uv run --frozen python -m eeg2bids`. That is three separate toolchains (Node,
uv, a Python interpreter) all assumed to be present, plus the repo itself on
disk.

A *production install* has to collapse all of that into one artifact a
non-technical user can install and launch, with **none** of Node, npm, uv, or a
managed Python environment present on their machine. So there are really three
sub-problems stacked on top of each other:

1. **Freeze the Python backend** into something that runs without uv or a
   Python interpreter.
2. **Bundle** that frozen backend + the Electron app + the renderer build into
   one installable package.
3. **Solve the Chromium sandbox** on modern Ubuntu, which a plain bundle does
   *not* solve on its own — this is the part that makes #170 hard rather than
   routine.

Everything below is organized around those three.

---

## 2. Key concepts (so the rest of the doc makes sense)

If you already know these, skip to §3.

- **Electron** = Chromium (the "renderer", i.e. our React UI) + a Node.js "main"
  process. Our main process also owns a *third* process: the Python backend.
- **The Chromium sandbox** is a security feature: Chromium runs the renderer in
  a locked-down child process that can't touch the filesystem or network
  directly. On Linux this relies on the kernel's **unprivileged user
  namespaces** feature.
- **AppArmor** is a Linux mandatory-access-control system. **Ubuntu 23.10+ /
  24.04+ ships a profile that restricts unprivileged user namespaces by
  default.** That restriction is what breaks Electron's sandbox on a fresh
  machine — Chromium tries to create a user namespace, the kernel refuses, and
  Electron aborts. This is the exact failure #155 documented for development.
- **The two legitimate fixes** (both endorsed by Electron's docs):
  1. A **setuid `chrome-sandbox` helper** — a small root-owned binary shipped
     inside Electron, mode `4755`, that Chromium calls to set up the sandbox
     with elevated privileges. This is the classic fix.
  2. An **AppArmor profile** installed for the app's binary that explicitly
     grants it the `userns` capability. This is Ubuntu's newer, preferred fix.
  We must do one of these *from the installer*, because a normal user can't be
  asked to `chmod 4755` a file or write an AppArmor profile by hand (that's the
  dev-only workaround #155 rejected for end users).
- **asar** = Electron's archive format; the app's JS/HTML get packed into one
  `app.asar` file inside the install. Native binaries and our frozen Python must
  be marked as "unpacked" so they stay as real files on disk (you can't exec a
  file that lives inside an archive).
- **PyInstaller** = a tool that freezes a Python program + its interpreter + all
  its libraries into a self-contained folder or single executable.
- **safeStorage** = Electron's OS-backed encrypted storage; on Linux it uses the
  desktop **secret service** (GNOME Keyring / KWallet) via libsecret. We already
  use it for LORIS credentials and must keep using it.

---

## 3. Decision 1 — how to ship the Python backend

**Recommendation: PyInstaller freeze, in one-directory (`--onedir`) mode,
spawned as a bundled executable.**

### The options considered

| Option | What it means | Verdict |
|---|---|---|
| **PyInstaller `--onedir`** | Freeze `python -m eeg2bids` into a folder containing a launcher binary + all libs. Ship the folder. | **Chosen.** |
| PyInstaller `--onefile` | Same, but one self-extracting exe. | Rejected — it unpacks to a temp dir on every launch (slow, ~200 MB extract each start, AV-unfriendly on Windows later). `--onedir` starts fast and is what we'd want cross-platform anyway. |
| Bundle uv + a locked venv + a private Python | Ship uv and run `uv run` against a pre-materialized venv inside the package. | Rejected — heavier, still effectively ships a Python install, and reimplements what freezing does. The issue also says users must not need uv *or* `uv sync`; bundling uv invites exactly that machinery. |
| Rewrite the backend as a bundled service some other way | e.g. Nuitka. | Out of scope — PyInstaller is already a declared, resolvable build dep in `pyproject.toml` (`packaging` group, currently pinned `pyinstaller>=6`, resolves to 6.21). Don't add a new toolchain. |

### Why this is the riskiest decision, and how we de-risk it first

The backend pulls **MNE, NumPy, and SciPy** — heavy scientific packages with
compiled extensions and data files that PyInstaller is historically fiddly
with (it misses "hidden imports" and non-code data files it can't statically
see). Frozen size will be large: SciPy alone is ~94 MB, NumPy ~34 MB, MNE
~22 MB in the current venv, so expect a **200–400 MB** frozen backend before
compression.

**Therefore the very first task in the plan (§8, Phase 0) is a throwaway spike:**
freeze the backend, run it standalone, and run the existing pytest suite
against the frozen binary's behavior. If MNE won't freeze cleanly, we want to
know that in an afternoon, not after we've built the whole installer around it.

Known things we'll almost certainly need in the PyInstaller spec:
- `--collect-all mne`, `--collect-all mne_bids` (they ship data files / lazy
  imports).
- hidden imports for `socketio`, `engineio`'s async drivers, `simple_websocket`.
- confirm `edfio`, `eeglabio`, `pybv`, `bids-validator` (ships a JS schema? —
  check) come across with their data.

### The single entry point already exists

`eeg2bids/__main__.py` is already written to be the freeze target — its
docstring literally says so. It calls `server.main()`. The backend already reads
its port from `EEG2BIDS_BACKEND_PORT` and watches `EEG2BIDS_OWNER_PID` to avoid
being orphaned. **So the backend needs no code changes to be frozen** — only the
build config and how Electron launches it change (§5).

---

## 4. Decision 2 — Linux package format + the sandbox

**Recommendation: build a `.deb` with `electron-builder`, and use the Debian
maintainer scripts (`postinst`/`prerm`) to install an AppArmor profile
(primary) with the setuid `chrome-sandbox` helper as the fallback mechanism.**

### Why a `.deb` and not the alternatives

The format choice is dictated almost entirely by the sandbox requirement,
because **only a format with install-time hooks can fix the sandbox.**

| Format | Has an install step that can run as root? | Verdict |
|---|---|---|
| **`.deb`** | Yes — `postinst`/`prerm` scripts run as root at install/remove. | **Chosen.** We can install the AppArmor profile and chmod the helper, and cleanly remove them on uninstall. |
| **AppImage** | **No.** It's a single file the user just runs; nothing runs as root, ever. | **Rejected — and the issue explicitly warns about this.** AppImage on Ubuntu 24.04 hits the exact sandbox failure with no way to fix it short of `--no-sandbox`, which is forbidden. |
| **Snap** | Yes, and the snap runtime *manages sandboxing for you.* | Strong contender, but its confinement is the problem: a snap can't freely read EEG files from arbitrary paths the user picks, and secret-service (safeStorage) access needs specific interfaces/plugs. It changes our filesystem and credentials story significantly. Worth revisiting, but more moving parts than a `.deb` for a first supported target. |
| **Flatpak** | Yes, runtime-sandboxed. | Same confinement trade-offs as Snap, plus portal-based file access. Same "revisit later" bucket. |
| **`.rpm`** | Yes (scriptlets). | Fine mechanism, wrong first audience — our documented target is Ubuntu. electron-builder can emit `.rpm` later from the same config. |

Rationale in one sentence: **AppImage is out because it can't fix the sandbox;
Snap/Flatpak *over*-fix it in a way that fights our file-access and credential
needs; `.deb` gives us exactly the root install hook we need and nothing we
don't.**

### How the sandbox actually gets fixed (the core of #170)

electron-builder, when it packages, ships Chromium's `chrome-sandbox` helper. On
a plain unpacked install it's the wrong owner/mode and Ubuntu's userns
restriction blocks the fallback. Our `postinst` does the two-part fix:

1. **Install an AppArmor profile** targeting the app's *stable installed binary
   path* (e.g. `/opt/EEG2BIDS/eeg2bids`). The profile grants that exact binary
   the `userns` capability so Chromium's normal (unprivileged) sandbox works
   under Ubuntu 24.04's policy. Reload AppArmor. This is the modern, preferred
   fix and avoids setuid entirely on machines where it's honored.
2. **As the robust fallback**, `chown root:root` the bundled `chrome-sandbox`
   and `chmod 4755` it, so the setuid path works where the AppArmor route
   doesn't apply.

`prerm`/`postrm` on uninstall: remove the AppArmor profile we installed, reload
AppArmor, and let the package manager remove the files it owns. **We only touch
policy we installed — we never disable AppArmor globally and never touch the
host-wide `kernel.apparmor_restrict_unprivileged_userns` sysctl.** Both of those
are explicitly forbidden by the issue and would weaken the whole machine.

Non-negotiables this respects (straight from the issue's security section):
- No `--no-sandbox`.
- No globally disabling the userns restriction.
- The setuid helper is narrowly scoped, root-owned, mode `4755`, and validated
  during package testing.
- The AppArmor profile targets the stable installed path and is installed *and
  removed* through the package lifecycle.
- Renderer keeps `sandbox: true` + context-isolated preload (already true in
  `windows.js`), and credentials stay on `safeStorage`.

### Install location

`/opt/EEG2BIDS/` for the app payload (Electron + frozen Python + renderer
`build/`), a `.desktop` launcher in `/usr/share/applications/`, and a symlink or
wrapper in `/usr/bin`. A stable, predictable path matters specifically because
the AppArmor profile is written against it — if the binary path moves between
versions, the profile silently stops matching and the sandbox breaks. So the
path is part of the security contract, not just a preference.

---

## 5. Runtime code changes (dev-vs-packaged)

Three places currently assume a source checkout. Each needs a packaged branch,
keyed off Electron's `app.isPackaged` (true in a built app, false from a
checkout) rather than the current `DEV` env var alone.

1. **`electron/main/backend-service.js`** — today:
   ```js
   const REPO_ROOT = path.join(__dirname, '../..');
   child = spawn('uv', ['run', '--frozen', 'python', '-m', 'eeg2bids'], { cwd: REPO_ROOT, ... });
   ```
   Packaged: spawn the **frozen backend executable** from the unpacked resources
   dir (e.g. `process.resourcesPath/backend/eeg2bids`), no uv, no `cwd` on the
   repo. Keep passing `EEG2BIDS_OWNER_PID` and `EEG2BIDS_BACKEND_PORT` exactly as
   now — that contract doesn't change. The "port already in use → assume
   external backend" logic stays and is still useful.

2. **`electron/main/windows.js`** — the renderer URL and the allowed-URL check
   both compute `../../build/index.html`. In a packaged app the renderer lives
   inside resources; resolve it relative to `process.resourcesPath` (or via the
   asar path) instead of `__dirname/../..`.

3. **Dev/prod signal** — right now the only switch is `process.env.DEV`.
   Introduce `app.isPackaged` as the real signal; `DEV` stays as the
   dev-server override. (Dev = load `localhost:3000`; packaged = load the
   bundled build; there's no "packaged but dev-server" case.)

**One cross-platform bug to flag now, even though it's not a Linux blocker:**
`backend-service.js` terminates the backend with `process.kill(-pid, ...)` on a
`detached` process group. That negative-pid / process-group trick is
**POSIX-only** — it works on Linux and macOS but **not on Windows**, so #188 will
have to add a Windows teardown path (job objects or `taskkill /T /F`). The
Python-side `EEG2BIDS_OWNER_PID` watchdog is already cross-platform, so the
backend won't orphan even if the Electron-side kill is weaker on Windows — but
the clean-shutdown guarantee needs Windows-specific work. Noting it here so
#170's "shared architecture" doesn't accidentally bake in a POSIX assumption the
follow-ups inherit silently.

---

## 6. The build pipeline (reproducible, from lockfiles)

The issue requires a reproducible build from the **authoritative npm and uv
lockfiles** (`package-lock.json`, `uv.lock`). Proposed sequence, wrapped in one
script (e.g. `tools/build-linux.sh`) and later a package.json `dist:linux`
script:

```
1.  uv sync --frozen --group packaging      # exact backend deps + pyinstaller
2.  uv run pyinstaller <spec>               # freeze backend  -> dist/backend/
3.  npm ci                                   # exact frontend deps
4.  npm run build                            # vite renderer   -> build/
5.  electron-builder --linux deb             # bundle 1+3+4    -> dist/*.deb
        (electron-builder config: mark dist/backend as an unpacked
         extraResource; wire postinst/prerm; set icon from build/logo512.png;
         set install path /opt/EEG2BIDS; version from a single source)
```

Reproducibility notes / rationale:
- Both `--frozen`/`ci` refuse to touch the lockfiles, so the artifact is pinned.
- **PyInstaller output is not bit-for-bit reproducible by default** (timestamps,
  paths). "Reproducible" here means *"same inputs → functionally identical,
  from committed lockfiles,"* not byte-identical. If byte-identical is later
  required we'd add `SOURCE_DATE_EPOCH` and `--strip`; I'd argue that's a
  #190 (CI) concern, not #170.
- electron-builder is chosen over electron-forge because it emits `.deb` with
  maintainer-script hooks, `.dmg`+notarization, and NSIS/MSI from *one* config —
  which is exactly the shared architecture #188/#189 need. Picking it here is a
  #170 decision with cross-platform consequences, so it's called out
  deliberately.

---

## 7. Lifecycle: install / upgrade / uninstall

- **Install:** dpkg unpacks to `/opt/EEG2BIDS/`; `postinst` installs the
  AppArmor profile + fixes the sandbox helper + reloads AppArmor; `.desktop`
  entry appears.
- **Upgrade / reinstall:** dpkg replaces files; `postinst` re-runs, so the
  sandbox integration is reapplied against the (unchanged, stable) path. Must
  verify the profile still matches after upgrade — this is an explicit
  acceptance criterion.
- **Uninstall:** `prerm`/`postrm` removes the AppArmor profile we installed and
  reloads AppArmor; dpkg removes installer-owned files. **User data** (settings
  + `safeStorage` credentials in the user's config/keyring) is left in place by
  default, with the removal policy documented — deleting someone's saved
  credentials on an uninstall is a surprising, destructive default.
- **No orphaned backend:** already guaranteed by the OWNER_PID watchdog + the
  process-group kill on `will-quit`; the packaged build must preserve both.

---

## 8. Phased implementation plan

Each phase is independently reviewable and de-risks the next.

- **Phase 0 — Freeze spike (throwaway, highest risk first). ✅ DONE — PASSED.**
  `--onedir` froze the backend in ~48s; the frozen binary launches and binds
  `127.0.0.1` in ~3.5s (proving MNE/NumPy/SciPy/MNE-BIDS import, since the
  server imports them transitively at startup). A separate frozen probe
  confirmed the *dynamic* write-time deps import inside a frozen binary with no
  source tree present: `edfio 0.4.14`, `eeglabio 0.1.3`, `pybv 0.8.1`,
  `mne 1.12.1`, plus `socketio`/`engineio`/`simple_websocket` and
  `bids_validator` (schema data bundled). Bundle size **221 MB**. The only
  PyInstaller "missing module" warnings were Windows-only (`winreg`, `win32pdh`,
  `msvc`) or benign optional imports (`typing_extensions`), none of them our
  runtime deps. **Gate cleared — proceed to Phase 1.** The working invocation
  (seed for the Phase 1 `.spec`):

  ```sh
  uv run --frozen --group packaging pyinstaller --noconfirm --onedir \
    --name eeg2bids-backend \
    --collect-all mne --collect-all mne_bids --collect-all bids_validator \
    --collect-submodules socketio --collect-submodules engineio \
    --hidden-import simple_websocket \
    --hidden-import edfio --hidden-import eeglabio --hidden-import eeglabio.utils \
    --hidden-import pybv \
    eeg2bids/__main__.py
  ```

  Not yet exercised (deferred to Phase 4 clean-machine test, not a freeze risk):
  a full end-to-end conversion through the socket.io API, and `simple_websocket`
  actually serving a live upgrade (it's bundled; only the runtime handshake is
  unproven).
- **Phase 1 — Backend build config. ✅ DONE.** Committed
  `tools/eeg2bids-backend.spec` (authoritative, hand-maintained; `.gitignore`
  un-ignores this one path via `!tools/eeg2bids-backend.spec`) and
  `tools/freeze-backend.sh` (syncs the `packaging` group, runs PyInstaller,
  outputs the runnable bundle to the gitignored `dist/eeg2bids-backend/`). The
  spec resolves its entry point from `SPECPATH` so it builds from any checkout
  path, excludes the test toolchain, and disables UPX. Verified: builds in ~41s
  from the committed spec and the resulting binary binds its port.
- **Phase 2 — Electron packaged paths.** Add `app.isPackaged` branches in
  `backend-service.js` and `windows.js`; spawn the frozen binary; load the
  bundled renderer. Verify from a locally-run `electron-builder --dir` (unpacked
  dir, no installer yet).
- **Phase 3 — `.deb` + sandbox.** electron-builder `.deb` target, install path,
  icons, and the `postinst`/`prerm` scripts doing the AppArmor + setuid work.
- **Phase 4 — Clean-machine verification.** Install the `.deb` on a fresh
  Ubuntu 24.04 VM/container with none of Node/npm/uv/Python present. Confirm:
  launches, sandbox on (not `--no-sandbox`), backend converts, credentials
  persist via keyring, quit leaves no python process, upgrade reapplies policy,
  uninstall removes policy. This *is* the acceptance-criteria checklist.
- **Phase 5 — Docs.** Supported distros/arch (Ubuntu 24.04 x86_64 to start),
  desktop/secret-service requirements, and explicit statements of what's *not*
  supported (Wayland-only quirks? non-AppArmor distros? arm64?).

---

## 9. What #188 (Windows) and #189 (macOS) inherit from this

So the follow-ups stay "sparse" as intended, #170 nails down the shared spine:
- The **PyInstaller freeze** of `__main__.py` (same on all three OSes; only the
  spec's platform bits differ).
- **electron-builder** as the packaging tool, one config, per-target sections.
- The **`app.isPackaged` runtime-path pattern** in `backend-service.js` /
  `windows.js`.
- The launch contract (`EEG2BIDS_BACKEND_PORT`, `EEG2BIDS_OWNER_PID`, port-in-use
  → external).

What they must add themselves (and why it can't be shared):
- **Windows (#188):** a real child-process teardown (the POSIX process-group
  kill doesn't exist); installer format (NSIS recommended); **Authenticode code
  signing** (needs a cert — a procurement decision, not code) or users get
  SmartScreen warnings.
- **macOS (#189):** `.dmg`/`.pkg`; **code signing + notarization** (needs an
  Apple Developer ID account — annual cost, org decision) or Gatekeeper blocks
  it on clean machines; hardened runtime; arm64 vs x86_64 (universal binary?).
  Neither Windows nor macOS has the AppArmor/userns problem — the whole §4
  sandbox saga is Linux-specific.

---

## 10. Decisions needed from a human before/while building

These are genuine forks I shouldn't silently pick:

1. **Supported scope for v1:** Ubuntu 24.04 x86_64 only, or also 22.04 / arm64 /
   non-AppArmor distros? (Narrower = faster to a real, *verified* artifact.)
2. **AppArmor profile vs setuid helper as the *primary*** — I've proposed
   "profile primary, setuid fallback." If we'd rather commit to one, that's a
   call to make.
3. **`.deb` first vs invest in Snap/Flatpak** for confinement-managed
   sandboxing. I recommend `.deb` first; Snap is a legitimate alternative if the
   team wants store distribution and can accept the file-access/credential
   confinement work.
4. **Version source of truth:** `package.json` and `pyproject.toml` both say
   `1.0.5` but #191 targets a `3.0.0` release. The build needs one authoritative
   version; where does it live and who bumps it?
5. **Uninstall data policy:** keep user credentials/settings on uninstall
   (proposed) vs purge them. Affects the `postrm` script.

---

## 11. Biggest risks, honestly

- **MNE/SciPy won't freeze cleanly** — the top risk; Phase 0 exists to hit it
  first. Mitigation is `--collect-all` + hidden-imports, but if a compiled dep
  actively resists freezing we may need a different backend-shipping strategy.
- **AppArmor profile doesn't take on some target distro** — userns policy
  differs across distros and even Ubuntu point releases; this is why "supported
  distros" must be *stated and verified*, not assumed.
- **Artifact size** — a 200–400 MB backend makes for a chunky `.deb`. Acceptable
  for a desktop scientific tool, but worth a conscious "yes, that's fine."
- **secret-service on minimal/headless desktops** — safeStorage needs a running
  keyring; on a bare session it may be absent. Needs a documented requirement
  and an actionable error, not a silent credential failure.
