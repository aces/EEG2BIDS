import React, {useContext, useEffect, useState} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';
import '../css/Validator.css';

// Display Loading, Success, Error
import Modal from './elements/modal';

// Socket.io
import {Event, SocketContext} from './socket.io';
import {DirectoryInput, RadioInput} from './elements/inputs';

/**
 * Validator - the Validation confirmation component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Validator = (props) => {
  // React Context
  const {state, updateState} = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  // React State
  const [validator, setValidator] = useState({});
  const [validPath, setValidPaths] = useState(null);
  const [validationMode, setValidationMode] = useState('lastRun');
  const [bidsDirectory, setBidsDirectory] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalText, setModalText] = useState({
    mode: 'loading',
    title: {
      loading: '⏱ Task in Progress!',
      success: '⭐ Task Finished!',
      error: '❌ Task Error!',
    },
    message: {
      loading: <span style={{padding: '40px'}}>
        <span className='bids-loading'>
            BIDS compression in progress
          <span>.</span><span>.</span><span>.</span>
            😴
        </span>
      </span>,
      success: <span style={{padding: '40px'}}>
        <span className='bids-success'>
          Success compressing BIDS! <a className='pass'> &#x2714;</a>
        </span></span>,
      error: '',
    },
  });

  /**
   * hideModal - display Modal.
   * @param {boolean} hidden
   */
  const hideModal = (hidden) => {
    setModalVisible(!hidden);
  };

  /**
   * getBIDSDir - get BIDS directory.
   *
   * @return {string}
   */
  const getBIDSDir = () => {
    if (validationMode == 'lastRun') {
      if (!state.bidsDirectory || !state.outputTime) {
        console.error('No bidsDirectory or outputTime.');
        return null;
      } else {
        return [
          state.bidsDirectory ?? '',
          state.outputTime ?? '',
        ].filter(Boolean).join('/');
      }
    } else {
      if (!bidsDirectory) {
        console.error('No bidsDirectory.');
        return null;
      } else {
        return bidsDirectory;
      }
    }
  };

  /**
   * validateBIDS - get validated BIDS format.
   *   Sent by socket to python: validate_bids.
   */
  const validateBIDS = () => {
    console.info('validateBIDS();');

    const bidsDirectory = getBIDSDir();
    if (bidsDirectory) {
      socketContext.emit('validate_bids', bidsDirectory);
    }
  };

  /**
   * packageBIDS - package BIDS format to tarfile.
   *   Sent by socket to python: tarfile_bids.
   */
  const packageBIDS = () => {
    console.info('packageBIDS();');

    const bidsDirectory = getBIDSDir();
    if (bidsDirectory) {
      setModalText((prevState) => {
        return {...prevState, ['mode']: 'loading'};
      });
      setModalVisible(true);

      socketContext.emit('tarfile_bids', bidsDirectory);
    }
  };

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    const renderFields = [];
    if (validator['file_paths']) {
      validator['file_paths'].forEach((value, index) => {
        if (validator['result'][index]) {
          renderFields.push(
              <div key={index} className='small-pad'>
                <span className='green'>&#x2714;</span> {value}
              </div>,
          );
        } else {
          renderFields.push(
              <div key={index} className='small-pad'>
                <span className='red'>&#x274C;</span> {value}
              </div>,
          );
        }
      });
    }
    setValidPaths(
        <>
          <div className='terminal'>
            {renderFields}
          </div>
        </>,
    );
  }, [validator]);

  useEffect(() => {
    setValidator({});
  }, [validationMode, bidsDirectory]);

  useEffect(() => {
    if (!socketContext?.connected) return;
    socketContext.on('bids', (message) => {
      if (message['output_time']) {
        setValidator({});
      }
    });
  }, [socketContext?.connected]);

  useEffect(() => {
    if (!state.outputTime) {
      setValidationMode('folder');
    } else {
      setValidationMode('lastRun');
    }
  }, [state.outputTime]);

  /**
   * onMessage - received message from python.
   * @param {object} message - response
   */
  const onMessage = (message) => {
    console.info(message);
    if (message['file_paths'] && message['result']) {
      setValidator(message);
    } else if (message['compression_time']) {
      setModalText((prevState) => {
        return {...prevState, ['mode']: 'success'};
      });
    }
  };

  return (
    <div style={{display: props.visible ? 'block' : 'none'}}>
      <span className='header'>
        Validate and package
      </span>
      <div className='info'>
        <div className='small-pad'>
          <RadioInput id='validationMode'
            name='validationMode'
            label='BIDS files to validate:'
            onUserInput={(_, value) => setValidationMode(value)}
            options={
              state.outputTime ?
              {
                folder: 'Select a folder',
                lastRun: `Current recording:
                  ${state.participantID}
                  ${state.session}
                  ${state.taskName}`,
              } :
              {
                folder: 'Select a folder',
              }
            }
            checked={validationMode}
          />
        </div>
        {validationMode == 'folder' &&
          <div className='small-pad'>
            <DirectoryInput id='bidsDirectory'
              name='bidsDirectory'
              required={validationMode == 'folder'}
              label='BIDS folder'
              placeholder={bidsDirectory}
              onUserInput={(_, value) => setBidsDirectory(value)}
            />
          </div>
        }
        <div className='small-pad'>
          <input onClick={validateBIDS}
            type='button'
            value='Validate BIDS'
            className='primary-btn'
            style={{marginRight: '10px'}}
            disabled={
              (validationMode == 'lastRun' && !state.outputTime) ||
              (validationMode == 'folder' && !bidsDirectory)
            }
          />
          <input onClick={packageBIDS}
            type='button'
            value='Package BIDS'
            className='primary-btn'
            disabled={
              (
                validationMode == 'lastRun' && !state.outputTime
              ) ||
              (validationMode == 'folder' && !bidsDirectory)
            }
          />
        </div>
      </div>
      {validPath}
      <Modal
        title={modalText.title[modalText.mode]}
        show={modalVisible}
        close={hideModal}
        width='500px'
      >
        {modalText.message[modalText.mode]}
      </Modal>
      <Event event='response' handler={onMessage} />
    </div>
  );
};

Validator.propTypes = {
  visible: PropTypes.bool,
};

export default Validator;
