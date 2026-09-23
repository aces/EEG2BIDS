import React, {useEffect, useContext} from 'react';
import {SocketContext} from './SocketContext';
import {warning} from './utils';

/**
 * Event - the socket.io Event component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Event = (props) => {
  // React Context
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
    return () => socket.off(props.event, props.handler);
  }, []);

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return null;
};

export default Event;
