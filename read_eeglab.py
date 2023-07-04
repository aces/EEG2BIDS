import csv
import os
from os.path import dirname
from os.path import join as pjoin
import numpy as np
from eeglabio.utils import cart_to_eeglab
from numpy.core.records import fromarrays
from scipy.io import savemat
from mne.io.eeglab.eeglab import _check_load_mat
import mne
from mne.export._eeglab import _get_als_coords_from_chs
from mne.utils.check import _check_fname
import numpy
import pymatreader
import scipy.io as sio
from mne_bids import BIDSPath, write_raw_bids
from mne_bids.dig import _write_dig_bids

f = '/Users/lfesselier/MCIN/TIDCC0066_998651_V02_RS.set'
#eeg = sio.loadmat(f, matlab_compatible = True)
#events = eeg['EEG']['event']
#print(events)
#eeg['EEG'][0][0][15] = "TIDCC0066_998651_V02_RS.fdt"
#print(sorted(mat_contents.keys()))
#print(mat_contents)
#sio.savemat(file_name=f, mdict=eeg, appendmat=False)
#print(eeg['EEG'][0][0][15])

#print(sorted(mat_contents.keys()))

#print(eeg['EEG'])
#eeg = eeg.get('EEG', eeg)
#print(eeg)


class WriteError(PermissionError):
    """Raised when a PermissionError is thrown while writing a file"""
    pass

def _populate_back_landmarks(raw, file):
  """
  This function is used to circumvent a bug in the mne.read_raw_eeglab function present across
  all version of mne, including 1.0.0 (latest version tested). For some reason, the landmarks
  (nasion, left periauricular point, right periauricular point) are not being properly read
  from the EEGLAB structure. This function fetches directly those landmark coordinates via
  the pymatreader library and reinsert them into the raw MNE structure.

  See development on https://github.com/mne-tools/mne-python/issues/10474 for more information

  :param raw: MNE-PYTHON raw object
  :param file: path to the EEG.set file
  """

  # read the EEG matlab structure to get the nasion, lpa and rpa locations
  eeg_mat = pymatreader.read_mat(file)
  urchanlocs_dict = None
  if 'EEG' in eeg_mat.keys() and 'urchanlocs' in eeg_mat['EEG'].keys():
      urchanlocs_dict = eeg_mat['EEG']['urchanlocs']
  elif 'urchanlocs' in eeg_mat.keys():
      urchanlocs_dict = eeg_mat['urchanlocs']

  # get the indices that should be used to fetch the coordinates of the different landmarks
  nasion_index = urchanlocs_dict['description'].index('Nasion')
  lpa_index = urchanlocs_dict['description'].index('Left periauricular point')
  rpa_index = urchanlocs_dict['description'].index('Right periauricular point')

  # fetch the coordinates of the different landmarks
  nasion_coord = [
      urchanlocs_dict['X'][nasion_index],
      urchanlocs_dict['Y'][nasion_index],
      urchanlocs_dict['Z'][nasion_index]
  ]
  lpa_coord = [
      urchanlocs_dict['X'][lpa_index],
      urchanlocs_dict['Y'][lpa_index],
      urchanlocs_dict['Z'][lpa_index]
  ]
  rpa_coord = [
      urchanlocs_dict['X'][rpa_index],
      urchanlocs_dict['Y'][rpa_index],
      urchanlocs_dict['Z'][rpa_index]
  ]

  # create the new montage with the channels positions and the landmark coordinates
  ras_montage = mne.channels.make_dig_montage(
      ch_pos=raw.get_montage().get_positions()['ch_pos'],
      coord_frame='head',
      nasion=nasion_coord,
      lpa=lpa_coord,
      rpa=rpa_coord
  )
  raw.set_montage(ras_montage)  # set the new montage in the raw object

  return nasion_coord, lpa_coord, rpa_coord




def _regenerate_events_file(bids_basename, file):

  # events_fpath = os.path.splitext(bids_basename.fpath)[0].removesuffix('_eeg') + '_events.tsv'
  events_fpath = os.path.splitext(bids_basename.fpath)[0][:-4] + '_events.tsv'

  # read the EEG matlab structure to get the detailed events
  eeg_mat = pymatreader.read_mat(file)
  event_dict = None
  if 'EEG' in eeg_mat.keys() and 'event' in eeg_mat['EEG'].keys():
      event_dict = eeg_mat['EEG']['event']
  elif 'event' in eeg_mat.keys():
      event_dict = eeg_mat['event']

  # convert empty arrays into None
  for key in event_dict.keys():
      print(type(event_dict[key]))
      for idx in range(0, len(event_dict[key]), 1):
          if isinstance(event_dict[key][idx], numpy.ndarray) and event_dict[key][idx].size == 0:
              event_dict[key][idx] = float("NaN")

  with open(events_fpath, 'w') as FILE:
      writer = csv.writer(FILE, delimiter='\t')
      tsv_columns = ["trial_type" if name == "type" else name for name in event_dict.keys()]
      writer.writerow(tsv_columns)
      writer.writerows(zip(*event_dict.values()))


