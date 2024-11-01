import abc
import os
import tarfile
import logging

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



# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

class ReadError(Exception):
    """Raised when an error occurs while reading a file"""
    pass

class WriteError(Exception):
    """Raised when an error occurs while writing a file"""
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
    """Utility class for handling time-related operations."""
    def __init__(self):
        from datetime import datetime
        now = datetime.now()
        self.latest_output = now.strftime("%Y-%m-%d-%Hh%Mm%Ss")

class BaseHandler(abc.ABC):
    """
    Abstract base class for EEG data handlers.
    Encapsulates common operations and enforces implementation of format-specific methods.
    """
    def __init__(self, data):
        self.data = data
        self.progress = 0
        self.pii_progress = 0
        self.stage = ''
        self.m_info = None

    def calculate_file_size(self, file):
        """
        Calculate the total size of the given file or directory.
        """
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(file):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                if not os.path.islink(fp):
                    total_size += os.path.getsize(fp)
        return total_size

    def package_pii(self, files, file_prefix):
        """
        Package Personally Identifiable Information (PII) into a tar.gz archive.
        """
        output_filename = os.path.join(os.path.dirname(files[0]), f"{file_prefix}_EEG.tar.gz")
        filesize = sum(self.calculate_file_size(file) for file in files)
        try:
            with tarfile.open(output_filename, "w:gz") as tar:
                for file in files:
                    tar.add(file, arcname=os.path.basename(file), filter=self.progress_filter)
            logging.info(f"Packaged PII into {output_filename}")
            return output_filename
        except Exception as e:
            logging.error(f"Failed to package PII: {e}")
            raise WriteError(e)

    def package(self, bids_directory):
        """
        Package the BIDS directory into a tar.gz archive.
        """
        output_filename = f"{bids_directory}.tar.gz"
        try:
            with tarfile.open(output_filename, "w:gz") as tar:
                tar.add(bids_directory, arcname=os.path.basename(bids_directory))
            logging.info(f"Packaged BIDS directory into {output_filename}")
            return output_filename
        except Exception as e:
            logging.error(f"Failed to package BIDS directory: {e}")
            raise WriteError(e)

    def progress_filter(self, tarinfo):
        """
        Placeholder for progress tracking logic during tarfile operations.
        Currently returns the tarinfo object unmodified.
        """
        return tarinfo

    def update_progress(self, new_progress):
        """
        Update the progress indicators based on the current stage.
        """
        if self.stage == 'packaging PII':
            self.pii_progress = new_progress
        else:
            self.progress = new_progress

    def set_stage(self, new_stage):
        """
        Set the current processing stage.
        """
        self.stage = new_stage

    def set_m_info(self, value):
        """
        Set the measurement info.
        """
        self.m_info = value

    @abc.abstractmethod
    def read_file(self, file):
        """Read the EEG file."""
        pass

    @abc.abstractmethod
    def convert_to_bids(self):
        """Convert the EEG data to BIDS format."""
        pass

    @abc.abstractmethod
    def get_file_info(self, files):
        """Retrieve information about the EEG files."""
        pass

    @staticmethod
    def validate(path):
        """
        Validate that the given path is a file.
        """
        if os.path.isfile(path):
            return True
        else:
            logging.error(f"File not found or is not a file: {path}")
            return False
