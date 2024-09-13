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
    