file="/Users/lfesselier/MCIN/TIDCC0066_998651_V02_RS.set"
#file="/Users/lfesselier/MCIN/DCC090_587630_V1_RS/sub-DCC090/ses-V1/eeg/sub-DCC090_ses-V1_task-RS_acq-eeg_run-01_eeg.set"
raw = mne.io.read_raw_eeglab(input_fname=file, preload=False, verbose=True)
#print(raw)
#print(raw.annotations)
##print(len(raw.annotations))
#print(set(raw.annotations.duration))
#print(set(raw.annotations.description))
#print(raw.annotations.onset[0])
# anonymize --
# info['meas_date'], will be set to January 1ˢᵗ, 2000
# birthday will be updated to match age
# refer to documentation on mne.io.anonymize_info
raw = raw.anonymize()

# for set files, the nasion, lpa and rpa landmarks are not properly read from
# EEGLAB files so manually editing them
nasion_coord, lpa_coord, rpa_coord = _populate_back_landmarks(raw, file)

m_info = raw.info
#print(m_info['dig'])
#print(m_info['dig'])
print(raw.info['chs'][0])
print('0')

raw._init_kwargs = {
    'input_fname': file,
    'preload': False,
    'verbose': None
}

ch_types = {}
for ch in raw.ch_names:
  ch_name = ch.lower()
  if 'eeg' in ch_name:
      ch_types[ch] = 'eeg'
  elif 'eog' in ch_name:
      ch_types[ch] = 'eog'
  elif 'ecg' in ch_name or 'ekg' in ch_name:
      ch_types[ch] = 'ecg'
  elif 'lflex' in ch_name or 'rflex' in ch_name or 'chin' in ch_name:
      ch_types[ch] = 'emg'
  elif 'trigger' in ch_name:
      ch_types[ch] = 'stim'
  else:
    ch_types[ch] = 'eeg'

raw.set_channel_types(ch_types)

m_info['subject_info'] = {
'his_id': 'DCC090'
}
subject = m_info['subject_info']['his_id'].replace('_', '').replace('-', '').replace(' ', '')

line_freq = None
raw.info['line_freq'] = line_freq

path = '/Users/lfesselier/MCIN/DCC090_587630_V1_RS'
os.makedirs(path, exist_ok=True)
bids_directory = path
bids_root = bids_directory

bids_basename = BIDSPath(subject='DCC090', task='RS', root=bids_root, acquisition='eeg', run='01')
bids_basename.update(session='V1')

try:
    #write_raw_bids(raw, bids_basename, allow_preload=False, overwrite=False, verbose=False)
    # SET files generated by write_raw_bids are corrupted and need to be recreated using
    # the export function of the mne library.
    # For more information, see https://github.com/mne-tools/mne-bids/issues/991
    #mne.export.export_raw(fname=bids_basename.fpath, raw=raw, fmt='eeglab', overwrite=True)

    #eeg = sio.loadmat(bids_basename.fpath)
    #eeg['event'] = events
    #sio.savemat(file_name=bids_basename.fpath, mdict=eeg, appendmat=False)

    #_regenerate_events_file(bids_basename, file)

    # Code from eeglabio/raw.py, export_set
    fname = str(bids_basename.fpath)
    ch_names = raw.ch_names
    sfreq = raw.info['sfreq']

    print(raw.info['chs'][0])

    ch_locs = _get_als_coords_from_chs(raw.info['chs'])

    print(ch_locs[0])
    print('1')

    ref_channels = "common"
    data = raw.get_data(picks=ch_names)
    data = data * 1e6  # convert to microvolts

    # channel types
    ch_types = np.repeat('', len(ch_names))

    if ch_locs is not None:
        # get full EEGLAB coordinates to export
        full_coords = cart_to_eeglab(ch_locs)

        print(full_coords[0])
        print('2')

        # convert to record arrays for MATLAB format
        chanlocs = fromarrays(
            [ch_names, *full_coords.T, ch_types],
            names=["labels", "X", "Y", "Z", "sph_theta", "sph_phi",
                   "sph_radius", "theta", "radius",
                   "sph_theta_besa", "sph_phi_besa", "type"])
        print(chanlocs[0])
        print('3')
    else:
        chanlocs = fromarrays([ch_names, ch_types], names=["labels", "type"])
        print(chanlocs[0])
        print('4')

    eeg_d = dict(data=data, setname=fname, nbchan=data.shape[0],
                 pnts=float(data.shape[1]), trials=1, srate=sfreq, xmin=0.0,
                 xmax=float(data.shape[1] / sfreq), ref=ref_channels,
                 chanlocs=chanlocs, icawinv=[], icasphere=[], icaweights=[])

    d =  _check_load_mat(file, False)

    # convert annotations to events
    if raw.annotations is not None:
        a_names = list(d.event.keys())
        a_data = list(d.event.values())
        events = fromarrays(a_data, names=a_names)
        eeg_d['event'] = events

    savemat(str(fname), eeg_d, appendmat=False)


    bids_basename.update(datatype='eeg')
    ch_pos = dict(zip(ch_names, ch_locs.tolist()))

    als_montage = mne.channels.make_dig_montage(
      ch_pos=ch_pos,
      coord_frame='ctf_head',
      nasion=nasion_coord,
      lpa=lpa_coord,
      rpa=rpa_coord
    )
    _write_dig_bids(bids_basename, raw, als_montage, False, False)

except Exception as ex:
    print('Exception ex:')
    print(ex)
    raise WriteError(ex)

print('finished')