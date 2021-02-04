import React from 'react';
import PropTypes from 'prop-types';
import {SocketContext} from './SocketContext';
import {warning} from './utils';

// eslint-disable-next-line require-jsdoc
class Event extends React.Component {
  static contextType = SocketContext;

  // eslint-disable-next-line require-jsdoc
  componentDidMount() {
    const {event, handler} = this.props;
    const socket = this.context;

    if (!socket) {
      warning('Socket IO connection has not been established.');
      return;
    }

    socket.on(event, handler);
  }

  // eslint-disable-next-line require-jsdoc
  componentWillUnmount() {
    const {event, handler} = this.props;
    const socket = this.context;

    if (!socket) {
      warning('Socket IO connection has not been established.');
      return;
    }

    socket.off(event, handler);
  }

  // eslint-disable-next-line require-jsdoc
  render() {
    return false;
  }
}

Event.contextType = SocketContext;

Event.propTypes = {
  event: PropTypes.string.isRequired,
  handler: PropTypes.func.isRequired,
};

export default Event;
