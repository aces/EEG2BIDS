import sys
sys.setrecursionlimit(sys.getrecursionlimit() * 5)

# -*- mode: python ; coding: utf-8 -*-


block_cipher = None


a = Analysis(
    ['python/eeg2bids.py'],
    pathex=['python'],
    binaries=[],
    datas=[('python/libs/bids_validator/rules/top_level_rules.json', 'bids_validator/rules'), ('python/libs/bids_validator/rules/associated_data_rules.json', 'bids_validator/rules'), ('python/libs/bids_validator/rules/file_level_rules.json', 'bids_validator/rules'), ('python/libs/bids_validator/rules/phenotypic_rules.json', 'bids_validator/rules'), ('python/libs/bids_validator/rules/session_level_rules.json', 'bids_validator/rules'), ('python/libs/bids_validator/rules/subject_level_rules.json', 'bids_validator/rules'), ('python/libs/bids_validator/tsv/non_custom_columns.json', 'bids_validator/tsv'), ('python/lib/python3.8/site-packages/mne/', 'mne'), ('python/lib/python3.8/site-packages/mne_bids/', 'mne_bids')],
    hiddenimports=['eventlet.hubs.epolls', 'eventlet.hubs.kqueue', 'eventlet.hubs.selects', 'dns', 'dns.dnssec', 'dns.e164', 'dns.hash', 'dns.namedict', 'dns.tsigkeyring', 'dns.update', 'dns.version', 'dns.zone', 'engineio.async_drivers.eventlet', 'json', 'csv'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [('u', None, 'OPTION')],
    name='eeg2bids-service',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
app = BUNDLE(
    exe,
    name='eeg2bids-service.app',
    icon=None,
    bundle_identifier=None,
)
