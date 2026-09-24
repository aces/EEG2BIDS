import hashlib
import os
import mne
import numpy as np
from mne_bids import (BIDSPath, get_anonymization_daysback,
                      write_raw_bids)


class ReadError(PermissionError):
    """Raised when a PermissionError is thrown while reading a file"""


class WriteError(PermissionError):
    """Raised when a PermissionError is thrown while writing a file"""


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


# Converter - Creates the BIDS output by edf file.
class Converter:
    @staticmethod
    def _anonymization_daysback(eeg_runs, participant_id):
        """Choose one valid, deterministic date shift for all requested runs."""
        raws = [read_raw_recording(run['recordingFile']) for run in eeg_runs]
        minimum, maximum = get_anonymization_daysback(raws, verbose=False)
        digest = hashlib.sha256(participant_id.encode('utf-8')).digest()
        return minimum + int.from_bytes(digest[:8], 'big') % (maximum - minimum + 1)

    def __init__(self, data):
        self.data = data

    def write_runs(self):
        """Write source runs and return BIDS basenames paired with event files."""
        data = self.data
        modality = 'eeg' if data['modality'] == 'eeg' else 'seeg'

        anonymize = data.get('anonymize', False)
        daysback = None
        if anonymize:
            daysback = self._anonymization_daysback(
                data['eegRuns'], data['participantID'])

        written_runs = []
        for index, eeg_run in enumerate(data['eegRuns']):
            basename = self.to_bids(
                eeg_run=eeg_run,
                ch_type=modality,
                task=data['taskName'],
                bids_directory=data['bids_directory'],
                subject_id=data['participantID'],
                session=data['session'],
                run=((index + 1) if len(data['recordingData']['files']) > 1 else None),
                output_time=data['output_time'],
                line_freq=data['line_freq'],
                output_format=data.get('outputFormat', 'auto'),
                anonymize=anonymize,
                daysback=daysback
            )
            written_runs.append({
                'recordingBIDSBasename': basename,
                'eventFile': eeg_run['eventFile'],
            })
        return written_runs

    def to_bids(self,
                eeg_run,
                bids_directory,
                subject_id,
                session,
                output_time,
                task,
                run,
                ch_type,
                line_freq,
                output_format,
                anonymize,
                daysback):
        source_path = eeg_run['recordingFile']

        if not os.path.isfile(source_path):
            raise ReadError(f'Recording file not found: {source_path}')

        # Reading is delegated to MNE's generic dispatcher, which selects
        # the format reader and resolves companion files from the file
        # itself.
        raw = read_raw_recording(source_path)

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

        # Drop a montage that carries no real electrode positions before
        # writing. An EEGLAB .set always stores a channel-location block, so
        # MNE reports a montage even for a recording that was never
        # digitized -- the positions then come back as all-NaN. mne-bids
        # will not write the BIDS electrodes sidecar for such a montage: it
        # requires fiducials (nasion + left/right pre-auricular points) that
        # a positionless recording does not have, and raises instead of
        # writing (an EDF, which has no location block, never hits this).
        # EEG2BIDS has no electrode-digitization step, so there are no real
        # coordinates to preserve here; clearing the empty montage lets the
        # SET convert. A montage with real positions is left untouched.
        montage = raw.get_montage()
        if montage is not None:
            positions = np.array([ch['loc'][:3] for ch in raw.info['chs']])
            if np.all(np.isnan(positions)):
                raw.set_montage(None)

        subject = subject_id.replace('_', '').replace('-', '').replace(' ', '')

        raw.info['line_freq'] = int(line_freq) if line_freq.isnumeric() else None

        try:
            bids_root = os.path.join(bids_directory, output_time)
            os.makedirs(bids_root, exist_ok=True)

            # Name the datatype explicitly (eeg/ieeg) rather than letting
            # MNE-BIDS infer it; inference is ambiguous when the recording
            # carries multiple data-class channel types (e.g. eeg + emg).
            datatype = 'eeg' if ch_type == 'eeg' else 'ieeg'

            bids_basename = BIDSPath(subject=subject, session=session, task=task, run=run,
                                     acquisition=ch_type, datatype=datatype, root=bids_root)

            # write_raw_bids returns the BIDSPath of the file it actually
            # wrote (with datatype/suffix/extension resolved). The output
            # format (preserve source vs. convert) is resolved from the
            # user's selection; a preserved lazily-read source is copied
            # file-as-is.
            write_kwargs = {'overwrite': False, 'verbose': False}
            write_kwargs.update(
                resolve_write_kwargs(raw, source_path, output_format))
            if anonymize:
                write_kwargs['anonymize'] = {
                    'daysback': daysback,
                    'keep_his': False,
                }
            written_path = write_raw_bids(
                raw, bids_basename, **write_kwargs)

            # MNE anonymizes the common metadata model. EDF additionally
            # has a standardized recording-identification field that MNE
            # does not expose, so clear it after serialization.
            if anonymize and written_path.extension == '.edf':
                with open(written_path.fpath, 'r+b') as f:
                    f.seek(8)
                    f.write(b'X X X X'.ljust(80) * 2)

            print('finished')

            return bids_basename.basename

        except PermissionError as ex:
            raise WriteError(ex) from ex
