import React, {useContext} from 'react';

// The renderer-side Socket.IO connection status, kept separate from
// SocketContext (which carries the raw socket instance) so components can
// react to connectivity changes without depending on the socket object.
// Values: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
// | 'error'.
export const SocketStatusContext = React.createContext('connecting');

/**
 * Read the current Socket.IO connection status.
 * @return {string} one of connecting|connected|disconnected|reconnecting|error
 */
export const useSocketStatus = () => useContext(SocketStatusContext);
