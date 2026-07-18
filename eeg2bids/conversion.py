"""Recording inspection and BIDS conversion orchestration.

These are ordinary backend functions with no Socket.IO or Electron
dependency, so they can be invoked and tested independently of the transport
layer. The Socket.IO handlers in ``server.py`` are thin adapters that call
into this module and forward the returned dict to the renderer.

Every function returns a serializable ``dict``. On failure the dict carries
an ``error`` key with an actionable message (a string, or a list of strings
for the multi-validation conversion path); the caller owns transport.
"""

import datetime

from eeg2bids import iEEG
from eeg2bids.iEEG import ReadError, WriteError
from eeg2bids.Modifier import Modifier


def inspect_recording(files):
    """Inspect the selected recording file(s) and summarize their metadata.

    ``files`` is a list of ``{'path': ..., 'name': ...}`` entries describing a
    single recording (possibly split across several files). Returns a dict
    with the sorted files plus the subject/recording identifiers and start
    date, or ``{'error': ...}`` when the recording cannot be read or the
    selection spans more than one recording.
    """
    if not files:
        return {'error': 'No EDF file selected.'}

    headers = []
    try:
        for file in files:
            anonymize = iEEG.Anonymize(file['path'])
            metadata = anonymize.get_header()
            year = '20' + str(metadata[0]['year']) if metadata[0]['year'] < 85 \
                else '19' + str(metadata[0]['year'])
            date = datetime.datetime(
                int(year), metadata[0]['month'], metadata[0]['day'],
                metadata[0]['hour'], metadata[0]['minute'],
                metadata[0]['second'])

            headers.append({
                'file': file,
                'metadata': metadata,
                'date': str(date)
            })

        for i in range(1, len(headers)):
            if set(headers[i - 1]['metadata'][1]['ch_names']) \
                    != set(headers[i]['metadata'][1]['ch_names']):
                return {'error': 'The files selected contain more than one '
                                 'recording.'}

        # sort the recording splits by date
        headers = sorted(headers, key=lambda k: k['date'])

        # return the first split's metadata and date
        return {
            'files': [header['file'] for header in headers],
            'subjectID': headers[0]['metadata'][0]['subject_id'],
            'recordingID': headers[0]['metadata'][0]['recording_id'],
            'date': headers[0]['date']
        }
    except ReadError as e:
        print(e)
        return {'error': 'Cannot read file - ' + str(e)}
    except Exception as e:
        print(e)
        return {'error': 'Failed to retrieve EDF header information'}


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
