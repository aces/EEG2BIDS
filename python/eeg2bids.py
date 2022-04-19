# import _thread
import os
os.environ['EVENTLET_NO_GREENDNS'] = 'yes'
import eventlet
from eventlet import tpool
import socketio
from python.libs import iEEG
from python.libs.iEEG import ReadError, WriteError, metadata as metadata_fields
from python.libs.Modifier import Modifier
from python.libs import BIDS
from python.libs.loris_api import LorisAPI
import csv
import datetime
import json
import subprocess
import sys

# LORIS credentials of user
lorisCredentials = {
    'lorisURL': '',
    'lorisUsername': '',
    'lorisPassword': '',
}

# Create socket listener.
sio = socketio.Server(async_mode='eventlet', cors_allowed_origins=[])
app = socketio.WSGIApp(sio)

# Create Loris API handler.
loris_api = LorisAPI()
tar_handler = iEEG.TarFile()


@sio.event
def connect(sid, environ):
    print('connect: ', sid)
    if environ['REMOTE_ADDR'] != '127.0.0.1':
        return False  # extra precaution.

def tarfile_bids_thread(bids_directory):
    tar_handler.set_stage('compressing')
    tar_handler.package(bids_directory)
    output_filename = bids_directory + '.tar.gz'
    tar_handler.set_stage('loris_upload')
    loris_api.upload_eeg(output_filename)
    response = {
        'compression_time': 'example_5mins'
    }
    return eventlet.tpool.Proxy(response)

@sio.event
def get_progress(sid):
    progress_info = {
        'stage': tar_handler.stage,
        'progress': 0
    }
    if tar_handler.stage == 'loris_upload':
        progress_info['progress'] = int(loris_api.upload_progress * 100)
    elif tar_handler.stage == 'compressing':
        print('eeg ', tar_handler.progress)
        progress_info['progress'] = int(tar_handler.progress)

    sio.emit('progress', progress_info)

@sio.event
def tarfile_bids(sid, bids_directory):
    response = eventlet.tpool.execute(tarfile_bids_thread, bids_directory)
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
    if 'lorisURL' not in lorisCredentials:
        print('error with credentials:', data)
        return

    if lorisCredentials['lorisURL'].endswith('/'):
        lorisCredentials['lorisURL'] = lorisCredentials['lorisURL'][:-1]
    loris_api.url = lorisCredentials['lorisURL'] + '/api/v0.0.4-dev/'
    loris_api.uploadURL = lorisCredentials['lorisURL'] + '/electrophysiology_uploader/upload/'
    loris_api.username = lorisCredentials['lorisUsername']
    loris_api.password = lorisCredentials['lorisPassword']
    resp = loris_api.login()

    if resp.get('error'):
        sio.emit('loris_login_response', {'error': resp.get('error')})
    else:
        sio.emit('loris_login_response', {
            'success': 200,
            'lorisUsername': loris_api.username
        })
        sio.emit('loris_sites', loris_api.get_sites())
        sio.emit('loris_projects', loris_api.get_projects())


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
def get_edf_data(sid, data):
    # data = { files: 'EDF files (array of {path, name})' }

    if 'files' not in data or not data['files']:
        msg = 'No EDF file selected.'
        print(msg)
        response = {'error': msg}
        sio.emit('edf_data', response)
        return

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

        for i in range(1, len(headers)):
            if set(headers[i - 1]['metadata'][1]['ch_names']) != set(headers[i]['metadata'][1]['ch_names']):
                msg = 'The files selected contain more than one recording.'
                print(msg)
                response = {
                    'error': msg,
                }
                sio.emit('edf_data', response)
                return

        # sort the recording per date
        headers = sorted(headers, key=lambda k: k['date'])

        # return the first split metadata and date
        response = {
            'files': [header['file'] for header in headers],
            'subjectID': headers[0]['metadata'][0]['subject_id'],
            'recordingID': headers[0]['metadata'][0]['recording_id'],
            'date': headers[0]['date']
        }

    except ReadError as e:
        print(e)
        response = {
            'error': 'Cannot read file - ' + str(e)
        }
    except Exception as e:
        print(e)
        response = {
            'error': 'Failed to retrieve EDF header information',
        }
    sio.emit('edf_data', response)


@sio.event
def get_set_data(sid, data):
    # data = { files: 'SET files (array of {path, name})' }
    print('get_set_data:', data)

    if 'files' not in data or not data['files']:
        msg = 'No SET file selected.'
        print(msg)
        response = {'error': msg}
        sio.emit('set_data', response)
        return

    headers = []
    try:
        for file in data['files']:
            headers.append({
                'file': file,
            })

        # date will be anonymized to this value during bids step
        date = datetime.datetime(2000, 1, 1, 0, 0)

        # return the first split metadata and date
        response = {
            'files': [header['file'] for header in headers],
            'subjectID': '',
            'recordingID': '',
            'date': str(date)
        }

    except Exception as e:
        print(e)
        response = {
            'error': 'Failed to retrieve SET file information',
        }

    sio.emit('set_data', response)


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


def eeg_to_bids_thread(data):
    print('data is ')
    print(data)
    error_messages = []
    if 'eegData' not in data or 'files' not in data['eegData'] or not data['eegData']['files']:
        error_messages.append('No eeg file(s) to convert.')
    if 'bids_directory' not in data or not data['bids_directory']:
        error_messages.append('The BIDS output folder is missing.')
    if not data['session']:
        error_messages.append('The LORIS Visit Label is missing.')

    if not error_messages:
        time = iEEG.Time()
        data['output_time'] = 'output-' + time.latest_output

        try:
            iEEG.Converter(data)  # EDF to BIDS format.

            # store subject_id for Modifier
            data['subject_id'] = iEEG.Converter.m_info['subject_info']['his_id']
            Modifier(data)  # Modifies data of BIDS format
            response = {
                'output_time': data['output_time']
            }
            return eventlet.tpool.Proxy(response)
        except ReadError as e:
            response = {
                'error': 'Cannot read file - ' + str(e)
            }
        except WriteError as e:
            response = {
                'error': 'Cannot write file - ' + str(e)
            }
    else:
        response = {
            'error': error_messages
        }
    return eventlet.tpool.Proxy(response)


@sio.event
def eeg_to_bids(sid, data):
    # data = { file_paths: [], bids_directory: '', read_only: false,
    # event_files: '', line_freq: '', site_id: '', project_id: '',
    # sub_project_id: '', session: '', subject_id: ''}
    print('eeg_to_bids: ', data)
    response = eventlet.tpool.execute(eeg_to_bids_thread, data)
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


if __name__ == '__main__':
    eventlet.wsgi.server(
        eventlet.listen(('127.0.0.1', 7301)),
        app,
        log_output=True
    )
