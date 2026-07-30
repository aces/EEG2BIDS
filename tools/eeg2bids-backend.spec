# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for freezing the EEG2BIDS backend.

Freezes eeg2bids/__main__.py into a self-contained --onedir bundle so the
Electron app can spawn the backend without uv or a Python interpreter present
on the end user's machine. See docs/linux-packaging-design.md (issue #170).

Build with the wrapper (recommended), which pins output to dist/eeg2bids-backend:

    tools/freeze-backend.sh

or directly:

    uv run --frozen --group packaging pyinstaller --noconfirm \
        --distpath dist tools/eeg2bids-backend.spec

The hidden imports and collect_all calls below exist because these deps are
loaded dynamically and PyInstaller's static analysis cannot see them:
  - edfio / eeglabio / pybv: MNE-BIDS export backends, imported lazily by
    mne-bids only when writing the matching format.
  - socketio / engineio submodules + simple_websocket: the async transport
    stack; the websocket driver is resolved at connection time.
  - mne / mne_bids / bids_validator: ship data files (montages, schema rules)
    that must be collected alongside the code, not just the modules.
This list is the proven output of the issue #170 Phase 0 freeze spike.
"""
import os

from PyInstaller.utils.hooks import collect_all, collect_submodules

# Resolve the entry point relative to this spec's location (SPECPATH is the
# directory containing the spec), so the build works from any CWD and on any
# checkout path — never hard-code an absolute path here.
REPO_ROOT = os.path.abspath(os.path.join(SPECPATH, os.pardir))
ENTRY = os.path.join(REPO_ROOT, 'eeg2bids', '__main__.py')

hiddenimports = [
    'simple_websocket',
    'edfio',
    'eeglabio',
    'eeglabio.utils',
    'pybv',
]
hiddenimports += collect_submodules('socketio')
hiddenimports += collect_submodules('engineio')

datas = []
binaries = []
for _pkg in ('mne', 'mne_bids', 'bids_validator'):
    _datas, _binaries, _hidden = collect_all(_pkg)
    datas += _datas
    binaries += _binaries
    hiddenimports += _hidden

a = Analysis(
    [ENTRY],
    pathex=[REPO_ROOT],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Test toolchain is not part of the shipped backend; excluding it keeps
        # the bundle smaller and avoids pytest's optional imports polluting the
        # freeze. (pytest is a dev-group dep, not runtime.)
        'pytest',
        '_pytest',
    ],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='eeg2bids-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    # UPX is disabled deliberately: it is non-deterministic, provides little
    # benefit for a local desktop tool, and UPX-compressed binaries are a
    # frequent source of antivirus false positives on the Windows target (#188).
    upx=False,
    # The backend is a console service; Electron captures its stdout/stderr.
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='eeg2bids-backend',
)
