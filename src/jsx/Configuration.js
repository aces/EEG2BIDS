import React, {useContext, useState, useEffect} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';
import '../css/Configuration.css';
import 'react-datepicker/dist/react-datepicker.css';

// Components
import {
  DirectoryInput,
  FileInput,
  NumberInput,
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
import DatePicker from 'react-datepicker';

// Socket.io
import {SocketContext} from './socket.io';

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
  const state = {};
  /* state.errors = {};
  [state.errors.get, state.errors.set] = useState({}); */
  state.edfFiles = {};
  [state.edfFiles.get, state.edfFiles.set] = useState([]);
  state.edfData = {};
  [state.edfData.get, state.edfData.set] = useState([]);
  state.modality = {};
  [state.modality.get, state.modality.set] = useState('ieeg');
  state.eventsTSV = {};
  [state.eventsTSV.get, state.eventsTSV.set] = useState([]);
  state.annotationsTSV = {};
  [state.annotationsTSV.get, state.annotationsTSV.set] = useState([]);
  state.annotationsJSON = {};
  [state.annotationsJSON.get, state.annotationsJSON.set] = useState([]);
  state.bidsDirectory = {};
  [state.bidsDirectory.get, state.bidsDirectory.set] = useState(null);
  state.LORIScompliant = {};
  [state.LORIScompliant.get, state.LORIScompliant.set] = useState(true);
  state.siteID = {};
  [state.siteID.get, state.siteID.set] = useState('n/a');
  state.siteOptions = {};
  [state.siteOptions.get, state.siteOptions.set] = useState([]);
  state.siteUseAPI = {};
  [state.siteUseAPI.get, state.siteUseAPI.set] = useState(false);
  state.projectID = {};
  [state.projectID.get, state.projectID.set] = useState('n/a');
  state.projectOptions = {};
  [state.projectOptions.get, state.projectOptions.set] = useState([]);
  state.projectUseAPI = {};
  [state.projectUseAPI.get, state.projectUseAPI.set] = useState(false);
  state.subprojectID = {};
  [state.subprojectID.get, state.subprojectID.set] = useState('n/a');
  state.subprojectOptions = {};
  [state.subprojectOptions.get, state.subprojectOptions.set] = useState([]);
  state.subprojectUseAPI = {};
  [state.subprojectUseAPI.get, state.subprojectUseAPI.set] = useState(false);
  state.session = {};
  [state.session.get, state.session.set] = useState('');
  state.sessionOptions = {};
  state.bidsMetadataFile = {};
  [state.bidsMetadataFile.get, state.bidsMetadataFile.set] = useState([]);
  state.bidsMetadata = {};
  [state.bidsMetadata.get, state.bidsMetadata.set] = useState(null);
  state.lineFreq = {};
  [state.lineFreq.get, state.lineFreq.set] = useState('');
  state.taskName = {};
  [state.taskName.get, state.taskName.set] = useState('');
  state.reference = {};
  [state.reference.get, state.reference.set] = useState('n/a');
  state.recordingType = {};
  [state.recordingType.get, state.recordingType.set] = useState('n/a');
  state.softwareFilters = {};
  [state.softwareFilters.get, state.softwareFilters.set] = useState('n/a');
  [state.sessionOptions.get, state.sessionOptions.set] = useState([]);
  state.sessionUseAPI = {};
  [state.sessionUseAPI.get, state.sessionUseAPI.set] = useState(false);
  state.participantEntryMode = {};
  [
    state.participantEntryMode.get,
    state.participantEntryMode.set,
  ] = useState('manual');
  state.participantCandID = {};
  [state.participantCandID.get, state.participantCandID.set] = useState('');
  state.participantID = {};
  [state.participantID.get, state.participantID.set] = useState('');
  state.participantDOB = {};
  [state.participantDOB.get, state.participantDOB.set] = useState('');
  state.participantAge = {};
  [state.participantAge.get, state.participantAge.set] = useState('n/a');
  state.participantSex = {};
  [state.participantSex.get, state.participantSex.set] = useState('n/a');
  state.participantHand = {};
  [state.participantHand.get, state.participantHand.set] = useState('n/a');
  state.anonymize = {};
  [state.anonymize.get, state.anonymize.set] = useState(false);
  state.subjectID = {};
  [state.subjectID.get, state.subjectID.set] = useState('');
  state.authCredentialsVisible = {};
  [
    state.authCredentialsVisible.get,
    state.authCredentialsVisible.set,
  ] = useState(false);
  state.isAuthenticated = {};
  [state.isAuthenticated.get, state.isAuthenticated.set] = useState(false);

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    Object.keys(state).map((key) => appContext.setTask(key, state[key].get));
  }, []);

  /* useEffect(() => {
    state.errors.set({});
  }, [state.edfFiles.get]); */

  useEffect(() => {
    if (socketContext) {
      socketContext.emit('get_participant_data', {
        candID: state.participantCandID.get,
      });
    }
  }, [state.participantCandID.get]);

  useEffect(() => {
    if (!state.participantCandID.get || !state.session.get ||
      !state.siteID.get || !state.projectID.get ||
      !state.subprojectID.get || !state.edfData.get?.date) return;

    const visitDate = state.edfData.get['date']
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
    state.edfData.get]);

  useEffect(() => {
    if (socketContext) {
      socketContext.emit('get_edf_data', {
        files: state.edfFiles.get.map((edfFile) =>
          ({
            path: edfFile['path'],
            name: edfFile['name'],
          })),
      });
    }
  }, [state.edfFiles.get]);

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
    if (!state.edfData.get?.date || !state.participantDOB.get) return;

    const age = getAge(state.participantDOB.get, state.edfData.get.date);
    state.participantAge.set(age);
    appContext.setTask('participantAge', age);
  }, [state.participantDOB.get, state.edfData.get]);

  useEffect(() => {
    if (socketContext) {
      // socketContext.emit('get_loris_sites');
      socketContext.on('loris_sites', (sites) => {
        if (!sites) return;
        const siteOpts = [];
        sites.map((site) => {
          siteOpts.push(site.Name);
        });
        state.siteOptions.set(siteOpts);
      });

      // socketContext.emit('get_loris_projects');
      socketContext.on('loris_projects', (projects) => {
        const projectOpts = [];
        Object.keys(projects).map((project) => {
          projectOpts.push(project);
        });
        state.projectOptions.set(projectOpts);
      });

      socketContext.on('loris_subprojects', (subprojects) => {
        const subprojectOpts = [];
        subprojects.map((subproject) => {
          subprojectOpts.push(subproject);
        });
        state.subprojectOptions.set(subprojectOpts);
      });

      socketContext.on('loris_visits', (visits) => {
        const visitOpts = [];
        visits.map((visit) => {
          visitOpts.push(visit);
        });
        state.sessionOptions.set(visitOpts);
      });

      socketContext.on('edf_data', (message) => {
        if (message['error']) {
          console.error(message['error']);
          // state.errors.set([...state.errors.get, message['error']]);
        }

        if (message['date']) {
          message['date'] = new Date(message['date']);
        }

        state.subjectID.set(message?.['subjectID'] || '');
        state.edfData.set(message);
        appContext.setTask('edfData', message);
      });

      socketContext.on('bids_metadata', (message) => {
        if (message['error']) {
          console.error(message['error']);
        }

        state.bidsMetadata.set(message);
        appContext.setTask('bidsMetadata', message);
      });

      socketContext.on('new_candidate_created', (data) => {
        console.log(data);

        state.participantID.set(data['PSCID']);
        appContext.setTask('participantID', data['PSCID']);
      });

      socketContext.on('loris_login_response', (data) => {
        if (data.error) {
          // todo display error message - login failure
        } else {
          state.isAuthenticated.set(true);
          state.participantEntryMode.set('new_loris');
        }
      });

      socketContext.on('participant_data', (data) => {
        console.log(data);
        if (data?.error) {
          console.log(data);
          appContext.setTask('participantCandID', {error: data.error});
        } else {
          state.participantID.set(data.PSCID);
          appContext.setTask('participantID', data.PSCID);

          state.participantDOB.set(new Date(data.DoB));
          appContext.setTask('participantDoB', data.DoB);

          state.participantSex.set(data.Sex);
          appContext.setTask('participantSex', data.Sex);
        }
      });
    }
  }, [socketContext]);


  /**
   * onUserInput - input change by user.
   * @param {string} name - element name
   * @param {object|string|boolean} value - element value
   */
  const onUserInput = (name, value) => {
    // Update the state of Configuration.
    switch (name) {
      case 'recordingID':
        state.edfData.set((prevState) => {
          return {...prevState, [name]: value};
        });
        appContext.setTask(name, value);
        break;
      case 'subjectID':
        state.edfData.set((prevState) => {
          return {...prevState, [name]: value};
        });
        state.subjectID.set(value);
        appContext.setTask(name, value);
        break;
      case 'LORIScompliant':
        if (value === 'yes') {
          value = true;
          if (state.isAuthenticated.get) {
            state.participantEntryMode.set('new_loris');
          } else {
            state.participantEntryMode.set('manual');
          }
        } else {
          value = false;
          state.participantEntryMode.set('manual');
        }
        state.LORIScompliant.set(value);
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
          state.edfData.set((prevState) => {
            return {...prevState, ['subjectID']: 'X X X X'};
          });
          appContext.setTask('subjectID', 'X X X X');
        } else {
          state.edfData.set((prevState) => {
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
    console.log(birthDate);
    console.log(visitDate);
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
   * create candidate
   */
  const createCandidate = () => {
    // todo disable button if one of the fields missing
    if (socketContext) {
      const dob = state.participantDOB.get.toISOString().replace(/T.*/, '');
      if (!state.edfData.get?.['date']) return;

      const visitDate = state.edfData.get['date']
          .toISOString().replace(/T.*/, '');

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
  };

  /**
   * hideAuthCredentials - display AuthCredentials.
   * @param {boolean} hidden
   */
  const hideAuthCredentials = (hidden) => {
    state.authCredentialsVisible.set(!hidden);
  };

  return props.visible ? (
    <>
      <AuthenticationMessage
        setAuthCredentialsVisible={state.authCredentialsVisible.set}
      />
      {/*<div className="errors">
        {state.errors.get.map((error, index) =>
          <div key={index} className="alert alert-danger" role="alert">
            &#x274C; {error}
          </div>,
        )}
      </div> */}
      <span className='header-with-hint'>
        Select data and metadata
        <p className={'header-hint'}>
          ⓘ  for details please see BIDS specification
        </p>
      </span>
      <div className='info'>
        <div className='small-pad'>
          <FileInput id='edfFiles'
            name='edfFiles'
            multiple={true}
            accept='.edf,.EDF'
            placeholder={
              state.edfFiles.get.map((edfFile) => edfFile['name']).join(', ')
            }
            label='EDF Recording to convert'
            required={true}
            onUserInput={onUserInput}
          />
          <div>
            <small>
              Multiple EDF files can be selected for a single recording
            </small>
          </div>
        </div>
        <div className='small-pad'>
          <RadioInput id='modality'
            name='modality'
            label='Data modality'
            required={true}
            onUserInput={onUserInput}
            options={{
              ieeg: 'Stereo iEEG',
              eeg: 'EEG',
            }}
            checked={state.modality.get}
          />
        </div>
        <div className='small-pad'>
          <FileInput id='eventsTSV'
            name='eventsTSV'
            accept='.tsv'
            placeholder={state.eventsTSV.get?.[0]?.['name']}
            label='events.tsv'
            onUserInput={onUserInput}
          />
        </div>
        <div className='small-pad'>
          <FileInput id='annotationsTSV'
            name='annotationsTSV'
            accept='.tsv'
            placeholder={state.annotationsTSV.get?.[0]?.['name']}
            label='annotations.tsv'
            onUserInput={onUserInput}
          />
        </div>
        <div className='small-pad'>
          <FileInput id='annotationsJSON'
            name='annotationsJSON'
            accept='.json'
            placeholder={state.annotationsJSON.get?.[0]?.['name']}
            label='annotations.json'
            onUserInput={onUserInput}
          />
        </div>
        <div className='small-pad'>
          <FileInput id='bidsMetadataFile'
            name='bidsMetadataFile'
            accept='.tsv'
            placeholder={
              state.bidsMetadataFile.get.map(
                  (bidsMetadataFile) => bidsMetadataFile['name'],
              ).join(', ')
            }
            label='Parameter metadata (tsv)'
            onUserInput={onUserInput}
          />
        </div>
        <div className='small-pad'>
          <DirectoryInput id='bidsDirectory'
            name='bidsDirectory'
            required={true}
            label='BIDS output folder'
            placeholder={state.bidsDirectory.get}
            onUserInput={onUserInput}
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
          />
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
              label='Task name'
              value={state.taskName.get}
              onUserInput={onUserInput}
            />
          </div>
          {state.LORIScompliant.get &&
            <>
              <div className='small-pad'>
                <label className="label" htmlFor='#siteID_API'>
                  <b>
                    Site <span className="red">*</span>
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
                  bannedCharacters={['-', '_', ' ']}
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
            />
          </div>
          <div className='small-pad'>
            <NumberInput id='lineFreq'
              name='lineFreq'
              label='Powerline frequency'
              value={state.lineFreq.get}
              placeholder='n/a'
              onUserInput={onUserInput}
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
            />
          </div>
          <div className='small-pad'>
            <TextareaInput id='softwareFilters'
              name='softwareFilters'
              label='Software Filters'
              value={state.softwareFilters.get}
              onUserInput={onUserInput}
            />
          </div>
        </div>
      </div>
      <span className='header'>
        Participant Details
      </span>
      <div className='info'>
        {state.LORIScompliant.get && state.isAuthenticated.get &&
          <div className='small-pad'>
            <RadioInput id='participantEntryMode'
              name='participantEntryMode'
              label='Entry mode'
              required={true}
              onUserInput={onUserInput}
              options={state.isAuthenticated.get ?
                {
                  new_loris: 'Create a LORIS candidate',
                  existing_loris: 'Use an existing LORIS candidate',
                  manual: 'Manual',
                } :
                {
                  manual: 'Manual',
                }
              }
              checked={state.participantEntryMode.get}
            />
          </div>
        }
        {state.participantEntryMode.get == 'new_loris' &&
          state.isAuthenticated.get &&
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
                emptyOption=' '
                options={{
                  'female': 'Female',
                  'male': 'Male',
                  'other': 'Other',
                }}
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
              />
            </div>
            <input type='button'
              className="primary-btn"
              style={{margin: '10px 0 10px 240px'}}
              value='Create Candidate'
              onClick={createCandidate}
            />
          </>
        }
        {state.participantEntryMode.get == 'existing_loris' &&
          state.isAuthenticated.get &&
          <>
            <div className='small-pad'>
              <TextInput id='participantCandID'
                name='participantCandID'
                label='LORIS CandID'
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
              />
            </div>
          </>
        }
        {state.participantEntryMode.get == 'manual' &&
          <>
            <div className='small-pad'>
              <TextInput id='participantID'
                name='participantID'
                label='Participant ID'
                required={true}
                value={state.participantID.get}
                onUserInput={onUserInput}
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
              />
            </div>
            <div className='small-pad'>
              <SelectInput id='participantSex'
                name='participantSex'
                label='Biological Sex'
                value={state.participantSex.get}
                emptyOption='n/a'
                options={{
                  'F': 'Female',
                  'M': 'Male',
                }}
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
            disabled={state.edfData.get?.files?.length > 0 ? false : true}
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
              value={state.edfData?.get['subjectID'] || ''}
              onUserInput={onUserInput}
              readonly={state.edfData.get?.files?.length > 0 ? false : true}
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
              value={state.edfData.get?.['recordingID'] || ''}
              onUserInput={onUserInput}
              readonly={state.edfData.get?.files?.length > 0 ? false : true}
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
              value={state.edfData.get?.['date'] ?
                  new Intl.DateTimeFormat(
                      'en-US',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                      },
                  ).format(state.edfData.get['date']) :
                  ''
              }
            />
          </div>
        </div>
      </div>
      <AuthenticationCredentials
        title='LORIS Authentication'
        show={state.authCredentialsVisible.get}
        close={hideAuthCredentials}
        width='500px'
      />
    </>
  ) : null;
};
Configuration.propTypes = {
  visible: PropTypes.bool,
};

export default Configuration;
