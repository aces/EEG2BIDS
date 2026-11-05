import React, {createContext, useContext, useEffect, useState} from 'react';
import {io} from 'socket.io-client';

export const SocketContext = createContext(null);

// Values: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
// | 'error'.
const SocketStatusContext = createContext('connecting');
export const useSocketStatus = () => useContext(SocketStatusContext);

export const Socket = ({uri, options, children}) => {
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    const instance = io(uri, options);
    // `connect` also fires after a successful reconnection.
    instance.on('connect', () => setStatus('connected'));
    instance.on('disconnect', () => setStatus('disconnected'));
    instance.on('connect_error', (error) => {
      setStatus((prev) => (prev === 'connected' ? prev : 'error'));
      console.warn('[socket] connect_error', error.message);
    });
    // Reconnection attempts are reported by the manager, not the socket.
    instance.io.on('reconnect_attempt', () => setStatus('reconnecting'));
    setSocket(instance);

    return () => {
      instance.io.removeAllListeners();
      instance.removeAllListeners();
      instance.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      <SocketStatusContext.Provider value={status}>
        {children}
      </SocketStatusContext.Provider>
    </SocketContext.Provider>
  );
};
