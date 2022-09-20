import '../css/Converter.css';

import React, {useContext, useEffect, useState} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';

// Socket.io
import {SocketContext} from './socket.io';

// Display Loading, Success, Error
import Modal from './elements/modal';
import EEGRun from './types/EEGRun';

// Components
import {
  TextInput,
} from './elements/inputs';
import RecordingData from './Converter/RecordingData';

/**
 * formatError - Helper to format error msg
 * @param {string} msg
 * @return {JSX.Element}
 */
export const formatError = (msg) => {
  return (
    <>
      <span className='error'>&#x274C;</span> {msg}
    </>
  );
};

/**
 * formatWarning - Helper to format warning msg
 * @param {string} msg
 * @return {JSX.Element}
 */
export const formatWarning = (msg) => {
  return (
    <>
      <span className='warning'>&#x26A0;</span> {msg}
    </>
  );
};

/**
 * formatPass - Helper to format pass msg
 * @param {string} msg
 * @return {JSX.Element}
 */
export const formatPass = (msg) => {
  return (
    <>
      <span className='checkmark'>&#x2714;</span>
      {msg}
    </>
  );
};

/**
 * Converter - the EDF to BIDS component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Converter = (props) => {
  // React Context
  const {state, setState} = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  const [displayErrors, setDisplayErrors] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [validationError, setValidationError] = useState(false);
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
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (!socketContext?.connected) return;

    socketContext.on('bids', (message) => {
      if (message['output_time']) {
        setState({outputTime: message['output_time']});
        setModalText((prevState) => {
          return {...prevState, ['mode']: 'success'};
        });
      } else if (message['error']) {
        setModalText((prevState) => {
          prevState.message['error'] = (
            <div className='bids-errors'>
              {message['error'].map((error, i) =>
                <span key={i}>{error}<br/></span>)}
            </div>
          );
          return {...prevState, ['mode']: 'error'};
        });
      }
    });
  }, [socketContext?.connected]);

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
    if (!props.visible) return;
    console.log(state);
    validate();
  }, [props.visible]);

  const validate = () => {
    /*if (socketContext) {
      if (state.session && state.siteID &&
          state.projectID && state.subprojectID &&
          state.edfData?.date && state.participantDOB &&
          state.participantSex
      ) {
        const visitDate = state.edfData['date'] */
    //        .toISOString().replace(/T.*/, '');

    //    const dob = state.participantDOB
    //        .toISOString().replace(/T.*/, '');

    /*    console.info('start request for new candidate');
        socketContext.emit('create_candidate_and_visit', {
          project: state.projectID,
          dob: dob,
          sex: state.participantSex,
          site: state.siteID,
          subproject: state.subprojectID,
          visit: state.session,
          date: visitDate,
        });
      }

      if (state.participantCandID && state.session &&
          state.siteID && state.projectID &&
          state.subprojectID && state.edfData?.date
      ) {
        console.info('start request to create the visit');
        const visitDate = state.edfData['date'] */
    //        .toISOString().replace(/T.*/, '');

    /*    socketContext.emit('create_visit', {
          candID: state.participantCandID,
          project: state.projectID,
          site: state.siteID,
          subproject: state.subprojectID,
          visit: state.session,
          date: visitDate,
        });
    } */

    if (state.edfData?.files?.length > 0) {
      const eventFiles = [...state.eventFiles];
      const annotationsTSVs = [...state.annotationsTSV];
      const annotationsJSONs = [...state.annotationsJSON];

      const eegRuns = [];

      state.edfData?.files.map(
          (edfFile) => {
            const eegRun = new EEGRun();
            eegRun.edfFile = edfFile['path'];

            const edfFileName = edfFile['name'].toLowerCase()
                .replace(/_i?eeg\.edf/i, '').replace('.edf', '');

            const edfFileNameAlt = edfFile['name'].toLowerCase()
                .replace('.edf', '');

            // Check if we do have a matching event file
            const eventFileIndex = eventFiles.findIndex((eventFile) => {
              const eventFileName = eventFile['name'].toLowerCase()
                  .replace('_events.tsv', '').replace('.tsv', '');
              return (
                edfFileName === eventFileName ||
                edfFileNameAlt === eventFileName
              );
            });

            if (eventFileIndex > -1) {
              eegRun.eventFile = eventFiles[eventFileIndex]['path'];
              eventFiles.splice(eventFileIndex, 1);
            }

            // Check if we do have a matching annotations TSV file
            const annotationsTSVIndex = annotationsTSVs.findIndex(
                (annotationsTSV) => {
                  const annotationsTSVName = annotationsTSV['name']
                      .toLowerCase()
                      .replace('_annotations.tsv', '').replace('.tsv', '');

                  return (
                    edfFileName === annotationsTSVName ||
                    edfFileNameAlt === annotationsTSVName
                  );
                },
            );

            if (annotationsTSVIndex > -1) {
              eegRun.annotationsTSV =
                annotationsTSVs[annotationsTSVIndex]['path'];
              annotationsTSVs.splice(annotationsTSVIndex, 1);
            }

            // Check if we do have a matching annotations JSON file
            const annotationsJSONIndex = annotationsJSONs.findIndex(
                (annotationsJSON) => {
                  const annotationsJSONName = annotationsJSON['name']
                      .toLowerCase()
                      .replace('_annotations.json', '')
                      .replace('.json', '');

                  return (
                    edfFileName === annotationsJSONName ||
                    edfFileNameAlt === annotationsJSONName
                  );
                },
            );

            if (annotationsJSONIndex > -1) {
              eegRun.annotationsJSON =
                annotationsJSONs[annotationsJSONIndex]['path'];
              annotationsJSONs.splice(annotationsJSONIndex, 1);
            }

            eegRuns.push(eegRun);
          },
      );

      eegRuns.eventErrors = [];
      eventFiles.map((eventFile) => {
        eegRuns.eventErrors.push(`Event file ${eventFile['name']}
          is not matching any edf file names.`);
      });

      eegRuns.annotationsTSVErrors = [];
      annotationsTSVs.map((annotationsTSV) => {
        eegRuns.annotationsTSVErrors.push(
            `Annotation file ${annotationsTSV['name']}
            is not matching any edf file names.`,
        );
      });

      eegRuns.annotationsJSONErrors = [];
      annotationsJSONs.map((annotationsJSON) => {
        eegRuns.annotationsJSONErrors.push(
            `Annotation file  ${annotationsJSON['name']}
            is not matching any edf file names.`,
        );
      });

      setState({eegRuns: eegRuns});
    }
  };

  const validateRecordingParameters = () => {
    const result = [];
    let ignoredKeyFound = false;

    if (!state.bidsMetadata) {
      return formatWarning('No EEG Parameter metadata file selected');
    }

    if (state.invalidBidsMetadataFile?.length > 0) {
      return formatError(
          `EEG Parameter metadata file(s) 
            ${state.invalidBidsMetadataFile.join(', ')}
            are not valid JSON file(s).`,
      );
    }

    if ('error' in state.bidsMetadata) {
      return formatWarning(state.bidsMetadata['error']);
    }

    const metadata = state.bidsMetadata?.metadata;
    const ignoredKeys = state.bidsMetadata?.ignored_keys;

    if (!metadata || !ignoredKeys || metadata.length < 1) {
      return formatWarning(
          'An error occured while processing ' +
          'the recording parameters file selected.',
      );
    }

    Object.keys(metadata).map((key) => {
      if (ignoredKeys.indexOf(key) > -1) {
        ignoredKeyFound = true;
        result.push(
            <div key={key}>
              {formatWarning(`${key}: ${metadata[key]}`)}
            </div>,
        );
      } else {
        result.push(
            <div
              key={key}
              style={{paddingLeft: '32px'}}
            >
              {key}: {typeof metadata[key] == 'object' ?
                JSON.stringify(metadata[key]) :
                metadata[key]
              }
            </div>,
        );
      }
    });

    if (ignoredKeyFound) {
      result.push(
          <p key="message">
            <span className='warning'>&#x26A0;</span>
            Note: invalid or extra parameters, as well as
            parameters with empty values are ignored.
          </p>,
      );
    }

    return result;
  };

  const validateRecordingDetails = () => {
    const result = [];

    // taskName
    let taskNameStatus = '';
    const taskName = state.taskName;
    if (taskName) {
      /* if (taskName.indexOf('-') > -1 ||
          taskName.indexOf('_') > -1 ||
          taskName.indexOf('/') > -1) {
        taskNameStatus = formatError(
            'Task Name has invalid characters (-, /, _)',
        );
      } else {
        taskNameStatus = formatPass(
            `Task Name: ${appContext.getFromTask('taskName')}`,
        );
      } */
      taskNameStatus = formatPass(
          `Task Name: ${state.taskName}`,
      );
    } else {
      taskNameStatus = formatError('Task Name is not specified');
    }
    result.push(<div key='taskNameStatus'>{taskNameStatus}</div>);

    if (state.LORIScompliant) {
      // siteID
      let siteIDStatus = '';
      if (state.siteID) {
        siteIDStatus = formatPass(
            `Site: ${state.siteID}`,
        );
      } else {
        siteIDStatus = formatError('Site is not specified');
      }
      result.push(<div key='siteIDStatus'>{siteIDStatus}</div>);

      // projectID
      let projectIDStatus = '';
      if (state.projectID) {
        projectIDStatus = formatPass(
            `Project: ${state.projectID}`,
        );
      } else {
        projectIDStatus = formatError('Project is not specified');
      }
      result.push(<div key='projectIDStatus'>{projectIDStatus}</div>);

      // subprojectID
      let subprojectIDStatus = '';
      if (state.subprojectID) {
        subprojectIDStatus = formatPass(
            `Subproject: ${state.subprojectID}`,
        );
      } else {
        projectIDStatus = formatError('Subproject is not specified');
      }
      result.push(<div key='subprojectIDStatus'>{subprojectIDStatus}</div>);
    }

    // session
    let sessionStatus = '';
    if (state.session) {
      if (
        state.session.indexOf(' ') >= 0 ||
        state.session.indexOf('-') >= 0
      ) {
        sessionStatus = formatError('Session is containing a dash/space.');
      } else {
        sessionStatus = formatPass(
            `Session: ${state.session}`,
        );
      }
    } else {
      sessionStatus = formatError('Session is not specified');
    }
    result.push(<div key='sessionStatus'>{sessionStatus}</div>);

    // lineFreq
    let lineFreqStatus = '';
    if (state.lineFreq) {
      lineFreqStatus = formatPass(
          `Powerline Frequency: ${state.lineFreq}`,
      );
    } else {
      lineFreqStatus = formatWarning('Powerline frequency is not specified');
    }
    result.push(<div key='lineFreqStatus'>{lineFreqStatus}</div>);

    // reference
    let referenceStatus = '';
    if (state.reference) {
      referenceStatus = formatPass(
          `Reference: ${state.reference}`,
      );
    } else {
      referenceStatus = formatError('Reference is not specified');
    }
    result.push(<div key='referenceStatus'>{referenceStatus}</div>);

    return result;
  };

  const validateParticipantDetails = () => {
    const result = [];

    if (state.participantEntryMode == 'existing_loris') {
      // participantPSCID
      let participantPSCIDStatus = '';

      // participantCandID
      let participantCandIDStatus = '';

      if (!state.participantPSCID) {
        participantPSCIDStatus = formatError(
            'LORIS PSCID is not specified',
        );
      } else {
        participantPSCIDStatus = formatPass(
            `LORIS PSCID: ${state.participantPSCID}`,
        );
      }

      if (!state.participantCandID) {
        participantCandIDStatus = formatError(
            'LORIS DCCID is not specified',
        );
      } else if (state.participantCandID?.error) {
        participantCandIDStatus = formatError(
            state.participantCandID.error,
        );
      } else {
        participantCandIDStatus = formatPass(
            `LORIS DCCID: ${state.participantCandID}`,
        );
      }

      result.push(
          <div key='participantPSCIDStatus'>
            {participantPSCIDStatus}
          </div>,
      );

      result.push(
          <div key='participantCandIDStatus'>
            {participantCandIDStatus}
          </div>,
      );
    } else {
      // participantID
      let participantIDStatus = '';
      if (state.participantID) {
        participantIDStatus = formatPass(
            `Participant ID: ${state.participantID}`,
        );
      } else {
        participantIDStatus = formatError(
            'Participant ID is not specified',
        );
      }
      // participantCandID
      // let participantCandID;
      // if (state.participantCandID) {
      //   participantCandID = formatPass(
      //       `DSCID: ${state.participantCandID}`,
      //   );
      // } else {
      //   participantCandID = formatError(
      //       'DSCID is unknown',
      //   );
      // }
      result.push(
          <div key='participantID'>{participantIDStatus}</div>,
          // <div key='participantCandID'>{participantCandID}</div>,
      );
    }

    return result;
  };

  /**
   * hideModal - display Modal.
   * @param {boolean} hidden
   */
  const hideModal = (hidden) => {
    setModalVisible(!hidden);
  };

  /**
   * beginBidsCreation - create BIDS format.
   *   Sent by socket to python: edf_to_bids.
   */
  const beginBidsCreation = () => {
    if (!state.preparedBy) {
      setDisplayErrors(true);
      return;
    }

    setModalText((prevState) => {
      return {...prevState, ['mode']: 'loading'};
    });
    setModalVisible(true);

    if (state.edfData?.['files'].length > 0) {
      const {outputTime, ...data} = state;
      socketContext.emit('edf_to_bids', {
        ...data,
        eventFiles: state.eventFiles[0]?.['path'],
        annotationsTSV: state.annotationsTSV[0]?.['path'],
        annotationsJSON: state.annotationsJSON[0]?.['path'],
        readOnly: false,
      });
    }
  };

  /* const onError = () => {
    setValidationError(true);
  };*/

  return (
    <div style={{display: props.visible ? 'block' : 'none'}}>
      <span className='header'>
        EDF to BIDS
      </span>
      <div className='info report'>
        <div className='small-pad'>
          <b>Review your data and metadata:</b>
          <div></div>
        </div>
        <div className='small-pad'>
          <b>Review your recording details:</b>
          {validateRecordingDetails()}
        </div>
        <div className='small-pad'>
          <b>Review your participant details:</b>
          {validateParticipantDetails()}
        </div>
        <div className='small-pad'>
          <b>Review your uploaded EEG Parameter metadata:</b>
          <div>{validateRecordingParameters()}</div>
        </div>
        <div className='small-pad'>
          <b>Verify anonymization of EDF header data:</b>
          {state.subjectID ?
            <div>
              Subject ID: {state.subjectID}
            </div> :
            <div>
              {formatWarning('Subject ID is not modified.')}
            </div>
          }
          {state.recording_id &&
            <div>
              Recording ID:&nbsp;
              {state.recording_id}
            </div>
          }
          {state.edfData?.['date'] &&
            <div>
              Recording Date:&nbsp;
              {new Intl.DateTimeFormat(
                  'en-US',
                  {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                  },
              ).format(state.edfData['date'])}
            </div>
          }
        </div>

        {validationError ?
          <div className="alert alert-danger" role="alert">
            &#x274C; Please correct the above errors.
          </div> :
          <div className="alert alert-success" role="alert">
            &#x2714; Ready to proceed
          </div>
        }

        <hr/>

        <div className='small-pad'>
          <TextInput
            id='preparedBy'
            name='preparedBy'
            required={true}
            label='Prepared by'
            value={state.preparedBy}
            placeholder='Enter your name'
            onUserInput={(_, value) => setState({preparedBy: value})}
            help='Name of person performing data conversion
            and validation is required.'
          />
          {!state.preparedBy && displayErrors &&
            <div>
              <span className='error'>&#x274C;</span>
              Required for conversion logging
            </div>
          }
        </div>
        <div className='small-pad convert-bids-row'>
          <input type='button'
            className='start_task primary-btn'
            onClick={beginBidsCreation}
            value='Convert to BIDS'
            disabled={validationError}
          />
          {successMessage}
        </div>
      </div>
      <Modal
        title={modalText.title[modalText.mode]}
        show={modalVisible}
        close={hideModal}
        width='500px'
      >
        {modalText.message[modalText.mode]}
      </Modal>
    </div>
  );
};

Converter.propTypes = {
  visible: PropTypes.bool,
};

export default Converter;
