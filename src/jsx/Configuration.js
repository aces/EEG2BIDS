import React, {useContext, useState, useEffect} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';
import '../css/Configuration.css';
import '../../node_modules/@fortawesome/fontawesome-free/css/all.css';
import 'react-datepicker/dist/react-datepicker.css';

// Components
import {
  TextInput,
  SelectInput,
  MultiDirectoryInput,
  FileInput,
} from './elements/inputs';

// Socket.io
import {SocketContext} from './socket.io';

import '../css/Converter.css';

// Display Loading, Success, Error
import Modal from './elements/modal';
import ConversionFlags from '../ConversionFlags';

/**
 * Configuration - the Data Configuration component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Configuration = (props) => {
  // React Context
  const socketContext = useContext(SocketContext);
  const {state, setState} = useContext(AppContext);
  const [mffModalVisible, setMffModalVisible] = useState(false);
  const [mffModalText, setMffModalText] = useState({
    mode: 'loading',
    title: {
      loading: '⏱ Task in Progress!',
      success: '⭐ Task Finished!',
      error: '❌ Task Error!',
    },
    message: {
      loading: <span style={{padding: '40px'}}>
        <span className='bids-loading'>
            MFF to SET conversion in progress
          <span>.</span><span>.</span><span>.</span>
            😴
        </span>
      </span>,
      success: <span style={{padding: '40px'}}>
        <span className='bids-success'>
          <span className='checkmark'>&#x2714;</span> Success converting to SET!
        </span></span>,
      error: '',
    },
  });

  useEffect(() => {
    if (state.isAuthenticated && state.LORIScompliant) {
      setState({participantEntryMode: 'existing_loris'});
    } else {
      setState({participantEntryMode: 'manual'});
    }
  }, [state.LORIScompliant, state.isAuthenticated]);

  useEffect(() => {
    if (socketContext) {
      setState({participantID: ''});

      socketContext.emit('get_participant_data', {
        candID: state.participantCandID,
      });
    }
  }, [state.participantCandID]);

  let error = false;
  const checkError = (input) => {
    switch (input) {
      case 'participantCandID':
        if (!state.participantCandID) {
          error = true;
          return 'LORIS DCCID is not specified';
        } else if (state.participantCandID?.error) {
          error = true;
          return state.participantCandID.error;
        }
        return;
      case 'participantPSCID':
        if (!state.participantPSCID) {
          error = true;
          return 'LORIS PSCID is not specified';
        } else if (
          state.participantCandID &&
          state.participantID !== state.participantPSCID
        ) {
          error = true;
          return 'The PSCID/DDCID pair you provided' +
              ' does not match an existing candidate.';
        }
        return;
      case 'session_API':
        if (!state.session) {
          error = true;
          return 'Session is not specified';
        }
        return;
      default:
        return;
    }
  };

  const getFileName = (file) => file.path?.split(/(\\|\/)/g).pop();

  const checkPhotoError = () => {
    if (state.image_file.length === 0) {
      error = true;
      return 'Image files are required.';
    }
    const pscid = state.participantPSCID;
    const candID = state.participantCandID;
    const session = state.session;
    const filename = `${pscid}_${candID}_${session}_EEG.zip`;
    if (state.image_file[0].name !== filename) {
      error = true;
      return 'File should have naming format ' +
              '[PSCID]_[DCCID]_[VisitLabel]_EEG.zip';
    }

    return;
  };

  const checkFileError = (task) => {
    // Need to split file path based on `/`
    const pscid = state.participantPSCID;
    const candID = state.participantCandID;
    const session = state.session;
    const substring = `${pscid}_${candID}_${session}_${task}`;
    if (state.mffDirectories[task].length > 1) {
      const nameError = Array(state.mffDirectories[task].length);
      state.mffDirectories[task].forEach((file, idx) => {
        if (file.path === '') {
          error = true;
          nameError[idx] = 'Please provide file or remove run.';
        } else if (getFileName(file) !== `${substring}_run-${idx + 1}.mff`) {
          error = true;
          nameError[idx] = 'File should have naming format ' +
            `[PSCID]_[DCCID]_[VisitLabel]_[taskName]_[run-${idx + 1}].mff`;
        }
      });
      return nameError;
    } else if (state.mffDirectories[task][0].exclude) {
      if (state.mffDirectories[task][0].reason === '') {
        error = true;
        return ['Exclusion reason is required.'];
      }
    } else if (state.mffDirectories[task][0].path === '') {
      error = true;
      return ['Please provide file or reason for exclusion.'];
    } else if (
      getFileName(state.mffDirectories[task][0]) !== `${substring}.mff`
    ) {
      error = true;
      return ['File should have naming format ' +
              '[PSCID]_[DCCID]_[VisitLabel]_[taskName].mff'];
    }
    return;
  };

  useEffect(() => {
    // setState({mffDirectories: [{path: '', name: ''}]});
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

  const convertMFFtoSET = async () => {
    if (socketContext && state.fileFormatUploaded === 'mff') {
      setMffModalVisible(true);
      setMffModalText((prevState) => {
        return {...prevState, ['mode']: 'loading'};
      });
      const updateMessage = (msg) => {
        console.info(msg);
        setState({eegData: msg});
      };

      // if no MFF files, do nothing.
      const dirs = [];
      const exclude = {};
      for (const key in state.mffDirectories) {
        if (state.mffDirectories[key][0]['exclude']) {
          exclude[key] = state.mffDirectories[key][0]['reason'];
        } else if (state.mffDirectories[key].length === 1) {
          dirs.push({
            ...state.mffDirectories[key][0],
            task: key,
            run: -1,
          });
        } else {
          state.mffDirectories[key].forEach((dir, i) => {
            dirs.push({
              ...dir,
              task: key,
              run: i + 1,
            });
          });
        }
      }
      // state.mffDirectories.filter((dir) => dir['path'] != '');
      if (dirs.length == 0) {
        updateMessage({'error': 'No MFF file selected.'});
        return;
      }

      // Start working on file conversion-
      updateMessage({'error': 'Working on converting files...'});

      setState({exclude: exclude});
      const mffFiles = dirs.map((dir) => dir.path);
      mffFiles.push(state.image_file[0].path);
      setState({mffFiles: mffFiles});

      const callback = (success, message, files, flags, bidsDir) => {
        if (success) {
          const pscid = state.participantPSCID;
          const candID = state.participantCandID;
          const session = state.session;
          setState({bidsDirectory: bidsDir});
          setState({outputFilename: `${pscid}_${candID}_${session}_bids`});
          setState({flags: flags});

          if (files.length === dirs.length) {
            const validationFlags = {
              errors: [],
              success: [],
            };
            Object.keys(flags).forEach((key) => {
              const flagVal = ConversionFlags[key].flagCondition;
              if (flags[key] === flagVal) {
                validationFlags.errors.push({
                  flag: key,
                  label: ConversionFlags[key].warning,
                  reason: ConversionFlags[key].reason,
                });
              } else {
                validationFlags.success.push({
                  flag: key,
                  label: ConversionFlags[key].pass,
                });
              }
            });
            setState({validationFlags: validationFlags});

            socketContext.emit('get_set_data', {files: files});
            setMffModalText((prevState) => {
              return {...prevState, ['mode']: 'success'};
            });

            setTimeout(() => {
              setMffModalVisible(false);
              setState({appMode: 'Converter'});
            }, 5000);
          }
        } else {
          setMffModalText((prevState) => {
            prevState.message['error'] = (
              <div className='bids-errors'>
                {message['error'].map((error, i) =>
                  <span key={i}>{error}<br/></span>)}
              </div>
            );
            return {...prevState, ['mode']: 'error'};
          });
          updateMessage({'error': message});
        }
      };

      const myAPI = window['myAPI']; // from public/preload.js
      await myAPI.convertMFFToSET(dirs, callback);
    }
  };

  useEffect(() => {
    if (socketContext) {
      if (state.bidsMetadataFile.length > 0) {
        socketContext.emit('get_bids_metadata', {
          file_path: state.bidsMetadataFile[0]['path'],
          modality: state.modality,
        });
      }
    }
  }, [state.bidsMetadataFile, state.modality]);

  useEffect(() => {
    if (!state.eegData?.date || !state.participantDOB) return;

    const age = getAge(state.participantDOB, state.eegData.date);
    setState({participantAge: age});
  }, [state.participantDOB, state.eegData]);

  useEffect(() => {
    if (socketContext) {
      socketContext.on('loris_sites', (sites) => {
        if (!sites) return;
        const siteOpts = [];
        sites.map((site) => {
          siteOpts.push(site.Name);
        });
        setState({siteOptions: siteOpts});
      });

      socketContext.on('loris_projects', (projects) => {
        const projectOpts = [];
        Object.keys(projects).map((project) => {
          projectOpts.push(project);
        });
        setState({projectOptions: projectOpts});
      });

      socketContext.on('loris_subprojects', (subprojects) => {
        const subprojectOpts = [];
        subprojects?.map((subproject) => {
          subprojectOpts.push(subproject);
        });
        setState({subprojectOptions: subprojectOpts});
      });

      socketContext.on('loris_visits', (visits) => {
        const visitOpts = [];
        if (visits && visits?.length > 0) {
          visits.map((visit) => {
            visitOpts.push(visit);
          });
        }
        setState({sessionOptions: visitOpts});
      });

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

      socketContext.on('bids_metadata', (message) => {
        if (message['error']) {
          console.error(message['error']);
        }

        setState({bidsMetadata: message});
      });

      socketContext.on('new_candidate_created', (data) => {
        console.info('candidate created !!!');

        setState({participantID: data['PSCID']});
        setState({participantCandID: data['CandID']});
      });

      socketContext.on('participant_data', (data) => {
        if (data?.error) {
          // TODO: participantID souldn't store errors
          // since its value is used in Validator
          setState({participantID: data.error});
        } else {
          setState({participantCandID: data.Meta.CandID});
          setState({participantID: data.Meta.PSCID});
          setState({participantDoB: new Date(data.Meta.DoB)});
          setState({participantSex: data.Meta.Sex});
          setState({projectID: data.Meta.Project});
          setState({siteID: data.Meta.Site});
          setState({sessionOptions: data.Visits});
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
        setState({LORIScompliant: value});
        break;
      case 'recordingID':
        setState({
          eegData: {
            ...state.eegData,
            [name]: value,
          },
        });
        break;
      case 'subjectID':
        setState({
          eegData: {
            ...state.eegData,
            [name]: value,
          },
        });
        setState({subjectID: value});
        break;
      case 'siteID_API':
        if (value == 'Enter manually') {
          value = '';
          setState({siteUseAPI: false});
        } else {
          setState({siteUseAPI: true});
        }
        setState({siteID: value});
        name = 'siteID';
        break;
      case 'siteID_Manual':
        setState({siteID: value});
        name = 'siteID';
        break;
      case 'projectID_API':
        if (value == 'Enter manually') {
          setState({projectUseAPI: false});
          value = '';
        } else {
          setState({projectUseAPI: true});
          socketContext.emit('get_loris_subprojects', value);
        }
        setState({projectID: value});
        name = 'projectID';
        break;
      case 'projectID_Manual':
        setState({projectID: value});
        name = 'projectID';
        break;
      case 'subprojectID_API':
        if (value == 'Enter manually') {
          setState({subprojectUseAPI: false});
          value = '';
        } else {
          setState({subprojectUseAPI: true});
          socketContext.emit('get_loris_visits', value);
        }
        setState({subprojectID: value});
        name = 'subprojectID';
        break;
      case 'subprojectID_Manual':
        setState({subprojectID: value});
        name = 'subprojectID';
        break;
      case 'session_API':
        if (value == 'Enter manually') {
          setState({sessionUseAPI: false});
          value = '';
        } else {
          setState({sessionUseAPI: true});
        }
        setState({session: value});
        name = 'session';
        break;
      case 'session_Manual':
        setState({session: value});
        name = 'session';
        break;
      case 'anonymize':
        if (value) {
          setState({
            eegData: {
              ...state.eegData,
              ['subjectID']: 'X X X X',
            },
          });
        } else {
          setState({
            eegData: {
              ...state.eegData,
              ['subjectID']: state.subjectID,
            },
          });
        }
        setState({anonymize: value});
        break;
      default:
        if (name in state) {
          setState({[name]: value});
        }
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
   * Remove an MFF directory entry from the form
   *
   * @param {String} task - the task to update
   * @param {Number} index - index of the directory to delete
   *
   * @return {function}
   */
  const removeMFFDirectory = (task, index) => {
    return () => {
      setState({mffDirectories: {
        ...state.mffDirectories,
        [task]: [
          ...state.mffDirectories[task].slice(0, index),
          ...state.mffDirectories[task].slice(index+1),
        ],
      }});
    };
  };

  /**
   * Add an MFF directory entry to the form
   * @param {Sting} task the task to add run to
   */
  const addMFFDirectory = (task) => {
    setState({mffDirectories: {
      ...state.mffDirectories,
      [task]: [
        ...state.mffDirectories[task],
        {
          path: '',
          name: '',
        },
      ],
    }});
  };

  /**
   *
   * @param {string} task the task to update
   * @param {boolean} exclude exclusion flag
   * @param {string} reason reason why excluded
   */
  const excludeMFFDirectory = (task, exclude, reason) => {
    let taskList = [];
    if (state.mffDirectories[task][0]['exclude'] != exclude) {
      taskList = [{path: '', name: '', exclude: exclude, reason: reason}];
    } else if (exclude) {
      taskList = [{
        ...state.mffDirectories[task][0],
        reason: reason,
      }];
    }

    setState({mffDirectories: {
      ...state.mffDirectories,
      [task]: taskList,
    }});
  };

  /**
   * Update an investigator entry
   *
   * @param {string} task - the task to update
   * @param {Number} index - index of the dir to update
   * @param {string} value - the value to update
   *
   */
  const updateMFFDirectory = (task, index, value) => {
    if (value) {
      setState({mffDirectories: {
        ...state.mffDirectories,
        [task]: [
          ...state.mffDirectories[task].slice(0, index),
          {
            path: value,
            name: value.replace(/\.[^/.]+$/, ''),
          },
          ...state.mffDirectories[task].slice(index+1),
        ],
      }});
    }
  };

  const filePrefix = (state.participantPSCID || '[PSCID]') + '_' +
    (state.participantCandID || '[DCCID]') + '_' +
    (state.session || '[VisitLabel]');

  return props.visible ? (
    <>
      <span className='header'>
        Participant Details
      </span>
      <div className='info'>
        <>
          <div className='small-pad'>
            <TextInput id='participantPSCID'
              name='participantPSCID'
              label='LORIS PSCID'
              required={true}
              value={state.participantPSCID}
              onUserInput={onUserInput}
              error={checkError('participantPSCID')}
            />
          </div>
          <div className='small-pad'>
            <TextInput id='participantCandID'
              name='participantCandID'
              label='LORIS DCCID'
              required={true}
              value={state.participantCandID}
              onUserInput={onUserInput}
              error={checkError('participantCandID')}
            />
          </div>
        </>
      </div>
      <span className='header'>
        Recording details
      </span>
      <div className='container'>
        <div className='info' style={{width: '100%'}}>
          {state.LORIScompliant &&
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
                  {!state.siteUseAPI &&
                    <TextInput id='siteID_Manual'
                      name='siteID_Manual'
                      label=''
                      placeholder='n/a'
                      value={state.siteID}
                      readonly={true}
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
                  {!state.projectUseAPI &&
                    <TextInput id='projectID_Manual'
                      name='projectID_Manual'
                      label=''
                      placeholder='n/a'
                      readonly={true}
                      value={state.projectID}
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
              {state.LORIScompliant &&
                <div><small>(LORIS Visit Label)</small></div>
              }
            </label>
            <div className='comboField'>
              {state.LORIScompliant &&
                <SelectInput id='session_API'
                  name='session_API'
                  label=''
                  required={true}
                  value={state.session}
                  emptyOption='Select One'
                  options={arrayToObject(state.sessionOptions)}
                  onUserInput={onUserInput}
                  error={checkError('session_API')}
                />
              }
            </div>
          </div>
        </div>
        <div className='info half'>
        </div>
      </div>
      <span className='header'>
        Recording data
      </span>
      <div className='info'>
        <div className='small-pad'>
          <MultiDirectoryInput
            id='mffDirectories'
            name='mffDirectories'
            multiple={true}
            required={true}
            taskName='RS'
            label='Resting state/baseline'
            updateDirEntry={updateMFFDirectory}
            removeDirEntry={removeMFFDirectory}
            addDirEntry={addMFFDirectory}
            excludeMFFDirectory={excludeMFFDirectory}
            value={state.mffDirectories.RS}
            help={'Folder name(s) must be formatted correctly: ' +
              `e.g. ${filePrefix}_RS[_run-X].mff`}
            error={checkFileError('RS')}
          />
        </div>
        <div className='small-pad'>
          <MultiDirectoryInput
            id='mffDirectories'
            name='mffDirectories'
            multiple={true}
            required={true}
            taskName='MMN'
            label='MMN'
            updateDirEntry={updateMFFDirectory}
            removeDirEntry={removeMFFDirectory}
            addDirEntry={addMFFDirectory}
            excludeMFFDirectory={excludeMFFDirectory}
            value={state.mffDirectories.MMN}
            help={'Folder name(s) must be formatted correctly: ' +
              `e.g. ${filePrefix}_MMN[_run-X].mff`}
            error={checkFileError('MMN')}
          />
        </div>
        <div className='small-pad'>
          <MultiDirectoryInput
            id='mffDirectories'
            name='mffDirectories'
            multiple={true}
            required={true}
            taskName='FACE'
            label='Face processing'
            updateDirEntry={updateMFFDirectory}
            removeDirEntry={removeMFFDirectory}
            addDirEntry={addMFFDirectory}
            excludeMFFDirectory={excludeMFFDirectory}
            value={state.mffDirectories.FACE}
            help={'Folder name(s) must be formatted correctly: ' +
              `e.g. ${filePrefix}_FACE[_run-X].mff`}
            error={checkFileError('FACE')}
          />
        </div>
        <div className='small-pad'>
          <MultiDirectoryInput
            id='mffDirectories'
            name='mffDirectories'
            multiple={true}
            required={true}
            taskName='VEP'
            label='Visual Evoked Potential'
            updateDirEntry={updateMFFDirectory}
            removeDirEntry={removeMFFDirectory}
            addDirEntry={addMFFDirectory}
            excludeMFFDirectory={excludeMFFDirectory}
            value={state.mffDirectories.VEP}
            help={'Folder name(s) must be formatted correctly: ' +
              `e.g. ${filePrefix}_VEP[_run-X].mff`}
            error={checkFileError('VEP')}
          />
        </div>
        <div className='small-pad'>
          <FileInput
            id='image_file'
            required={true}
            name='image_file'
            label='Placement Photos'
            accept='.zip'
            onUserInput={onUserInput}
            help='For photos taken with iPad of cap placement'
            placeholder={
              state.image_file.map((file) => file['name']).join(', ')
            }
            error={checkPhotoError()}
          />
        </div>
      </div>
      <div className='small-pad info'>
        <input type='button'
          className='start_task primary-btn'
          onClick={convertMFFtoSET}
          value='Convert to SET'
          disabled={error}
        />
      </div>
      <Modal
        title={mffModalText.title[mffModalText.mode]}
        show={mffModalVisible}
        close={() => setMffModalVisible(false)}
        width='500px'
      >
        {mffModalText.message[mffModalText.mode]}
      </Modal>
      <ReactTooltip/>
    </>
  ) : null;
};

Configuration.propTypes = {
  visible: PropTypes.bool,
};

export default Configuration;
