import React, {useContext, useState, useEffect, useRef} from 'react';
import {AppContext} from '../context';
import '../css/Configuration.css';
import '@fortawesome/fontawesome-free/css/all.css';
import {buildConversionRequest} from './types/conversionRequest';
import {invalidFiles, isJSON, isTSV} from './configuration/recordingFiles';
import {buildConversionReview} from './configuration/conversionReview';
import {formValues} from './configuration/prepopulation';
import {initialState} from './configuration/initialState';
import ConfigurationForm from './configuration/ConfigurationForm';
import {recordingDateFormat} from './configuration/recordingDateFormat';
import {TextInput} from './elements/inputs';
import {SocketContext, useSocketStatus} from './socket.io';
import '../css/Converter.css';
import Modal, {MODAL_TITLES} from './elements/modal';

// Form fields the Validator reads back through the shared task store.
const TASK_KEYS = ['bidsDirectory', 'participantID', 'session', 'taskName'];

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

/**
 * Configuration - the Data Configuration component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Configuration = (props) => {
  const appContext = useContext(AppContext);
  const socketContext = useContext(SocketContext);
  const socketStatus = useSocketStatus();
  const importedPrepopulationFile = useRef(null);

  const [form, setForm] = useState(initialState);
  const setField = (key, next) => setForm((previous) => ({
    ...previous,
    [key]: typeof next === 'function' ? next(previous[key]) : next,
  }));

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [login, setLogin] = useState(null);
  const [authCredentialsVisible, setAuthCredentialsVisible] = useState(false);
  const [participantLookupError, setParticipantLookupError] = useState('');

  const [preparedBy, setPreparedBy] = useState('');
  const [displayErrors, setDisplayErrors] = useState(false);
  const [outputTime, setOutputTime] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modal, setModal] = useState({mode: 'loading', error: null});

  /**
   * reset - reset the form fields (state).
   */
  const reset = () => {
    const defaults = {
      ...initialState,
      participantEntryMode: isAuthenticated ? 'existing_loris' : 'manual',
    };
    setForm(defaults);
    importedPrepopulationFile.current = null;
    setParticipantLookupError('');
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
    if (review.hasError) return;

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

    socketContext.emit('recording_to_bids',
        buildConversionRequest(form, preparedBy));
  };

  useEffect(() => {
    setField('participantEntryMode',
        isAuthenticated && form.LORIScompliant ? 'existing_loris' : 'manual');
  }, [form.LORIScompliant, isAuthenticated]);

  useEffect(() => {
    TASK_KEYS.forEach((key) => appContext.setTask(key, form[key]));
  });

  // Log in with saved LORIS credentials on every (re)connect to the backend.
  useEffect(() => {
    if (!socketContext) return;
    const login = () => window.eeg2bids.getLorisAuthenticationCredentials()
        .then((credentials) => {
          if (credentials?.lorisURL && credentials.lorisUsername &&
              credentials.lorisPassword) {
            socketContext.emit('set_loris_credentials', credentials);
          }
        });
    socketContext.on('connect', login);
    if (socketContext.connected) login();
    return () => socketContext.off('connect', login);
  }, [socketContext]);

  useEffect(() => {
    if (!socketContext) return;
    setField('participantID', '');
    setParticipantLookupError('');
    if (form.participantCandID && form.participantPSCID) {
      socketContext.emit('get_participant_data', {
        candID: form.participantCandID,
      });
    }
  }, [socketContext, form.participantCandID, form.participantPSCID]);

  useEffect(() => {
    invalidFiles(form.bidsMetadataFile, isJSON)
        .then((invalid) => setField('invalidBidsMetadataFile', invalid));
  }, [form.bidsMetadataFile]);

  useEffect(() => {
    invalidFiles(form.eventFiles, isTSV)
        .then((invalid) => setField('invalidEventFiles', invalid));
  }, [form.eventFiles]);

  useEffect(() => {
    if (!socketContext) return;

    const onBids = (message) => {
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
    };
    socketContext.on('bids', onBids);
    return () => socketContext.off('bids', onBids);
  }, [socketContext]);

  const review = buildConversionReview(form, participantLookupError);
  const renderStatuses = (statuses) => statuses.map(({kind, message}, index) =>
    <div key={index} style={kind === 'plain' ? {paddingLeft: '32px'} : {}}>
      {kind === 'error' && <span className='error'>&#x274C;</span>}
      {kind === 'warning' && <span className='warning'>&#x26A0;</span>}
      {kind === 'pass' && <span className='checkmark'>&#x2714;</span>}
      {' '}{message}
    </div>,
  );

  useEffect(() => {
    if (!form.participantCandID || !form.session ||
      !form.siteID || !form.projectID ||
      !form.subprojectID || !form.recordingData?.date) return;

    const visitDate = form.recordingData['date']
        .toISOString().replace(/T.*/, '');

    socketContext.emit('create_visit', {
      candID: form.participantCandID,
      project: form.projectID,
      site: form.siteID,
      subproject: form.subprojectID,
      visit: form.session,
      date: visitDate,
    });
  }, [form.participantCandID, form.session,
    form.siteID, form.projectID, form.subprojectID,
    form.recordingData]);

  useEffect(() => {
    if (!form.recordingData?.date || !form.participantDOB) return;

    const age = getAge(form.participantDOB, form.recordingData.date);
    setField('participantAge', age);
  }, [form.participantDOB, form.recordingData]);

  useEffect(() => {
    if (!socketContext) return;

    const handlers = {
      loris_sites: (sites) =>
        sites && setField('siteOptions', sites.map((site) => site.Name)),
      loris_projects: (projects) =>
        setField('projectOptions', Object.keys(projects)),
      loris_subprojects: (subprojects) =>
        setField('subprojectOptions', subprojects ?? []),
      loris_visits: (visits) => setField('sessionOptions', visits ?? []),
      loris_login_response: (data) => {
        setLogin(data);
        if (!data.error) setIsAuthenticated(true);
      },
    };
    Object.entries(handlers).forEach(([event, handler]) =>
      socketContext.on(event, handler));
    return () => Object.entries(handlers).forEach(([event, handler]) =>
      socketContext.off(event, handler));
  }, [socketContext]);

  useEffect(() => {
    const files = form.recordingFiles.map(
        ({path, name}) => ({path, name}));
    const selectedPaths = files.map(({path}) => path);
    setField('subjectID', '');
    setField('recordingData', []);
    if (!socketContext) return;

    const onRecordingData = (message) => {
      if (JSON.stringify(message.requested_files) !==
          JSON.stringify(selectedPaths)) return;
      if (message.error) console.error(message.error);
      const recording = {
        ...message,
        date: message.date ? new Date(message.date) : '',
      };
      setField('subjectID', recording.subjectID || '');
      setField('recordingData', recording);
    };
    socketContext.on('recording_data', onRecordingData);
    socketContext.emit('get_recording_data', {files});
    return () => socketContext.off('recording_data', onRecordingData);
  }, [socketContext, form.recordingFiles]);

  useEffect(() => {
    const selectedFile = form.bidsMetadataFile[0]?.path;
    const modality = form.modality;
    setField('bidsMetadata', null);
    if (!selectedFile) importedPrepopulationFile.current = null;
    if (!socketContext) return;

    const onMetadata = (message) => {
      if (!selectedFile || message.source_file !== selectedFile ||
          message.modality !== modality) return;

      if (message.error) console.error(message.error);
      setField('bidsMetadata', message);

      if (message.prepopulation && selectedFile !==
          importedPrepopulationFile.current) {
        Object.entries(formValues(message.prepopulation))
            .forEach(([field, value]) => setField(field, value));
        importedPrepopulationFile.current = selectedFile;
      }
    };
    socketContext.on('bids_metadata', onMetadata);
    if (selectedFile) {
      socketContext.emit('get_bids_metadata', {
        file_path: selectedFile, modality,
      });
    }
    return () => socketContext.off('bids_metadata', onMetadata);
  }, [socketContext, form.bidsMetadataFile, form.modality]);

  useEffect(() => {
    if (!socketContext) return;

    const onParticipantData = ({candID, candidate}) => {
      if (candID !== form.participantCandID) return;
      if (candidate?.error) {
        setParticipantLookupError(candidate.error);
        setField('participantID', '');
      } else if (candidate?.PSCID &&
          form.participantPSCID === candidate.PSCID) {
        setParticipantLookupError('');
        setField('participantID', candidate.PSCID);
        setField('participantDOB', new Date(candidate.DoB));
        setField('participantSex', candidate.Sex);
      } else {
        setField('participantID', '');
        setParticipantLookupError('The DDCID/PSCID pair you provided' +
            ' does not match an existing candidate.');
      }
    };
    socketContext.on('participant_data', onParticipantData);
    return () => socketContext.off('participant_data', onParticipantData);
  }, [socketContext, form.participantPSCID, form.participantCandID]);

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
        setField(field.replace(/ID$/, '') + 'UseAPI', useAPI);
        const next = {
          projectID: 'get_loris_subprojects',
          subprojectID: 'get_loris_visits',
        }[field];
        if (useAPI && next) socketContext.emit(next, value);
      }
      name = field;
    }

    switch (name) {
      case 'LORIScompliant':
        value = value === 'yes';
        break;
      case 'recordingID':
      case 'subjectID':
        setField('recordingData', (previous) => ({...previous, [name]: value}));
        break;
      case 'anonymize':
        setField('recordingData', (previous) => ({
          ...previous, subjectID: value ? 'X X X X' : form.subjectID,
        }));
        break;
    }
    if (name in initialState) setField(name, value);
  };

  if (props.appMode === 'Configuration') {
    return <ConfigurationForm
      form={form}
      onUserInput={onUserInput}
      reset={reset}
      isAuthenticated={isAuthenticated}
      login={login}
      authCredentialsVisible={authCredentialsVisible}
      setAuthCredentialsVisible={setAuthCredentialsVisible}
    />;
  } else if (props.appMode === 'Converter') {
    return (
      <>
        <span className='header'>
          Recording to BIDS
        </span>
        <div className='info report'>
          <div className='small-pad'>
            <b>Review your data and metadata:</b>
            {renderStatuses(review.sections.data)}
          </div>
          <div className='small-pad'>
            <b>Review your recording details:</b>
            {renderStatuses(review.sections.details)}
          </div>
          <div className='small-pad'>
            <b>Review your participant details:</b>
            {renderStatuses(review.sections.participant)}
          </div>
          <div className='small-pad'>
            <b>Review your uploaded EEG Parameter metadata:</b>
            <div>{renderStatuses(review.sections.parameters)}</div>
          </div>
          <div className='small-pad'>
            <b>Verify anonymization of EDF header data:</b>
            {form.recordingData?.subjectID ?
              <div>
                Subject ID: {form.recordingData.subjectID}
              </div> :
              <div>
                <span className='warning'>&#x26A0;</span> Subject ID is not
                modified.
              </div>
            }
            {form.recordingData?.date &&
              <div>
                Recording Date:&nbsp;
                {recordingDateFormat.format(form.recordingData.date)}
              </div>
            }
          </div>

          {review.hasError ?
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
              disabled={review.hasError}
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
        >
          {modal.mode === 'error' ? modal.error : MODAL_MESSAGES[modal.mode]}
        </Modal>
      </>
    );
  } else {
    return null;
  }
};

export default Configuration;
