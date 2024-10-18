# bids_convertor.py

import logging
import os
import traceback
import functools
import sys
import json
import datetime

# Add the 'python' directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
python_lib_path = os.path.join(current_dir, 'python')

if python_lib_path not in sys.path:
    sys.path.append(python_lib_path)

from python.libs.BaseHandler import ReadError, WriteError
from python.libs.EDFHandler import EDFHandler
from python.libs.SETHandler import SETHandler

os.environ['EVENTLET_NO_GREENDNS'] = 'yes'

import eventlet
from eventlet import tpool
import socketio
from python.libs import iEEG
from python.libs.iEEG import ReadError as iEEGReadError, WriteError as iEEGWriteError, metadata as metadata_fields
from python.libs.Modifier import Modifier
from python.libs import BIDS
from python.libs.loris_api import LorisAPI

# Initialize LORIS credentials (optional, can be set via events)
lorisCredentials = {
    'lorisURL': '',
    'lorisUsername': '',
    'lorisPassword': '',
}

# Create socket listener with comprehensive settings
sio = socketio.Server(
    async_mode='eventlet',
    ping_timeout=60000,
    cors_allowed_origins=[],
)
app = socketio.WSGIApp(sio)

# Create Loris API handler
loris_api = LorisAPI()
tar_handler = iEEG.TarFile()

# Configure logging
log = logging.getLogger()
handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
log.addHandler(handler)
log.setLevel(logging.DEBUG)

# Override print to flush immediately
print = functools.partial(print, flush=True)

@sio.event
def connect(sid, environ):
    try:
        print('Client connected:', sid)
        if environ.get('REMOTE_ADDR') != '127.0.0.1':
            print(f"Rejected connection from {environ.get('REMOTE_ADDR')}")
            return False  # Reject non-local connections
        else:
            print(f"Accepted connection from {environ.get('REMOTE_ADDR')}")
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        print(traceback.format_exc())

@sio.event
def disconnect(sid):
    print('Client disconnected:', sid)

@sio.event
def set_loris_credentials(sid, data):
    try:
        print('Setting LORIS credentials:', data)
        if 'lorisURL' not in data:
            error_msg = 'lorisURL is required.'
            print(error_msg)
            sio.emit('loris_login_response', {'error': error_msg}, to=sid)
            return

        loris_api.url = data['lorisURL'].rstrip('/') + '/api/v0.0.4-dev/'
        loris_api.username = data.get('lorisUsername', '')
        loris_api.password = data.get('lorisPassword', '')
        loris_api.token = data.get('lorisToken', '')

        if loris_api.token:
            # If token is provided, use it directly
            loris_api.authenticate_with_token()
        else:
            # Perform login with username and password
            resp = loris_api.login()
            if isinstance(resp, dict) and resp.get('error'):
                sio.emit('loris_login_response', {'error': resp.get('error')}, to=sid)
                return

        # Successful authentication
        response = {
            'success': 200,
            'lorisUsername': loris_api.username,
            'lorisURL': loris_api.url,
            'lorisToken': loris_api.token,
        }
        print('LORIS credentials set successfully.')
        sio.emit('loris_login_response', response, to=sid)

        # Optionally emit sites and projects
        sio.emit('loris_sites', loris_api.get_sites(), to=sid)
        sio.emit('loris_projects', loris_api.get_projects(), to=sid)
    except Exception as e:
        error_msg = 'Connection refused.'
        sio.emit('loris_login_response', {'error': error_msg}, to=sid)
        sio.emit('server_error', {'error': str(e)}, to=sid)
        print(traceback.format_exc())

