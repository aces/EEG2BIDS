import React, {useContext, useState, useEffect} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';
import '../css/Configuration.css';

// Components
import {
  DirectoryInput,
  FileInput,
  NumberInput, RadioInput,
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
  const [edfType, setEdfType] = useState('iEEG');
  const [eventsTSV, setEventsTSV] = useState({});
  const [bidsDirectory, setBidsDirectory] = useState(null);
  const [lineFreq, setLineFreq] = useState('');
  const [siteID, setSiteID] = useState('');
  const [projectID, setProjectID] = useState('');
  const [subProjectID, setSubProjectID] = useState('');
  const [visitLabel, setVisitLabel] = useState('');
  const [headerFields, setHeaderFields] = useState(null);
  const [edfHeader, setHeader] = useState({
    subject_id: '', recording_id: '',
    day: '', month: '', year: '',
    hour: '', minute: '', second: '',
    subtype: '',
  });

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    const keys = [
      'subject_id', 'recording_id',
      'day', 'month', 'year',
      'hour', 'minute', 'second',
      'subtype',
    ];
    const renderFields = [];
    for (const key of keys) {
      renderFields.push(
          <div key={key} className={'small-pad-flex'}>
            <TextInput id={key}
              name={key}
              label={`The ${key}: `}
              value={edfHeader[key]}
              onUserInput={onUserHeaderFieldInput}
              placeholder={edfHeader[key]}
              readonly={true}
            />
          </div>,
      );
      appContext.setTask(key, edfHeader[key]);
    }
    setHeaderFields(renderFields);
  }, [edfHeader]);

  /**
   * onUserInput - input change by user.
   * @param {string} name - element name
   * @param {object|string} value - element value
   */
  const onUserInput = (name, value) => {
    // Update the state of Configuration.
    switch (name) {
      case 'edfFile': {
        setEdfFile(value);
        createHeaderFields(value['path']);
        break;
      }
      case 'edfType': {
        setEdfType(value);
        break;
      }
      case 'eventsTSV': {
        setEventsTSV(value);
        break;
      }
      case 'bidsDirectory': {
        setBidsDirectory(value);
        break;
      }
      case 'lineFreq': {
        setLineFreq(value);
        break;
      }
      case 'siteID': {
        setSiteID(value);
        break;
      }
      case 'projectID': {
        setProjectID(value);
        break;
      }
      case 'subProjectID': {
        setSubProjectID(value);
        break;
      }
      case 'visitLabel': {
        setVisitLabel(value);
        break;
      }
      default: {
        return;
      }
    }
    // Update the 'task' of app context.
    appContext.setTask(name, value);
  };

  /**
   * onUserHeaderFieldInput - input change by user.
   * @param {string} name - element name
   * @param {object|string} value - element value
   */
  const onUserHeaderFieldInput = (name, value) => {
    setHeader((prevState) => {
      return {...prevState, [name]: value};
    });
    // Update the 'task' of app context.
    appContext.setTask(name, value);
  };

  /**
   * createHeaderFields - EDF file given from user.
   * @param {string} path - edf file path
   * Creates Header fields for EDF file.
   */
  const createHeaderFields = (path) => {
    socketContext.emit('ieeg_get_header', {
      file_path: path,
    });
  };

  /**
   * onMessage - received message from python.
   * @param {object} message - response
   */
  const onMessage = (message) => {
    if (message['header']) {
      setHeader(message['header']);
    }
  };

  /**
   * anonymizeHeaderValues - anonymize iEEG header values.
   */
  const anonymizeHeaderValues = () => {
    const keys = [
      'subject_id', 'recording_id',
      'day', 'month', 'year',
    ];
    const anonymize = {
      subject_id: '0 X X X',
      recording_id: 'Startdate 31-DEC-1924 X mne-bids_anonymize X',
      day: 31,
      month: 12,
      year: 85,
    };
    for (const key of keys) {
      onUserHeaderFieldInput(key, anonymize[key]);
      appContext.setTask(key, anonymize[key]);
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
          <RadioInput id='edfType'
            name='edfType'
            label='2. The edf type: '
            onUserInput={onUserInput}
            options={{
              iEEG: 'iEEG',
              EEG: 'EEG',
            }}
            checked={edfType}
          />
        </div>
        <div className={'small-pad'}>
          <FileInput id='eventsTSV'
            name='eventsTSV'
            accept='.tsv'
            placeholder={eventsTSV['name']}
            label='3. The events.tsv to include: '
            onUserInput={onUserInput}
          />
        </div>
        <div className={'small-pad'}>
          <DirectoryInput id='bidsDirectory'
            name='bidsDirectory'
            label='4. The BIDS output directory: '
            placeholder={bidsDirectory}
            onUserInput={onUserInput}
          />
        </div>
        <div className={'small-pad'}>
          <NumberInput id='lineFreq'
            name='lineFreq'
            label='5. The line_freq used: '
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
            label='6. The SiteID from LORIS: '
            value={siteID}
            onUserInput={onUserInput}
          />
        </div>
        <div className={'small-pad'}>
          <TextInput id='projectID'
            name='projectID'
            label='7. The ProjectID from LORIS: '
            value={projectID}
            onUserInput={onUserInput}
          />
        </div>
        <div className={'small-pad'}>
          <TextInput id='subProjectID'
            name='subProjectID'
            label='8. The SubProjectID from LORIS: '
            value={subProjectID}
            onUserInput={onUserInput}
          />
        </div>
        <div className={'small-pad'}>
          <TextInput id='visitLabel'
            name='visitLabel'
            label='9. The Visit Label from LORIS: '
            value={visitLabel}
            bannedCharacters={['-', '_', ' ']}
            onUserInput={onUserInput}
          />
        </div>
      </div>
      <span className={'header'}>
        EDF header data
      </span>
      <div className={'info-flex-container'}>
        {headerFields}
        <input type={'button'}
          className={'anonymize'}
          value={'Anonymize'}
          onClick={anonymizeHeaderValues}
        />
      </div>
      <Event event='response' handler={onMessage} />
    </>
  ) : null;
};
Configuration.propTypes = {
  visible: PropTypes.bool,
};

export default Configuration;
