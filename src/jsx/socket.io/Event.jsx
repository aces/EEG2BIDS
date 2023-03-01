import {useEffect, useContext} from 'react';
import {SocketContext} from './SocketContext';
import PropTypes from 'prop-types';
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
    return () => {
      if (!socket) {
        warning('Socket IO connection has not been established.');
        return;
      }
      socket.off(props.event, props.handler);
    };
  }, []);

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return null;
};

Event.context = SocketContext;

Event.propTypes = {
  event: PropTypes.string.isRequired,
  handler: PropTypes.func.isRequired,
};

export default Event;
