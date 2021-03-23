import eventlet
import socketio
from python.libs import iEEG
from python.libs import BIDS


# Create socket listener.
sio = socketio.Server(async_mode='eventlet', cors_allowed_origins=[])
app = socketio.WSGIApp(sio)


@sio.event
def connect(sid, environ):
    print('connect: ', sid)


@sio.event
def ieeg_get_header(sid, data):
    print('ieeg_get_header:')
    anonymize = iEEG.Anonymize(data)
    header = anonymize.get_header()
    response = {
        'header': header[0]
    }
    sio.emit('response', response)


@sio.event
def ieeg_anonymize_header(sid, data):
    print('ieeg_anonymize_header: ', sid)
    print('data is ')
    print(data)
    anonymize = iEEG.Anonymize(data)


@sio.event
def edf_to_bids(sid, data):
    print('edf_to_bids: ', data)
    time = iEEG.Time()
    data['output_time'] = 'output-' + time.latest_output
    iEEG.Converter(data)  # EDF to BIDS format.
    # store subject_id for iEEG.Modifier
    data['subject_id'] = iEEG.Converter.m_info['subject_id']
    iEEG.Modifier(data)  # Modifies data of BIDS format
    response = {
        'directory_name': data['subject_id'].replace('_', '').replace('-', '').replace(' ', ''),
        'output_time': data['output_time']
    }
    sio.emit('response', response)


@sio.event
def validate_bids(sid, data):
    print('validate_bids: ', data)
    BIDS.Validate(data)
    response = {
        'file_paths': BIDS.Validate.file_paths,
        'result': BIDS.Validate.result
    }
    sio.emit('response', response)


@sio.event
def disconnect(sid):
    print('disconnect: ', sid)


if __name__ == '__main__':
    eventlet.wsgi.server(
        eventlet.listen(('', 5000)),
        app,
        log_output=False
    )
