import datetime
import json
import logging
import os
import sys
import traceback

import eventlet
from eventlet import tpool
import socketio

# Add the 'python' directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
python_lib_path = os.path.join(current_dir, 'python')

if python_lib_path not in sys.path:
    sys.path.append(python_lib_path)

from python.libs.BaseHandler import ReadError, WriteError, Time, metadata as metadata_fields
from python.libs.EDFHandler import EDFHandler
from python.libs.SETHandler import SETHandler
from python.libs.Modifier import Modifier
from python.libs.BIDS import Validate
# from python.libs import iEEG
from python.libs.loris_api import LorisAPI
from python.libs.TarFile import TarFile
from python.libs.Anonymize import Anonymize

# Set environment variable for Eventlet
os.environ['EVENTLET_NO_GREENDNS'] = 'yes'

# Initialize LORIS credentials (optional, can be set via events)
lorisCredentials = {
    'lorisURL': '',
    'lorisUsername': '',
    'lorisPassword': '',
}

# Configure logging
log = logging.getLogger()
handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
handler.setFormatter(formatter)
log.addHandler(handler)
log.setLevel(logging.DEBUG)

# Initialize Socket.IO server
sio = socketio.Server(
    async_mode='eventlet',
    ping_timeout=60000,
    cors_allowed_origins=[],
)
app = socketio.WSGIApp(sio)

# Create Loris API and TarFile handlers
loris_api = LorisAPI()
tar_handler = TarFile()

# Initialize file format, needed for upload_tarfile_bids()
file_format = 'set'


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
        log.info(f'Client connected: {sid}')
        remote_addr = environ.get('REMOTE_ADDR')
        if remote_addr != '127.0.0.1':
            log.warning(f"Rejected connection from {remote_addr}")
            return False
        else:
            log.info(f"Accepted connection from {remote_addr}")
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        log.error(traceback.format_exc())


@sio.event
def disconnect(sid):
    log.info(f'Client disconnected: {sid}')

@sio.event
def get_participant_data(sid, data):
    """
    Event handler to retrieve participant data based on candID.
    """
    log.info(f'get_participant_data: {data}')
    cand_id = data.get('candID')

    if not cand_id:
        error_msg = 'candID is required.'
        log.error(error_msg)
        sio.emit('server_error', {'error': error_msg}, to=sid)
        return

    try:
        candidate = loris_api.get_candidate(cand_id)
        sio.emit('participant_data', candidate, to=sid)
    except Exception as e:
        log.error('Error retrieving participant data.', exc_info=True)
        sio.emit('server_error', {'error': str(e)}, to=sid)

@sio.event
def set_loris_credentials(sid, data):
    try:
        log.info(f'Setting LORIS credentials: {data}')
        loris_url = data.get('lorisURL')
        if not loris_url:
            error_msg = 'lorisURL is required.'
            log.error(error_msg)
            sio.emit('loris_login_response', {'error': error_msg}, to=sid)
            return

        loris_api.url = loris_url.rstrip('/') + '/api/v0.0.4-dev/'
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
        log.info('LORIS credentials set successfully.')
        sio.emit('loris_login_response', response, to=sid)

        # Optionally emit sites and projects
        sio.emit('loris_sites', loris_api.get_sites(), to=sid)
        sio.emit('loris_projects', loris_api.get_projects(), to=sid)
    except Exception as e:
        error_msg = 'Connection refused.'
        sio.emit('loris_login_response', {'error': error_msg}, to=sid)
        sio.emit('server_error', {'error': str(e)}, to=sid)
        log.error(traceback.format_exc())


