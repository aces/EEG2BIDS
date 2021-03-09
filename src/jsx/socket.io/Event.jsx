import React, {useEffect, useContext} from 'react';
import PropTypes from 'prop-types';
import {SocketContext} from './SocketContext';
import {warning} from './utils';

// eslint-disable-next-line require-jsdoc
const Event = (props) => {
  const socket = useContext(SocketContext);

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    if (!socket) {
      warning('Socket IO connection has not been established.');
      return;
    }
    socket.on(props.event, props.handler);

    // returned function will be called on component unmount
    return () => {
      if (!socket) {
        warning('Socket IO connection has not been established.');
        return;
      }
      socket.off(props.event, props.handler);
    };
  }, []);

  // eslint-disable-next-line require-jsdoc
  return false;
};

Event.context = SocketContext;

Event.propTypes = {
  event: PropTypes.string.isRequired,
  handler: PropTypes.func.isRequired,
};

export default Event;
