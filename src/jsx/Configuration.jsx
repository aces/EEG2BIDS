import React, {useContext, useState, useEffect, useRef} from 'react';
import {AppContext} from '../context';
import {Tooltip} from 'react-tooltip';
import '../css/Configuration.css';
import '../../node_modules/@fortawesome/fontawesome-free/css/all.css';
import EEGRun from './types/EEGRun';
import {buildConversionRequest} from './types/conversionRequest';
import Papa from 'papaparse';

// Components
import {
  DirectoryInput,
  FileInput,
  RadioInput,
  TextInput,
  SelectInput,
  TextareaInput,
} from './elements/inputs';
import {
  AuthenticationMessage,
  AuthenticationCredentials,
} from './elements/authentication';

import Switch from 'react-switch';

// Socket.io
import {SocketContext, useSocketStatus} from './socket.io';

import '../css/Converter.css';

// Display Loading, Success, Error
import Modal from './elements/modal';

const MODAL_TITLES = {
  loading: '⏱ Task in Progress!',
  success: '⭐ Task Finished!',
  error: '❌ Task Error!',
};

const MODAL_MESSAGES = {
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
};

const recordingDateFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
});

const eventMatchesRecording = (eventFile, recordingFile) => {
  const rec = recordingFile.name.toLowerCase();
  const evt = eventFile.name.toLowerCase()
      .replace('_events.tsv', '').replace('.tsv', '');
  return evt === rec.replace(/_i?eeg\.(edf|set)/i, '')
      .replace(/\.(edf|set)/i, '') ||
    evt === rec.replace(/\.(edf|set)/i, '');
};

const invalidFiles = async (files, isValid) => {
  const results = await Promise.all(files.map(
      async (file) => (isValid(await file.text()) ? null : file.name),
  ));
  return results.filter(Boolean);
};

