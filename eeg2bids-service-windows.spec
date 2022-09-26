import sys
sys.setrecursionlimit(sys.getrecursionlimit() * 5)

# -*- mode: python ; coding: utf-8 -*-


block_cipher = None


a = Analysis(
    ['python\\eeg2bids.py'],
    pathex=['python'],
    binaries=[],
    datas=[('python/libs/bids_validator/rules/top_level_rules.json', './bids_validator/rules'), ('python/libs/bids_validator/rules/associated_data_rules.json', './bids_validator/rules'), ('python/libs/bids_validator/rules/file_level_rules.json', './bids_validator/rules'), ('python/libs/bids_validator/rules/phenotypic_rules.json', './bids_validator/rules'), ('python/libs/bids_validator/rules/session_level_rules.json', './bids_validator/rules'), ('python/libs/bids_validator/rules/subject_level_rules.json', './bids_validator/rules'), ('python/libs/bids_validator/tsv/non_custom_columns.json', './bids_validator/tsv'), ('python/libs/mne/channels/data/montages/EGI_256.csd', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/GSN-HydroCel-128.sfp', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/GSN-HydroCel-129.sfp', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/GSN-HydroCel-256.sfp', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/GSN-HydroCel-257.sfp', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/GSN-HydroCel-32.sfp', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/GSN-HydroCel-64_1.0.sfp', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/GSN-HydroCel-65_1.0.sfp', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/artinis-brite23.elc', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/artinis-octamon.elc', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/biosemi128.txt', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/biosemi16.txt', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/biosemi160.txt', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/biosemi256.txt', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/biosemi32.txt', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/biosemi64.txt', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/easycap-M1.txt', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/easycap-M10.txt', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/mgh60.elc', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/mgh70.elc', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/standard_1005.elc', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/standard_1020.elc', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/standard_alphabetic.elc', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/standard_postfixed.elc', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/standard_prefixed.elc', './mne/channels/data/montages'), ('python/libs/mne/channels/data/montages/standard_primed.elc', './mne/channels/data/montages'), ('Lib/site-packages/mne', 'mne'), ('Lib/site-packages/mne_bids', 'mne_bids')],
    hiddenimports=['eventlet.hubs.epolls', 'eventlet.hubs.kqueue', 'eventlet.hubs.selects', 'eventlet.tpool', 'eventlet.event', 'eventlet.greenio', 'eventlet.greenthread', 'eventlet.patcher', 'eventlet.timeout', 'eventlet.six', 'dns', 'dns.dnssec', 'dns.e164', 'dns.hash', 'dns.namedict', 'dns.tsigkeyring', 'dns.update', 'dns.version', 'dns.zone', 'engineio.async_drivers.eventlet'],
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
    [],
    name='eeg2bids-service-windows',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
