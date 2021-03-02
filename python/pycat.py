import eventlet
import socketio
from python.libs import iEEG
from python.libs import BIDS
from python.libs.edfrw import open_edf
from python.libs.edfrw.headers import EdfHeaderException
import pyedflib
import numpy as np


# Create socket listener.
sio = socketio.Server(async_mode='eventlet', cors_allowed_origins=[])
app = socketio.WSGIApp(sio)

try:
    # Open file in reading (default) mode
    # f = open_edf('/Users/alizee/Desktop/data/Example_from_the_MNI.edf')
    f = open_edf('/Users/alizee/Desktop/data/Example_from_Lyon_Micromed.edf')
    print('version:')
    print(f.header.version)
    print('subject_id:')
    print(f.header.subject_id)
    print('recording_id:')
    print(f.header.recording_id)
    print('startdate:')
    print(f.header.startdate)
    print('starttime:')
    print(f.header.starttime)
except EdfHeaderException:
    print('An exception occurred')

f = pyedflib.EdfReader('/Users/alizee/Desktop/data/Example_from_the_MNI.edf')
n = f.signals_in_file
signal_labels = f.getSignalLabels()
sigbufs = np.zeros((n, f.getNSamples()[0]))
for i in np.arange(n):
        sigbufs[i, :] = f.readSignal(i)


@sio.event
def connect(sid, environ):
    print('connect: ', sid)


@sio.event
def ieeg_to_bids(sid, data):
    print('ieeg_to_bids: ', data)
    iEEG.Converter(data)  # iEEG to BIDS format.
    # store subject_id for iEEG.Modifier
    data['subject_id'] = iEEG.Converter.m_info['subject_id']
    iEEG.Modifier(data)  # Modifies data of BIDS format
    response = {
        'directory_name': data['subject_id'].replace('_', '').replace('-', '').replace(' ', '')
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