const isJSON = (text) => {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

const isTSV = (text) => Papa.parse(text, {quoteChar: ''}).errors.length === 0;

/**
 * Get age at visit
 *
 * @param {Date} birthDate
 * @param {Date} visitDate
 *
 * @return {Number}
 */
const getAge = (birthDate, visitDate) => {
  let age = visitDate.getFullYear() - birthDate.getFullYear();
  const m = visitDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && visitDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const arrayToObject = (array) => Object.fromEntries(array.map((v) => [v, v]));

/**
 * Configuration - the Data Configuration component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Configuration = (props) => {
  // React Context
  const appContext = useContext(AppContext);
  const socketContext = useContext(SocketContext);
  const socketStatus = useSocketStatus();
  const importedPrepopulationFile = useRef(null);

  // React State
  const initialState = {
    eegRuns: null,
    recordingData: [],
    recordingFiles: [],
    modality: 'ieeg',
    outputFormat: 'auto',
    eventFiles: [],
    invalidEventFiles: [],
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
    recordingType: 'continuous',
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
  const [modalVisible, setModalVisible] = useState(false);
  const [modal, setModal] = useState({mode: 'loading', error: null});

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
   *   Sent by socket to python: recording_to_bids.
   */
  const beginBidsCreation = () => {
    if (!preparedBy) {
      setDisplayErrors(true);
      return;
    }

    if (socketStatus !== 'connected') {
      setModal({mode: 'error', error: (
        <span style={{padding: '40px'}}>
          <span className='error'>&#x274C;</span> The backend is not
          connected, so the conversion cannot run. Wait for it to reconnect
          or use “Restart backend”, then try again.
        </span>
      )});
      setModalVisible(true);
      return;
    }

    setModal({mode: 'loading', error: null});
    setModalVisible(true);

    if (appContext.getFromTask('recordingData')?.['files'].length > 0) {
      socketContext.emit('recording_to_bids', buildConversionRequest(
          (key) => appContext.getFromTask(key),
          {
            eegRuns: state.eegRuns.get ?? [],
            preparedBy: preparedBy ?? '',
          },
      ));
    }
  };

  useEffect(() => {
    if (isAuthenticated && state.LORIScompliant.get) {
      state.participantEntryMode.set('existing_loris');
    } else {
      state.participantEntryMode.set('manual');
    }
  }, [state.LORIScompliant.get, isAuthenticated]);

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
    invalidFiles(state.bidsMetadataFile.get, isJSON)
        .then(state.invalidBidsMetadataFile.set);
  }, [state.bidsMetadataFile.get]);

  useEffect(() => {
    invalidFiles(state.eventFiles.get, isTSV)
        .then(state.invalidEventFiles.set);
  }, [state.eventFiles.get]);

  useEffect(() => {
    if (props.appMode === 'Converter') {
      validate();
    }
  }, [props.appMode]);

  useEffect(() => {
    if (socketContext) {
      socketContext.on('bids', (message) => {
        if (message['output_time']) {
          setOutputTime(message['output_time']);
          appContext.setTask('output_time', message['output_time']);
          setModal({mode: 'success', error: null});
        } else if (message['error']) {
          setModal({mode: 'error', error: (
            <div className='bids-errors'>
              {message['error'].map((error, i) =>
                <span key={i}>{error}<br/></span>)}
            </div>
          )});
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

    // recordingData
    let recordingDataStatus;
    if (state.recordingData.get?.error) {
      recordingDataStatus = formatError(state.recordingData.get.error);
    } else if (state.recordingData.get?.files?.length > 0) {
      recordingDataStatus = formatPass('Recording file(s): ' +
        state.recordingData.get.files.map(
            (recordingFile) => recordingFile['name'],
        ).join(', '),
      );
    } else {
      recordingDataStatus = formatError('No recording file selected');
    }
    result.push(<div key='recordingDataStatus'>{recordingDataStatus}</div>);


    // Data modality
    let modalityStatus;
    if (appContext.getFromTask('modality')) {
      modalityStatus = formatPass(
          `Modality: ${appContext.getFromTask('modality')}`,
      );
    } else {
      modalityStatus = formatError('No modality selected');
    }
    result.push(<div key='modalityStatus'>{modalityStatus}</div>);

    // Output format
    const outputFormat = appContext.getFromTask('outputFormat') ?? 'auto';
    result.push(
        <div key='outputFormatStatus'>
          {formatPass(`Output format: ${outputFormat === 'auto' ?
            'Auto (keep source, EDF when converting)' : outputFormat}`)}
        </div>,
    );

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
        const recordingFiles = appContext.getFromTask('recordingData')['files'];
        const unmatched = appContext.getFromTask('eventFiles').findLast(
            (eventFile) => !recordingFiles.some(
                (recording) => eventMatchesRecording(eventFile, recording),
            ),
        );

        if (unmatched) {
          eventsStatus = formatError(
              `Event file ${unmatched['name']}
              is not matching any recording file names.`,
          );
        } else {
          eventsStatus = formatPass('Event file(s): ' +
              appContext.getFromTask('eventFiles').map(
                  (eventFile) => eventFile['name'],
              ).join(', '),
          );
        }
      }
    }
    result.push(<div key='eventsStatus'>{eventsStatus}</div>);


    // bidsDirectory
    let bidsDirectoryStatus;
    if (appContext.getFromTask('bidsDirectory')) {
      bidsDirectoryStatus = formatPass('BIDS output directory: ' +
        appContext.getFromTask('bidsDirectory'),
      );
    } else {
      bidsDirectoryStatus = formatError('No BIDS output folder selected');
    }
    result.push(<div key='bidsDirectoryStatus'>{bidsDirectoryStatus}</div>);

    // LORIS compliant
    let LORIScompliantStatus;
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
          'An error occurred while processing ' +
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

  const requireField = (key, label) => {
    const value = appContext.getFromTask(key);
    return (
      <div key={key}>
        {value ?
          formatPass(`${label}: ${value}`) :
          formatError(`${label} is not specified`)}
      </div>
    );
  };

  const validateRecordingDetails = () => {
    const result = [requireField('taskName', 'Task Name')];

    if (appContext.getFromTask('LORIScompliant')) {
      result.push(
          requireField('siteID', 'Site'),
          requireField('projectID', 'Project'),
          requireField('subprojectID', 'Subproject'),
      );
    }

    // session
    let sessionStatus;
    if (appContext.getFromTask('session')) {
      if (/[ -]/.test(appContext.getFromTask('session'))) {
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
    let lineFreqStatus;
    if (appContext.getFromTask('lineFreq')) {
      lineFreqStatus = formatPass(
          `Powerline Frequency: ${appContext.getFromTask('lineFreq')}`,
      );
    } else {
      lineFreqStatus = formatWarning('Powerline frequency is not specified');
    }
    result.push(<div key='lineFreqStatus'>{lineFreqStatus}</div>);

    result.push(requireField('reference', 'Reference'));

    return result;
  };

  const validateParticipantDetails = () => {
    const result = [];

    if (state.participantEntryMode.get === 'existing_loris') {
      // participantPSCID
      let participantPSCIDStatus;

      // participantCandID
      let participantCandIDStatus;

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
      let participantIDStatus;
      if (state.participantID.get) {
        participantIDStatus = formatPass(
            `Participant ID: ${state.participantID.get}`,
        );
      } else {
        participantIDStatus = formatError(
            'Participant ID is not specified',
        );
      }
      result.push(<div key='participantID'>{participantIDStatus}</div>);
    }

    return result;
  };

  const validate = () => {
    if (state.recordingData.get?.files?.length > 0) {
      const eventFiles = [...state.eventFiles.get];

      const eegRuns = state.recordingData.get.files.map((recordingFile) => {
        const eegRun = new EEGRun();
        eegRun.recordingFile = recordingFile['path'];

        const eventFileIndex = eventFiles.findIndex(
            (eventFile) => eventMatchesRecording(eventFile, recordingFile),
        );
        if (eventFileIndex > -1) {
          eegRun.eventFile = eventFiles[eventFileIndex]['path'];
          eventFiles.splice(eventFileIndex, 1);
        }

        return eegRun;
      });

      state.eegRuns.set(eegRuns);
    }
  };

  useEffect(() => {
    if (!state.participantCandID.get || !state.session.get ||
      !state.siteID.get || !state.projectID.get ||
      !state.subprojectID.get || !state.recordingData.get?.date) return;

    const visitDate = state.recordingData.get['date']
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
    state.recordingData.get]);

  useEffect(() => {
    Object.keys(state).map((key) => appContext.setTask(key, state[key].get));
  }, []);

  useEffect(() => {
    if (socketContext) {
      socketContext.emit('get_recording_data', {
        files: state.recordingFiles.get.map((recordingFile) =>
          ({
            path: recordingFile['path'],
            name: recordingFile['name'],
          })),
      });
    }
  }, [state.recordingFiles.get]);

  useEffect(() => {
    if (socketContext) {
      if (state.bidsMetadataFile.get.length > 0) {
        socketContext.emit('get_bids_metadata', {
          file_path: state.bidsMetadataFile.get[0]['path'],
          modality: state.modality.get,
        });
      } else {
        importedPrepopulationFile.current = null;
      }
    }
  }, [state.bidsMetadataFile.get, state.modality.get]);

  useEffect(() => {
    if (!state.recordingData.get?.date || !state.participantDOB.get) return;

    const age = getAge(state.participantDOB.get, state.recordingData.get.date);
    state.participantAge.set(age);
    appContext.setTask('participantAge', age);
  }, [state.participantDOB.get, state.recordingData.get]);

  useEffect(() => {
    if (socketContext) {
      socketContext.on('loris_sites', (sites) =>
        sites && state.siteOptions.set(sites.map((site) => site.Name)));
      socketContext.on('loris_projects', (projects) =>
        state.projectOptions.set(Object.keys(projects)));
      socketContext.on('loris_subprojects', (subprojects) =>
        state.subprojectOptions.set(subprojects ?? []));
      socketContext.on('loris_visits', (visits) =>
        state.sessionOptions.set(visits ?? []));

      socketContext.on('recording_data', (message) => {
        if (message['error']) {
          console.error(message['error']);
        }

        if (message['date']) {
          message['date'] = new Date(message['date']);
        }

        state.subjectID.set(message?.['subjectID'] || '');
        state.recordingData.set(message);
        appContext.setTask('recordingData', message);
      });

      socketContext.on('bids_metadata', (message) => {
        if (message['error']) {
          console.error(message['error']);
        }

        state.bidsMetadata.set(message);
        appContext.setTask('bidsMetadata', message);

        if (message.prepopulation && message.source_file !==
            importedPrepopulationFile.current) {
          const fieldMap = {
            Project: 'projectID',
            Subproject: 'subprojectID',
            Visit: 'session',
            Site: 'siteID',
            LineFrequency: 'lineFreq',
            Reference: 'reference',
            RecordingType: 'recordingType',
          };
          Object.entries(fieldMap).forEach(([parameter, task]) => {
            const value = message.prepopulation[parameter];
            if (value !== undefined && value !== null && value !== '') {
              state[task].set(value);
              appContext.setTask(task, value);
            }
          });
          importedPrepopulationFile.current = message.source_file;
        }
      });

      socketContext.on('loris_login_response', (data) => {
        if (!data.error) setIsAuthenticated(true);
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
        } else if (state.participantPSCID.get === data.PSCID) {
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

    const combo = name.match(
        /^(siteID|projectID|subprojectID|session)_(API|Manual)$/,
    );
    if (combo) {
      const [, field, source] = combo;
      if (source === 'API') {
        const useAPI = value !== 'Enter manually';
        if (!useAPI) value = '';
        state[field.replace(/ID$/, '') + 'UseAPI'].set(useAPI);
        const next = {
          projectID: 'get_loris_subprojects',
          subprojectID: 'get_loris_visits',
        }[field];
        if (useAPI && next) socketContext.emit(next, value);
      }
      name = field;
    }

    // Update the state of Configuration.
    switch (name) {
      case 'LORIScompliant':
        value = value === 'yes';
        state.LORIScompliant.set(value);
        break;
      case 'recordingID':
        state.recordingData.set((prevState) => {
          return {...prevState, [name]: value};
        });
        appContext.setTask(name, value);
        break;
      case 'subjectID':
        state.recordingData.set((prevState) => {
          return {...prevState, [name]: value};
        });
        state.subjectID.set(value);
        appContext.setTask(name, value);
        break;
      case 'anonymize':
        if (value) {
          state.recordingData.set((prevState) => {
            return {...prevState, ['subjectID']: 'X X X X'};
          });
          appContext.setTask('subjectID', 'X X X X');
        } else {
          state.recordingData.set((prevState) => {
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
            <FileInput id='recordingFiles'
              name='recordingFiles'
              multiple={true}
              accept='.edf,.EDF,.set,.SET'
              placeholder={
                state.recordingFiles.get
                    .map((recordingFile) => recordingFile['name']).join(', ')
              }
              label='Recording to convert'
              required={true}
              onUserInput={onUserInput}
              help='Filename(s) must be formatted correctly:
              e.g. [subjectID]_[sessionLabel]_[taskName]_[run-1]_ieeg.edf'
            />
            <div>
              <small>
                Multiple files can be selected for a single recording
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
            <SelectInput id='outputFormat'
              name='outputFormat'
              label='Output format'
              value={state.outputFormat.get}
              options={{
                auto: 'Auto (keep source, EDF when converting)',
                EDF: 'EDF',
                BrainVision: 'BrainVision',
                EEGLAB: 'EEGLAB',
              }}
              onUserInput={onUserInput}
              help='Auto preserves a BIDS-compatible source format and
              recommends EDF when the recording must be converted'
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
          <small>Events file names must match one of the recording file names.
          </small>
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
                help='Optional additional BIDS events. Time-based markers
                embedded in the recording are extracted automatically and
                merged with this file.'
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
            {state.LORIScompliant.get && [
              ['siteID', 'Site', 'Study Centre',
                state.siteOptions.get, state.siteUseAPI.get],
              ['projectID', 'Project', 'Study',
                state.projectOptions.get, state.projectUseAPI.get],
              ['subprojectID', 'Subproject', 'Subproject or population cohort',
                state.subprojectOptions.get, state.subprojectUseAPI.get],
            ].map(([field, label, tooltip, options, useAPI]) =>
              <div className='small-pad' key={field}>
                <label className="label" htmlFor={`#${field}_API`}>
                  <b>
                    {label} <span className="red">*</span>
                    <i className='fas fa-question-circle'
                      data-tooltip-content={tooltip}
                    />
                  </b>
                </label>
                <div className='comboField'>
                  <SelectInput id={`${field}_API`}
                    name={`${field}_API`}
                    label=''
                    required={true}
                    value={state[field].get}
                    emptyOption='Enter manually'
                    options={arrayToObject(options)}
                    onUserInput={onUserInput}
                  />
                  {!useAPI &&
                    <TextInput id={`${field}_Manual`}
                      name={`${field}_Manual`}
                      label=''
                      placeholder='n/a'
                      value={state[field].get}
                      onUserInput={onUserInput}
                    />
                  }
                </div>
              </div>,
            )}
            <div className='small-pad'>
              <label className="label" htmlFor='#session_API'>
                <b>
                  Session <span className="red">*</span>
                  <i className='fas fa-question-circle'
                    data-tooltip-content='Visit or TimePoint Label'
                  />
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
                  help='Participant age at the time of data acquisition'
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
            </>
          }
          <div className='small-pad'>
            <SelectInput id='participantHand'
              name='participantHand'
              label='Handedness'
              value={state.participantHand.get}
              emptyOption='n/a'
              options={{R: 'Right', L: 'Left', A: 'Ambidextrous'}}
              onUserInput={onUserInput}
              help='Required; see BIDS specification for more information'
            />
          </div>
        </div>
        <span className='header'>
          Recording Details
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
              disabled={!state.recordingData.get?.files?.length}
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
                value={state.recordingData?.get['subjectID'] || ''}
                onUserInput={onUserInput}
                readonly={state.recordingData.get?.files?.length <= 0}
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
                value={state.recordingData.get?.['recordingID'] || ''}
                onUserInput={onUserInput}
                readonly={state.recordingData.get?.files?.length <= 0}
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
                value={state.recordingData.get?.['date'] ?
                  recordingDateFormat.format(state.recordingData.get['date']) :
                  ''
                }
              />
            </div>
          </div>
        </div>
        <AuthenticationCredentials
          title='Login to LORIS'
          show={authCredentialsVisible}
          close={() => setAuthCredentialsVisible(false)}
          width='500px'
        />
        <Tooltip anchorSelect='[data-tooltip-content]'/>
      </>
    );
  } else if (props.appMode === 'Converter') {
    return (
      <>
        <span className='header'>
          Recording to BIDS
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
            {appContext.getFromTask('recordingData')?.['date'] &&
              <div>
                Recording Date:&nbsp;
                {recordingDateFormat.format(
                    appContext.getFromTask('recordingData')['date'],
                )}
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
            {outputTime &&
              <a className='task-finished'>
                Last created at: {outputTime.replace('output-', '')
                    .replace(/-(?=[^-]*$)/, ' ')}
              </a>
            }
          </div>
        </div>
        <Modal
          title={MODAL_TITLES[modal.mode]}
          show={modalVisible}
          close={() => setModalVisible(false)}
          width='500px'
        >
          {modal.mode === 'error' ? modal.error : MODAL_MESSAGES[modal.mode]}
        </Modal>
        <Tooltip anchorSelect='[data-tooltip-content]'/>
      </>
    );
  } else {
    return null;
  }
};

export default Configuration;
