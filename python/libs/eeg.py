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



class ReadError(PermissionError):
    """Raised when a PermissionError is thrown while reading a file"""
    pass

class WriteError(PermissionError):
    """Raised when a PermissionError is thrown while writing a file"""
    pass

metadata = {
    'eeg': [
        'TaskName',
        'InstitutionName',
        'InstitutionAddress',
        'Manufacturer',
        'ManufacturersModelName',
        'SoftwareVersions',
        'TaskDescription',
        'Instructions',
        'CogAtlasID',
        'CogPOID',
        'DeviceSerialNumber',
        'EEGReference',
        'SamplingFrequency',
        'PowerLineFrequency',
        'SoftwareFilters',
        'CapManufacturer',
        'CapManufacturersModelName',
        'EEGChannelCount',
        'EOGChannelCount',
        'ECGChannelCount',
        'EMGChannelCount',
        'MiscChannelCount',
        'TriggerChannelCount',
        'RecordingDuration',
        'RecordingType',
        'EpochLength',
        'EEGGround',
        'HeadCircumference',
        'EEGPlacementScheme',
        'HardwareFilters',
        'SubjectArtefactDescription',
    ],
    'ieeg': [
        'TaskName',
        'InstitutionName',
        'InstitutionAddress',
        'Manufacturer',
        'ManufacturersModelName',
        'SoftwareVersions',
        'TaskDescription',
        'Instructions',
        'CogAtlasID',
        'CogPOID',
        'DeviceSerialNumber',
        'iEEGReference',
        'SamplingFrequency',
        'PowerLineFrequency',
        'SoftwareFilters',
        'DCOffsetCorrection',
        'HardwareFilters',
        'ElectrodeManufacturer',
        'ElectrodeManufacturersModelName',
        'ECOGChannelCount',
        'SEEGChannelCount',
        'EEGChannelCount',
        'EOGChannelCount',
        'ECGChannelCount',
        'EMGChannelCount',
        'MiscChannelCount',
        'TriggerChannelCount',
        'RecordingDuration',
        'RecordingType',
        'EpochLength',
        'iEEGGround',
        'iEEGPlacementScheme',
        'iEEGElectrodeGroups',
        'SubjectArtefactDescription',
        'ElectricalStimulation',
        'ElectricalStimulationParameters',
    ]
}

# Mapping of substrings to channel types
channel_map = {
    'eeg': 'eeg',
    'eog': 'eog',
    'ecg': 'ecg',
    'ekg': 'ecg',
    'lflex': 'emg',
    'rflex': 'emg',
    'chin': 'emg',
    'trigger': 'stim'
}

class Time:
    def __init__(self):
        now = datetime.now()
        self.latest_output = now.strftime("%Y-%m-%d-%Hh%Mm%Ss")
        
class BaseHandler(abc.ABC):
    def __init__(self, data):
        self.data = data

    def calculate_file_size(self, file):
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(file):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                if not os.path.islink(fp):
                    total_size += os.path.getsize(fp)
        return total_size

    def package_pii(self, files, file_prefix):
        output_filename = os.path.dirname(files[0]) + os.path.sep + file_prefix + '_EEG.tar.gz'
        filesize = sum(self.calculate_file_size(file) for file in files)
        with tarfile.open(output_filename, "w:gz") as tar:
            tar.setTotalSize(filesize)
            for file in files:
                tar.add(file, progress=self.update_progress)
        return output_filename

    def package(self, bids_directory):
        output_filename = bids_directory + '.tar.gz'
        with tarfile.open(output_filename, "w:gz") as tar:
            tar.add(bids_directory, arcname=os.path.basename(bids_directory), progress=self.update_progress, calculateSize=True)

    def update_progress(self, new_progress):
        if self.stage == 'packaging PII':
            self.pii_progress = new_progress
        else:
            self.progress = new_progress

    def set_stage(self, new_stage):
        self.stage = new_stage

    def set_m_info(self, value):
        self.m_info = value

    @abc.abstractmethod
    def read_file(self, file):
        pass

    @abc.abstractmethod
    def convert_to_bids(self):
        pass

    @staticmethod
    def validate(path):
        return os.path.isfile(path)
    




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


class SETHandler(BaseHandler):
    def read_file(self, file):
        try:
            raw = read_raw_eeglab(input_fname=file, preload=False, verbose=True)
            raw = raw.anonymize()
            m_info = raw.info
            self.set_m_info(m_info)
            raw._init_kwargs = {
                'input_fname': file,
                'preload': False,
                'verbose': None
            }
            return raw
        except Exception as ex:
            raise ReadError(ex)

    def convert_to_bids(self):
        print('- SETHandler: convert_to_bids started.')
        data = self.data
        dest_path = os.path.join(data['bids_directory'], data['outputFilename'])
        if os.path.exists(dest_path):
            shutil.rmtree(dest_path)

        for i, eegRun in enumerate(data['eegRuns']):
            raw = self.read_file(eegRun['eegFile'])
            eegRun['eegBIDSBasename'] = self.to_bids(
                fileFormat='set',
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
                write_raw_bids(raw, bids_basename, allow_preload=True, overwrite=False, format="EEGLAB", verbose=False)
            except Exception as ex:
                raise WriteError(ex)

            return bids_basename.basename
        else:
            print('File not found or is not a file: %s', file)

    @staticmethod
    def _populate_back_landmarks(raw, file):
        eeg_mat = pymatreader.read_mat(file)
        urchanlocs_dict = eeg_mat.get('EEG', {}).get('urchanlocs', eeg_mat.get('urchanlocs'))

        nasion_index = urchanlocs_dict['description'].index('Nasion')
        lpa_index = urchanlocs_dict['description'].index('Left periauricular point')
        rpa_index = urchanlocs_dict['description'].index('Right periauricular point')

        nasion_coord = [urchanlocs_dict['X'][nasion_index], urchanlocs_dict['Y'][nasion_index], urchanlocs_dict['Z'][nasion_index]]
        lpa_coord = [urchanlocs_dict['X'][lpa_index], urchanlocs_dict['Y'][lpa_index], urchanlocs_dict['Z'][lpa_index]]
        rpa_coord = [urchanlocs_dict['X'][rpa_index], urchanlocs_dict['Y'][rpa_index], urchanlocs_dict['Z'][rpa_index]]

        new_montage = make_dig_montage(
            ch_pos=raw.get_montage().get_positions()['ch_pos'],
            coord_frame='head',
            nasion=nasion_coord,
            lpa=lpa_coord,
            rpa=rpa_coord
        )
        raw.set_montage(new_montage)

        return nasion_coord, lpa_coord, rpa_coord

    @staticmethod
    def _regenerate_events_file(bids_basename, file):
        events_fpath = os.path.splitext(bids_basename.fpath)[0][:-4] + '_events.tsv'
        eeg_mat = pymatreader.read_mat(file)
        event_dict = eeg_mat.get('EEG', {}).get('event', eeg_mat.get('event'))

        for key in event_dict.keys():
            for idx in range(len(event_dict[key])):
                if isinstance(event_dict[key][idx], np.ndarray) and event_dict[key][idx].size == 0:
                    event_dict[key][idx] = float("NaN")

        with open(events_fpath, 'w') as FILE:
            writer = csv.writer(FILE, delimiter='\t')
            tsv_columns = ["trial_type" if name == "type" else name for name in event_dict.keys()]
            writer.writerow(tsv_columns)
            writer.writerows(zip(*event_dict.values()))
