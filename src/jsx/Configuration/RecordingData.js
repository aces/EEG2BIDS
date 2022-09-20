import React, {useContext, useEffect} from 'react';
import {AppContext} from '../../context';

// Socket.io
import {SocketContext} from '../socket.io';

import {
  DirectoryInput,
  FileInput,
  RadioInput,
} from '../elements/inputs';

/**
 * Recording Data - the Recording Data component.
 * @param {object} props
 * @return {JSX.Element}
 */
const RecordingData = () => {
  const {state, setState} = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  /**
   * onUserInput - input change by user.
   * @param {string} name - element name
   * @param {object|string|boolean} value - element value
   */
  const onUserInput = (name, value) => {
    switch (name) {
      case 'LORIScompliant':
        if (value === 'yes') {
          value = true;
        } else {
          value = false;
        }
        setState({LORIScompliant: value});
        break;
      default:
        if (name in state) {
          setState({[name]: value});
        }
    }
  };

  useEffect(() => {
    if (!socketContext?.connected) return;

    socketContext.emit('get_edf_data', {
      files: state.edfFiles?.map((edfFile) =>
        ({
          path: edfFile['path'],
          name: edfFile['name'],
        })),
    });
  }, [state.edfFiles]);

  useEffect(() => {
    if (!socketContext?.connected) return;

    socketContext.on('edf_data', (message) => {
      if (message['error']) {
        console.error(message['error']);
      }

      if (message['date']) {
        message['date'] = new Date(message['date']);
      }

      setState({
        subjectID: message?.['subjectID'] || '',
        edfData: message,
      });
    });
  }, [socketContext?.connected]);

  return (
    <>
      <span className='header'>
        Recording data
      </span>
      <div className='info'>
        <div className='small-pad'>
          <FileInput id='edfFiles'
            name='edfFiles'
            multiple={true}
            accept='.edf,.EDF'
            placeholder={
              state.edfFiles?.map((edfFile) => edfFile['name']).join(', ')
            }
            label='EDF Recording to convert'
            required={true}
            onUserInput={onUserInput}
            help='Filename(s) must be formatted correctly:
            e.g. [subjectID]_[sessionLabel]_[taskName]_[run-1]_ieeg.edf'
          />
          <div>
            <small>
              Multiple EDF files can be selected for a single recording
            </small>
          </div>
        </div>
        <div className='small-pad'>
          <DirectoryInput id='bidsDirectory'
            name='bidsDirectory'
            required={true}
            label='BIDS output folder'
            placeholder={state.bidsDirectory}
            onUserInput={onUserInput}
            help='Where the BIDS-compliant folder will be created'
          />
        </div>
        <div className='small-pad'>
          <RadioInput id='modality'
            name='modality'
            label='Data Modality'
            required={true}
            onUserInput={onUserInput}
            options={{
              ieeg: 'Stereo iEEG',
              eeg: 'EEG',
            }}
            checked={state.modality}
            help='If any intracranial (stereo) channels, select Stereo iEEG'
          />
        </div>
        <div className='small-pad'>
          <RadioInput id='LORIScompliant'
            name='LORIScompliant'
            label='Will this data be loaded in LORIS?'
            required={true}
            onUserInput={onUserInput}
            options={{
              yes: 'Yes',
              no: 'No',
            }}
            checked={state.LORIScompliant ? 'yes' : 'no'}
            help='Select Yes if research datasets will be stored
            in a LORIS data platform'
          />
        </div>
      </div>
    </>
  );
};

export default RecordingData;
