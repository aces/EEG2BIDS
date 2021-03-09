import React, {useEffect} from 'react';
import PropTypes from 'prop-types';
import SocketIO from 'socket.io-client';
import {SocketContext} from './SocketContext';
import {warning, debug} from './utils';

// eslint-disable-next-line require-jsdoc
const Socket = (props) => {
  // eslint-disable-next-line require-jsdoc
  const mergeOptions = (options = {}) => {
    const defaultOptions = {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10 * 1000,
      autoConnect: true,
      transports: ['polling'],
      rejectUnauthorized: true,
    };
    return {...defaultOptions, ...options};
  };
  // eslint-disable-next-line new-cap
  const socket = SocketIO(props.uri, mergeOptions(props.options));

  useEffect(() => {
    socket.status = 'initialized';

    socket.on('connect', () => {
      console.info('[Socket] connect');
      socket.status = 'connected';
      debug('connected');
    });

    socket.on('disconnect', () => {
      console.info('[Socket] disconnect');
      socket.status = 'disconnected';
      debug('disconnect');
    });

    socket.on('error', (err) => {
      socket.status = 'failed';
      warning('error', err);
    });

    socket.on('reconnect', (data) => {
      socket.status = 'connected';
      debug('reconnect', data);
    });

    socket.on('reconnect_attempt', () => {
      debug('reconnect_attempt');
    });

    socket.on('reconnecting', () => {
      socket.status = 'reconnecting';
      debug('reconnecting');
    });

    socket.on('reconnect_failed', (error) => {
      socket.status = 'failed';
      warning('reconnect_failed', error);
    });
  }, []);

  // eslint-disable-next-line require-jsdoc
  return (
    <SocketContext.Provider value={socket}>
      {React.Children.only(props.children)}
    </SocketContext.Provider>
  );
};
Socket.propTypes = {
  options: PropTypes.object.isRequired,
  uri: PropTypes.string.isRequired,
  children: PropTypes.element.isRequired,
};

export default Socket;
