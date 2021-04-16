import eventlet
import socketio
from python.libs import iEEG
from python.libs import BIDS


# Create socket listener.
sio = socketio.Server(async_mode='eventlet', cors_allowed_origins=[])
app = socketio.WSGIApp(sio)

# pyCat version
appVersion = '1.0.0'


@sio.event
def connect(sid, environ):
    print('connect: ', sid)
    if environ['REMOTE_ADDR'] != '127.0.0.1':
        return False  # extra precaution.


@sio.event
def tarfile_bids(sid, data):
    # data = { bids_directory: '../path/to/bids/output', output_time: 'bids output time' }
    print('tarfile_bids:', data)
    iEEG.TarFile(data)


@sio.event
def ieeg_get_header(sid, data):
    # data = { file_path: 'path to iEEG file' }
    print('ieeg_get_header:', data)
    try:
        anonymize = iEEG.Anonymize(data)
        header = anonymize.get_header()
        response = {
            'header': header[0]
        }
    except Exception as ex:
        print(ex)
        response = {
            'error': 'Failed to retrieve EDF header information',
        }
    sio.emit('response', response)


@sio.event
def edf_to_bids(sid, data):
    # data = { file_path: '', bids_directory: '', read_only: false,
    # events_tsv: '', line_freq: '', site_id: '', project_id: '',
    # sub_project_id: '', visit_label: '', subject_id: ''}
    print('edf_to_bids: ', data)
    error_messages = []
    if not data['file_path']:
        error_messages.append('The file.edf to convert is missing.')
    if not data['bids_directory']:
        error_messages.append('The BIDS output directory is missing.')
    if not data['events_tsv']:
        error_messages.append('The events.tsv to include is missing.')
    if not data['line_freq']:
        error_messages.append('The line_freq is missing.')
    if not data['site_id']:
        error_messages.append('The LORIS SiteID is missing.')
    if not data['project_id']:
        error_messages.append('The LORIS ProjectID is missing.')
    if not data['sub_project_id']:
        error_messages.append('The LORIS SubProjectID is missing.')
    if not data['visit_label']:
        error_messages.append('The LORIS Visit Label is missing.')
    if not error_messages:
        time = iEEG.Time()
        data['output_time'] = 'output-' + time.latest_output
        iEEG.Converter(data)  # EDF to BIDS format.

        # store subject_id for iEEG.Modifier
        data['subject_id'] = iEEG.Converter.m_info['subject_id']
        data['appVersion'] = appVersion
        iEEG.Modifier(data, sio)  # Modifies data of BIDS format
        response = {
            'output_time': data['output_time']
        }
    else:
        response = {
            'error': error_messages
        }
    sio.emit('response', response)


@sio.event
def validate_bids(sid, data):
    # data = { bids_directory: '../path/to/bids/output', output_time: 'bids output time' }
    print('validate_bids: ', data)
    error_messages = []
    if not data['bids_directory']:
        error_messages.append('The BIDS output directory is missing.')
    if not data['output_time']:
        error_messages.append('The BIDS format is missing.')
    if not error_messages:
        BIDS.Validate(data)
        response = {
            'file_paths': BIDS.Validate.file_paths,
            'result': BIDS.Validate.result
        }
    else:
        response = {
            'error': error_messages
        }
    sio.emit('response', response)


@sio.event
def disconnect(sid):
    print('disconnect: ', sid)


if __name__ == '__main__':
    eventlet.wsgi.server(
        eventlet.listen(('127.0.0.1', 7301)),
        app,
        log_output=True
    )
