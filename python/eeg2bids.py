# import _thread
import eventlet
from eventlet import tpool
import socketio
from python.libs import iEEG
from python.libs.Modifier import Modifier
from python.libs import BIDS
from python.libs.loris_api import LorisAPI
import csv

# Create socket listener.
sio = socketio.Server(async_mode='eventlet', cors_allowed_origins=[])
app = socketio.WSGIApp(sio)
loris_api = LorisAPI()

# EEG2BIDS Wizard version
appVersion = '1.0.0'


@sio.event
def connect(sid, environ):
    print('connect: ', sid)
    if environ['REMOTE_ADDR'] != '127.0.0.1':
        return False  # extra precaution.


def tarfile_bids_thread(data):
    iEEG.TarFile(data)
    response = {
            'compression_time': 'example_5mins'
        }
    return eventlet.tpool.Proxy(response)


@sio.event
def tarfile_bids(sid, data):
    # data = { bids_directory: '../path/to/bids/output', output_time: 'bids output time' }
    print('tarfile_bids:', data)
    response = eventlet.tpool.execute(tarfile_bids_thread, data)
    print('response received!')
    print(response)
    send = {
            'compression_time': response['compression_time']
        }
    print('send received!')
    print(send)
    sio.emit('response', send)


@sio.event
def get_loris_sites(sid):
    sio.emit('loris_sites', loris_api.get_sites())

@sio.event
def get_loris_projects(sid):
    sio.emit('loris_projects', loris_api.get_projects())

@sio.event
def get_loris_subprojects(sid, project):
    sio.emit('loris_subprojects', loris_api.get_subprojects(project))

@sio.event
def get_loris_visits(sid, project):
    sio.emit('loris_visits', loris_api.get_visits(project))

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
    sio.emit('edf_header', response)

@sio.event
def get_metadata(sid, data):
    # data = { file_path: 'path to metadata file' }
    print('metadata file:', data)
    
    if not data['file_path']:
        print('No file path found.')
        response = {
            'error': 'No file path found.',
        }
    else :    
        try:
            with open(data['file_path']) as fd:
                reader = csv.DictReader(fd, delimiter="\t", quotechar='"')
                response = {
                    'metadata': {rows['Field']:rows['Value'] for rows in reader}
                }
        except IOError:
            print("Could not read the metadata file.")
            response = {
                'error': 'No file path found.',
            }

    sio.emit('metadata', response)

def edf_to_bids_thread(data):
    print('data is ')
    print(data)
    error_messages = []
    if not data['file_paths']:
        error_messages.append('No .edf file(s) to convert.')
    if not data['bids_directory']:
        error_messages.append('The BIDS output directory is missing.')
    if not data['session']:
        error_messages.append('The LORIS Visit Label is missing.')

    if not error_messages:
        time = iEEG.Time()
        data['output_time'] = 'output-' + time.latest_output
        iEEG.Converter(data)  # EDF to BIDS format.

        # store subject_id for Modifier
        data['subject_id'] = iEEG.Converter.m_info['subject_id']
        data['appVersion'] = appVersion
        Modifier(data)  # Modifies data of BIDS format
        response = {
            'output_time': data['output_time']
        }
    else:
        response = {
            'error': error_messages
        }
    return eventlet.tpool.Proxy(response)


@sio.event
def edf_to_bids(sid, data):
    # data = { file_paths: [], bids_directory: '', read_only: false,
    # events_tsv: '', line_freq: '', site_id: '', project_id: '',
    # sub_project_id: '', session: '', subject_id: ''}
    print('edf_to_bids: ', data)
    response = eventlet.tpool.execute(edf_to_bids_thread, data)
    print(response)
    print('Response received!')
    sio.emit('response', response.copy())


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
