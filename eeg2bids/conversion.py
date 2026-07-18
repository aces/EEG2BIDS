"""Recording inspection and BIDS conversion orchestration.

These are ordinary backend functions with no Socket.IO or Electron
dependency, so they can be invoked and tested independently of the transport
layer. The Socket.IO handlers in ``server.py`` are thin adapters that call
into this module and forward the returned dict to the renderer.

Every function returns a serializable ``dict``. On failure the dict carries
an ``error`` key with an actionable message (a string, or a list of strings
for the multi-validation conversion path); the caller owns transport.
"""

from eeg2bids import iEEG
from eeg2bids.iEEG import ReadError, WriteError
from eeg2bids.Modifier import Modifier


def _meas_date_str(raw):
    """Recording start as 'YYYY-MM-DD HH:MM:SS', or None when MNE has none.

    MNE stores ``meas_date`` as a timezone-aware datetime; the renderer
    reparses this string with ``new Date(...)``, so the wall-clock components
    are emitted without a timezone suffix to match the prior format.
    """
    meas_date = raw.info.get('meas_date')
    if meas_date is None:
        return None
    return meas_date.strftime('%Y-%m-%d %H:%M:%S')


def _subject_id(raw):
    """MNE-provided subject identifier, or 'n/a' when absent."""
    subject_info = raw.info.get('subject_info') or {}
    his_id = subject_info.get('his_id')
    return his_id if his_id else 'n/a'


def inspect_recording(files):
    """Inspect the selected recording file(s) and summarize their metadata.

    ``files`` is a list of ``{'path': ..., 'name': ...}`` entries describing a
    single recording (possibly split across several files). Each entry point is
    opened through MNE's generic ``read_raw`` dispatcher, so format selection
    and companion-file resolution are delegated to MNE. Returns a dict with the
    sorted files plus subject identifier and start date (missing optional
    values as ``n/a`` / empty), or ``{'error': ...}`` when the recording cannot
    be read or the selection spans more than one recording.
    """
    if not files:
        return {'error': 'No recording file selected.'}

    recordings = []
    try:
        for file in files:
            raw = iEEG.read_raw_recording(file['path'])
            recordings.append({
                'file': file,
                'raw': raw,
                'date': _meas_date_str(raw),
            })

        for i in range(1, len(recordings)):
            if set(recordings[i - 1]['raw'].ch_names) \
                    != set(recordings[i]['raw'].ch_names):
                return {'error': 'The files selected contain more than one '
                                 'recording.'}

        # sort the recording splits by date (blank dates sort first)
        recordings = sorted(recordings, key=lambda r: r['date'] or '')
        first = recordings[0]['raw']

        return {
            'files': [r['file'] for r in recordings],
            'subjectID': _subject_id(first),
            'recordingID': 'n/a',
            'date': recordings[0]['date'] or '',
        }
    except ReadError as e:
        print(e)
        return {'error': str(e)}


def convert_recording(data):
    """Convert the selected recording(s) to BIDS and apply post-write edits.

    Validates the request, runs the MNE-BIDS conversion, then applies the
    dataset/participant/event/annotation modifications. Returns
    ``{'output_time': ...}`` on success or ``{'error': [...]}`` with one or
    more actionable messages.
    """
    error_messages = []
    if 'edfData' not in data or 'files' not in data['edfData'] \
            or not data['edfData']['files']:
        error_messages.append('No .edf file(s) to convert.')
    if 'bids_directory' not in data or not data['bids_directory']:
        error_messages.append('The BIDS output folder is missing.')
    if not data['session']:
        error_messages.append('The LORIS Visit Label is missing.')

    if error_messages:
        return {'error': error_messages}

    time = iEEG.Time()
    data['output_time'] = 'output-' + time.latest_output

    try:
        iEEG.Converter(data)  # source recording to BIDS format.

        # store subject_id for Modifier
        data['subject_id'] = iEEG.Converter.m_info['subject_id']
        Modifier(data)  # Modifies data of BIDS format
        return {'output_time': data['output_time']}
    except ReadError as e:
        error_messages.append('Cannot read file - ' + str(e))
    except WriteError as e:
        error_messages.append('Cannot write file - ' + str(e))

    return {'error': error_messages}
