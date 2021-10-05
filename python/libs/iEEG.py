import os
import mne
from python.libs import EDF
from mne_bids import write_raw_bids, BIDSPath


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


# TarFile - tarfile the BIDS data.
class TarFile:
    def __init__(self, bids_directory):
        import tarfile
        output_filename = bids_directory + '.tar.gz'
        with tarfile.open(output_filename, "w:gz") as tar:
            tar.add(bids_directory, arcname=os.path.basename(bids_directory))

        #import platform
        #import subprocess
        #if platform.system() == 'Windows':
        #    os.startfile(data['bids_directory'])
        #elif platform.system() == 'Darwin':
        #    subprocess.Popen(['open', data['bids_directory']])
        #else:
        #    subprocess.Popen(['xdg-open', data['bids_directory']])


# Anonymize - scrubs edf header data.
class Anonymize:
    file_path = ''
    header = []

    # data = { file_path: 'path to iEEG file' }
    def __init__(self, file_path):
        self.file_path = file_path

        try:
            # read EDF file from file_path,
            file_in = EDF.EDFReader(fname=self.file_path)
            # read header of EDF file.
            self.header = file_in.readHeader()
            file_in.close()
        except PermissionError as ex:
            raise ReadError(ex)

    def get_header(self):
        return self.header

    def set_header(self, key, value):
        self.header[0][key] = value

    def make_copy(self, new_file):
        header = self.get_header()
        file_in = EDF.EDFReader(fname=self.file_path)
        file_out = EDF.EDFWriter()
        file_out.open(new_file)
        file_out.writeHeader(header)
        meas_info = header[0]
        for i in range(meas_info['n_records']):
            data = file_in.readBlock(i)
            file_out.writeBlock(data)
        file_in.close()
        file_out.close()


# Converter - Creates the BIDS output by edf file.
class Converter:
    m_info = ''

    # data = { file_path: '', bids_directory: '', read_only: false,
    # event_files: '', line_freq: '', site_id: '', project_id: '',
    # sub_project_id: '', session: '', subject_id: ''}
    def __init__(self, data):
        print('- Converter: init started.')
        modality = 'seeg'
        if data['modality'] == 'eeg':
            modality = 'eeg'

        for i, eegRun in enumerate(data['eegRuns']):
            eegRun['edfBIDSBasename'] = self.to_bids(
                eeg_run=eegRun,
                ch_type=modality,
                task=data['taskName'],
                bids_directory=data['bids_directory'],
                subject_id=data['participantID'],
                session=data['session'],
                run=((i + 1) if len(data['edfData']['files']) > 1 else None),
                output_time=data['output_time'],
                read_only=data['read_only'],
                line_freq=data['line_freq']
            )

    @staticmethod
    def validate(path):
        if os.path.isfile(path):
            return True
        else:
            print('File not found or is not file: %s', path)
            return False

    @classmethod
    def set_m_info(cls, value):
        cls.m_info = value

    def to_bids(self,
                eeg_run,
                bids_directory,
                subject_id,
                session,
                output_time,
                task='test',
                run=None,
                ch_type='seeg',
                read_only=False,
                line_freq='n/a'):
        file = eeg_run['edfFile']

        if self.validate(file):
            try:
                reader = EDF.EDFReader(fname=file)
            except PermissionError as ex:
                raise ReadError(ex)

            m_info, c_info = reader.open(fname=file)
            self.set_m_info(m_info)

            raw = mne.io.read_raw_edf(input_fname=file)

            if read_only:
                return True

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
                    ch_types[ch] = ch_type

            raw.set_channel_types(ch_types)

            m_info['subject_id'] = subject_id
            subject = m_info['subject_id'].replace('_', '').replace('-', '').replace(' ', '')

            if line_freq.isnumeric():
                line_freq = int(line_freq)
            raw.info['line_freq'] = line_freq

            raw._init_kwargs = {
                'input_fname': file,
                'eog': None,
                'misc': None,
                'stim_channel': 'auto',
                'exclude': (),
                'preload': False,
                'verbose': None
            }

            try:
                os.makedirs(bids_directory + os.path.sep + output_time, exist_ok=True)
                bids_directory = bids_directory + os.path.sep + output_time
                bids_root = bids_directory

                bids_basename = BIDSPath(subject=subject, task=task, root=bids_root, acquisition=ch_type, run=run)
                bids_basename.update(session=session)

                try:
                    write_raw_bids(raw, bids_basename, overwrite=False, verbose=False)
                    with open(bids_basename, 'r+b') as f:
                        f.seek(8)  # id_info field starts 8 bytes in
                        f.write(bytes("X X X X".ljust(80), 'ascii'))
                except Exception as ex:
                    print('Exception ex:')
                    print(ex)

                print('finished')

                return bids_basename.basename

            except PermissionError as ex:
                raise WriteError(ex)

            except Exception as ex:
                print(ex)
        else:
            print('File not found or is not file: %s', file)


# Time - used for generating BIDS 'output' directory
class Time:
    def __init__(self):
        print('- Time: init started.')
        from datetime import datetime
        now = datetime.now()
        self.latest_output = now.strftime("%Y-%m-%d-%Hh%Mm%Ss")
