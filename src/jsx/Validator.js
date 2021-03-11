import React, {useContext} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';

// Socket.io
import {Event, SocketContext} from './socket.io';

/**
 * Validator - the Validation confirmation component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Validator = (props) => {
  // React Context
  const appContext = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  /**
   * validateBIDS - get validated BIDS format.
   *   Sent by socket to python: validate_bids.
   */
  const validateBIDS = () => {
    console.log('validateBIDS();');
    socketContext.emit('validate_bids', {
      bids_directory: '', // appContext.getFromTask('bidsDirectory') ?? '',
    });
  };

  /**
   * onMessage - received message from python.
   * @param {object} message - response
   */
  const onMessage = (message) => {
    console.info(message);
  };

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return props.visible ? (
    <>
      <span className={'header'}>
        Validation confirmation
      </span>
      <div className={'info'}>
        <input onClick={validateBIDS}
          type={'button'}
          value={'Validate BIDS'}/>
      </div>
      <Event event='response' handler={onMessage} />
    </>
  ) : null;
};
Validator.propTypes = {
  visible: PropTypes.bool,
};

export default Validator;