@sio.event
def get_loris_sites(sid):
    try:
        sites = loris_api.get_sites()
        sio.emit('loris_sites', sites, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        print(traceback.format_exc())

@sio.event
def get_loris_projects(sid):
    try:
        projects = loris_api.get_projects()
        sio.emit('loris_projects', projects, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        print(traceback.format_exc())

@sio.event
def get_loris_subprojects(sid, project):
    try:
        subprojects = loris_api.get_subprojects(project)
        sio.emit('loris_subprojects', subprojects, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        print(traceback.format_exc())

@sio.event
def get_loris_visits(sid, subproject):
    try:
        visits = loris_api.get_visits(subproject)
        sio.emit('loris_visits', visits, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        print(traceback.format_exc())

@sio.event
def get_loris_visit(sid, data):
    try:
        candID = data.get('candID')
        visit = data.get('visit')
        if not candID or not visit:
            error_msg = 'candID and visit are required.'
            sio.emit('server_error', {'error': error_msg}, to=sid)
            return
        visit_data = loris_api.get_visit(candID, visit)
        sio.emit('loris_visit', visit_data, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        print(traceback.format_exc())

@sio.event
def create_visit(sid, data):
    try:
        print('Creating visit:', data)
        loris_api.create_visit(
            candID=data['candID'],
            visit=data['visit'],
            site=data['site'],
            project=data['project'],
            subproject=data['subproject']
        )
        loris_api.start_next_stage(
            candID=data['candID'],
            visit=data['visit'],
            site=data['site'],
            subproject=data['subproject'],
            project=data['project'],
            date=data['date']
        )
        response = {'success': 'Visit created and stage started.'}
        sio.emit('response', response, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        print(traceback.format_exc())

@sio.event
def create_candidate_and_visit(sid, data):
    try:
        print('Creating candidate and visit:', data)
        new_candidate = loris_api.create_candidate(
            project=data['project'],
            dob=data['dob'],
            sex=data['sex'],
            site=data['site'],
        )

        if new_candidate.get('CandID'):
            loris_api.create_visit(
                candID=new_candidate['CandID'],
                visit=data['visit'],
                site=data['site'],
                project=data['project'],
                subproject=data['subproject']
            )
            visit_started = loris_api.start_next_stage(
                candID=new_candidate['CandID'],
                visit=data['visit'],
                site=data['site'],
                subproject=data['subproject'],
                project=data['project'],
                date=data['date']
            )
            if visit_started.get('error'):
                new_candidate['error'] = f"Candidate {new_candidate['CandID']} created, but cannot start visit: {visit_started.get('error')}"
        else:
            new_candidate['error'] = 'Failed to create candidate.'

        sio.emit('new_candidate_created', new_candidate, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        print(traceback.format_exc())

def tarfile_bids_thread(data):
    """
    Handles packaging PII, uploading PII, compressing BIDS directory, and uploading EEG data to LORIS.
    """
    print('tarfile_bids_thread:', data)
    try:
        tar_handler.set_stage('packaging PII')
        pii_tar = tar_handler.package_pii(data['mffFiles'], data['filePrefix'])

        tar_handler.set_stage('upload PII')
        pii_response = loris_api.upload_pii(pii_tar)

        tar_handler.set_stage('compressing')
        tar_handler.package(data['bidsDirectory'])
        output_filename = data['bidsDirectory'] + '.tar.gz'

        tar_handler.set_stage('loris_upload')
        loris_response = loris_api.upload_eeg(
            output_filename,
            data['metaData'],
            data['candID'],
            data['pscid'],
            data['visit']
        )

        response = {
            'loris': loris_response,
            'pii': pii_response
        }
        return eventlet.tpool.Proxy(response)
    except Exception as e:
        error_response = {
            'error': f'Unknown error: {str(e)}'
        }
        print(traceback.format_exc())
        return eventlet.tpool.Proxy(error_response)

def edf_to_bids_thread(data):
    """
    Converts EDF data to BIDS format using EDFHandler.
    """
    print('edf_to_bids_thread:', data)
    error_messages = []

    # Validate input data
    if 'eegData' not in data or 'files' not in data['eegData'] or not data['eegData']['files']:
        error_messages.append('No EEG file(s) to convert.')
    if 'bids_directory' not in data or not data['bids_directory']:
        error_messages.append('The BIDS output folder is missing.')
    if not data.get('session'):
        error_messages.append('The LORIS Visit Label is missing.')

    if not error_messages:
        try:
            # Instantiate the EDFHandler with data
            handler = EDFHandler(data)
            
            # Perform the conversion
            handler.convert_to_bids()

            # Prepare the response
            response = {
                'output_time': data['output_time']
            }
            return eventlet.tpool.Proxy(response)
        except ReadError as e:
            error_messages.append(f'Cannot read file: {str(e)}')
            print(traceback.format_exc())
        except WriteError as e:
            error_messages.append(f'Cannot write file: {str(e)}')
            print(traceback.format_exc())
        except Exception as e:
            error_messages.append(f'Unknown error: {str(e)}')
            print(traceback.format_exc())

    # Return errors if any
    response = {
        'error': error_messages
    }
    print(response)
    return eventlet.tpool.Proxy(response)

def set_to_bids_thread(data):
    """
    Converts SET data to BIDS format using SETHandler.
    """
    print('set_to_bids_thread:', data)
    error_messages = []

    # Validate input data
    if 'setData' not in data or 'files' not in data['setData'] or not data['setData']['files']:
        error_messages.append('No SET file(s) to convert.')
    if 'bids_directory' not in data or not data['bids_directory']:
        error_messages.append('The BIDS output folder is missing.')
    if not data.get('session'):
        error_messages.append('The LORIS Visit Label is missing.')

    if not error_messages:
        try:
            # Instantiate the SETHandler with data
            handler = SETHandler(data)
            
            # Perform the conversion
            handler.convert_to_bids()

            # Prepare the response
            response = {
                'output_time': data['output_time']
            }
            return eventlet.tpool.Proxy(response)
        except ReadError as e:
            error_messages.append(f'Cannot read file: {str(e)}')
            print(traceback.format_exc())
        except WriteError as e:
            error_messages.append(f'Cannot write file: {str(e)}')
            print(traceback.format_exc())
        except Exception as e:
            error_messages.append(f'Unknown error: {str(e)}')
            print(traceback.format_exc())

    # Return errors if any
    response = {
        'error': error_messages
    }
    print(response)
    return eventlet.tpool.Proxy(response)

@sio.event
def convert_eeg_to_bids(sid, data):
    """
    Handles conversion of EEG data (both EDF and SET) to BIDS format.
    The data should include a 'file_format' key indicating 'edf' or 'set'.
    """
    try:
        print('Conversion requested:', data)
        file_format = data.get('file_format')

        if file_format == 'edf':
            response = tpool.execute(edf_to_bids_thread, data)
            event_name = 'edf_bids_response'
        elif file_format == 'set':
            response = tpool.execute(set_to_bids_thread, data)
            event_name = 'set_bids_response'
        else:
            response = {'error': 'Unsupported file format. Use "edf" or "set".'}
            event_name = 'bids_response'

        print('Conversion response:', response)

        sio.emit(event_name, response.copy(), to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        print(traceback.format_exc())

@sio.event
def get_progress(sid):
    """
    Provides progress updates based on the current stage of processing.
    """
    try:
        progress_info = {
            'stage': tar_handler.stage,
            'progress': 0,
            'read': 0,
            'total': 0,
        }
        if tar_handler.stage == 'loris_upload':
            progress_info['progress'] = int(
                loris_api.upload_read / loris_api.upload_total * 100
            )
            progress_info['read'] = loris_api.upload_read
            progress_info['total'] = loris_api.upload_total
        elif tar_handler.stage == 'compressing':
            progress_info['progress'] = int(tar_handler.progress)
        elif tar_handler.stage == 'packaging PII':
            progress_info['progress'] = int(tar_handler.pii_progress)
        elif tar_handler.stage == 'upload PII':
            progress_info['progress'] = int(
                loris_api.upload_pii_read / loris_api.upload_pii_total * 100
            )
            progress_info['read'] = loris_api.upload_pii_read
            progress_info['total'] = loris_api.upload_pii_total
        sio.emit('progress', progress_info, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        print(traceback.format_exc())

@sio.event
def validate_bids(sid, bids_directory):
    """
    Validates the BIDS directory structure.
    """
    try:
        print('validate_bids request:', bids_directory)
        error_messages = []
        if not bids_directory:
            error_messages.append('The BIDS output directory is missing.')

        if not error_messages:
            try:
                BIDS.Validate(bids_directory)
                response = {
                    'file_paths': BIDS.Validate.file_paths,
                    'result': BIDS.Validate.result
                }
            except Exception as e:
                error_messages.append(f'Validation failed: {str(e)}')
                response = {'error': error_messages}
        else:
            response = {'error': error_messages}

        print('BIDS Validation Response:', response)
        sio.emit('response', response, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        print(traceback.format_exc())

@sio.event
def tarfile_bids(sid, data):
    """
    Handles the process of packaging PII, compressing BIDS directory, and uploading to LORIS.
    """
    try:
        print('tarfile_bids request:', data)
        response = tpool.execute(tarfile_bids_thread, data)

        if 'error' in response:
            resp = {
                'type': 'upload',
                'code': 500,
                'body': {
                    'errors': [response['error']]
                }
            }
        elif response.get('pii', {}).get('status_code', 0) >= 400 or response.get('loris', {}).get('status_code', 0) >= 400:
            errors = []
            if response.get('pii', {}).get('status_code', 0) >= 400:
                print(response['pii'])
                errors.append('PII Error: ' + response['pii'].get('reason', 'Unknown PII upload error'))
            if response.get('loris', {}).get('status_code', 0) >= 400:
                try:
                    error = response['loris'].json().get('error', 'Unknown LORIS upload error')
                    print(error)
                    errors.append('LORIS Error: ' + error)
                except json.decoder.JSONDecodeError:
                    error = response['loris'].get('reason', 'Unknown LORIS upload error')
                    errors.append('LORIS Error: ' + error)
            resp = {
                'type': 'upload',
                'code': max(response['pii'].get('status_code', 0), response['loris'].get('status_code', 0)),
                'body': {
                    'errors': errors
                }
            }
        else:
            resp = {
                'type': 'upload',
                'code': response['loris'].get('status_code', 200),
                'body': response['loris'].json()
            }

        sio.emit('response', resp, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        print(traceback.format_exc())

def main():
    try:
        eventlet.wsgi.server(
            eventlet.listen(('127.0.0.1', 7301)),
            app,
            log=log,
            log_output=True
        )
    except Exception as e:
        sio.emit('server_error', {'error': str(e)})
        print(traceback.format_exc())

if __name__ == '__main__':
    main()
