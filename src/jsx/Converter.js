import React, {useContext, useState, useEffect} from 'react';
import {AppContext} from '../context';
import {TextInput, TextareaInput} from './elements/inputs';
import PropTypes from 'prop-types';
import Modal from './elements/modal';
import ReactTooltip from 'react-tooltip';
import {participantMetadata} from './Configuration/ParticipantDetails';
import {recordingMetadata} from './Configuration/RecordingMetadata';

// Socket.io
import {SocketContext} from './socket.io';

import '../css/Converter.css';

import RecordingData from './Converter/RecordingData';
import RecordingDetails from './Converter/RecordingDetails';
import ParticipantDetails from './Converter/ParticipantDetails';
import RecordingParameters from './Converter/RecordingParameters';

/**
 * Converter - the EDF to BIDS component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Converter = (props) => {
  const socketContext = useContext(SocketContext);
  const {state, setState, config} = useContext(AppContext);

  const [successMessage, setSuccessMessage] = useState(null);
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
            BIDS creation in progress<span>.</span><span>.</span><span>.</span>
            😴
        </span>
      </span>,
      success: <span style={{padding: '40px'}}>
        <span className='bids-success'>
          <span className='checkmark'>&#x2714;</span> Success creating BIDS!
        </span></span>,
      error: '',
    },
  });

  useEffect(() => {
    // Init state
    setState({preparedBy: ''});
    setState({reasons: {}});
  }, []);

  const reasonUpdate = (name, value) =>
    setState({reasons: {
      ...state.reasons,
      [name]: value,
    }});

  /**
   * beginBidsCreation - create BIDS format.
   *   Sent by socket to python: eeg_to_bids.
   */
  const beginBidsCreation = () => {
    setModalText((prevState) => {
      return {...prevState, ['mode']: 'loading'};
    });

    setModalVisible(true);

    if (state.eegFileNames?.length > 0) {
      socketContext.emit('eeg_to_bids', {
        eegData: state.eegData ?? [],
        fileFormat: state.fileFormat ?? 'set',
        eegRuns: state.eegRuns ?? [],
        modality: state.modality ?? 'eeg',
        bids_directory: state.bidsDirectory ?? '',
        read_only: false,
        event_files: state.eventFiles.length > 0 ?
          state.eventFiles[0]['path'] : '',

        // group
        site_id: state.siteID ?? '',
        project_id: state.projectID ?? '',
        sub_project_id: state.subprojectID ?? '',
        session: state.session ?? '',

        participantID: state.participantID || '',

        preparedBy: state.preparedBy ?? '',

        // group
        bidsMetadata: state.bidsMetadata ?? '',

        ...(recordingMetadata
            .filter((field) => config?.recordingMetadata?.[field.name])
            .reduce(
                (obj, field) => Object.assign(
                    obj,
                    {[field.name]: state[field.name] || field.default},
                ),
                {},
            )
        ),

        subject_id: state.subjectID ?? '',
        outputFilename: state.outputFilename ?? '',

        ...(participantMetadata
            .filter((field) => config?.participantMetadata?.[field.name])
            .reduce(
                (obj, field) => Object.assign(
                    obj,
                    {[field.name]: state[field.name] || field.default},
                ),
                {},
            )
        ),

        ...(config?.participantMetadata?.additional
            .filter((field) => field?.display)
            .reduce(
                (obj, field) => Object.assign(
                    obj,
                    {[field.name]: state[field.name] || field.default},
                ),
                {},
            )
        ),
      });
    }
  };

  const reviewSuccessFlags = state.inputFileFormat == 'mff' ?
    () => {
      const listItems = state?.validationFlags?.success?.map((err) => {
        return formatPass(err.label, err.flag);
      });
      return (
        <div className='small-pad'>
          <b>Review your success flags:</b>
          {listItems}
        </div>
      );
    } :
    () => {};

  const formatPass = (msg, key) =>
    <div className='flags' key={key}>
      <span className='checkmark'>&#x2714;</span>
      {msg}
    </div>;

  const formatWarning = (msg, key) =>
    <div key={key} className='flags'>
      <span className='warning'>&#x26A0;</span> {msg}
    </div>;

  let error = false;
  const formatError = (msg, key) => {
    const value = state.reasons[key] || '';
    if (value === '') {
      error = true;
    }
    return (
      <div key={key} className='flags'>
        <span className='error'>&#x274C;</span> {msg}
        <TextareaInput
          name={key}
          value={value}
          onUserInput={reasonUpdate}
        />
      </div>
    );
  };

  const reviewWarnings = state.inputFileFormat == 'mff' ?
    () => {
      if (state?.validationFlags?.errors?.length === 0) {
        return null;
      }

      const listItems = state?.validationFlags?.errors?.map((err) => {
        if (err.reason) {
          return formatError(err.label, err.flag);
        } else {
          return formatWarning(err.label, err.flag);
        }
      });

      const value = state.reasons['additional'] || '';
      return (
        <div className='small-pad'>
          <b>Review your warning flags:</b>
          {listItems}
          <div className='flags'>
            <TextareaInput
              name='additional'
              label={'Optional: Please provide additional reasoning ' +
                'as to why issues happened if not already defined above:'}
              value={value}
              onUserInput={reasonUpdate}
            />
          </div>
        </div>
      );
    } :
    () => {};

  useEffect(() => {
    setState({outputTime: ''});
  }, []);

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    if (state.outputTime) {
      // cleanup time display for user.
      let time = state.outputTime.replace('output-', '');
      time = time.slice(0, time.lastIndexOf('-')) + ' ' +
        time.slice(time.lastIndexOf('-')+1);
      setSuccessMessage(<>
        <a className='task-finished'>Last created at: {time}</a>
      </>);
    }
  }, [state.outputTime]);

  useEffect(() => {
    if (socketContext) {
      socketContext.on('bids', (message) => {
        if (message['output_time']) {
          setState({outputTime: message['output_time']});
          setModalText((prevState) => {
            return {...prevState, ['mode']: 'success'};
          });

          setTimeout(() => {
            setModalVisible(false);
            setState({appMode: 'Validator'});
          }, 5000);
        } else if (message['error']) {
          setModalText((prevState) => {
            prevState.message['error'] = (
              <div className='bids-errors'>
                {Array.isArray(message['error']) ?
                  message['error'].map((error, i) =>
                    <span key={i}>{error}<br/></span>) :
                  <span>{message['error']}</span>
                }
              </div>
            );
            return {...prevState, ['mode']: 'error'};
          });
        }
      });
    }
  }, [socketContext]);

  return props.visible ? (
    <>
      <span className='header'>
        EEG to BIDS
      </span>
      <div className='info report'>
        {state.eegFileNames?.length > 0 ?
          <>
            <RecordingData/>
            <RecordingDetails/>
            <ParticipantDetails/>
            <RecordingParameters/>
            {reviewWarnings()}
            {reviewSuccessFlags()}
            {
              state.ParticipantDetailsValid &&
              state.RecordingDataValid &&
              state.RecordingDetailsValid &&
              state.RecordingParameterValid ?

              <div className="alert alert-success" role="alert">
                &#x2714; Ready to proceed
              </div> :
              <div className="alert alert-danger" role="alert">
                &#x274C; Please correct the above errors.
              </div>
            }
          </> :
          <div className="alert alert-danger" role="alert">
            &#x274C; No file to convert.
          </div>
        }

        <hr/>

        <div className='small-pad'>
          <TextInput
            name='preparedBy'
            required={true}
            label='Prepared by'
            value={state.preparedBy}
            placeholder='Enter your name'
            onUserInput={(_, value) => setState({preparedBy: value})}
            help='Name of person performing data conversion
            and validation is required.'
          />
          {!state.preparedBy &&
            <label className='input-error' style={{paddingLeft: '10px'}}>
              Required for conversion logging
            </label>
          }
        </div>
        <div className='small-pad convert-bids-row'>
          <input type='button'
            className='start_task primary-btn'
            onClick={beginBidsCreation}
            value='Convert to BIDS'
            disabled={
              !state.preparedBy ||
              error ||
              state.eegFileNames?.length < 1
            }
          />
          {successMessage}
        </div>
      </div>
      <Modal
        title={modalText.title[modalText.mode]}
        show={modalVisible}
        close={() => setModalVisible(false)}
        width='500px'
      >
        {modalText.message[modalText.mode]}
      </Modal>
      <ReactTooltip/>
    </>
  ) : null;
};

Converter.propTypes = {
  visible: PropTypes.bool,
};

export default Converter;
