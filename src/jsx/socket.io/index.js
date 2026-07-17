import Socket from './Socket';
import Event from './Event';
import {SocketContext} from './SocketContext';
import {SocketStatusContext, useSocketStatus} from './SocketStatusContext';

if (window) {
  window.ReactSocketIO = {Socket, Event, SocketContext, SocketStatusContext};
}

export {Socket, Event, SocketContext, SocketStatusContext, useSocketStatus};
