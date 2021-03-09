import React, {useContext, useState, useEffect} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';

// Components
import {
  DirectoryInput,
  FileInput,
  NumberInput,
  TextInput,
} from './elements/inputs';

// Socket.io
import {Event, SocketContext} from './socket.io';

/**
 * Configuration - the Data Configuration component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Configuration = (props) => {
  // React Context
  const appContext = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  // React State
  const [edfFile, setEdfFile] = useState({});
  const [eventsTSV, setEventsTSV] = useState({});
  const [bidsDirectory, setBidsDirectory] = useState(null);
  const [lineFreq, setLineFreq] = useState('');
  const [siteID, setSiteID] = useState('');
  const [headerFields, setHeaderFields] = useState(null);
  const [edfHeader, setHeader] = useState({
    subject_id: '',
    recording_id: '',
    day: '',
    month: '',
    year: '',
    hour: '',
    minute: '',
    second: '',
  });

  useEffect(() => {
    console.log('useEffect called');
    const keys = [
      'subject_id',
      'recording_id',
      'day',
      'month',
      'year',
      'hour',
      'minute',
      'second',
    ];
    const renderFields = [];
    for (const key of keys) {
      // setHeaderValueByKey(key, edfHeader[key]);
      renderFields.push(
          <div key={key} className={'small-pad-flex'}>
            <TextInput id={key}
              name={key}
              label={`The ${key}: `}
              value={edfHeader[key]}
              onUserInput={onUserHeaderFieldInput}
              placeholder={edfHeader[key]}
            />
          </div>,
      );
    }
    setHeaderFields(renderFields);
  }, [edfHeader]);

  /**
   * onUserInput - input change by user.
   * @param {string} name - element name
   * @param {object|string} value - element value
   */
  const onUserInput = async (name, value) => {
    // Update the state of Configuration.
    console.info(edfHeader);
    switch (name) {
      case 'edfFile': {
        await setEdfFile(value);
        createHeaderFields(value['path']);
        break;
      }
      case 'eventsTSV': {
        await setEventsTSV(value);
        break;
      }
      case 'bidsDirectory': {
        await setBidsDirectory(value);
        break;
      }
      case 'lineFreq': {
        await setLineFreq(value);
        break;
      }
      case 'siteID': {
        await setSiteID(value);
        break;
      }
      default: {
        return;
      }
    }
    // Update the 'task' of app context.
    await appContext.setTask(name, value);
  };

  /**
   * onUserHeaderFieldInput - input change by user.
   * @param {string} name - element name
   * @param {object|string} value - element value
   */
  const onUserHeaderFieldInput = (name, value) => {
    console.info(name);
    console.info(value);
    console.info(edfHeader);
    // Update the state of Configuration.
    switch (name) {
      case 'subject_id': {
        break;
      }
      case 'recording_id': {
        break;
      }
      case 'day': {
        break;
      }
      case 'month': {
        break;
      }
      case 'year': {
        break;
      }
      case 'hour': {
        break;
      }
      case 'minute': {
        break;
      }
      case 'second': {
        break;
      }
      default: {
        return;
      }
    }
  };

  /**
   * createHeaderFields - EDF file given from user.
   * @param {string} path - edf file path
   * Creates Header fields for EDF file.
   */
  const createHeaderFields = (path) => {
    console.log('createHeaderFields');
    socketContext.emit('ieeg_get_header', {
      file_path: path,
    });
  };

  /**
   * setHeaderValueByKey - EDF file given from user.
   * @param {string} key - key of header object.
   * @param {string} value - value for header object.
   * Creates Header fields for EDF file.
   */
  const setHeaderValueByKey = (key, value) => {
    setHeader((prevState) => {
      console.info('previous', prevState);
      return {...prevState, [key]: value};
    });
    console.log('edfHeader is ');
    console.log(edfHeader);
  };

  /**
   * onMessage - received message from python.
   * @param {object} message - response
   */
  const onMessage = (message) => {
    if (message['header']) {
      setHeader(message['header']);
      // console.info('header is ');
      // console.info(header);
    }
  };

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return props.visible ? (
    <>
      <span className={'header'}>
        Data Configuration
      </span>
      <div className={'info'}>
        <div className={'small-pad'}>
          <FileInput id='edfFile'
            name='edfFile'
            accept='.edf'
            placeholder={edfFile['name']}
            label='1. The file.edf to convert: '
            onUserInput={onUserInput}
          />
        </div>
        <div className={'small-pad'}>
          <FileInput id='eventsTSV'
            name='eventsTSV'
            accept='.tsv'
            placeholder={eventsTSV['name']}
            label='2. The events.tsv to include: '
            onUserInput={onUserInput}
          />
        </div>
        <div className={'small-pad'}>
          <DirectoryInput id='bidsDirectory'
            name='bidsDirectory'
            label='3. The BIDS output directory: '
            placeholder={bidsDirectory}
            onUserInput={onUserInput}
          />
        </div>
        <div className={'small-pad'}>
          <NumberInput id='lineFreq'
            name='lineFreq'
            label='4. The line_freq used: '
            value={lineFreq}
            placeholder='60'
            onUserInput={onUserInput}
          />
        </div>
      </div>
      <span className={'header'}>
        LORIS metadata
      </span>
      <div className={'info'}>
        <div className={'small-pad'}>
          <TextInput id='siteID'
            name='siteID'
            label='5. The SiteID from LORIS: '
            value={siteID}
            onUserInput={onUserInput}
          />
        </div>
      </div>
      <span className={'header'}>
        iEEG header data
      </span>
      <div className={'info-flex-container'}>
        {headerFields}
      </div>
      <Event event='response' handler={onMessage} />
    </>
  ) : null;
};
Configuration.propTypes = {
  visible: PropTypes.bool,
};

export default Configuration;
