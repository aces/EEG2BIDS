import React, {useContext, useEffect} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';
import '../css/Configuration.css';
import '../../node_modules/@fortawesome/fontawesome-free/css/all.css';
import 'react-datepicker/dist/react-datepicker.css';

// Socket.io
import {SocketContext} from './socket.io';

import '../css/Converter.css';

// Display Loading, Success, Error
import ParticipantDetails from './Configuration/ParticipantDetails';
import RecordingDetails from './Configuration/RecordingDetails';
import RecordingMetadata from './Configuration/RecordingMetadata';
import RecordingData from './Configuration/RecordingData';
import MFF2SET from './Configuration/MFF2SET';

/**
 * Configuration - the Data Configuration component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Configuration = (props) => {
  // React Context
  const socketContext = useContext(SocketContext);
  const {state, setState, config} = useContext(AppContext);

  useEffect(() => {
    setState({filePrefix:
      (state.participantPSCID || '[PSCID]') + '_' +
      (state.participantCandID || '[DCCID]') + '_' +
      (state.session || '[VisitLabel]'),
    });
  }, [state.participantPSCID, state.participantCandID, state.session]);

  useEffect(() => {
    setState({eegFiles: []});
  }, [state.fileFormatUploaded]);

  useEffect(() => {
    if (socketContext) {
      let emit = '';
      if (state.fileFormatUploaded === 'edf') {
        console.info('edf file selected');
        emit = 'get_edf_data';
      }
      if (state.fileFormatUploaded === 'set') {
        console.info('set file selected');
        emit = 'get_set_data';
      }
      socketContext.emit(emit, {
        files: state.eegFiles.map((eegFile) =>
          ({
            path: eegFile['path'],
            name: eegFile['name'],
          })),
      });
    }
  }, [state.eegFiles]);

  useEffect(() => {
    if (socketContext) {
      socketContext.on('edf_data', (message) => {
        if (message['error']) {
          console.error(message['error']);
        }

        if (message['date']) {
          message['date'] = new Date(message['date']);
        }

        setState({subjectID: message?.['subjectID'] || ''});
        setState({eegData: message});
        setState({fileFormat: 'edf'});
      });

      socketContext.on('set_data', (message) => {
        if (message['error']) {
          console.error(message['error']);
        }

        if (message['date']) {
          message['date'] = new Date(message['date']);
        }

        setState({subjectID: message?.['subjectID'] || ''});
        setState({eegData: message});
        setState({fileFormat: 'set'});
      });
    }
  }, [socketContext]);

  return (
    <div style={{
      display: props.visible ? 'block' : 'none',
    }}>
      <ParticipantDetails/>
      <RecordingDetails/>
      {config.recordingMetadata && <RecordingMetadata/>}
      <RecordingData/>
      <MFF2SET/>
      <ReactTooltip/>
    </div>
  );
};

Configuration.propTypes = {
  visible: PropTypes.bool,
};

export default Configuration;
