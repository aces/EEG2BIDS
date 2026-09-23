import React, {useContext, useEffect, useState} from 'react';
import {AppContext} from '../context';
import '../css/Validator.css';

// Display Loading, Success, Error
import Modal from './elements/modal';

// Socket.io
import {Event, SocketContext, useSocketStatus} from './socket.io';
import {DirectoryInput, RadioInput} from './elements/inputs';

/**
 * Validator - the Validation confirmation component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Validator = (props) => {
  // React Context
  const appContext = useContext(AppContext);
  const socketContext = useContext(SocketContext);
  const socketStatus = useSocketStatus();

  // React State
  const [validator, setValidator] = useState({});
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
          Success compressing BIDS! <a className='checkmark'> &#x2714;</a>
        </span></span>,
      error: '',
    },
  });

  /**
   * getBIDSDir - get BIDS directory.
   *
   * @return {string}
   */
  const getBIDSDir = () => {
    if (validationMode !== 'lastRun') {
      if (!bidsDirectory) console.error('No bidsDirectory.');
      return bidsDirectory || null;
    }
    const dir = appContext.getFromTask('bidsDirectory');
    const time = appContext.getFromTask('output_time');
    if (!dir || !time) {
      console.error('No bidsDirectory or output_time.');
      return null;
    }
    return `${dir}/${time}`;
  };

  /**
   * requireBackend - display the backend-disconnected error modal.
   * @return {boolean} true when the backend is connected, false otherwise
   */
  const requireBackend = () => {
    if (socketStatus === 'connected') {
      return true;
    }
    setModalText((prevState) => {
      prevState.message['error'] = (
        <span style={{padding: '40px'}}>
          <span className='red'>&#x274C;</span> The backend is not connected.
          Wait for it to reconnect or use “Restart backend”, then try again.
        </span>
      );
      return {...prevState, ['mode']: 'error'};
    });
    setModalVisible(true);
    return false;
  };

  /**
   * validateBIDS - get validated BIDS format.
   *   Sent by socket to python: validate_bids.
   */
  const validateBIDS = () => {
    console.info('validateBIDS();');

    const bidsDirectory = getBIDSDir();
    if (bidsDirectory) {
      if (!requireBackend()) {
        return;
      }
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
      if (!requireBackend()) {
        return;
      }
      setModalText((prevState) => {
        return {...prevState, ['mode']: 'loading'};
      });
      setModalVisible(true);

      socketContext.emit('tarfile_bids', bidsDirectory);
    }
  };

  useEffect(() => {
    setValidator({});
  }, [validationMode, bidsDirectory]);

  useEffect(() => {
    if (socketContext) {
      socketContext.on('bids', (message) => {
        if (message['output_time']) {
          setValidator({});
        }
      });
    }
  }, [socketContext]);

  useEffect(() => {
    if (!appContext.getFromTask('output_time')) {
      setValidationMode('folder');
    } else {
      setValidationMode('lastRun');
    }
  }, [props.visible]);
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

  const noTarget = validationMode === 'lastRun' ?
    !appContext.getFromTask('output_time') :
    !bidsDirectory;

  return props.visible ? (
    <>
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
              appContext.getFromTask('output_time') ?
              {
                folder: 'Select a folder',
                lastRun: `Current recording:
                  ${appContext.getFromTask('participantID')}
                  ${appContext.getFromTask('session')}
                  ${appContext.getFromTask('taskName')}`,
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
            disabled={noTarget}
          />
          <input onClick={packageBIDS}
            type='button'
            value='Package BIDS'
            className='primary-btn'
            disabled={noTarget}
          />
        </div>
      </div>
      <div className='terminal'>
        {validator.file_paths?.map((path, i) => (
          <div key={i} className='small-pad'>
            {validator.result[i] ?
              <span className='green'>&#x2714;</span> :
              <span className='red'>&#x274C;</span>} {path}
          </div>
        ))}
      </div>
      <Modal
        title={modalText.title[modalText.mode]}
        show={modalVisible}
        close={() => setModalVisible(false)}
        width='500px'
      >
        {modalText.message[modalText.mode]}
      </Modal>
      <Event event='response' handler={onMessage} />
    </>
  ) : null;
};
export default Validator;
