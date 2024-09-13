import abc
import csv
import os
import pymatreader
import numpy as np
import shutil
from datetime import datetime
from python.libs import (
    EDF,
    tarfile_progress as tarfile
)

from mne_bids.write import write_raw_bids
from mne_bids.path import BIDSPath
from mne_bids.dig import _write_dig_bids

from mne.export._eeglab import _get_als_coords_from_chs
from mne.io import (
    read_raw_edf,
    read_raw_eeglab
)
from mne.channels import (
    make_dig_montage
)
from basehandler import BaseHandler, ReadError, WriteError, channel_map

class EDFHandler(BaseHandler):
    def read_file(self, file):
        try:
            reader = EDF.EDFReader(fname=file)
            m_info, c_info = reader.open(fname=file)
            self.set_m_info(m_info)
            raw = read_raw_edf(input_fname=file)
            raw._init_kwargs = {
                'input_fname': file,
                'eog': None,
                'misc': None,
                'stim_channel': 'auto',
                'exclude': (),
                'preload': False,
                'verbose': None
            }
            return raw
        except PermissionError as ex:
            raise ReadError(ex)

    def convert_to_bids(self):
        print('- EDFHandler: convert_to_bids started.')
        data = self.data
        dest_path = os.path.join(data['bids_directory'], data['outputFilename'])
        if os.path.exists(dest_path):
            shutil.rmtree(dest_path)

        for i, eegRun in enumerate(data['eegRuns']):
            raw = self.read_file(eegRun['eegFile'])
            eegRun['eegBIDSBasename'] = self.to_bids(
                fileFormat='edf',
                eeg_run=eegRun,
                ch_type='eeg',
                task=eegRun['task'],
                bids_directory=data['bids_directory'],
                subject_id=data['participantID'],
                session=data['session'],
                run=((eegRun['run']) if eegRun['run'] != -1 else None),
                output_time=data['output_time'],
                read_only=data['read_only'],
                line_freq=data['powerLineFreq'],
                outputFilename=data['outputFilename']
            )

    def to_bids(self, **kwargs):
        raw = kwargs['raw']
        file = kwargs['eeg_run']['eegFile']
        if self.validate(file):
            ch_types = {}
            for ch in raw.ch_names:
                ch_name = ch.lower()
                ch_types[ch] = next((ctype for key, ctype in channel_map.items() if key in ch_name), ch_type)

            raw.set_channel_types(ch_types)

            m_info = raw.info
            m_info['subject_info'] = {'his_id': kwargs['subject_id']}
            subject = m_info['subject_info']['his_id'].replace('_', '').replace('-', '').replace(' ', '')

            if kwargs['line_freq'].isnumeric():
                line_freq = int(kwargs['line_freq'])
            else:
                line_freq = None
            raw.info['line_freq'] = line_freq

            root = kwargs['bids_directory'] + os.path.sep + kwargs['outputFilename']
            os.makedirs(root, exist_ok=True)
                
            bids_basename = BIDSPath(
                subject=subject,
                task=kwargs['task'],
                root=root,
                acquisition=kwargs['ch_type'],
                run=kwargs['run'],
                datatype='eeg',
                session=kwargs['session']
            )

            try:
                write_raw_bids(raw, bids_basename, allow_preload=False, overwrite=False, verbose=False)
                with open(bids_basename, 'r+b') as f:
                    f.seek(8)
                    f.write(bytes("X X X X".ljust(80), 'ascii'))
            except Exception as ex:
                raise WriteError(ex)

            return bids_basename.basename
        else:
            print('File not found or is not a file: %s', file)