@sio.event
def get_loris_sites(sid):
    try:
        sites = loris_api.get_sites()
        sio.emit('loris_sites', sites, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        log.error(traceback.format_exc())


@sio.event
def get_loris_projects(sid):
    try:
        projects = loris_api.get_projects()
        sio.emit('loris_projects', projects, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        log.error(traceback.format_exc())


@sio.event
def get_loris_subprojects(sid, project):
    try:
        subprojects = loris_api.get_subprojects(project)
        sio.emit('loris_subprojects', subprojects, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        log.error(traceback.format_exc())


@sio.event
def get_loris_visits(sid, subproject):
    try:
        visits = loris_api.get_visits(subproject)
        sio.emit('loris_visits', visits, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        log.error(traceback.format_exc())


@sio.event
def get_loris_visit(sid, data):
    try:
        cand_id = data.get('candID')
        visit = data.get('visit')
        if not cand_id or not visit:
            error_msg = 'candID and visit are required.'
            log.error(error_msg)
            sio.emit(error_msg)
            return
        sio.emit('loris_visit', loris_api.get_visit(cand_id, visit))

    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        log.error(traceback.format_exc())


@sio.event
def create_visit(sid, data):
    try:
        log.info(f'Creating visit: {data}')
        loris_api.create_visit(
            data['candID'],
            data['visit'],
            data['site'],
            data['project'],
            data['subproject']
        )
        loris_api.start_next_stage(
            data['candID'],
            data['visit'],
            data['site'],
            data['subproject'],
            data['project'],
            data['date']
        )
        response = {'success': 'Visit created and stage started.'}
        sio.emit('response', response, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        log.error(traceback.format_exc())


@sio.event
def create_candidate_and_visit(sid, data):
    try:
        log.info(f'Creating candidate and visit: {data}')
        new_candidate = loris_api.create_candidate(
            data['project'],
            data['dob'],
            data['sex'],
            data['site'],
        )

        if new_candidate.get('CandID'):
            loris_api.create_visit(
                new_candidate['CandID'],
                data['visit'],
                data['site'],
                data['project'],
                data['subproject']
            )
            visit_started = loris_api.start_next_stage(
                new_candidate['CandID'],
                data['visit'],
                data['site'],
                data['subproject'],
                data['project'],
                data['date']
            )
            if visit_started.get('error'):
                new_candidate['error'] = (
                    f"Candidate {new_candidate['CandID']} created, "
                    f"but cannot start visit: {visit_started.get('error')}"
                )
        else:
            new_candidate['error'] = 'Failed to create candidate.'

        sio.emit('new_candidate_created', new_candidate, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        log.error(traceback.format_exc())


def tarfile_edf_bids_thread(data):
    log.info(f'tarfile_edf_bids_thread: {data}')
    try:
        tar_handler.package(data['bidsDirectory'])
        response = {
            'compression_time': 'example_5mins'
        }
        return eventlet.tpool.Proxy(response)
    except Exception as e:
        error_response = {
            'error': f'Unknown error: {str(e)}'
        }
        log.error(traceback.format_exc())
        return eventlet.tpool.Proxy(error_response)


def tarfile_set_bids_thread(data):
    """
    Handles packaging PII, uploading PII, compressing BIDS directory, and uploading EEG data to LORIS.
    """
    log.info(f'tarfile_set_bids_thread: {data}')
    try:
        tar_handler.set_stage('packaging PII')
        pii_tar = tar_handler.packagePII(data['mffFiles'], data['filePrefix'])

        tar_handler.set_stage('upload PII')
        pii_response = loris_api.upload_pii(pii_tar)

        tar_handler.set_stage('compressing')
        tar_handler.package(data['bidsDirectory'])
        output_filename = f"{data['bidsDirectory']}.tar.gz"

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
        log.error(traceback.format_exc())
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
        log.error(traceback.format_exc())


@sio.event
def tarfile_bids(sid, data):
    log.info(f'tarfile_bids: {data}')
    try:
        tar_handler.set_stage('compressing')
        tar_handler.package(data['bidsDirectory'])

        resp = {
            'type': 'compress',
            'code': '200'
        }
        sio.emit('response', resp, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        log.error(traceback.format_exc())


@sio.event
def upload_tarfile_bids(sid, data):
    """
    Handles the process of packaging PII, compressing BIDS directory, and uploading to LORIS.
    """
    try:
        log.info(f'tarfile_bids request: {data}')
        global file_format
        if not file_format:
            response = {'error': 'fileFormat not specified in data'}
        elif file_format == 'edf':
            response = tpool.execute(tarfile_edf_bids_thread, data)
        elif file_format == 'set':
            response = tpool.execute(tarfile_set_bids_thread, data)
        else:
            response = {'error': f"Unsupported file format: {file_format}"}

        if 'error' in response:
            resp = {
                'type': 'upload',
                'code': 500,
                'body': {
                    'errors': [response['error']]
                }
            }
        elif (
            response.get('pii', {}).get('status_code', 0) >= 400
            or response.get('loris', {}).get('status_code', 0) >= 400
        ):
            errors = []
            if response.get('pii', {}).get('status_code', 0) >= 400:
                log.error(response['pii'])
                errors.append(
                    'PII Error: '
                    + response['pii'].get('reason', 'Unknown PII upload error')
                )
            if response.get('loris', {}).get('status_code', 0) >= 400:
                try:
                    error = response['loris'].json().get('error', 'Unknown LORIS upload error')
                    log.error(error)
                    errors.append('LORIS Error: ' + error)
                except json.decoder.JSONDecodeError:
                    error = response['loris'].get('reason', 'Unknown LORIS upload error')
                    errors.append('LORIS Error: ' + error)
            resp = {
                'type': 'upload',
                'code': max(
                    response['pii'].get('status_code', 0),
                    response['loris'].get('status_code', 0)
                ),
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
        log.error(traceback.format_exc())


def eeg_to_bids_thread(data):
    log.info(f'eeg_to_bids_thread: {data}')
    error_messages = []

    # Validate input data
    eeg_data = data.get('eegData', {})
    files = eeg_data.get('files', [])
    bids_directory = data.get('bids_directory')
    session = data.get('session')

    if not files or not eeg_data:
        error_messages.append('No EEG file(s) to convert.')
    if not bids_directory:
        error_messages.append('The BIDS output folder is missing.')
    if not session:
        error_messages.append('The LORIS Visit Label is missing.')

    if not error_messages:
        time_instance = Time()
        data['output_time'] = f'output-{time_instance.latest_output}'

        try:
            # Determine file format from data
            file_format_local = data.get('fileFormat')
            if file_format_local == 'edf':
                log.info("Selected EDF File, setting EDF Handler")
                handler = EDFHandler(data)
            elif file_format_local == 'set':
                log.info("Selected SET File, setting SET Handler")
                handler = SETHandler(data)
            else:
                error_messages.append('Unsupported file format.')
                response = {'error': error_messages}
                return eventlet.tpool.Proxy(response)

            # Perform the conversion
            log.info("Calling the SET/EDF File Handler")
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
                'error': f'Cannot read file - {str(e)}'
            }
            log.error(traceback.format_exc())
        except WriteError as e:
            response = {
                'error': f'Cannot write file - {str(e)}'
            }
            log.error(traceback.format_exc())
        except Exception as e:
            response = {
                'error': f'Unknown error: {str(e)}'
            }
            log.error(traceback.format_exc())
    else:
        response = {
            'error': error_messages
        }

    log.error(response)
    return eventlet.tpool.Proxy(response)


@sio.event
def get_set_data(sid, data):
    """
    Event handler for processing SET files when they are selected.
    """
    log.info(f'get_set_data: {data}')

    files = data.get('files', [])
    if not files:
        response = {
            'error': 'No SET file selected.'
        }
    else:
        try:
            # Use a fixed date since SET files are anonymized during the BIDS conversion
            date = datetime.datetime(2000, 1, 1, 0, 0)

            # Prepare the response data
            response = {
                'files': files,
                'subjectID': '',
                'recordingID': '',
                'date': str(date),
                'fileFormat': 'set',
            }

        except Exception as e:
            log.error(traceback.format_exc())
            response = {
                'error': 'Failed to retrieve SET file information',
            }

    log.info(f'Emitting eeg_data: {response}')
    sio.emit('eeg_data', response, to=sid)


@sio.event
def get_edf_data(sid, data):
    log.info(f'get_edf_data: {data}')
    # data = { files: 'EDF files (array of {path, name})' }

    files = data.get('files', [])
    if not files:
        response = {'error': 'No EDF file selected.'}
    else:
        headers = []
        try:
            for file in files:
                anonymize = Anonymize(file['path'])
                metadata = anonymize.get_header()
                year = (
                    f"20{metadata[0]['year']}"
                    if metadata[0]['year'] < 85
                    else f"19{metadata[0]['year']}"
                )
                date = datetime.datetime(
                    int(year),
                    metadata[0]['month'],
                    metadata[0]['day'],
                    metadata[0]['hour'],
                    metadata[0]['minute'],
                    metadata[0]['second']
                )

                headers.append({
                    'file': file,
                    'metadata': metadata,
                    'date': str(date)
                })

            multiple_recordings = False
            for i in range(1, len(headers)):
                if set(headers[i - 1]['metadata'][1]['ch_names']) != set(headers[i]['metadata'][1]['ch_names']):
                    multiple_recordings = True
                    break

            if multiple_recordings:
                response = {'error': 'The files selected contain more than one recording.'}
            else:
                # Sort the recordings by date
                headers_sorted = sorted(headers, key=lambda k: k['date'])

                # Return the first split metadata and date
                first_header = headers_sorted[0]
                response = {
                    'files': [first_header['file']],
                    'subjectID': first_header['metadata'][0]['subject_id'],
                    'recordingID': first_header['metadata'][0]['recording_id'],
                    'date': first_header['date'],
                    'fileFormat': 'edf',
                }

        except ReadError as e:
            log.error(traceback.format_exc())
            response = {
                'error': f'Cannot read file - {str(e)}'
            }
        except Exception as e:
            log.error(traceback.format_exc())
            response = {
                'error': 'Failed to retrieve EDF header information',
            }

    log.info(f'Response: {response}')
    sio.emit('eeg_data', response, to=sid)


@sio.event
def eeg_to_bids(sid, data):
    """
    Handles conversion of EEG data to BIDS format.
    """
    log.info('BIDS Conversion - START')
    log.info(f'convert_eeg_to_bids: {data}')
    response = tpool.execute(eeg_to_bids_thread, data)
    log.info(f'Conversion response: {response}')
    log.info('BIDS Conversion - END')
    sio.emit('bids', response.copy(), to=sid)


@sio.event
def validate_bids(sid, bids_directory):
    log.info(f'validate_bids: {bids_directory}')
    try:
        error_messages = []
        if not bids_directory:
            error_messages.append('The BIDS output directory is missing.')

        if not error_messages:
            Validate(bids_directory)
            response = {
                'file_paths': Validate.file_paths,
                'result': Validate.result
            }
        else:
            response = {
                'error': error_messages
            }

        log.info(f'Response: {response}')
        sio.emit('response', response, to=sid)
    except Exception as e:
        sio.emit('server_error', {'error': str(e)}, to=sid)
        log.error(traceback.format_exc())


@sio.event
def get_bids_metadata(sid, data):
    """
    Event handler to retrieve BIDS metadata from a specified file.
    """
    log.info(f'get_bids_metadata: {data}')

    file_path = data.get('file_path')
    modality = data.get('modality')

    if not file_path:
        error_msg = 'No metadata file selected.'
        log.error(error_msg)
        response = {'error': error_msg}
        sio.emit('bids_metadata', response, to=sid)
        return

    if modality not in ['ieeg', 'eeg']:
        error_msg = 'No valid modality found.'
        log.error(error_msg)
        response = {'error': error_msg}
        sio.emit('bids_metadata', response, to=sid)
        return

    try:
        with open(file_path, 'r') as fd:
            metadata = json.load(fd)
    except IOError:
        log.error('Could not read the metadata file.', exc_info=True)
        response = {'error': 'Could not read the metadata file.'}
        sio.emit('bids_metadata', response, to=sid)
        return
    except ValueError:
        log.error('Metadata file format is not valid.', exc_info=True)
        response = {'error': 'Metadata file format is not valid.'}
        sio.emit('bids_metadata', response, to=sid)
        return

    # List of keys with empty string values
    empty_values = [
        k for k, v in metadata.items()
        if isinstance(v, str) and v.strip() == ''
    ]

    # Difference between metadata keys and expected fields, excluding empty values
    diff = list(
        set(metadata.keys()) -
        set(metadata_fields.get(modality, [])) -
        set(empty_values)
    )

    # Keys to be ignored (empty values and unexpected fields)
    ignored_keys = empty_values + diff

    response = {
        'metadata': metadata,
        'ignored_keys': ignored_keys,
    }

    log.info(f'Response: {response}')
    sio.emit('bids_metadata', response, to=sid)


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
        log.error(traceback.format_exc())


if __name__ == '__main__':
    main()
