import os
import shutil

import socketio
from werkzeug.serving import run_simple
from eeg2bids import conversion
from eeg2bids import BIDS
from eeg2bids.loris_api import LorisAPI
from eeg2bids.parameter_file import read_parameter_file
from eeg2bids.runtime.owner_process import watch_owner_process

# The host and port the local Socket.IO service binds to. The service only
# ever listens on the loopback interface; the connect handler below rejects
# any client that is not on 127.0.0.1. The port is configurable through
# EEG2BIDS_BACKEND_PORT (Electron and the integration tests set it) and
# defaults to 7301 for normal use.
HOST = '127.0.0.1'
PORT = int(os.environ.get('EEG2BIDS_BACKEND_PORT') or 7301)

# Create socket listener. The threading async mode keeps the event handlers
# synchronous (they perform blocking file IO and BIDS conversion) and avoids
# the eventlet green-thread runtime that the backend previously depended on.
sio = socketio.Server(async_mode='threading', cors_allowed_origins='*')
app = socketio.WSGIApp(sio)

# Create Loris API handler.
loris_api = LorisAPI()


@sio.event
def connect(sid, environ):
    print('connect: ', sid)
    if environ['REMOTE_ADDR'] != '127.0.0.1':
        return False  # extra precaution.


@sio.event
def tarfile_bids(sid, bids_directory):
    shutil.make_archive(bids_directory, 'gztar',
                        root_dir=os.path.dirname(bids_directory),
                        base_dir=os.path.basename(bids_directory))
    sio.emit('response', {'compression_time': 'example_5mins'})


@sio.event
def get_participant_data(sid, data):
    if not data.get('candID'):
        return

    candidate_id = data['candID']
    candidate = loris_api.get_candidate(candidate_id)
    sio.emit('participant_data', {
        'candID': candidate_id,
        'candidate': candidate,
    })


@sio.event
def set_loris_credentials(sid, data):
    # Never print the credentials payload: it contains the LORIS password
    # and this output is forwarded into the development logs.
    if 'lorisURL' not in data:
        print('set_loris_credentials: lorisURL missing from credentials payload')
        return

    loris_api.url = data['lorisURL'].removesuffix('/') + '/api/v0.0.4-dev/'
    loris_api.username = data['lorisUsername']
    loris_api.password = data['lorisPassword']
    resp = loris_api.login()

    if resp.get('error'):
        sio.emit('loris_login_response', {'error': resp.get('error')})
        return

    sio.emit('loris_login_response', {
        'success': 200,
        'lorisUsername': loris_api.username
    })
    # Login succeeded, but a later metadata request could still fail; that
    # must not raise out of the handler and leave the renderer waiting.
    try:
        sio.emit('loris_sites', loris_api.get_sites())
        sio.emit('loris_projects', loris_api.get_projects())
    except Exception as e:
        print('set_loris_credentials: could not load LORIS metadata:', e)


@sio.event
def get_loris_subprojects(sid, project):
    sio.emit('loris_subprojects', loris_api.get_subprojects(project))


@sio.event
def get_loris_visits(sid, subproject):
    sio.emit('loris_visits', loris_api.get_visits(subproject))


@sio.event
def create_visit(sid, data):
    candid = data['candID']
    loris_api.create_visit(candid, data['visit'], data['site'], data['project'], data['subproject'])
    loris_api.start_next_stage(candid, data['visit'], data['site'], data['subproject'], data['project'], data['date'])


@sio.event
def get_recording_data(sid, data):
    # Echo the selection so a late inspection cannot replace a newer one.
    files = data.get('files') if isinstance(data, dict) else None
    response = conversion.inspect_recording(files)
    sio.emit('recording_data', {
        **response,
        'requested_files': [file['path'] for file in files] if files else [],
    })


@sio.event
def get_bids_metadata(sid, data):
    if not data.get('file_path'):
        msg = 'No metadata file selected.'
        print(msg)
        response = {'error': msg}
    elif data.get('modality') not in ('ieeg', 'eeg'):
        msg = 'No valid modality found.'
        print(msg)
        response = {'error': msg}
    else:
        try:
            response = read_parameter_file(data['file_path'], data['modality'])
        except (ValueError, TypeError) as e:
            print(e)
            response = {'error': f'Metadata file format is not valid: {e}'}
        except OSError:
            msg = 'Could not read the metadata file.'
            print(msg)
            response = {'error': msg}

    # Echo the request identity even on errors. The renderer may select a
    # different file or modality before this blocking read completes.
    response['source_file'] = data.get('file_path')
    response['modality'] = data.get('modality')
    sio.emit('bids_metadata', response)


@sio.event
def recording_to_bids(sid, data):
    # data = { recordingData: {files: [{path, name}]}, eegRuns: [], modality: '',
    # bids_directory: '', session: '', participantID: '',
    # taskName: '', line_freq: '', site_id: '', project_id: '',
    # sub_project_id: '', ... } (see beginBidsCreation in Configuration.jsx)
    response = conversion.convert_recording(data)
    sio.emit('bids', response)


@sio.event
def validate_bids(sid, bids_directory):
    if not bids_directory:
        response = {'error': ['The BIDS output directory is missing.']}
    else:
        response = BIDS.validate(bids_directory)
    sio.emit('response', response)


@sio.event
def disconnect(sid):
    print('disconnect: ', sid)


def main():
    """Start the local EEG2BIDS Socket.IO service.

    Uses Werkzeug's threaded WSGI server. WebSocket transport is provided by
    the ``simple-websocket`` package; if it is unavailable Socket.IO falls back
    to HTTP long-polling, which is sufficient for this local single-client
    service.
    """
    watch_owner_process()
    # A port collision needs no handling here: Werkzeug prints an actionable
    # "Port <PORT> is in use by another program" message and exits non-zero.
    run_simple(HOST, PORT, app, threaded=True)
