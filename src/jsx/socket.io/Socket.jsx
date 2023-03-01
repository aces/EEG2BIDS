import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import SocketIO from 'socket.io-client';
import {SocketContext} from './SocketContext';
import {warning, debug} from './utils';

/**
 * Socket - the socket.io Socket component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Socket = (props) => {
  const [socket, setSocket] = useState(null);

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
      transports: ['polling'],
      rejectUnauthorized: true,
    };
    return {...defaultOptions, ...options};
  };

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    if (!socket) {
      // eslint-disable-next-line new-cap
      setSocket(SocketIO(props.uri, mergeOptions(props.options)));
    } else {
      socket.status = 'initialized';

      socket.on('connect', () => {
        console.info('[Socket] connect');
        socket.status = 'connected';
        debug('connected');
      });

      socket.on('connect_error', () => {
        console.info('[Socket] connect error');
      });

      socket.onAny((eventName, ...args) => {
        if (eventName !== 'progress') {
          console.info(`EVENT: ${eventName}, ${JSON.stringify(args)}`);
        }
      });

      socket.on('disconnect', (reason, details) => {
        console.info('[Socket] disconnect');
        console.info('---- Disconnect details START ----');
        console.info(reason); // "transport close"

        // in that case, details is a plain object
        console.info(details);
        console.info(details?.message);
        console.info(details?.description);

        // details.context is a CloseEvent object
        console.info(details?.context?.code);
        console.info(details?.context?.reason);

        // Example within a cluster without sticky sessions:
        console.info(details?.context?.status);
        console.info(details?.context?.responseText);

        console.info('---- Disconnect details END ----');

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
    }
  }, [socket]);

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
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
