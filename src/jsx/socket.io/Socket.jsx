import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {io} from 'socket.io-client';
import {SocketContext} from './SocketContext';
import {SocketStatusContext} from './SocketStatusContext';
import {warning, debug} from './utils';

/**
 * Socket - the socket.io Socket component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Socket = (props) => {
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('connecting');

  /**
   * mergeOptions - merge socket.io options.
   * @param {object} options - the options to merge
   * @return {object}
   */
  const mergeOptions = (options = {}) => {
    const defaultOptions = {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10 * 1000,
      autoConnect: true,
      transports: ['websocket', 'polling'],
      rejectUnauthorized: true,
    };
    return {...defaultOptions, ...options};
  };

  useEffect(() => {
    const instance = io(props.uri, mergeOptions(props.options));

    // Socket-level lifecycle events. In socket.io-client v4 the connection
    // events live on the socket, but the reconnection events live on its
    // manager (instance.io) — registering them on the socket, as the old
    // code did, meant they never fired.
    instance.on('connect', () => {
      setStatus('connected');
      debug('[socket] connect');
    });
    instance.on('disconnect', (reason) => {
      setStatus('disconnected');
      debug('[socket] disconnect', reason);
    });
    instance.on('connect_error', (error) => {
      // Fires when the initial connection is refused or fails, e.g. the
      // backend is not up yet. The old code listened for 'error', which
      // does not cover connection refusal in v4.
      setStatus((prev) => (prev === 'connected' ? prev : 'error'));
      warning('[socket] connect_error', error.message);
    });

    // Manager-level reconnection events.
    const manager = instance.io;
    manager.on('reconnect_attempt', (attempt) => {
      setStatus('reconnecting');
      debug('[socket] reconnect_attempt', attempt);
    });
    manager.on('reconnect', (attempt) => {
      setStatus('connected');
      debug('[socket] reconnect', attempt);
    });
    manager.on('reconnect_failed', () => {
      setStatus('error');
      warning('[socket] reconnect_failed');
    });
    manager.on('error', (error) => {
      warning('[socket] transport error', error && error.message);
    });

    setSocket(instance);

    return () => {
      manager.removeAllListeners();
      instance.removeAllListeners();
      instance.close();
    };
  }, []);

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <SocketContext.Provider value={socket}>
      <SocketStatusContext.Provider value={status}>
        {React.Children.only(props.children)}
      </SocketStatusContext.Provider>
    </SocketContext.Provider>
  );
};
Socket.propTypes = {
  options: PropTypes.object.isRequired,
  uri: PropTypes.string.isRequired,
  children: PropTypes.element.isRequired,
};

export default Socket;
