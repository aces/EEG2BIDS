import os
import mne
from eeg2bids import EDF
from mne_bids import write_raw_bids, BIDSPath


class ReadError(PermissionError):
    """Raised when a PermissionError is thrown while reading a file"""
    pass


class WriteError(PermissionError):
    """Raised when a PermissionError is thrown while writing a file"""
    pass


def read_raw_recording(path):
    """Open a continuous recording through MNE's generic reader.

    Format selection and companion-file resolution are delegated to
    ``mne.io.read_raw``; the backend keeps no per-format reader table. Raises
    :class:`ReadError` with an actionable message that preserves the underlying
    MNE cause when the input cannot be read as continuous data -- an epoched
    recording, a missing companion file, or an unsupported/malformed source.
    """
    try:
        return mne.io.read_raw(path, verbose='ERROR')
    except PermissionError as ex:
        raise ReadError(ex) from ex
    except Exception as ex:
        message = str(ex)
        if 'read_epochs' in message or 'must be 1 for raw' in message:
            raise ReadError(
                'This recording contains epoched data. EEG2BIDS converts '
                'continuous EEG/iEEG recordings only. Underlying reader '
                'message: ' + message
            ) from ex
        raise ReadError(message) from ex


def infer_channel_type(ch_name):
    """Best-effort channel type from a channel name, or None when unknown.

    Used only as a fallback for channels MNE left as the generic ``eeg``
    default; MNE-provided types are preferred (see ``Converter.to_bids``).
    """
    name = ch_name.lower()
    if 'eeg' in name:
        return 'eeg'
    if 'eog' in name:
        return 'eog'
    if 'ecg' in name or 'ekg' in name:
        return 'ecg'
    if 'lflex' in name or 'rflex' in name or 'chin' in name:
        return 'emg'
    if 'trigger' in name:
        return 'stim'
    return None


# BIDS-compatible source formats mapped to the MNE-BIDS writer that preserves
# them. Used only when the source reader preloads data (so MNE-BIDS re-writes
# rather than copies); a source not listed here is converted to EDF, the
# recommended output when conversion is required. User-facing output-format
# selection is layered on top of this default separately.
_PRESERVE_FORMAT_BY_EXT = {
    '.set': 'EEGLAB',
    '.edf': 'EDF',
    '.vhdr': 'BrainVision',
    '.fif': 'FIF',
}


def default_output_format(source_path):
    """MNE-BIDS output format that preserves ``source_path``'s format.

    Falls back to ``'EDF'`` for sources without a BIDS-compatible in-place
    format, matching the "recommend EDF when conversion is necessary" default.
    """
    ext = os.path.splitext(source_path)[1].lower()
    return _PRESERVE_FORMAT_BY_EXT.get(ext, 'EDF')


# User-selectable output formats for EEG/iEEG, keyed by a case-insensitive
# request token and mapped to the exact MNE-BIDS writer name. 'auto' (preserve
# the source format) is handled separately. FIF is intentionally excluded: it
# is a MEG format and not BIDS-valid for EEG/iEEG.
_OUTPUT_FORMATS = {
    'edf': 'EDF',
    'brainvision': 'BrainVision',
    'eeglab': 'EEGLAB',
}


def is_supported_output_format(requested):
    """True when ``requested`` is ``'auto'`` or a known EEG/iEEG output format."""
    token = (requested or '').lower()
    return token == 'auto' or token in _OUTPUT_FORMATS


