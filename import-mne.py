import mne
import os
from mne_bids import write_raw_bids, BIDSPath

print(mne.sys_info())
file = r'C:\Users\Lae\Documents\test_data\DCC0003_444597_V01_FACE.set'
bids_directory = r'C:\Users\Lae\Documents\test_data'
raw = mne.io.read_raw_eeglab(input_fname=file, preload=False, verbose=True)

os.makedirs(bids_directory + os.path.sep, exist_ok=True)
bids_directory = bids_directory + os.path.sep
bids_root = bids_directory
bids_basename = BIDSPath(subject='001', task='test', root=bids_root, acquisition='eeg', run=None)
bids_basename.update(session='V1')
write_raw_bids(raw, bids_basename, allow_preload=False, overwrite=False, verbose=True)