import React, {useContext, useEffect, useState} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';
import '../css/Validator.css';

// Display Loading, Success, Error
import Modal from './elements/modal';

// Socket.io
import {Event, SocketContext} from './socket.io';
import {DirectoryInput, RadioInput} from './elements/inputs';
import {debug} from './socket.io/utils';

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
  const [validationMode, setValidationMode] = useState('lastRun');
  const [progress, setProgress] = useState({});
  const [bidsDirectory, setBidsDirectory] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [packaging, setPackaging] = useState(false);
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
          BIDS {progress['stage']} in progress {progress['progress']}%
          <span>.</span><span>.</span><span>.</span>
          😴
        </span>
      </span>,
      success: <span>
        <span className='bids-success'>
          Success Uploading files! <a className='checkmark'> &#x2714;</a>
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
      if (!appContext.getFromTask('bidsDirectory') ||
          !appContext.getFromTask('outputFilename')
      ) {
        console.error('No bidsDirectory or output_time.');
        return null;
      } else {
        return [
          appContext.getFromTask('bidsDirectory') ?? '',
          appContext.getFromTask('outputFilename') ?? '',
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

  const monitorProgress = () => {
    setTimeout(() => {
      socketContext.emit('get_progress');
    }, 1000);
  };

  /**
   * packageBIDS - package BIDS format to tarfile.
   *   Sent by socket to python: tarfile_bids.
   */
  const packageBIDS = () => {
    console.info('packageBIDS();');

    const bidsDirectory = getBIDSDir();
    const exclude = appContext.getFromTask('exclude');
    const flags = appContext.getFromTask('flags');
    const reasons = appContext.getFromTask('reasons');
    const candID = appContext.getFromTask('participantCandID');
    const pscid = appContext.getFromTask('participantPSCID');
    const visit = appContext.getFromTask('session');
    const mffFiles = appContext.getFromTask('mffFiles');
    const metaData = {
      exclude: exclude,
      flags: flags,
      reasons: reasons,
    };

    if (bidsDirectory) {
      const data = {
        bidsDirectory: bidsDirectory,
        metaData: metaData,
        candID: candID,
        pscid: pscid,
        visit: visit,
        mffFiles: mffFiles,
        filePrefix: `${pscid}_${candID}_${visit}`,
      };
      setModalText((prevState) => {
        return {...prevState, ['mode']: 'loading'};
      });
      setModalVisible(true);
      setPackaging(true);

      socketContext.emit('tarfile_bids', data);
      monitorProgress();
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
    if (socketContext) {
      socketContext.on('bids', (message) => {
        if (message['output_time']) {
          setValidator({});
        }
      });
      socketContext.on('loris_upload', (message) =>{
        debug('PERCENT ', message);
      });
      socketContext.on('progress', (message) => {
        setProgress(message);
        if (message.progress < 100 || progress.stage !== 'loris_upload') {
          monitorProgress();
        }
      });
      socketContext.on('connect', () => {
        setConnected(true);
        if (packaging) {
          monitorProgress();
        }
        debug('VALIDATION CONNECTED');
      });
      socketContext.on('disconnect', () => {
        setConnected(false);
        debug('VALIDATION DISCONNECTED');
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
    } else if (message['type'] === 'upload') {
      setModalText((prevState) => {
        if (message.code >= 400) {
          const prevMessage = prevState.message;
          prevMessage.error = message.body.error;
          return {
            ...prevState,
            ['mode']: 'error',
            message: prevMessage,
          };
        }
        return {...prevState, ['mode']: 'success'};
      });
      setPackaging(false);
    }
  };

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
            disabled={
              (
                validationMode == 'lastRun' &&
                !appContext.getFromTask('output_time')
              ) ||
              (validationMode == 'folder' && !bidsDirectory)
            }
          />
          <input onClick={packageBIDS}
            type='button'
            value='Package BIDS'
            className='primary-btn'
            disabled={
              (
                validationMode == 'lastRun' &&
                !appContext.getFromTask('output_time')
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
        {modalText.mode === 'loading' && (
          <div>
            {!connected && (
              <div style={{'color': 'red'}}>
                LOST CONNECTION TO PYTHON
              </div>
            )}
            <div className='bids-loading'>
                BIDS {progress['stage']} in progress:
              <div className='progress-wrapper'>
                <div className="pull-right">{progress.progress}%</div>
                <div className="progress">
                  <div
                    className="progress-bar"
                    style={{width: `${progress.progress}%`}}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        {modalText.mode !== 'loading' && modalText.message[modalText.mode]}
      </Modal>
      <Event event='response' handler={onMessage} />
    </>
  ) : null;
};
Validator.propTypes = {
  visible: PropTypes.bool,
};

export default Validator;
