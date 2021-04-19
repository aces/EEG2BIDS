import React, {useContext, useEffect, useState} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';
import '../css/Validator.css';

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

  // React State
  const [validator, setValidator] = useState({});
  const [validPath, setValidPaths] = useState(null);

  /**
   * validateBIDS - get validated BIDS format.
   *   Sent by socket to python: validate_bids.
   */
  const validateBIDS = () => {
    console.info('validateBIDS();');
    socketContext.emit('validate_bids', {
      bids_directory: appContext.getFromTask('bidsDirectory') ?? '',
      output_time: appContext.getFromTask('output_time') ?? '',
    });
  };

  /**
   * packageBIDS - package BIDS format to tarfile.
   *   Sent by socket to python: tarfile_bids.
   */
  const packageBIDS = () => {
    console.info('packageBIDS();');
    socketContext.emit('tarfile_bids', {
      bids_directory: appContext.getFromTask('bidsDirectory') ?? '',
      output_time: appContext.getFromTask('output_time') ?? '',
    });
  };

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    const renderFields = [];
    const renderPackageBIDS = [];
    if (validator['file_paths']) {
      validator['file_paths'].forEach((value, index) => {
        if (validator['result'][index]) {
          renderFields.push(
              <div key={index} className={'small-pad'}>
                <a className={'green-font-italic'}>{value}</a>
              </div>,
          );
        } else {
          renderFields.push(
              <div key={index} className={'small-pad'}>
                <a className={'red-font-bold'}>{value}</a>
              </div>,
          );
        }
      });
      renderPackageBIDS.push(
          <div className={'info'}>
            <div className={'small-pad'}>
              <b style={{cursor: 'default'}}>
                Package BIDS output folder into a compressed file:&nbsp;
              </b>
              <input onClick={packageBIDS}
                type={'button'}
                value={'Compress BIDS'}/>
            </div>
          </div>,
      );
    }
    setValidPaths(<>
      <div className={'key-terminal'}>
        Valid is <a className={'green-font-italic'}>green</a>.
        Invalid is <a className={'red-font-bold'}>red</a>.
      </div>
      <div className={'terminal'}>
        {renderFields}
      </div>
      {renderPackageBIDS}
    </>);
  }, [validator]);

  /**
   * onMessage - received message from python.
   * @param {object} message - response
   */
  const onMessage = (message) => {
    console.info(message);
    if (message['file_paths'] && message['result']) {
      setValidator(message);
    }
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
        <div className={'small-pad'}>
          <b style={{cursor: 'default'}}>
            Run BIDS Validator:&nbsp;
          </b>
          <input onClick={validateBIDS}
            type={'button'}
            value={' Validate BIDS '}/>
        </div>
      </div>
      {validPath}
      <Event event='response' handler={onMessage} />
    </>
  ) : null;
};
Validator.propTypes = {
  visible: PropTypes.bool,
};

export default Validator;
