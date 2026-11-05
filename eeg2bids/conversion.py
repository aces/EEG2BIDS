"""Recording inspection and BIDS conversion, independent of Socket.IO."""

import re
from datetime import datetime

from eeg2bids import Modifier, converter
from eeg2bids.converter import ReadError, WriteError


def inspect_recording(files):
    """Summarize the selected file(s) of one recording, or return an error."""
    if not files:
        return {'error': 'No recording file selected.'}

    recordings = []
    try:
        for file in files:
            raw = converter.read_raw_recording(file['path'])
            # No timezone suffix: the renderer reparses this with new Date().
            meas_date = raw.info.get('meas_date')
            recordings.append({
                'file': file,
                'raw': raw,
                'date': meas_date and meas_date.strftime('%Y-%m-%d %H:%M:%S'),
            })

        if len({frozenset(r['raw'].ch_names) for r in recordings}) > 1:
            return {'error': 'The files selected contain more than one '
                             'recording.'}

        # sort the recording splits by date (blank dates sort first)
        recordings = sorted(recordings, key=lambda r: r['date'] or '')
        subject_info = recordings[0]['raw'].info.get('subject_info') or {}

        return {
            'files': [r['file'] for r in recordings],
            'subjectID': subject_info.get('his_id') or 'n/a',
            'recordingID': 'n/a',
            'date': recordings[0]['date'] or '',
        }
    except ReadError as e:
        print(e)
        return {'error': str(e)}


def convert_recording(data):
    """Convert to BIDS; return ``{'output_time': ...}`` or ``{'error': [...]}``."""
    error_messages = []
    if not data.get('recordingData', {}).get('files'):
        error_messages.append('No recording file(s) to convert.')
    if not data.get('bids_directory'):
        error_messages.append('The BIDS output folder is missing.')
    if not data.get('session'):
        error_messages.append('The LORIS Visit Label is missing.')
    if not data.get('eegRuns'):
        error_messages.append('No recording run(s) to convert.')
    if not converter.is_supported_output_format(data.get('outputFormat', 'auto')):
        error_messages.append(
            "Unsupported output format '{}'. Choose Auto, EDF, BrainVision, "
            'or EEGLAB.'.format(data.get('outputFormat')))

    if error_messages:
        return {'error': error_messages}

    try:
        # Copy rather than mutate the caller's request. BIDS subject labels
        # are alphanumeric, so drop separators once for every path built.
        request = {
            **data,
            'participantID': re.sub(r'[_\- ]', '', data['participantID']),
            'output_time': datetime.now().strftime('output-%Y-%m-%d-%Hh%Mm%Ss'),
        }
        Modifier.apply(request, converter.write_runs(request))
        return {'output_time': request['output_time']}
    except ReadError as e:
        error_messages.append('Cannot read file - ' + str(e))
    except WriteError as e:
        error_messages.append('Cannot write file - ' + str(e))
    except Exception as e:
        error_messages.append(str(e))

    return {'error': error_messages}
