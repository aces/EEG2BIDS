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
  state.edfFiles = {};
  [state.edfFiles.get, state.edfFiles.set] = useState([]);
  state.edfType = {};
  [state.edfType.get, state.edfType.set] = useState('ieeg');
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
  state.recordingDate = {};
  [state.recordingDate.get, state.recordingDate.set] = useState(null);
  state.subprojectOptions = {};
  [state.subprojectOptions.get, state.subprojectOptions.set] = useState([]);
  state.subprojectUseAPI = {};
  [state.subprojectUseAPI.get, state.subprojectUseAPI.set] = useState(false);
  state.session = {};
  [state.session.get, state.session.set] = useState('');
  state.sessionOptions = {};
  state.eegMetadataFile = {};
  [state.eegMetadataFile.get, state.eegMetadataFile.set] = useState([]);
  state.eegMetadata = {};
  [state.eegMetadata.get, state.eegMetadata.set] = useState([]);
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
  ] = useState('loris');
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
  state.edfHeader = {};
  [state.edfHeader.get, state.edfHeader.set] = useState({
    subject_id: '', recording_id: '',
    day: '', month: '', year: '',
    hour: '', minute: '', second: '',
    subtype: '',
  });
  const [authCredentialsVisible, setAuthCredentialsVisible] = useState(false);

  useEffect(() => {
    Object.keys(state).map((key) => appContext.setTask(key, state[key].get));
  }, []);

  useEffect(() => {
    Object.keys(state).map((key) => appContext.setTask(key, state[key].get));
  }, []);

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    Object.keys(state.edfHeader.get).map((key) => {
      appContext.setTask(key, state.edfHeader.get[key]);
    });

    if (!isNaN(parseInt(state.edfHeader.get['year']))) {
      const date = new Date(
        state.edfHeader.get['year'] < 85 ?
          Number('20' + state.edfHeader.get['year']) :
          Number('19' + state.edfHeader.get['year']),
        Number(state.edfHeader.get['month']-1),
        Number(state.edfHeader.get['day']),
        Number(state.edfHeader.get['hour']),
        Number(state.edfHeader.get['minute']),
        Number(state.edfHeader.get['second']),
      );
      state.recordingDate.set(date);
      appContext.setTask('recordingDate', date);
    }
  }, [state.edfHeader.get]);

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    if (socketContext) {
      // socketContext.emit('get_loris_sites');
      socketContext.on('loris_sites', (sites) => {
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

      socketContext.on('edf_header', (message) => {
        if (message['error']) {
          console.error(message['error']);
        }

        if (message['header']) {
          state.edfHeader.set(message['header']);
          state.subjectID.set(message['header']['subject_id']);
        }
      });

      socketContext.on('metadata', (message) => {
        if (message['error']) {
          console.error(message['error']);
        }

        if (message['metadata']) {
          state.eegMetadata.set(message['metadata']);
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
      case 'edfFiles':
        state.edfFiles.set(value);
        createHeaderFields(value[0]['path']);
        break;
      case 'eegMetadataFile':
        state.eegMetadataFile.set(value);
        createMetadataFields(value[0]['path']);
        break;
      case 'LORIScompliant':
        if (value === 'yes') {
          value = true;
          state.participantEntryMode.set('loris');
        } else {
          value = false;
          state.participantEntryMode.set('manual');
        }
        state.LORIScompliant.set(value);
        break;
      case 'siteID_API':
        if (value === 'Manual entry') {
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
        if (value === 'Manual entry') {
          state.projectUseAPI.set(false);
          value = '';
        } else {
          state.projectUseAPI.set(true);
          socketContext.emit('get_loris_subprojects', value);
          socketContext.emit('get_loris_visits', value);
        }
        state.projectID.set(value);
        name = 'projectID';
        break;
      case 'projectID_Manual':
        state.projectID.set(value);
        name = 'projectID';
        break;
      case 'subprojectID_API':
        if (value === 'Manual entry') {
          state.subprojectUseAPI.set(false);
          value = '';
        } else {
          state.subprojectUseAPI.set(true);
        }
        state.subprojectID.set(value);
        name = 'subprojectID';
        break;
      case 'subprojectID_Manual':
        state.subprojectID.set(value);
        name = 'subprojectID';
        break;
      case 'session_API':
        if (value === 'Manual entry') {
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
          anonymizeHeaderValues();
        } else {
          onUserHeaderFieldInput('subject_id', state.subjectID.get);
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
   * onUserHeaderFieldInput - input change by user.
   * @param {string} name - element name
   * @param {object|string} value - element value
   */
  const onUserHeaderFieldInput = (name, value) => {
    state.edfHeader.set((prevState) => {
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
   * createMetadataFields - Metadata file given from user.
   * @param {string} path - metadata file path
   */
  const createMetadataFields = (path) => {
    socketContext.emit('get_metadata', {
      file_path: path,
    });
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
   * anonymizeHeaderValues - anonymize iEEG header values.
   */
  const anonymizeHeaderValues = () => {
    const keys = ['subject_id'];
    const anonymize = {subject_id: 'X X X X'};
    for (const key of keys) {
      onUserHeaderFieldInput(key, anonymize[key]);
      appContext.setTask(key, anonymize[key]);
    }
  };

  /**
   * createCandidate
   */
  const createCandidate = () => {
  };

  /**
   * hideAuthCredentials - display AuthCredentials.
   * @param {boolean} hidden
   */
  const hideAuthCredentials = (hidden) => {
    setAuthCredentialsVisible(!hidden);
  };

  return props.visible ? (
    <>
      <AuthenticationMessage
        setAuthCredentialsVisible={setAuthCredentialsVisible}
      />
      <span className='header'>
        Data Configuration
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
          <div><small>Can be split into multiple EDF files</small></div>
        </div>
        <div className='small-pad'>
          <RadioInput id='edfType'
            name='edfType'
            label='Data modality'
            required={true}
            onUserInput={onUserInput}
            options={{
              ieeg: 'Stereo iEEG',
              eeg: 'EEG',
            }}
            checked={state.edfType.get}
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
          <FileInput id='eegMetadataFile'
            name='eegMetadataFile'
            accept='.tsv'
            placeholder={
              state.eegMetadataFile.get.map(
                  (eegMetadataFile) => eegMetadataFile['name'],
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
            label='BIDS output directory'
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
                    emptyOption='Manual entry'
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
                    emptyOption='Manual entry'
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
                    emptyOption='Manual entry'
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
                Session label <span className="red">*</span>
              </b>
              {state.LORIScompliant.get &&
                <div><small>Use the LORIS Visit label</small></div>
              }
            </label>
            <div className='comboField'>
              {state.LORIScompliant.get &&
                <SelectInput id='session_API'
                  name='session_API'
                  label=''
                  required={true}
                  value={state.session.get}
                  emptyOption='Manual entry'
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
        Participant Data
      </span>
      <div className='info'>
        {state.LORIScompliant.get &&
          <div className='small-pad'>
            <RadioInput id='participantEntryMode'
              name='participantEntryMode'
              label='Entry mode'
              required={true}
              onUserInput={onUserInput}
              options={{
                loris: 'Create a LORIS candidate',
                manual: 'Manual',
              }}
              checked={state.participantEntryMode.get}
            />
          </div>
        }
        {state.participantEntryMode.get == 'loris' &&
          <>
            <div className='small-pad'>
              <label className="label" htmlFor={props.id}>
                <b>Date of birth <span className="red">*</span></b>
              </label>
              <DatePicker id='participantDOB'
                name='participantDOB'
                required={true}
                selected={state.participantDOB.get}
                onChange={(date) => onUserInput('participantDOB', date)}
              />
            </div>
            <div className='small-pad'>
              <SelectInput id='participantSex'
                name='participantSex'
                label='Biological sex'
                required={true}
                value={state.participantSex.get}
                emptyOption=' '
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
                label='Hand'
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
                label='Biological sex'
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
                label='Hand'
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
          />
          <span>Anonymize</span>
        </label>
      </span>
      <div className='info-flex-container'>
        <div className='container'>
          <div className='half small-pad'>
            <TextInput id='subject_id'
              name='subject_id'
              label='Subject ID'
              value={state.edfHeader.get['subject_id']}
              onUserInput={(name, value) => {
                state.subjectID.set(value);
                onUserHeaderFieldInput(name, value);
              }}
              placeholder={state.edfHeader.get['subject_id']}
            />
            <div>
              <small>Recommended EDF anonymization: "X X X X"<br/>
              (EDF spec: patientID patientSex patientBirthdate patientName)
              </small>
            </div>
          </div>
          <div className='half small-pad'>
            <TextInput id='recording_id'
              name='recording_idd'
              label='Recording ID'
              value={state.edfHeader.get['recording_id']}
              onUserInput={onUserHeaderFieldInput}
              placeholder={state.edfHeader.get['recording_id']}
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
              value={state.recordingDate.get ?
                  new Intl.DateTimeFormat(
                      'en-US',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                      },
                  ).format(state.recordingDate.get) :
                  ''
              }
            />
          </div>
        </div>
      </div>
      <AuthenticationCredentials
        title='LORIS Authentication'
        show={authCredentialsVisible}
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
