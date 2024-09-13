import os
import eventlet
from eventlet import tpool
import socketio
import traceback
import json
import logging
import sys
import functools

from python.libs import iEEG
from python.libs.iEEG import ReadError, WriteError, metadata as metadata_fields
from python.libs.Modifier import Modifier
from python.libs import BIDS
from python.libs.loris_api import LorisAPI

# Import from EEG.py
from .eeg import  Time, EDFHandler, SETHandler

os.environ['EVENTLET_NO_GREENDNS'] = 'yes'

def create_handler(file_format, data):
    if file_format.lower() == 'edf':
        return EDFHandler(data)
    elif file_format.lower() == 'set':
        return SETHandler(data)
    else:
        raise ValueError(f"Unsupported file format: {file_format}")

class SocketServer:
    def __init__(self):
        self.sio = socketio.Server(
            async_mode='eventlet',
            ping_timeout=60000,
            cors_allowed_origins=[],
        )
        self.app = socketio.WSGIApp(self.sio)
        self.loris_api = LorisAPI()
        self.tar_handler = iEEG.TarFile()
        
        self.register_handlers()

    def register_handlers(self):
        handlers = [
            self.connect, self.disconnect, self.get_participant_data,
            self.set_loris_credentials, self.get_loris_projects,
            self.get_loris_subprojects, self.get_loris_sites,
            self.get_loris_visits, self.get_loris_visit,
            self.create_visit, self.create_candidate_and_visit,
            self.get_eeg_data, self.get_bids_metadata,
            self.eeg_to_bids, self.validate_bids, self.get_progress,
            self.tarfile_bids, self.upload_tarfile_bids
        ]
        for handler in handlers:
            self.sio.on(handler.__name__, handler)

    def connect(self, sid, environ):
        print('connect: ', sid)
        if environ['REMOTE_ADDR'] != '127.0.0.1':
            return False  # extra precaution.

    def disconnect(self, sid):
        print('disconnect: ', sid)

    def get_participant_data(self, sid, data):
        if 'candID' not in data or not data['candID']:
            return

        candidate = self.loris_api.get_candidate(data['candID'])
        self.sio.emit('participant_data', candidate)

    def set_loris_credentials(self, sid, data):
        self.lorisCredentials = data
        if 'lorisURL' not in self.lorisCredentials:
            print('error with credentials:', data)
            return

        if self.lorisCredentials['lorisURL'].endswith('/'):
            self.lorisCredentials['lorisURL'] = self.lorisCredentials['lorisURL'][:-1]
        self.loris_api.url = self.lorisCredentials['lorisURL'] + '/api/v0.0.4-dev/'
        self.loris_api.username = self.lorisCredentials['lorisUsername']
        self.loris_api.password = self.lorisCredentials['lorisPassword']
        resp = self.loris_api.login()

        if resp.get('error'):
            self.sio.emit('loris_login_response', {'error': resp.get('error')})
        else:
            self.sio.emit('loris_login_response', {
                'success': 200,
                'lorisUsername': self.loris_api.username
            })
            self.sio.emit('loris_sites', self.loris_api.get_sites())
            self.sio.emit('loris_projects', self.loris_api.get_projects())

    def get_loris_projects(self, sid):
        self.sio.emit('loris_projects', self.loris_api.get_projects())

    def get_loris_subprojects(self, sid, project):
        self.sio.emit('loris_subprojects', self.loris_api.get_subprojects(project))

    def create_visit(self, sid, data):
        self.loris_api.create_visit(data['candID'], data['visit'], data['site'], data['project'], data['subproject'])
        self.loris_api.start_next_stage(data['candID'], data['visit'], data['site'], data['subproject'], data['project'], data['date'])


    def get_eeg_data(self, sid, data):
        print('get_eeg_data:', data)
        if 'files' not in data or not data['files']:
            response = {'error': 'No EEG file selected.'}
        else:
            try:
                file_format = data['files'][0]['name'].split('.')[-1].lower()
                handler = create_handler(file_format, data)
                response = handler.get_file_info(data['files'])
            except Exception as e:
                print(traceback.format_exc())
                response = {
                    'error': f'Failed to retrieve {file_format.upper()} file information: {str(e)}',
                }
        print(response)
        self.sio.emit('eeg_data', response)

    def eeg_to_bids(self, sid, data):
        print('BIDS Conversion - START')
        print('eeg_to_bids: ', data)
        response = eventlet.tpool.execute(self.eeg_to_bids_thread, data)
        print(response)
        print('BIDS Conversion - END')
        self.sio.emit('bids', response.copy())

    def eeg_to_bids_thread(self, data):
        error_messages = []
        if 'eegData' not in data or 'files' not in data['eegData'] or not data['eegData']['files']:
            error_messages.append('No EEG file(s) to convert.')
        if 'bids_directory' not in data or not data['bids_directory']:
            error_messages.append('The BIDS output folder is missing.')
        if not data['session']:
            error_messages.append('The LORIS Visit Label is missing.')

        if not error_messages:
            time = Time()
            data['output_time'] = 'output-' + time.latest_output

            try:
                file_format = data['eegData']['files'][0]['name'].split('.')[-1].lower()
                handler = create_handler(file_format, data)
                handler.convert_to_bids()

                # store subject_id for Modifier
                data['subject_id'] = handler.m_info['subject_info']['his_id']
                Modifier(data)  # Modifies data of BIDS format
                response = {
                    'output_time': data['output_time']
                }
                return eventlet.tpool.Proxy(response)
            except ReadError as e:
                response = {
                    'error': 'Cannot read file - ' + str(e)
                }
                print(traceback.format_exc())
            except WriteError as e:
                response = {
                    'error': 'Cannot write file - ' + str(e)
                }
                print(traceback.format_exc())
            except Exception as e:
                response = {
                    'error': 'Unknown - ' + str(e)
                }
                print(traceback.format_exc())
        else:
            response = {
                'error': error_messages
            }

        print(response)
        return eventlet.tpool.Proxy(response)

    # ... (keep other methods from the original set2bids.py)
    def create_candidate_and_visit(self, sid, data):
        new_candidate = self.loris_api.create_candidate(
            data['project'],
            data['dob'],
            data['sex'],
            data['site'],
        )

        if new_candidate['CandID']:
            print('create_visit')
            self.loris_api.create_visit(new_candidate['CandID'], data['visit'], data['site'], data['project'],
                                    data['subproject'])
            self.loris_api.start_next_stage(new_candidate['CandID'], data['visit'], data['site'], data['subproject'],
                                        data['project'], data['date'])
            print('new_candidate_created')
            self.sio.emit('new_candidate_created', new_candidate)

    def get_bids_metadata(self, sid, data):
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

        self.sio.emit('bids_metadata', response)

    def validate_bids(self, sid, bids_directory):
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
        self.sio.emit('response', response)

    def start_server(self):
        eventlet.wsgi.server(
            eventlet.listen(('127.0.0.1', 7301)),
            self.app,
            log=logging.getLogger(),
            log_output=True
        )

if __name__ == '__main__':
    try:
        print = functools.partial(print, flush=True)

        log = logging.getLogger()
        handler = logging.StreamHandler(sys.stdout)
        log.addHandler(handler)
        log.setLevel(logging.DEBUG)

        server = SocketServer()
        server.start_server()
    except Exception as e:
        print('Server error:', str(e))
        print(traceback.format_exc())