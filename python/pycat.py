import eventlet
import socketio
from python.libs import iEEG


sio = socketio.Server(async_mode='eventlet', cors_allowed_origins=[])
app = socketio.WSGIApp(sio)


@sio.event
def connect(sid, environ):
    print('connect: ', sid)


@sio.event
def my_message(sid, data):
    print('message: ', data)
    sio.emit('response', 'hello you!')


@sio.event
def ieeg_to_bids(sid, data):
    print('ieeg_to_bids: ', data)
    iEEG.Converter(data)
    directory_name = 'sub-' + iEEG.Converter.m_info['subject_id']\
        .replace('_', '').replace('-', '').replace(' ', '')
    print(directory_name)
    # os.path.join(mydir, myfile)
    # pathlib.Path(mydir, myfile)
    # os.path.join( "C:", "meshes", "as" )
    sio.emit('response', 'success')


@sio.event
def modify_bids_tsv(sid, data):
    print('modify_bids_tsv: ', data)
    iEEG.Modifier(data)
    sio.emit('response', 'success')


@sio.event
def disconnect(sid):
    print('disconnect: ', sid)


if __name__ == '__main__':
    eventlet.wsgi.server(eventlet.listen(('', 5000)), app)
