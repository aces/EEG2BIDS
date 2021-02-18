import React, {useState, useContext} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';

// Socket.io
import {Event, SocketContext} from './socket.io';

// Components
import {
  DirectoryInput,
  FileInput,
  NumberInput,
  TextInput,
} from './elements/inputs';

/**
 * DeIdentifier - the de-identifier component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Configuration = (props) => {
  // React Context
  const appContext = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  // React State
  const [edfFile, setEdfFile] = useState('');
  const [bidsDirectory, setBidsDirectory] = useState(null);
  const [eventsTSV, setEventsTSV] = useState({});
  const [siteID, setSiteID] = useState('');
  const [lineFreq, setLineFreq] = useState(''); // line_freq

  const onUserInput = async (name, value) => {
    if (name === 'edfFile') {
      await setEdfFile(value);
      await appContext.setTask(name, value);
    } else if (name === 'eventsTSV') {
      await setEventsTSV(value);
      await appContext.setTask(name, value);
    } else if (name === 'bidsDirectory') {
      await setBidsDirectory(value);
      await appContext.setTask(name, value);
    } else if (name === 'lineFreq') {
      await setLineFreq(value);
      await appContext.setTask(name, value);
    } else if (name === 'siteID') {
      await setSiteID(value);
      await appContext.setTask(name, value);
    }
  };

  const onMessage = (message) => {
    console.log(message);
  };

  return props.visible ? (
    <>
      <div style={{
        fontSize: '20px',
        textAlign: 'center',
        verticalAlign: 'middle',
        cursor: 'default',
        padding: '20px',
      }}>
        Data Configuration
      </div>
      <div style={{backgroundColor: '#039b83', padding: '14px'}}>
        <div style={{padding: '10px'}}>
          <FileInput id='edfFile'
            name='edfFile'
            accept='.edf'
            placeholder={edfFile['name']}
            label='1. The file.edf to convert: '
            onUserInput={onUserInput}
          />
        </div>
        <div style={{padding: '10px'}}>
          <FileInput id='eventsTSV'
            name='eventsTSV'
            accept='.tsv'
            placeholder={eventsTSV['name']}
            label='2. The events.tsv to include: '
            onUserInput={onUserInput}
          />
        </div>
        <div style={{padding: '10px'}}>
          <DirectoryInput id='bidsDirectory'
            name='bidsDirectory'
            label='3. The BIDS output directory: '
            placeholder={bidsDirectory}
            onUserInput={onUserInput}
          />
        </div>
        <div style={{padding: '10px'}}>
          <NumberInput id='lineFreq'
            name='lineFreq'
            label='4. The line_freq used: '
            value={lineFreq}
            placeholder='60'
            onUserInput={onUserInput}
          />
        </div>
      </div>
      <div style={{
        fontSize: '20px',
        textAlign: 'center',
        verticalAlign: 'middle',
        cursor: 'default',
        padding: '20px',
      }}>
        LORIS meta data
      </div>
      <div style={{backgroundColor: '#039b83', padding: '14px'}}>
        <div style={{padding: '10px'}}>
          <TextInput id='siteID'
            name='siteID'
            label='5. The SiteID from LORIS: '
            value={siteID}
            onUserInput={onUserInput}
          />
        </div>
      </div>
      <Event event='response' handler={onMessage} />
    </>
  ) : null;
};
Configuration.propTypes = {
  visible: PropTypes.bool,
};

export default Configuration;
