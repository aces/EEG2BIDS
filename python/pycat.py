import eventlet
import socketio
from python.libs import iEEG
from python.libs import BIDS
from python.libs.edfrw import open_edf
from python.libs.edfrw.headers import EdfHeaderException

from python.libs.EDF import EDFReader
from python.libs.EDF import EDFWriter


# Create socket listener.
sio = socketio.Server(async_mode='eventlet', cors_allowed_origins=[])
app = socketio.WSGIApp(sio)

# with open('/Users/alizee/Desktop/data/test.edf', encoding='latin-1') as f:
#     first_line = f.readline()

# file_in = EDFReader(fname='/Users/alizee/Desktop/data/Example_from_Lyon_Micromed.edf')
# header = file_in.readHeader()
# print('header is ')
# print(header)
# print('subject_id:')
# print(header[0]['subject_id'])
# print('recording_id:')
# print(header[0]['recording_id'])
# print('day:')
# print(header[0]['day'])
# print('month:')
# print(header[0]['month'])
# print('year:')
# print(header[0]['year'])
# print('hour:')
# print(header[0]['hour'])
# print('minute:')
# print(header[0]['minute'])
# print('second:')
# print(header[0]['second'])
# m_info, c_info = file_in.open(fname='/Users/alizee/Desktop/data/Example_from_Lyon_Micromed.edf')
# print('meas_info is ')
# print(m_info)
# print('chan_info is ')
# print(c_info)
#
# file_out = EDFWriter()
# file_out.open('/Users/alizee/Desktop/data/Example_from_Lyon_Micromed_Copy.edf')
# file_out.writeHeader(header)
# meas_info = header[0]
# for i in range(meas_info['n_records']):
#     data = file_in.readBlock(i)
#     file_out.writeBlock(data)
# file_in.close()
# file_out.close()


@sio.event
def connect(sid, environ):
    print('connect: ', sid)


@sio.event
def ieeg_get_header(sid, data):
    print('ieeg_get_header:')
    print(data)
    print(data)
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
