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
# lorisCredentials = {
#     'lorisURL': '',
#     'lorisUsername': '',
#     'lorisPassword': '',
# }

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

# Define the custom WSGI log handler
class WsgiLogHandler:
    def write(self, message):
        message = message.strip()
        if message:
            log.info(message)
    def flush(self):
        pass

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
    try:
        print('Client disconnected:', sid)
    except:
        pass

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
        if 'candID' not in data or not data['candID']:
            sio.emit('candID and visit are required.')
            return
        if 'visit' not in data or not data['visit']:
            sio.emit('candID and visit are required.')
            return
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

@sio.event
def eeg_to_bids_thread(data):
    print('eeg_to_bids_thread:', data)
    error_messages = []

    # Validate input data
    if 'eegData' not in data or 'files' not in data['eegData'] or not data['eegData']['files']:
        error_messages.append('No EEG file(s) to convert.')
    if 'bids_directory' not in data or not data['bids_directory']:
        error_messages.append('The BIDS output folder is missing.')
    if not data.get('session'):
        error_messages.append('The LORIS Visit Label is missing.')

    if not error_messages:
        time = iEEG.Time()
        data['output_time'] = 'output-' + time.latest_output

        try:
            # Determine file format from data
            file_format = data.get('file_format')
            if file_format == 'edf':
                handler = EDFHandler(data)
            elif file_format == 'set':
                handler = SETHandler(data)
            else:
                error_messages.append('Unsupported file format.')
                response = {'error': error_messages}
                return eventlet.tpool.Proxy(response)
            # Perform the conversion
            handler.convert_to_bids()

            # Store subject_id for Modifier
            data['subject_id'] = handler.m_info['subject_info']['his_id']
            Modifier(data)  # Modifies data of BIDS format

            # Prepare the response
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
                'error': 'Unknown error: ' + str(e)
            }
            print(traceback.format_exc())
    else:
        response = {
            'error': error_messages
        }

    print(response)
    return eventlet.tpool.Proxy(response)


@sio.event
def get_set_data(sid, data):
    """
    Event handler for processing SET files when they are selected.
    """
    print('get_set_data:', data)

    if 'files' not in data or not data['files']:
        response = {
            'error': 'No SET file selected.'
        }
    else:
        try:
            # Use a fixed date since SET files are anonymized during the BIDS conversion
            date = datetime.datetime(2000, 1, 1, 0, 0)

            # Prepare the response data
            response = {
                'files': data['files'],
                'subjectID': '',
                'recordingID': '',
                'date': str(date),
                'fileFormat': 'set',
            }

        except Exception as e:
            print(traceback.format_exc())
            response = {
                'error': 'Failed to retrieve SET file information',
            }

    print('Emitting eeg_data:', response)
    sio.emit('eeg_data', response, to=sid)


@sio.event
def get_edf_data(sid, data):
    print('get_edf_data',data)
    # data = { files: 'EDF files (array of {path, name})' }


    if 'files' not in data or not data['files']:
        response = {'error': 'No EDF file selected.'}
    else:
        headers = []
        try:
            for file in data['files']:
                anonymize = iEEG.Anonymize(file['path'])
                metadata = anonymize.get_header()
                year = '20' + str(metadata[0]['year']) if metadata[0]['year'] < 85 else '19' + str(metadata[0]['year'])
                date = datetime.datetime(int(year), metadata[0]['month'], metadata[0]['day'], metadata[0]['hour'],
                                        metadata[0]['minute'], metadata[0]['second'])

                headers.append({
                    'file': file,
                    'metadata': metadata,
                    'date': str(date)
                })

            multipleRecordings = False
            for i in range(1, len(headers)):
                if set(headers[i - 1]['metadata'][1]['ch_names']) != set(headers[i]['metadata'][1]['ch_names']):
                    multipleRecordings = True
                    break
                    
            if multipleRecordings:
                response = {'error': 'The files selected contain more than one recording.'}
            else:
                # sort the recording per date
                headers = sorted(headers, key=lambda k: k['date'])

                # return the first split metadata and date
                response = {
                    'files': [header['file'] for header in headers],
                    'subjectID': headers[0]['metadata'][0]['subject_id'],
                    'recordingID': headers[0]['metadata'][0]['recording_id'],
                    'date': headers[0]['date'],
                    'fileFormat': 'edf',
                }
               
        except ReadError as e:
            print(traceback.format_exc())
            response = {
                'error': 'Cannot read file - ' + str(e)
            }
        except Exception as e:
            print(traceback.format_exc())
            response = {
                'error': 'Failed to retrieve EDF header information',
            }

    print(response)
    sio.emit('eeg_data', response)



@sio.event
def convert_eeg_to_bids(sid, data):
    """
    Handles conversion of EEG data to BIDS format.
    """
    print('BIDS Conversion - START')
    print('convert_eeg_to_bids:', data)
    response = eventlet.tpool.execute(eeg_to_bids_thread, data)
    print('Conversion response:', response)
    print('BIDS Conversion - END')
    sio.emit('bids', response.copy(), to=sid)

def main():
    try:
        # Create an instance of the custom log handler
        wsgi_log_handler = WsgiLogHandler()
        eventlet.wsgi.server(
            eventlet.listen(('127.0.0.1', 7301)),
            app,
            log=wsgi_log_handler,
            log_output=True
        )
    except Exception as e:
        sio.emit('server_error', {'error': str(e)})
        print(traceback.format_exc())

if __name__ == '__main__':
    main()
