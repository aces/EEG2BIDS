import React, {useContext, useEffect, useState} from 'react';
import {AppContext} from '../context';
import '../css/Validator.css';
import Modal, {MODAL_TITLES} from './elements/modal';
import {SocketContext, useSocketStatus} from './socket.io';
import {DirectoryInput, RadioInput} from './elements/inputs';

const MODAL_MESSAGES = {
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
  error: <span style={{padding: '40px'}}>
    <span className='red'>&#x274C;</span> The backend is not connected.
    Wait for it to reconnect or use “Restart backend”, then try again.
  </span>,
};

/**
 * Validator - the Validation confirmation component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Validator = (props) => {
  const appContext = useContext(AppContext);
  const socketContext = useContext(SocketContext);
  const socketStatus = useSocketStatus();

  const [validator, setValidator] = useState({});
  const [validationMode, setValidationMode] = useState('folder');
  const [bidsDirectory, setBidsDirectory] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('loading');

  const outputTime = appContext.getFromTask('output_time');
  const lastRunDir = appContext.getFromTask('bidsDirectory');
  const target = validationMode === 'lastRun' ?
    (lastRunDir && outputTime && `${lastRunDir}/${outputTime}`) :
    bidsDirectory;

  /**
   * send - emit a request for the target, or report a missing backend.
   * @param {string} event - socket event name
   * @return {boolean} true when the request was sent
   */
  const send = (event) => {
    if (socketStatus !== 'connected') {
      setModalMode('error');
      setModalVisible(true);
      return false;
    }
    socketContext.emit(event, target);
    return true;
  };

  const packageBIDS = () => {
    if (!send('tarfile_bids')) return;
    setModalMode('loading');
    setModalVisible(true);
  };

  useEffect(() => {
    setValidator({});
  }, [validationMode, bidsDirectory]);

  useEffect(() => {
    setValidationMode(outputTime ? 'lastRun' : 'folder');
  }, [props.visible]);

  useEffect(() => {
    if (!socketContext) return;
    const onResponse = (message) => {
      if (message['file_paths'] && message['result']) {
        setValidator(message);
      } else if (message['compression_time']) {
        setModalMode('success');
      }
    };
    const onBids = (message) => {
      if (message['output_time']) setValidator({});
    };
    socketContext.on('response', onResponse);
    socketContext.on('bids', onBids);
    return () => {
      socketContext.off('response', onResponse);
      socketContext.off('bids', onBids);
    };
  }, [socketContext]);

  return props.visible ? (
    <>
      <span className='header'>
        Validate and package
      </span>
      <div className='info'>
        <div className='small-pad'>
          <RadioInput id='validationMode'
            label='BIDS files to validate:'
            onUserInput={(_, value) => setValidationMode(value)}
            options={{
              folder: 'Select a folder',
              ...(outputTime && {
                lastRun: `Current recording:
                  ${appContext.getFromTask('participantID')}
                  ${appContext.getFromTask('session')}
                  ${appContext.getFromTask('taskName')}`,
              }),
            }}
            checked={validationMode}
          />
        </div>
        {validationMode === 'folder' &&
          <div className='small-pad'>
            <DirectoryInput id='bidsDirectory'
              required
              label='BIDS folder'
              placeholder={bidsDirectory}
              onUserInput={(_, value) => setBidsDirectory(value)}
            />
          </div>
        }
        <div className='small-pad'>
          <input onClick={() => send('validate_bids')}
            type='button'
            value='Validate BIDS'
            className='primary-btn'
            style={{marginRight: '10px'}}
            disabled={!target}
          />
          <input onClick={packageBIDS}
            type='button'
            value='Package BIDS'
            className='primary-btn'
            disabled={!target}
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
        title={MODAL_TITLES[modalMode]}
        show={modalVisible}
        close={() => setModalVisible(false)}
      >
        {MODAL_MESSAGES[modalMode]}
      </Modal>
    </>
  ) : null;
};
export default Validator;
