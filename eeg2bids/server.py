import os
import sys
import threading
import time

import socketio
from werkzeug.serving import run_simple
from eeg2bids import converter
from eeg2bids.converter import metadata as metadata_fields
from eeg2bids import conversion
from eeg2bids import BIDS
from eeg2bids.loris_api import LorisAPI
import json

# The host and port the local Socket.IO service binds to. The service only
# ever listens on the loopback interface; the connect handler below rejects
# any client that is not on 127.0.0.1. The port is configurable through
# EEG2BIDS_BACKEND_PORT (Electron and the integration tests set it) and
# defaults to 7301 for normal use.
HOST = '127.0.0.1'
PORT = int(os.environ.get('EEG2BIDS_BACKEND_PORT') or 7301)

# LORIS credentials of user
lorisCredentials = {
    'lorisURL': '',
    'lorisUsername': '',
    'lorisPassword': '',
}

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


def tarfile_bids_thread(bids_directory):
    converter.TarFile(bids_directory)
    response = {
        'compression_time': 'example_5mins'
    }
    return response


@sio.event
def tarfile_bids(sid, bids_directory):
    response = tarfile_bids_thread(bids_directory)
    send = {
        'compression_time': response['compression_time']
    }
    sio.emit('response', send)


@sio.event
def get_participant_data(sid, data):
    # todo helper to to data validation
    if 'candID' not in data or not data['candID']:
        return

    candidate = loris_api.get_candidate(data['candID'])
    sio.emit('participant_data', candidate)


@sio.event
def set_loris_credentials(sid, data):
    global lorisCredentials
    lorisCredentials = data
    # Never print the credentials payload: it contains the LORIS password
    # and this output is forwarded into the development logs.
    if 'lorisURL' not in lorisCredentials:
        print('set_loris_credentials: lorisURL missing from credentials payload')
        return

    if lorisCredentials['lorisURL'].endswith('/'):
        lorisCredentials['lorisURL'] = lorisCredentials['lorisURL'][:-1]
    loris_api.url = lorisCredentials['lorisURL'] + '/api/v0.0.4-dev/'
    loris_api.username = lorisCredentials['lorisUsername']
    loris_api.password = lorisCredentials['lorisPassword']
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
def get_loris_sites(sid):
    sio.emit('loris_sites', loris_api.get_sites())


@sio.event
def get_loris_projects(sid):
    sio.emit('loris_projects', loris_api.get_projects())


@sio.event
def get_loris_subprojects(sid, project):
    sio.emit('loris_subprojects', loris_api.get_subprojects(project))


@sio.event
def get_loris_visits(sid, subproject):
    sio.emit('loris_visits', loris_api.get_visits(subproject))


@sio.event
def create_visit(sid, data):
    loris_api.create_visit(data['candID'], data['visit'], data['site'], data['project'], data['subproject'])
    loris_api.start_next_stage(data['candID'], data['visit'], data['site'], data['subproject'], data['project'], data['date'])

@sio.event
def create_candidate_and_visit(sid, data):
    new_candidate = loris_api.create_candidate(
        data['project'],
        data['dob'],
        data['sex'],
        data['site'],
    )

    if new_candidate['CandID']:
        print('create_visit')
        loris_api.create_visit(new_candidate['CandID'], data['visit'], data['site'], data['project'],
                               data['subproject'])
        loris_api.start_next_stage(new_candidate['CandID'], data['visit'], data['site'], data['subproject'],
                                   data['project'], data['date'])
        print('new_candidate_created')
        sio.emit('new_candidate_created', new_candidate)


@sio.event
def get_recording_data(sid, data):
    # data = { files: 'recording entry points (array of {path, name})' }
    print('get_recording_data:', data)
    files = data.get('files') if isinstance(data, dict) else None
    response = conversion.inspect_recording(files)
    sio.emit('recording_data', response)


@sio.event
def get_bids_metadata(sid, data):
    # data = { file_path: 'path to metadata file' }
    print('data:', data)

    if 'file_path' not in data or not data['file_path']:
        msg = 'No metadata file selected.'
        print(msg)
        response = {'error': msg}
    elif 'modality' not in data or data['modality'] not in ['ieeg', 'eeg']:
        msg = 'No valid modality found.'
        print(msg)
        response = {'error': msg}
    else:
        try:
            with open(data['file_path']) as fd:
                try:
                    metadata = json.load(fd)
                    empty_values = [k for k in metadata if isinstance(metadata[k], str) and metadata[k].strip() == '']
                    diff = list(set(metadata.keys()) - set(metadata_fields[data['modality']]) - set(empty_values))
                    ignored_keys = empty_values + diff

                    response = {
                        'metadata': metadata,
                        'ignored_keys': ignored_keys,
                    }
                except ValueError as e:
                    print(e)
                    metadata = {}
                    response = {
                        'error': 'Metadata file format is not valid.',
                    }
        except IOError:
            msg = "Could not read the metadata file."
            print(msg)
            response = {
                'error': msg,
            }

    sio.emit('bids_metadata', response)


@sio.event
def recording_to_bids(sid, data):
    # data = { recordingData: {files: [{path, name}]}, eegRuns: [], modality: '',
    # bids_directory: '', read_only: false, session: '', participantID: '',
    # taskName: '', line_freq: '', site_id: '', project_id: '',
    # sub_project_id: '', ... } (see beginBidsCreation in Configuration.jsx)
    print('recording_to_bids: ', data)
    response = conversion.convert_recording(data)
    print(response)
    print('Response received!')
    sio.emit('bids', response.copy())


@sio.event
def validate_bids(sid, bids_directory):
    print('validate_bids: ', bids_directory)
    error_messages = []
    if not bids_directory:
        error_messages.append('The BIDS output directory is missing.')

    if not error_messages:
        BIDS.Validate(bids_directory)
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


def _watch_owner_process():
    """Exit when the process that owns this backend disappears.

    Electron sets EEG2BIDS_OWNER_PID when it spawns the backend. Electron
    normally terminates the backend's process group itself on quit, but that
    cannot happen when Electron dies without a graceful shutdown (a terminal
    Ctrl+C killing the whole foreground process group, or a hard kill). This
    watchdog is the backstop that keeps the backend from being orphaned.
    """
    owner_pid = os.environ.get('EEG2BIDS_OWNER_PID', '')
    if not owner_pid.isdigit():
        return

    def watch():
        while True:
            time.sleep(2)
            try:
                os.kill(int(owner_pid), 0)
            except OSError:
                # stderr is a pipe into the (now dead) owner, so this
                # print may itself fail; exit regardless.
                try:
                    print(
                        f'eeg2bids: owner process {owner_pid} exited, '
                        'shutting down',
                        file=sys.stderr,
                    )
                except OSError:
                    pass
                finally:
                    os._exit(0)

    threading.Thread(target=watch, daemon=True).start()


def main():
    """Start the local EEG2BIDS Socket.IO service.

    Uses Werkzeug's threaded WSGI server. WebSocket transport is provided by
    the ``simple-websocket`` package; if it is unavailable Socket.IO falls back
    to HTTP long-polling, which is sufficient for this local single-client
    service.
    """
    _watch_owner_process()
    # A port collision needs no handling here: Werkzeug prints an actionable
    # "Port <PORT> is in use by another program" message and exits non-zero.
    run_simple(HOST, PORT, app, threaded=True)


if __name__ == '__main__':
    main()
