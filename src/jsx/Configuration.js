import React, {useContext, useState, useEffect} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';
import '../css/Configuration.css';
import '../../node_modules/@fortawesome/fontawesome-free/css/all.css';
import 'react-datepicker/dist/react-datepicker.css';
import EEGRun from './types/EEGRun';
import Papa from 'papaparse';

// Components
import {
  DirectoryInput,
  FileInput,
  NumberInput,
  RadioInput,
  TextInput,
  SelectInput,
  TextareaInput,
  MultiDirectoryInput,
} from './elements/inputs';
import {
  AuthenticationMessage,
  AuthenticationCredentials,
} from './elements/authentication';
import Switch from 'react-switch';
import DatePicker from 'react-datepicker';

// Socket.io
import {SocketContext} from './socket.io';

import '../css/Converter.css';

// Display Loading, Success, Error
import Modal from './elements/modal';

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
  const initialState = {
    eegRuns: null,
    fileFormatUploaded: 'edf',
    fileFormat: 'edf',
    eegData: [],
    eegFiles: [],
    mffDirectories: [{path: '', name: ''}],
    modality: 'ieeg',
    eventFiles: [],
    invalidEventFiles: [],
    annotationsTSV: [],
    invalidAnnotationsTSV: [],
    annotationsJSON: [],
    invalidAnnotationsJSON: [],
    bidsDirectory: null,
    LORIScompliant: true,
    siteID: 'n/a',
    siteOptions: [],
    siteUseAPI: false,
    projectID: 'n/a',
    projectOptions: [],
    projectUseAPI: false,
    subprojectID: 'n/a',
    subprojectOptions: [],
    subprojectUseAPI: false,
    session: '',
    sessionOptions: [],
    sessionUseAPI: false,
    bidsMetadataFile: [],
    invalidBidsMetadataFile: [],
    bidsMetadata: null,
    lineFreq: 'n/a',
    taskName: '',
    reference: 'n/a',
    recordingType: 'n/a',
    participantEntryMode: 'existing_loris',
    participantPSCID: '',
    participantCandID: '',
    participantID: '',
    participantDOB: null,
    participantAge: 'n/a',
    participantSex: 'n/a',
    participantHand: 'n/a',
    anonymize: false,
    subjectID: '',
  };

  const state = {};
  for (const [key, value] of Object.entries(initialState)) {
    state[key] = {};
    [state[key].get, state[key].set] = useState(value);
  }

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authCredentialsVisible, setAuthCredentialsVisible] = useState(false);

  const [preparedBy, setPreparedBy] = useState('');
  const [displayErrors, setDisplayErrors] = useState(false);
  const [outputTime, setOutputTime] = useState('');
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

  /**
   * reset - reset the form fields (state).
   */
  const reset = () => {
    for (const [key, value] of Object.entries(initialState)) {
      state[key].set(value);
    }
  };

  /**
   * beginBidsCreation - create BIDS format.
   *   Sent by socket to python: eeg_to_bids.
   */
  const beginBidsCreation = () => {
    if (!preparedBy) {
      setDisplayErrors(true);
      return;
    }

    setModalText((prevState) => {
      return {...prevState, ['mode']: 'loading'};
    });
    setModalVisible(true);

    if (appContext.getFromTask('eegData')?.['files'].length > 0) {
      socketContext.emit('eeg_to_bids', {
        eegData: appContext.getFromTask('eegData') ?? [],
        fileFormat: state.fileFormat.get ?? '',
        eegRuns: state.eegRuns.get ?? [],
        modality: appContext.getFromTask('modality') ?? 'ieeg',
        bids_directory: appContext.getFromTask('bidsDirectory') ?? '',
        read_only: false,
        event_files: appContext.getFromTask('eventFiles').length > 0 ?
          appContext.getFromTask('eventFiles')[0]['path'] : '',
        annotations_tsv: appContext.getFromTask('annotationsTSV').length > 0 ?
          appContext.getFromTask('annotationsTSV')[0]['path'] : '',
        annotations_json: appContext.getFromTask('annotationsJSON').length > 0 ?
          appContext.getFromTask('annotationsJSON')[0]['path'] : '',
        bidsMetadata: appContext.getFromTask('bidsMetadata') ?? '',
        site_id: appContext.getFromTask('siteID') ?? '',
        project_id: appContext.getFromTask('projectID') ?? '',
        sub_project_id: appContext.getFromTask('subprojectID') ?? '',
        session: appContext.getFromTask('session') ?? '',
        participantID: appContext.getFromTask('participantID') ?? '',
        age: appContext.getFromTask('participantAge') ?? '',
        hand: appContext.getFromTask('participantHand') ?? '',
        sex: appContext.getFromTask('participantSex') ?? '',
        preparedBy: preparedBy ?? '',
        line_freq: appContext.getFromTask('lineFreq') || 'n/a',
        recording_type: appContext.getFromTask('recordingType') ?? 'n/a',
        taskName: appContext.getFromTask('taskName') ?? '',
        reference: appContext.getFromTask('reference') ?? '',
        subject_id: appContext.getFromTask('subject_id') ?? '',
      });
    }
  };

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    if (outputTime) {
      // cleanup time display for user.
      let time = outputTime.replace('output-', '');
      time = time.slice(0, time.lastIndexOf('-')) + ' ' +
        time.slice(time.lastIndexOf('-')+1);
      setSuccessMessage(<>
        <a className='task-finished'>Last created at: {time}</a>
      </>);
    }
  }, [outputTime]);

  useEffect(() => {
    if (isAuthenticated && state.LORIScompliant.get) {
      state.participantEntryMode.set('existing_loris');
    } else {
      state.participantEntryMode.set('manual');
    }
  }, [state.LORIScompliant.get, isAuthenticated]);

  /**
   * hideModal - display Modal.
   * @param {boolean} hidden
   */
  const hideModal = (hidden) => {
    setModalVisible(!hidden);
  };

  const validateJSON = (jsons) => {
    const promisesArray = [];
    for (let i = 0; i < jsons?.length; i++) {
      const json = jsons[i];
      promisesArray.push(new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.readAsText(json, 'UTF-8');
        fileReader.onload = (e) => {
          try {
            JSON.parse(e.target.result);
            resolve(null);
          } catch (e) {
            console.log(e);
            resolve(json.name);
          }
        };
      }));
    }
    return Promise.all(promisesArray);
  };

  const validateTSV = (tsvs) => {
    const promisesArray = [];
    for (let i = 0; i < tsvs?.length; i++) {
      const tsv = tsvs[i];
      promisesArray.push(new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.readAsText(tsv, 'UTF-8');
        fileReader.onload = (e) => {
          Papa.parse(
              e.target.result,
              {
                quoteChar: '',
                complete: (results, file) => {
                  console.log(results.errors);
                  if (results.errors.length > 0) {
                    resolve(tsv.name);
                  } else {
                    resolve(null);
                  }
                },
              },
          );
        };
      }));
    }
    return Promise.all(promisesArray);
  };

  useEffect(() => {
    if (socketContext) {
      state.participantID.set('');

      if (!state.participantCandID.get || !state.participantPSCID.get) {
        appContext.setTask('participantCandID', {
          error: 'The DDCID/PSCID pair you provided' +
              ' does not match an existing candidate.',
        });
        return;
      }

      socketContext.emit('get_participant_data', {
        candID: state.participantCandID.get,
      });
    }
  }, [state.participantCandID.get, state.participantPSCID.get]);

  useEffect(() => {
    validateJSON(state.bidsMetadataFile.get)
        .then((result) => {
          state.invalidBidsMetadataFile.set(result.filter((el) => el != null));
        });
  }, [state.bidsMetadataFile.get]);

  useEffect(() => {
    validateTSV(state.eventFiles.get)
        .then((result) => {
          state.invalidEventFiles.set(result.filter((el) => el != null));
        });
  }, [state.eventFiles.get]);

  useEffect(() => {
    validateJSON(state.annotationsJSON.get)
        .then((result) => {
          state.invalidAnnotationsJSON.set(result.filter((el) => el != null));
        });
  }, [state.annotationsJSON.get]);

  useEffect(() => {
    validateTSV(state.annotationsTSV.get)
        .then((result) => {
          state.invalidAnnotationsTSV.set(result.filter((el) => el != null));
        });
  }, [state.annotationsTSV.get]);

  useEffect(() => {
    if (props.appMode === 'Converter') {
      console.info('validate');
      validate();
    }
  }, [props.appMode]);

  useEffect(() => {
    if (socketContext) {
      socketContext.on('bids', (message) => {
        if (message['output_time']) {
          setOutputTime(message['output_time']);
          appContext.setTask('output_time', message['output_time']);
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
    }
  }, [socketContext]);

  let error = false;
  const formatError = (msg) => {
    error = true;
    return (
      <>
        <span className='error'>&#x274C;</span> {msg}
      </>
    );
  };

  const formatWarning = (msg) => {
    return (
      <>
        <span className='warning'>&#x26A0;</span> {msg}
      </>
    );
  };

  const formatPass = (msg) => {
    return (
      <>
        <span className='checkmark'>&#x2714;</span>
        {msg}
      </>
    );
  };

  const validateData = () => {
    const result = [];

    // eegData
    let eegDataStatus = '';
    if (state.eegData.get?.error) {
      eegDataStatus = formatError(state.eegData.get.error);
    } else if (
      state.eegData.get && state.eegData.get?.files?.length > 0
    ) {
      eegDataStatus = formatPass('EEG data file(s): ' +
        state.eegData.get.files.map(
            (eegFile) => eegFile['name'],
        ).join(', '),
      );
    } else {
      eegDataStatus = formatError('No EEG file selected');
    }
    result.push(<div key='eegDataStatus'>{eegDataStatus}</div>);


    // Data modality
    let modalityStatus = '';
    if (appContext.getFromTask('modality')) {
      modalityStatus = formatPass(
          `Modality: ${appContext.getFromTask('modality')}`,
      );
    } else {
      modalityStatus = formatError('No modality selected');
    }
    result.push(<div key='modalityStatus'>{modalityStatus}</div>);

    // events
    let eventsStatus = '';
    if (!appContext.getFromTask('eventFiles') ||
      Object.keys(appContext.getFromTask('eventFiles'))?.length < 1
    ) {
      eventsStatus = formatWarning('No events.tsv selected ' +
      '(for additional events)');
    } else {
      // check if any TSV file is invalid
      if (state.invalidEventFiles.get?.length > 0) {
        eventsStatus = formatError(
            `Event file(s) ${state.invalidEventFiles.get.join(', ')}
            are not valid TSV file(s).`,
        );
      } else {
        let match = true;

        // Check that the events files are appropriatly named
        appContext.getFromTask('eventFiles').map((eventFile) => {
          if ('files' in appContext.getFromTask('eegData') &&
          !appContext.getFromTask('eegData')?.files.find(
              (eegFile) => {
                const re = new RegExp('_i?eeg.' + state.fileFormat.get, 'i');
                const eegFileName = eegFile['name'].toLowerCase()
                    .replace(re, '')
                    .replace('.' + state.fileFormat.get, '');

                const eegFileNameAlt = eegFile['name'].toLowerCase()
                    .replace('.' + state.fileFormat.get, '');

                const eventFileName = eventFile['name'].toLowerCase()
                    .replace('_events.tsv', '').replace('.tsv', '');

                return (
                  eegFileName === eventFileName ||
                  eegFileNameAlt === eventFileName
                );
              },
          )) {
            match = false;
            eventsStatus = formatError(
                `Event file ${eventFile['name']}
                is not matching any eeg file names.`,
            );
          }
        });

        if (match) {
          eventsStatus = formatPass('Event file(s): ' +
              appContext.getFromTask('eventFiles').map(
                  (eventFile) => eventFile['name'],
              ).join(', '),
          );
        }
      }
    }
    result.push(<div key='eventsStatus'>{eventsStatus}</div>);


    // annotations TSV
    let annotationsTSVStatus = '';
    if (!appContext.getFromTask('annotationsTSV') ||
      Object.keys(appContext.getFromTask('annotationsTSV'))?.length < 1
    ) {
      annotationsTSVStatus = formatWarning('No annotations.tsv selected');
    } else {
      // check if any TSV file is invalid
      if (state.invalidAnnotationsTSV.get?.length > 0) {
        annotationsTSVStatus = formatError(
            `Annotation file(s) ${state.invalidAnnotationsTSV.get.join(', ')}
            are not valid TSV file(s).`,
        );
      } else {
        let match = true;

        // Check that the events files are appropriatly named
        appContext.getFromTask('annotationsTSV').map((annotationsTSVFile) => {
          if (!appContext.getFromTask('eegData')['files'].find(
              (eegFile) => {
                const re = new RegExp('_i?eeg.' + state.fileFormat.get, 'i');
                const eegFileName = eegFile['name'].toLowerCase()
                    .replace(re, '')
                    .replace('.' + state.fileFormat.get, '');

                const eegFileNameAlt = eegFile['name'].toLowerCase()
                    .replace('.' + state.fileFormat.get, '');

                const annotationsTSVFileName = annotationsTSVFile['name']
                    .toLowerCase()
                    .replace('_annotations.tsv', '').replace('.tsv', '');

                return (
                  eegFileName === annotationsTSVFileName ||
                  eegFileNameAlt === annotationsTSVFileName
                );
              },
          )) {
            match = false;
            annotationsTSVStatus = formatError(
                `Annotation file ${annotationsTSVFile['name']}
                is not matching any eeg file names.`,
            );
          }
        });

        if (match) {
          annotationsTSVStatus = formatPass('Annotations TSV file(s): ' +
              appContext.getFromTask('annotationsTSV').map(
                  (annotationsTSVFile) => annotationsTSVFile['name'],
              ).join(', '),
          );
        }
      }
    }
    result.push(<div key='annotationsTSVStatus'>{annotationsTSVStatus}</div>);

    // annotations JSON
    let annotationsJSONStatus = '';

    //if (appContext.getFromTask('annotationsTSV') &&
    //  Object.keys(appContext.getFromTask('annotationsTSV'))?.length > 0
    //) {
    if (!appContext.getFromTask('annotationsJSON') ||
      Object.keys(appContext.getFromTask('annotationsJSON'))?.length < 1
    ) {
      annotationsJSONStatus = formatWarning('No annotations.json selected');
    } else {
      // check if any JSON file is invalid
      if (state.invalidAnnotationsJSON.get?.length > 0) {
        annotationsJSONStatus = formatError(
            `Annotation file(s) ${state.invalidAnnotationsJSON.get.join(', ')}
            are not valid JSON file(s).`,
        );
      } else {
        let match = true;
        // Check that the events files are appropriatly named
        appContext.getFromTask('annotationsJSON')
            .map((annotationsJSONFile) => {
              if (!appContext.getFromTask('eegData')['files'].find(
                  (eegFile) => {
                    const re = new RegExp('_i?eeg.'+ state.fileFormat.get, 'i');
                    const eegFileName = eegFile['name'].toLowerCase()
                        .replace(re, '')
                        .replace('.' + state.fileFormat.get, '');

                    const eegFileNameAlt = eegFile['name'].toLowerCase()
                        .replace('.' + state.fileFormat.get, '');

                    const annotationsJSONFileName =
                        annotationsJSONFile['name'].toLowerCase()
                            .replace('_annotations.json', '')
                            .replace('.json', '');

                    return (
                      eegFileName === annotationsJSONFileName ||
                      eegFileNameAlt === annotationsJSONFileName
                    );
                  },
              )) {
                match = false;
                annotationsJSONStatus = formatError(
                    `Annotation file ${annotationsJSONFile['name']}
                  is not matching any eeg file names.`,
                );
              }
            });

        if (match) {
          annotationsJSONStatus = formatPass(
              'Annotations JSON file(s): ' +
              appContext.getFromTask('annotationsJSON').map(
                  (annotationsJSONFile) => annotationsJSONFile['name'],
              ).join(', '),
          );
        }
      }
    }
    result.push(
        <div key='annotationsJSONStatus'>
          {annotationsJSONStatus}
        </div>,
    );
    //}


    // bidsDirectory
    let bidsDirectoryStatus = '';
    if (appContext.getFromTask('bidsDirectory')) {
      bidsDirectoryStatus = formatPass('BIDS output directory: ' +
        appContext.getFromTask('bidsDirectory'),
      );
    } else {
      bidsDirectoryStatus = formatError('No BIDS output folder selected');
    }
    result.push(<div key='bidsDirectoryStatus'>{bidsDirectoryStatus}</div>);

    // LORIS compliant
    let LORIScompliantStatus = '';
    if (typeof appContext.getFromTask('LORIScompliant') == 'boolean') {
      LORIScompliantStatus = formatPass(
          `Data loaded in LORIS: ${appContext.getFromTask('LORIScompliant')}`,
      );
    } else {
      LORIScompliantStatus = formatError(
          'Select if the data will be loaded into LORIS.',
      );
    }
    result.push(<div key='LORIScompliantStatus'>{LORIScompliantStatus}</div>);

    return result;
  };

  const validateRecordingParameters = () => {
    const result = [];
    let ignoredKeyFound = false;

    if (!appContext.getFromTask('bidsMetadata')) {
      return formatWarning('No EEG Parameter metadata file selected');
    }

    if (state.invalidBidsMetadataFile.get?.length > 0) {
      return formatError(
          `EEG Parameter metadata file(s) 
            ${state.invalidBidsMetadataFile.get.join(', ')}
            are not valid JSON file(s).`,
      );
    }

    if ('error' in appContext.getFromTask('bidsMetadata')) {
      return formatWarning(appContext.getFromTask('bidsMetadata')['error']);
    }

    const metadata = appContext.getFromTask('bidsMetadata')?.metadata;
    const ignoredKeys = appContext.getFromTask('bidsMetadata')?.ignored_keys;

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
    const taskName = appContext.getFromTask('taskName');
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
          `Task Name: ${appContext.getFromTask('taskName')}`,
      );
    } else {
      taskNameStatus = formatError('Task Name is not specified');
    }
    result.push(<div key='taskNameStatus'>{taskNameStatus}</div>);

    if (appContext.getFromTask('LORIScompliant')) {
      // siteID
      let siteIDStatus = '';
      if (appContext.getFromTask('siteID')) {
        siteIDStatus = formatPass(
            `Site: ${appContext.getFromTask('siteID')}`,
        );
      } else {
        siteIDStatus = formatError('Site is not specified');
      }
      result.push(<div key='siteIDStatus'>{siteIDStatus}</div>);

      // projectID
      let projectIDStatus = '';
      if (appContext.getFromTask('projectID')) {
        projectIDStatus = formatPass(
            `Project: ${appContext.getFromTask('projectID')}`,
        );
      } else {
        projectIDStatus = formatError('Project is not specified');
      }
      result.push(<div key='projectIDStatus'>{projectIDStatus}</div>);

      // subprojectID
      let subprojectIDStatus = '';
      if (appContext.getFromTask('subprojectID')) {
        subprojectIDStatus = formatPass(
            `Subproject: ${appContext.getFromTask('subprojectID')}`,
        );
      } else {
        projectIDStatus = formatError('Subproject is not specified');
      }
      result.push(<div key='subprojectIDStatus'>{subprojectIDStatus}</div>);
    }

    // session
    let sessionStatus = '';
    if (appContext.getFromTask('session')) {
      if (
        appContext.getFromTask('session').indexOf(' ') >= 0 ||
        appContext.getFromTask('session').indexOf('-') >= 0
      ) {
        sessionStatus = formatError('Session is containing a dash/space.');
      } else {
        sessionStatus = formatPass(
            `Session: ${appContext.getFromTask('session')}`,
        );
      }
    } else {
      sessionStatus = formatError('Session is not specified');
    }
    result.push(<div key='sessionStatus'>{sessionStatus}</div>);

    // lineFreq
    let lineFreqStatus = '';
    if (appContext.getFromTask('lineFreq')) {
      lineFreqStatus = formatPass(
          `Powerline Frequency: ${appContext.getFromTask('lineFreq')}`,
      );
    } else {
      lineFreqStatus = formatWarning('Powerline frequency is not specified');
    }
    result.push(<div key='lineFreqStatus'>{lineFreqStatus}</div>);

    // reference
    let referenceStatus = '';
    if (appContext.getFromTask('reference')) {
      referenceStatus = formatPass(
          `Reference: ${appContext.getFromTask('reference')}`,
      );
    } else {
      referenceStatus = formatError('Reference is not specified');
    }
    result.push(<div key='referenceStatus'>{referenceStatus}</div>);

    return result;
  };

  const validateParticipantDetails = () => {
    const result = [];

    if (state.participantEntryMode.get == 'existing_loris') {
      // participantPSCID
      let participantPSCIDStatus = '';

      // participantCandID
      let participantCandIDStatus = '';

      if (!appContext.getFromTask('participantPSCID')) {
        participantPSCIDStatus = formatError(
            'LORIS PSCID is not specified',
        );
      } else {
        participantPSCIDStatus = formatPass(
            `LORIS PSCID: ${state.participantPSCID.get}`,
        );
      }

      if (!appContext.getFromTask('participantCandID')) {
        participantCandIDStatus = formatError(
            'LORIS DCCID is not specified',
        );
      } else if (appContext.getFromTask('participantCandID')?.error) {
        participantCandIDStatus = formatError(
            appContext.getFromTask('participantCandID').error,
        );
      } else {
        participantCandIDStatus = formatPass(
            `LORIS DCCID: ${state.participantCandID.get}`,
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
      if (state.participantID.get) {
        participantIDStatus = formatPass(
            `Participant ID: ${state.participantID.get}`,
        );
      } else {
        participantIDStatus = formatError(
            'Participant ID is not specified',
        );
      }
      // participantCandID
      // let participantCandID;
      // if (state.participantCandID.get) {
      //   participantCandID = formatPass(
      //       `DSCID: ${state.participantCandID.get}`,
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

  const validate = () => {
    /*if (socketContext) {
      if (state.session.get && state.siteID.get &&
          state.projectID.get && state.subprojectID.get &&
          state.eegData.get?.date && state.participantDOB.get &&
          state.participantSex.get
      ) {
        const visitDate = state.eegData.get['date'] */
    //        .toISOString().replace(/T.*/, '');

    //    const dob = state.participantDOB.get
    //        .toISOString().replace(/T.*/, '');

    /*    console.info('start request for new candidate');
        socketContext.emit('create_candidate_and_visit', {
          project: state.projectID.get,
          dob: dob,
          sex: state.participantSex.get,
          site: state.siteID.get,
          subproject: state.subprojectID.get,
          visit: state.session.get,
          date: visitDate,
        });
      }

      if (state.participantCandID.get && state.session.get &&
          state.siteID.get && state.projectID.get &&
          state.subprojectID.get && state.eegData.get?.date
      ) {
        console.info('start request to create the visit');
        const visitDate = state.eegData.get['date'] */
    //        .toISOString().replace(/T.*/, '');

    /*    socketContext.emit('create_visit', {
          candID: state.participantCandID.get,
          project: state.projectID.get,
          site: state.siteID.get,
          subproject: state.subprojectID.get,
          visit: state.session.get,
          date: visitDate,
        });
    } */

    if (state.eegData.get?.files?.length > 0) {
      const eventFiles = [...state.eventFiles.get];
      const annotationsTSVs = [...state.annotationsTSV.get];
      const annotationsJSONs = [...state.annotationsJSON.get];

      const eegRuns = [];

      state.eegData.get?.files.map(
          (eegFile) => {
            const eegRun = new EEGRun();
            eegRun.eegFile = eegFile['path'];

            const re = new RegExp('_i?eeg.' + state.fileFormat.get, 'i');
            const eegFileName = eegFile['name'].toLowerCase()
                .replace(re, '')
                .replace('.' + state.fileFormat.get, '');

            const eegFileNameAlt = eegFile['name'].toLowerCase()
                .replace('.' + state.fileFormat.get, '');

            // Check if we do have a matching event file
            const eventFileIndex = eventFiles.findIndex((eventFile) => {
              const eventFileName = eventFile['name'].toLowerCase()
                  .replace('_events.tsv', '').replace('.tsv', '');
              return (
                eegFileName === eventFileName ||
                eegFileNameAlt === eventFileName
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
                    eegFileName === annotationsTSVName ||
                    eegFileNameAlt === annotationsTSVName
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
                    eegFileName === annotationsJSONName ||
                    eegFileNameAlt === annotationsJSONName
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
          is not matching any eeg file names.`);
      });

      eegRuns.annotationsTSVErrors = [];
      annotationsTSVs.map((annotationsTSV) => {
        eegRuns.annotationsTSVErrors.push(
            `Annotation file ${annotationsTSV['name']}
            is not matching any eeg file names.`,
        );
      });

      eegRuns.annotationsJSONErrors = [];
      annotationsJSONs.map((annotationsJSON) => {
        eegRuns.annotationsJSONErrors.push(
            `Annotation file  ${annotationsJSON['name']}
            is not matching any eeg file names.`,
        );
      });

      state.eegRuns.set(eegRuns);
    }
  };

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    if (!state.participantCandID.get || !state.session.get ||
      !state.siteID.get || !state.projectID.get ||
      !state.subprojectID.get || !state.eegData.get?.date) return;

    const visitDate = state.eegData.get['date']
        .toISOString().replace(/T.*/, '');

    socketContext.emit('create_visit', {
      candID: state.participantCandID.get,
      project: state.projectID.get,
      site: state.siteID.get,
      subproject: state.subprojectID.get,
      visit: state.session.get,
      date: visitDate,
    });
  }, [state.participantCandID.get, state.session.get,
    state.siteID.get, state.projectID.get, state.subprojectID.get,
    state.eegData.get]);

  useEffect(() => {
    Object.keys(state).map((key) => appContext.setTask(key, state[key].get));
  }, []);

  useEffect(() => {
    state.mffDirectories.set([{path: '', name: ''}]);
    state.eegFiles.set([]);
  }, [state.fileFormatUploaded.get]);

  useEffect(() => {
    if (socketContext) {
      let emit = '';
      if (state.fileFormatUploaded.get === 'edf') {
        console.log('edf file selected');
        emit = 'get_edf_data';
      }
      if (state.fileFormatUploaded.get === 'set') {
        console.log('set file selected');
        emit = 'get_set_data';
      }
      socketContext.emit(emit, {
        files: state.eegFiles.get.map((eegFile) =>
          ({
            path: eegFile['path'],
            name: eegFile['name'],
          })),
      });
    }
  }, [state.eegFiles.get]);

  useEffect(async () => {
    if (socketContext && state.fileFormatUploaded.get === 'mff') {
      const updateMessage = (msg) => {
        console.log(msg);
        state.eegData.set(msg);
        appContext.setTask('eegData', msg);
      };

      // if no MFF files, do nothing.
      const dirs = state.mffDirectories.get.filter((dir) => dir['path'] != '');
      if (dirs.length == 0) {
        updateMessage({'error': 'No MFF file selected.'});
        return;
      }

      // Start working on file conversion-
      updateMessage({'error': 'Working on converting files...'});

      const setFiles = [];
      const callback = (success, message, file) => {
        if (success) {
          console.log(message);
          setFiles.push(file);

          if (setFiles.length === dirs.length) {
            socketContext.emit('get_set_data', {files: setFiles});
          }
        } else {
          updateMessage({'error': message});
        }
      };

      const myAPI = window['myAPI']; // from public/preload.js
      for (const dir of dirs) {
        await myAPI.convertMFFToSET(dir, callback);
      }
    }
  }, [state.mffDirectories.get]);

  useEffect(() => {
    if (socketContext) {
      if (state.bidsMetadataFile.get.length > 0) {
        socketContext.emit('get_bids_metadata', {
          file_path: state.bidsMetadataFile.get[0]['path'],
          modality: state.modality.get,
        });
      }
    }
  }, [state.bidsMetadataFile.get, state.modality.get]);

  useEffect(() => {
    if (!state.eegData.get?.date || !state.participantDOB.get) return;

    const age = getAge(state.participantDOB.get, state.eegData.get.date);
    state.participantAge.set(age);
    appContext.setTask('participantAge', age);
  }, [state.participantDOB.get, state.eegData.get]);

  useEffect(() => {
    if (!state.eegData.get?.files) return;

    validate();
  }, [state.eegData.get]);

  useEffect(() => {
    if (socketContext) {
      socketContext.on('loris_sites', (sites) => {
        if (!sites) return;
        const siteOpts = [];
        sites.map((site) => {
          siteOpts.push(site.Name);
        });
        state.siteOptions.set(siteOpts);
      });

      socketContext.on('loris_projects', (projects) => {
        const projectOpts = [];
        Object.keys(projects).map((project) => {
          projectOpts.push(project);
        });
        state.projectOptions.set(projectOpts);
      });

      socketContext.on('loris_subprojects', (subprojects) => {
        const subprojectOpts = [];
        subprojects?.map((subproject) => {
          subprojectOpts.push(subproject);
        });
        state.subprojectOptions.set(subprojectOpts);
      });

      socketContext.on('loris_visits', (visits) => {
        const visitOpts = [];
        if (visits && visits?.length > 0) {
          visits.map((visit) => {
            visitOpts.push(visit);
          });
        }
        state.sessionOptions.set(visitOpts);
      });

      socketContext.on('edf_data', (message) => {
        if (message['error']) {
          console.error(message['error']);
        }

        if (message['date']) {
          message['date'] = new Date(message['date']);
        }

        state.subjectID.set(message?.['subjectID'] || '');
        state.eegData.set(message);
        state.fileFormat.set('edf');
        appContext.setTask('eegData', message);
      });

      socketContext.on('set_data', (message) => {
        if (message['error']) {
          console.error(message['error']);
        }

        if (message['date']) {
          message['date'] = new Date(message['date']);
        }

        state.subjectID.set(message?.['subjectID'] || '');
        state.eegData.set(message);
        state.fileFormat.set('set');
        appContext.setTask('eegData', message);
      });

      socketContext.on('bids_metadata', (message) => {
        if (message['error']) {
          console.error(message['error']);
        }

        state.bidsMetadata.set(message);
        appContext.setTask('bidsMetadata', message);
      });

      socketContext.on('new_candidate_created', (data) => {
        console.info('candidate created !!!');

        state.participantID.set(data['PSCID']);
        state.participantCandID.set(data['CandID']);
        appContext.setTask('participantID', data['PSCID']);
        appContext.setTask('participantCandID', data['CandID']);
      });

      socketContext.on('loris_login_response', (data) => {
        // todo from alizee - this code should not,
        //  isAuthenticated should be passed back from authentication component
        if (data.error) {
          // todo display error message - login failure
        } else {
          setIsAuthenticated(true);
          //state.participantEntryMode.set('new_loris');
        }
      });
    }
  }, [socketContext]);

  useEffect(() => {
    if (socketContext) {
      socketContext.on('participant_data', (data) => {
        if (data?.error) {
          appContext.setTask('participantCandID', {error: data.error});
          state.participantID.set('');
          appContext.setTask('participantID', '');
        } else if (state.participantPSCID.get == data.PSCID) {
          appContext.setTask('participantCandID', state.participantCandID.get);

          state.participantID.set(data.PSCID);
          appContext.setTask('participantID', data.PSCID);

          state.participantDOB.set(new Date(data.DoB));
          appContext.setTask('participantDoB', data.DoB);

          state.participantSex.set(data.Sex);
          appContext.setTask('participantSex', data.Sex);
        } else {
          state.participantID.set('');
          appContext.setTask('participantID', '');
          appContext.setTask('participantCandID', {
            error: 'The DDCID/PSCID pair you provided' +
                ' does not match an existing candidate.',
          });
        }
      });
    }
  }, [socketContext, state.participantPSCID.get]);

  /**
   * onUserInput - input change by user.
   * @param {string} name - element name
   * @param {object|string|boolean} value - element value
   */
  const onUserInput = (name, value) => {
    if (typeof value === 'string') {
      value = value.trim();
    }

    // Update the state of Configuration.
    switch (name) {
      case 'LORIScompliant':
        if (value === 'yes') {
          value = true;
        } else {
          value = false;
        }
        state.LORIScompliant.set(value);
        break;
      case 'recordingID':
        state.eegData.set((prevState) => {
          return {...prevState, [name]: value};
        });
        appContext.setTask(name, value);
        break;
      case 'subjectID':
        state.eegData.set((prevState) => {
          return {...prevState, [name]: value};
        });
        state.subjectID.set(value);
        appContext.setTask(name, value);
        break;
      case 'siteID_API':
        if (value == 'Enter manually') {
          value = '';
          state.siteUseAPI.set(false);
        } else {
          state.siteUseAPI.set(true);
        }
        state.siteID.set(value);
        name = 'siteID';
        break;
      case 'siteID_Manual':
        state.siteID.set(value);
        name = 'siteID';
        break;
      case 'projectID_API':
        if (value == 'Enter manually') {
          state.projectUseAPI.set(false);
          value = '';
        } else {
          state.projectUseAPI.set(true);
          socketContext.emit('get_loris_subprojects', value);
        }
        state.projectID.set(value);
        name = 'projectID';
        break;
      case 'projectID_Manual':
        state.projectID.set(value);
        name = 'projectID';
        break;
      case 'subprojectID_API':
        if (value == 'Enter manually') {
          state.subprojectUseAPI.set(false);
          value = '';
        } else {
          state.subprojectUseAPI.set(true);
          socketContext.emit('get_loris_visits', value);
        }
        state.subprojectID.set(value);
        name = 'subprojectID';
        break;
      case 'subprojectID_Manual':
        state.subprojectID.set(value);
        name = 'subprojectID';
        break;
      case 'session_API':
        if (value == 'Enter manually') {
          state.sessionUseAPI.set(false);
          value = '';
        } else {
          state.sessionUseAPI.set(true);
        }
        state.session.set(value);
        name = 'session';
        break;
      case 'session_Manual':
        state.session.set(value);
        name = 'session';
        break;
      case 'anonymize':
        if (value) {
          state.eegData.set((prevState) => {
            return {...prevState, ['subjectID']: 'X X X X'};
          });
          appContext.setTask('subjectID', 'X X X X');
        } else {
          state.eegData.set((prevState) => {
            return {...prevState, ['subjectID']: state.subjectID.get};
          });
          appContext.setTask('subjectID', state.subjectID.get);
        }
        state.anonymize.set(value);
        break;
      default:
        if (name in state) {
          state[name].set(value);
        }
    }
    if (name in state) {
      // Update the 'task' of app context.
      appContext.setTask(name, value);
    }
  };

  /**
   * Get age at visit
   *
   * @param {Date} birthDate
   * @param {Date} visitDate
   *
   * @return {Number}
   */
  const getAge = (birthDate, visitDate) => {
    if (!birthDate || !visitDate) return;

    let age = visitDate.getFullYear() - birthDate.getFullYear();
    const m = visitDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && visitDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  /**
   * arrayToObject - Convert an array to an object
   * { value: value }
   *
   * @param {array} array
   *
   * @return {Object}
   */
  const arrayToObject = (array) => {
    return array.reduce((obj, item) => {
      return {
        ...obj,
        [item]: item,
      };
    }, {});
  };

  /**
   * hideAuthCredentials - display AuthCredentials.
   * @param {boolean} hidden
   */
  const hideAuthCredentials = (hidden) => {
    setAuthCredentialsVisible(!hidden);
  };

  /**
   * Remove an MFF directory entry from the form
   *
   * @param {Number} index - index of the directory to delete
   *
   * @return {function}
   */
  const removeMFFDirectory = (index) => {
    return () => {
      state.mffDirectories.set(
          state.mffDirectories.get.filter((dir, idx) => idx !== index),
      );
    };
  };

  /**
   * Add an MFF directory entry to the form
   */
  const addMFFDirectory = () => {
    state.mffDirectories.set(
        [
          ...state.mffDirectories.get,
          {path: '', name: ''},
        ],
    );
  };

  /**
   * Update an investigator entry
   *
   * @param {id} id - the element's id
   * @param {Number} index - index of the dir to update
   * @param {string} value - the value to update
   *
   */
  const updateMFFDirectory = (id, index, value) => {
    if (value) {
      state.mffDirectories.set(state.mffDirectories.get.map((dir, idx) => {
        if (idx === index) {
          return {
            path: value,
            name: value.replace(/\.[^/.]+$/, ''),
          };
        } else return dir;
      }));
    }
  };

  const fileFormatAlt = state.fileFormatUploaded.get.toUpperCase();
  const acceptedFileFormats = '.' + state.fileFormatUploaded.get +
    ',.' + fileFormatAlt;

  if (props.appMode === 'Configuration') {
    return (
      <>
        <div className='container'>
          <AuthenticationMessage
            setAuthCredentialsVisible={setAuthCredentialsVisible}
          />
          <div className='small-pad resetBtn'>
            <input type='button'
              className='primary-btn'
              onClick={reset}
              value='Clear all fields below'
            />
          </div>
        </div>
        <span className='header'>
          Recording data
        </span>
        <div className='info'>
          <div className='small-pad'>
            <RadioInput id='fileFormatUploaded'
              name='fileFormatUploaded'
              label='File Format'
              required={true}
              onUserInput={onUserInput}
              options={{
                edf: 'EDF',
                set: 'SET',
                mff: 'MFF',
              }}
              checked={state.fileFormatUploaded.get}
              help='File format of the recording.'
            />
          </div>
          <div className='small-pad'>
            {state.fileFormatUploaded.get != 'mff' ?
              <FileInput id='eegFiles'
                name='eegFiles'
                multiple={true}
                accept={acceptedFileFormats}
                placeholder={
                  state.eegFiles.get.map((eegFile) =>
                    eegFile['name']).join(', ')
                }
                label={fileFormatAlt + ' Recording to convert'}
                required={true}
                onUserInput={onUserInput}
                help={'Filename(s) must be formatted correctly: ' +
                  'e.g. [subjectID]_[sessionLabel]_[taskName]_[run-1]_ieeg.' +
                  state.fileFormatUploaded.get
                }
              /> :
              <MultiDirectoryInput
                id='mffDirectories'
                name='mffDirectories'
                multiple={true}
                required={true}
                label='MFF Recording to convert'
                updateDirEntry={updateMFFDirectory}
                removeDirEntry={removeMFFDirectory}
                addDirEntry={addMFFDirectory}
                value={state.mffDirectories.get}
                help={'Folder name(s) must be formatted correctly: ' +
                  'e.g. [subjectID]_[sessionLabel]_[taskName]_[run-1]_ieeg.mff'}
              />
            }
            <div>
              <small>
                  Multiple {fileFormatAlt} files can be selected for a single
                  recording
              </small>
            </div>
          </div>
          <div className='small-pad'>
            <DirectoryInput id='bidsDirectory'
              name='bidsDirectory'
              required={true}
              label='BIDS output folder'
              placeholder={state.bidsDirectory.get}
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
              checked={state.modality.get}
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
              checked={state.LORIScompliant.get ? 'yes' : 'no'}
              help='Select Yes if research datasets will be stored
              in a LORIS data platform'
            />
          </div>
        </div>
        <span className='header'>
          Recording metadata
          <div className='header-hint'>
            ⓘ For details please see BIDS specification
          </div>
        </span>
        <div className='info'>
          <small>Annotation and events file names
          must match one of the EEG file names.</small>
        </div>
        <div className='container'>
          <div className='info half'>
            <div className='small-pad'>
              <FileInput id='bidsMetadataFile'
                name='bidsMetadataFile'
                accept='.json'
                placeholder={
                  state.bidsMetadataFile.get.map(
                      (bidsMetadataFile) => bidsMetadataFile['name'],
                  ).join(', ')
                }
                label='Recording Parameters (json)'
                onUserInput={onUserInput}
                help='Used to contribute non-required fields to *.json BIDS
                parameter file. See BIDS spec and template available with
                this release. Blank fields ignored.'
              />
            </div>
            <div className='small-pad'>
              <FileInput id='annotationsJSON'
                name='annotationsJSON'
                multiple={true}
                accept='.json'
                placeholder={
                  state.annotationsJSON.get.map(
                      (annotationJSON) => annotationJSON['name'],
                  ).join(', ')
                }
                label='annotations.json'
                onUserInput={onUserInput}
                help='Labels for Annotations, compliant with BIDS spec.
                One file per task/run. Filename must be formatted correctly.'
              />
            </div>
          </div>
          <div className='info half'>
            <div className='small-pad'>
              <FileInput id='eventFiles'
                name='eventFiles'
                multiple={true}
                accept='.tsv'
                placeholder={
                  state.eventFiles.get.map(
                      (eventFile) => eventFile['name'],
                  ).join(', ')
                }
                label='events.tsv (additional)'
                onUserInput={onUserInput}
                help='Additional events only. Events embedded in
                the EEG Annotations signal are automatically extracted.'
              />
            </div>
            <div className='small-pad'>
              <FileInput id='annotationsTSV'
                name='annotationsTSV'
                multiple={true}
                accept='.tsv'
                placeholder={
                  state.annotationsTSV.get.map(
                      (annotationTSV) => annotationTSV['name'],
                  ).join(', ')
                }
                label='annotations.tsv'
                onUserInput={onUserInput}
                help='Annotation data: time, label, etc compliant
                with BIDS spec. One file per task/run.
                Filename must be formatted correctly.'
              />
            </div>
          </div>
        </div>
        <span className='header'>
          Recording details
        </span>
        <div className='container'>
          <div className='info half'>
            <div className='small-pad'>
              <TextInput id='taskName'
                name='taskName'
                required={true}
                label='Task Name'
                value={state.taskName.get}
                onUserInput={onUserInput}
                bannedCharacters={['-', '_', ' ', '/']}
                help='Task, stimulus, state or experimental context.
                See BIDS specification for more information.'
              />
            </div>
            {state.LORIScompliant.get &&
              <>
                <div className='small-pad'>
                  <label className="label" htmlFor='#siteID_API'>
                    <b>
                      Site <span className="red">*</span>
                      <i
                        className='fas fa-question-circle'
                        data-tip='Study Centre'
                      ></i>
                    </b>
                  </label>
                  <div className='comboField'>
                    <SelectInput id='siteID_API'
                      name='siteID_API'
                      label=''
                      required={true}
                      value={state.siteID.get}
                      emptyOption='Enter manually'
                      options={arrayToObject(state.siteOptions.get)}
                      onUserInput={onUserInput}
                    />
                    {!state.siteUseAPI.get &&
                      <TextInput id='siteID_Manual'
                        name='siteID_Manual'
                        label=''
                        placeholder='n/a'
                        value={state.siteID.get}
                        onUserInput={onUserInput}
                      />
                    }
                  </div>
                </div>
                <div className='small-pad'>
                  <label className="label" htmlFor='#projectID_API'>
                    <b>
                      Project <span className="red">*</span>
                      <i
                        className='fas fa-question-circle'
                        data-tip='Study'
                      ></i>
                    </b>
                  </label>
                  <div className='comboField'>
                    <SelectInput id='projectID_API'
                      name='projectID_API'
                      label=''
                      required={true}
                      value={state.projectID.get}
                      emptyOption='Enter manually'
                      options={arrayToObject(state.projectOptions.get)}
                      onUserInput={onUserInput}
                    />
                    {!state.projectUseAPI.get &&
                      <TextInput id='projectID_Manual'
                        name='projectID_Manual'
                        label=''
                        placeholder='n/a'
                        value={state.projectID.get}
                        onUserInput={onUserInput}
                      />
                    }
                  </div>
                </div>
                <div className='small-pad'>
                  <label className="label" htmlFor='#subprojectID_API'>
                    <b>
                      Subproject <span className="red">*</span>
                      <i
                        className='fas fa-question-circle'
                        data-tip='Subproject or population cohort'
                      ></i>
                    </b>
                  </label>
                  <div className='comboField'>
                    <SelectInput id='subprojectID_API'
                      name='subprojectID_API'
                      label=''
                      required={true}
                      value={state.subprojectID.get}
                      emptyOption='Enter manually'
                      options={arrayToObject(state.subprojectOptions.get)}
                      onUserInput={onUserInput}
                    />
                    {!state.subprojectUseAPI.get &&
                      <TextInput id='subprojectID_Manual'
                        name='subprojectID_Manual'
                        label=''
                        placeholder='n/a'
                        value={state.subprojectID.get}
                        onUserInput={onUserInput}
                      />
                    }
                  </div>
                </div>
              </>
            }
            <div className='small-pad'>
              <label className="label" htmlFor='#session_API'>
                <b>
                  Session <span className="red">*</span>
                  <i
                    className='fas fa-question-circle'
                    data-tip='Visit or TimePoint Label'
                  ></i>
                </b>
                {state.LORIScompliant.get &&
                  <div><small>(LORIS Visit Label)</small></div>
                }
              </label>
              <div className='comboField'>
                {state.LORIScompliant.get &&
                  <SelectInput id='session_API'
                    name='session_API'
                    label=''
                    required={true}
                    value={state.session.get}
                    emptyOption='Enter manually'
                    options={arrayToObject(state.sessionOptions.get)}
                    onUserInput={onUserInput}
                  />
                }
                {!state.sessionUseAPI.get &&
                  <TextInput id='session_Manual'
                    name='session_Manual'
                    label=''
                    required={!state.LORIScompliant.get}
                    value={state.session.get}
                    bannedCharacters={['-', '_', ' ', '/']}
                    onUserInput={onUserInput}
                  />
                }
              </div>
            </div>
          </div>
          <div className='info half'>
            <div className='small-pad'>
              <TextareaInput id='reference'
                name='reference'
                required={true}
                label='Reference'
                value={state.reference.get}
                onUserInput={onUserInput}
                help='See BIDS specification for more information'
              />
            </div>
            <div className='small-pad'>
              <SelectInput id='lineFreq'
                name='lineFreq'
                label='Powerline Frequency'
                value={state.lineFreq.get}
                emptyOption='n/a'
                options={{
                  '50': '50',
                  '60': '60',
                }}
                onUserInput={onUserInput}
                help='See BIDS specification for more information'
              />
            </div>
            <div className='small-pad'>
              <SelectInput id='recordingType'
                name='recordingType'
                label='Recording Type'
                value={state.recordingType.get}
                emptyOption='n/a'
                options={{
                  'continuous': 'Continuous',
                  'discontinuous': 'Discontinuous',
                  'epoched': 'Epoched',
                }}
                onUserInput={onUserInput}
                help='See BIDS specification for more information'
              />
            </div>
          </div>
        </div>
        <span className='header'>
          Participant Details
        </span>
        <div className='info'>
          {state.LORIScompliant.get &&
            isAuthenticated &&
            <div className='small-pad'>
              <RadioInput id='participantEntryMode'
                name='participantEntryMode'
                label='Entry mode'
                required={true}
                onUserInput={onUserInput}
                options={isAuthenticated === true ?
                  {
                    manual: 'Manual',
                    //new_loris: '(beta) Create a LORIS candidate',
                    existing_loris: 'Use an existing LORIS candidate',
                  } :
                  {
                    manual: 'Manual',
                  }
                }
                checked={state.participantEntryMode.get}
                help='Specify participant details manually
                or by lookup in LORIS'
              />
            </div>
          }
          {state.participantEntryMode.get === 'new_loris' &&
            <>
              <div className='small-pad'>
                <label className="label" htmlFor={props.id}>
                  <b>Date of Birth <span className="red">*</span></b>
                </label>
                <DatePicker id='participantDOB'
                  name='participantDOB'
                  required={true}
                  selected={state.participantDOB.get}
                  dateFormat="yyyy-MM-dd"
                  onChange={(date) => onUserInput('participantDOB', date)}
                />
              </div>
              <div className='small-pad'>
                <SelectInput id='participantSex'
                  name='participantSex'
                  label='Biological Sex'
                  required={true}
                  value={state.participantSex.get}
                  emptyOption='n/a'
                  options={{
                    'female': 'Female',
                    'male': 'Male',
                    'other': 'Other',
                  }}
                  onUserInput={onUserInput}
                  help='Required; see BIDS specification for more information'
                />
              </div>
              <div className='small-pad'>
                <SelectInput id='participantHand'
                  name='participantHand'
                  label='Handedness'
                  value={state.participantHand.get}
                  emptyOption='n/a'
                  options={{
                    'R': 'Right',
                    'L': 'Left',
                    'A': 'Ambidextrous',
                  }}
                  onUserInput={onUserInput}
                  help='Required; see BIDS specification for more information'
                />
              </div>
            </>
          }
          {state.participantEntryMode.get === 'existing_loris' &&
            <>
              <div className='small-pad'>
                <TextInput id='participantPSCID'
                  name='participantPSCID'
                  label='LORIS PSCID'
                  required={true}
                  value={state.participantPSCID.get}
                  onUserInput={onUserInput}
                />
              </div>
              <div className='small-pad'>
                <TextInput id='participantCandID'
                  name='participantCandID'
                  label='LORIS DCCID'
                  required={true}
                  value={state.participantCandID.get}
                  onUserInput={onUserInput}
                />
              </div>
              <div className='small-pad'>
                <SelectInput id='participantHand'
                  name='participantHand'
                  label='Handedness'
                  value={state.participantHand.get}
                  emptyOption='n/a'
                  options={{
                    'R': 'Right',
                    'L': 'Left',
                    'A': 'Ambidextrous',
                  }}
                  onUserInput={onUserInput}
                  help='Required; see BIDS specification for more information'
                />
              </div>
            </>
          }
          {state.participantEntryMode.get === 'manual' &&
            <>
              <div className='small-pad'>
                <TextInput id='participantID'
                  name='participantID'
                  label='Participant ID'
                  required={true}
                  value={state.participantID.get}
                  onUserInput={onUserInput}
                  bannedCharacters={['-', '_', ' ', '/']}
                  help='Study ID (e.g. LORIS PSCID)'
                />
                {state.LORIScompliant.get &&
                  <div><small>Use the LORIS PSCID</small></div>
                }
              </div>
              <div className='small-pad'>
                <TextInput id='participantAge'
                  name='participantAge'
                  label='Participant age'
                  placeholder='n/a'
                  value={state.participantAge.get}
                  onUserInput={onUserInput}
                  help='Required; see BIDS specification for more information'
                />
              </div>
              <div className='small-pad'>
                <SelectInput id='participantSex'
                  name='participantSex'
                  label='Biological Sex'
                  value={state.participantSex.get}
                  emptyOption='n/a'
                  options={{
                    'female': 'Female',
                    'male': 'Male',
                    'other': 'Other',
                  }}
                  onUserInput={onUserInput}
                  help='Required; see BIDS specification for more information'
                />
              </div>
              <div className='small-pad'>
                <SelectInput id='participantHand'
                  name='participantHand'
                  label='Handedness'
                  value={state.participantHand.get}
                  emptyOption='n/a'
                  options={{
                    'R': 'Right',
                    'L': 'Left',
                    'A': 'Ambidextrous',
                  }}
                  onUserInput={onUserInput}
                  help='Required; see BIDS specification for more information'
                />
              </div>
            </>
          }
        </div>
        <span className='header'>
          EDF Header Data
          <label style={{
            position: 'absolute',
            left: '20px',
            fontSize: '16px',
            verticalAlign: 'middle',
          }}>
            <Switch
              className='react-switch'
              onColor="#86d3ff"
              onHandleColor="#2693e6"
              handleDiameter={20}
              uncheckedIcon={false}
              checkedIcon={false}
              boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
              activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
              height={15}
              width={40}
              name='anonymize'
              onChange={(checked) => onUserInput('anonymize', checked)}
              checked={state.anonymize.get}
              disabled={state.eegData.get?.files?.length > 0 ? false : true}
            />
            <span>Anonymize</span>
          </label>
        </span>
        <div className='info-flex-container'>
          <div className='container'>
            <div className='half small-pad'>
              <TextInput id='subjectID'
                name='subjectID'
                label='Subject ID'
                value={state.eegData?.get['subjectID'] || ''}
                onUserInput={onUserInput}
                readonly={state.eegData.get?.files?.length > 0 ? false : true}
              />
              <div>
                <small>Recommended EDF anonymization: "X X X X"<br/>
                (EDF spec: patientID patientSex patientBirthdate patientName)
                </small>
              </div>
            </div>
            <div className='half small-pad'>
              <TextInput id='recordingID'
                name='recordingID'
                label='Recording ID'
                value={state.eegData.get?.['recordingID'] || ''}
                onUserInput={onUserInput}
                readonly={state.eegData.get?.files?.length > 0 ? false : true}
              />
              <div>
                <small>(EDF spec: Startdate dd-MMM-yyyy
                  administrationCode investigatorCode equipmentCode)
                </small>
              </div>
            </div>
            <div className='small-pad half'>
              <TextInput id='recording_date'
                name='recording_date'
                label='Recording Date'
                readonly={true}
                value={state.eegData.get?.['date'] ?
                    new Intl.DateTimeFormat(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric',
                        },
                    ).format(state.eegData.get['date']) :
                    ''
                }
              />
            </div>
          </div>
        </div>
        <AuthenticationCredentials
          title='Login to LORIS'
          show={authCredentialsVisible}
          close={hideAuthCredentials}
          width='500px'
        />
        <ReactTooltip/>
      </>
    );
  } else if (props.appMode === 'Converter') {
    return (
      <>
        <span className='header'>
          EDF to BIDS
        </span>
        <div className='info report'>
          <div className='small-pad'>
            <b>Review your data and metadata:</b>
            {validateData()}
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
            {appContext.getFromTask('subjectID') ?
              <div>
                Subject ID: {appContext.getFromTask('subjectID')}
              </div> :
              <div>
                {formatWarning('Subject ID is not modified.')}
              </div>
            }
            {appContext.getFromTask('recording_id') &&
              <div>
                Recording ID:&nbsp;
                {appContext.getFromTask('recording_id')}
              </div>
            }
            {appContext.getFromTask('eegData')?.['date'] &&
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
                ).format(appContext.getFromTask('eegData')['date'])}
              </div>
            }
          </div>

          {error ?
            <div className="alert alert-danger" role="alert">
              &#x274C; Please correct the above errors.
            </div> :
            <div className="alert alert-success" role="alert">
              &#x2714; Ready to proceed
            </div>
          }

          <hr/>

          <div className='small-pad'>
            <TextInput id='preparedBy'
              name='preparedBy'
              required={true}
              label='Prepared by'
              value={preparedBy}
              placeholder='Enter your name'
              onUserInput={(_, value) => setPreparedBy(value)}
              help='Name of person performing data conversion
              and validation is required.'
            />
            {!preparedBy && displayErrors &&
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
              disabled={error}
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
        <ReactTooltip/>
      </>
    );
  } else {
    return null;
  }
};

Configuration.propTypes = {
  visible: PropTypes.bool,
};

export default Configuration;