def resolve_write_kwargs(raw, source_path, requested_format):
    """Extra ``write_raw_bids`` kwargs that honor the requested output format.

    ``'auto'`` preserves the source: a lazily-read source (e.g. EDF) is copied
    file-as-is (no extra kwargs, so the byte-for-byte EDF path is unchanged); a
    source whose reader preloads (e.g. EEGLAB) is re-written in its own
    BIDS-compatible format. An explicit format forces that format, loading the
    data and converting when it differs from the source.
    """
    token = (requested_format or 'auto').lower()
    if token == 'auto':
        if not raw.preload:
            return {}
        return {'allow_preload': True,
                'format': default_output_format(source_path)}

    target = _OUTPUT_FORMATS[token]
    if not raw.preload and target == default_output_format(source_path):
        # The explicit choice already matches the source; copy it as-is.
        return {}
    raw.load_data()
    return {'allow_preload': True, 'format': target}


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
            eegRun['recordingBIDSBasename'] = self.to_bids(
                eeg_run=eegRun,
                ch_type=modality,
                task=data['taskName'],
                bids_directory=data['bids_directory'],
                subject_id=data['participantID'],
                session=data['session'],
                run=((i + 1) if len(data['recordingData']['files']) > 1 else None),
                output_time=data['output_time'],
                read_only=data['read_only'],
                line_freq=data['line_freq'],
                output_format=data.get('outputFormat', 'auto')
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
                line_freq='n/a',
                output_format='auto'):
        file = eeg_run['recordingFile']

        if self.validate(file):
            # Reading is delegated to MNE's generic dispatcher, which selects
            # the format reader and resolves companion files from the file
            # itself.
            raw = read_raw_recording(file)

            self.set_m_info({'subject_id': subject_id})

            if read_only:
                return True

            # Preserve the channel types MNE resolved from the source. Only
            # channels MNE left as the generic 'eeg' default fall back to
            # name-based inference and, failing that, the user-selected
            # modality (ch_type).
            ch_types = {}
            for ch, mne_type in zip(raw.ch_names, raw.get_channel_types()):
                if mne_type != 'eeg':
                    continue
                inferred = infer_channel_type(ch)
                ch_types[ch] = inferred if inferred is not None else ch_type

            if ch_types:
                raw.set_channel_types(ch_types)

            subject = subject_id.replace('_', '').replace('-', '').replace(' ', '')

            if line_freq.isnumeric():
                line_freq = int(line_freq)
            else:
                line_freq = None

            raw.info['line_freq'] = line_freq

            try:
                os.makedirs(bids_directory + os.path.sep + output_time, exist_ok=True)
                bids_directory = bids_directory + os.path.sep + output_time
                bids_root = bids_directory

                # Name the datatype explicitly (eeg/ieeg) rather than letting
                # MNE-BIDS infer it; inference is ambiguous when the recording
                # carries multiple data-class channel types (e.g. eeg + emg).
                datatype = 'eeg' if ch_type == 'eeg' else 'ieeg'

                bids_basename = BIDSPath(subject=subject, task=task, root=bids_root,
                                         acquisition=ch_type, run=run, datatype=datatype)
                bids_basename.update(session=session)

                # write_raw_bids returns the BIDSPath of the file it actually
                # wrote (with datatype/suffix/extension resolved). The output
                # format (preserve source vs. convert) is resolved from the
                # user's selection; a preserved lazily-read source is copied
                # file-as-is.
                write_kwargs = {'overwrite': False, 'verbose': False}
                write_kwargs.update(
                    resolve_write_kwargs(raw, file, output_format))
                written_path = write_raw_bids(
                    raw, bids_basename, **write_kwargs)

                # write_raw_bids does not anonymize by default, so scrub the
                # subject identification field from the copied EDF header.
                if written_path.extension == '.edf':
                    with open(written_path.fpath, 'r+b') as f:
                        f.seek(8)  # id_info field starts 8 bytes in
                        f.write(bytes("X X X X".ljust(80), 'ascii'))

                print('finished')

                return bids_basename.basename

            except PermissionError as ex:
                raise WriteError(ex) from ex
        else:
            print('File not found or is not file: %s', file)


# Time - used for generating BIDS 'output' directory
class Time:
    def __init__(self):
        print('- Time: init started.')
        from datetime import datetime
        now = datetime.now()
        self.latest_output = now.strftime("%Y-%m-%d-%Hh%Mm%Ss")
