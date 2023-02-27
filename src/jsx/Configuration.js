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
  TextInput,
  SelectInput,
  MultiDirectoryInput, TextareaInput, FileInput,
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
  const appContext = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  // React State
  const initialState = {
    eegRuns: null,
    fileFormatUploaded: 'mff',
    fileFormat: 'mff',
    eegData: [],
    eegFiles: [],
    mffDirectories: {
      RS: [{path: '', name: '', exclude: false}],
      MMN: [{path: '', name: '', exclude: false}],
      FACE: [{path: '', name: '', exclude: false}],
      VEP: [{path: '', name: '', exclude: false}],
    },
    modality: 'eeg',
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
    lineFreq: '60',
    taskName: '',
    reference: 'Cz',
    recordingType: 'continuous',
    participantEntryMode: 'existing_loris',
    participantPSCID: '',
    participantCandID: '',
    participantID: '',
    participantDOB: null,
    participantAge: 'n/a',
    participantSex: 'n/a',
    participantHand: 'n/a',
    image_file: [],
    anonymize: false,
    subjectID: '',
    flags: {
      errors: [],
      success: [],
    },
    reasons: {},
  };

  const state = {};
  for (const [key, value] of Object.entries(initialState)) {
    state[key] = {};
    [state[key].get, state[key].set] = useState(value);
  }

  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
    appContext.setTask('reasons', state.reasons.get);

    if (appContext.getFromTask('eegData')?.['files'].length > 0) {
      socketContext.emit('eeg_to_bids', {
        eegData: appContext.getFromTask('eegData') ?? [],
        fileFormat: state.fileFormat.get ?? '',
        eegRuns: state.eegRuns.get ?? [],
        modality: appContext.getFromTask('modality') ?? 'eeg',
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
        outputFilename: appContext.getFromTask('outputFilename') ?? '',
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
    if (modalText.mode === 'success') {
      props.nextStage('Validator', 3);
    }
  };

  /**
   * hideModal - display Modal.
   * @param {boolean} hidden
   */
  const hideMffModal = (hidden) => {
    setMffModalVisible(!hidden);
    if (mffModalText.mode === 'success') {
      props.nextStage('Converter', 2);
    }
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
            console.error(e);
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
                  console.error(results.errors);
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

      socketContext.emit('get_participant_data', {
        candID: state.participantCandID.get,
      });
    }
  }, [state.participantCandID.get]);

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

  let error = false;
  const formatError = (msg, key) => {
    const value = state.reasons.get[key] ? state.reasons.get[key] : '';
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

  const checkError = (input) => {
    switch (input) {
      case 'participantCandID':
        if (!appContext.getFromTask('participantCandID')) {
          error = true;
          return 'LORIS DCCID is not specified';
        } else if (appContext.getFromTask('participantCandID')?.error) {
          error = true;
          return appContext.getFromTask('participantCandID').error;
        }
        return;
      case 'participantPSCID':
        if (!appContext.getFromTask('participantCandID')) {
          error = true;
          return 'LORIS DDCID is required first';
        } else if (
          appContext.getFromTask('participantID') !== state.participantPSCID.get
        ) {
          error = true;
          return 'The DDCID/PSCID pair you provided' +
              ' does not match an existing candidate.';
        }
        return;
      case 'session_API':
        if (!appContext.getFromTask('session')) {
          error = true;
          return 'Session is not specified';
        }
        return;
      default:
        return;
    }
  };

  const getFileName = (file) => file.path.split(/(\\|\/)/g).pop();

  const checkPhotoError = () => {
    if (state.image_file.get.length === 0) {
      error = true;
      return 'Image Files is required.';
    }
    const pscid = state.participantPSCID.get;
    const candID = state.participantCandID.get;
    const session = state.session.get;
    const filename = `${pscid}_${candID}_${session}_EEG.zip`;
    if (state.image_file.get[0].name !== filename) {
      error = true;
      return 'File should have naming format ' +
              '[PSCID]_[DCCID]_[VisitLabel]_EEG.zip';
    }

    return;
  };

  const checkFileError = (task) => {
    // Need to split file path based on `/`
    const pscid = state.participantPSCID.get;
    const candID = state.participantCandID.get;
    const session = state.session.get;
    const substring = `${pscid}_${candID}_${session}_${task}`;
    if (state.mffDirectories.get[task][0]['exclude']) {
      if (state.mffDirectories.get[task][0]['reason'] === '') {
        error = true;
        return 'Exclusion reason is required.';
      }
    } else if (state.mffDirectories.get[task][0]['path'] === '') {
      error = true;
      return 'Please provide file or reason for exclusion.';
    } else if (state.mffDirectories.get[task].length > 1) {
      let nameError;
      state.mffDirectories.get[task].forEach((file, idx) => {
        if (getFileName(file) !== `${substring}_run-${idx + 1}.mff`) {
          error = true;
          nameError = 'File should have naming format ' +
              '[PSCID]_[DCCID]_[VisitLabel]_[taskName]_[run-X].mff';
        }
      });
      return nameError;
    } else if (
      getFileName(state.mffDirectories.get[task][0]) !== `${substring}.mff`
    ) {
      error = true;
      return 'File should have naming format ' +
              '[PSCID]_[DCCID]_[VisitLabel]_[taskName].mff';
    }
    return;
  };

  const reasonUpdate = (name, value) => {
    state.reasons.set((state) => {
      state[name] = value;
      return {
        ...state,
      };
    });
  };

  const formatWarning = (msg, key) => {
    return (
      <div key={key} className='flags'>
        <span className='warning'>&#x26A0;</span> {msg}
      </div>
    );
  };

  const formatPass = (msg, key) => {
    return (
      <div className='flags' key={key}>
        <span className='checkmark'>&#x2714;</span>
        {msg}
      </div>
    );
  };

  const reviewWarnings = () => {
    if (state.flags.get.errors.length === 0) {
      return <></>;
    }

    const listItems = state.flags.get.errors.map((err) => {
      if (err.reason) {
        return formatError(err.label, err.flag);
      } else {
        return formatWarning(err.label, err.flag);
      }
    });

    const value = state.reasons.get['additional'] ?
        state.reasons.get['additional'] : '';
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
  };

  const reviewSuccessFlags = () => {
    const listItems = state.flags.get.success.map((err) => {
      return formatPass(err.label, err.flag);
    });
    return (
      <div className='small-pad'>
        <b>Review your success flags:</b>
        {listItems}
      </div>
    );
  };

  const validate = () => {
    if (state.eegData.get?.files?.length > 0) {
      const eventFiles = [...state.eventFiles.get];
      const annotationsTSVs = [...state.annotationsTSV.get];
      const annotationsJSONs = [...state.annotationsJSON.get];

      const eegRuns = [];

      state.eegData.get?.files.map(
          (eegFile) => {
            const eegRun = new EEGRun();
            eegRun.eegFile = eegFile['path'];
            eegRun.task = eegFile['task'];
            eegRun.run = eegFile['run'];

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

  useEffect(() => {
    // state.mffDirectories.set([{path: '', name: ''}]);
    state.eegFiles.set([]);
  }, [state.fileFormatUploaded.get]);

  useEffect(() => {
    if (socketContext) {
      let emit = '';
      if (state.fileFormatUploaded.get === 'edf') {
        console.info('edf file selected');
        emit = 'get_edf_data';
      }
      if (state.fileFormatUploaded.get === 'set') {
        console.info('set file selected');
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

  const convertMFFtoSET = async () => {
    if (socketContext && state.fileFormatUploaded.get === 'mff') {
      setMffModalVisible(true);
      setMffModalText((prevState) => {
        return {...prevState, ['mode']: 'loading'};
      });
      const updateMessage = (msg) => {
        console.info(msg);
        state.eegData.set(msg);
        appContext.setTask('eegData', msg);
      };

      // if no MFF files, do nothing.
      const dirs = [];
      const exclude = {};
      for (const key in state.mffDirectories.get) {
        if (state.mffDirectories.get[key][0]['exclude']) {
          exclude[key] = state.mffDirectories.get[key][0]['reason'];
        } else if (state.mffDirectories.get[key].length === 1) {
          dirs.push({
            ...state.mffDirectories.get[key][0],
            task: key,
            run: -1,
          });
        } else {
          state.mffDirectories.get[key].forEach((dir, i) => {
            dirs.push({
              ...dir,
              task: key,
              run: i + 1,
            });
          });
        }
      }
      // state.mffDirectories.get.filter((dir) => dir['path'] != '');
      if (dirs.length == 0) {
        updateMessage({'error': 'No MFF file selected.'});
        return;
      }

      // Start working on file conversion-
      updateMessage({'error': 'Working on converting files...'});

      appContext.setTask('exclude', exclude);
      const mffFiles = dirs.map((dir) => dir.path);
      mffFiles.push(state.image_file.get[0].path);
      appContext.setTask('mffFiles', mffFiles);

      const callback = (success, message, files, flags, bidsDir) => {
        if (success) {
          const pscid = state.participantPSCID.get;
          const candID = state.participantCandID.get;
          const session = state.session.get;
          const outputFilename = `${pscid}_${candID}_${session}_bids`;
          appContext.setTask('bidsDirectory', bidsDir);
          appContext.setTask('outputFilename', outputFilename);
          appContext.setTask('flags', flags);
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
            state.flags.set(validationFlags);

            socketContext.emit('get_set_data', {files: files});
            setMffModalText((prevState) => {
              return {...prevState, ['mode']: 'success'};
            });
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

      socketContext.on('participant_data', (data) => {
        if (data?.error) {
          appContext.setTask('participantCandID', {error: data.error});
          state.participantID.set(data.error);
          appContext.setTask('participantID', '');
        } else {
          appContext.setTask('participantCandID', data.Meta.CandID);

          state.participantID.set(data.Meta.PSCID);
          appContext.setTask('participantID', data.Meta.PSCID);

          state.participantDOB.set(new Date(data.Meta.DoB));
          appContext.setTask('participantDoB', data.Meta.DoB);

          state.participantSex.set(data.Meta.Sex);
          appContext.setTask('participantSex', data.Meta.Sex);

          state.projectID.set(data.Meta.Project);
          state.siteID.set(data.Meta.Site);
          state.sessionOptions.set(data.Visits);
        }
      });
    }
  }, [socketContext]);

  useEffect(() => {
    console.info('FAKE EFFECT TO TRIGGER RERENDER');
  }, [state.participantID.get]);

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
   * Remove an MFF directory entry from the form
   *
   * @param {String} task - the task to update
   * @param {Number} index - index of the directory to delete
   *
   * @return {function}
   */
  const removeMFFDirectory = (task, index) => {
    return () => {
      state.mffDirectories.set((prev) => {
        prev[task] = prev[task].filter((dir, idx) => idx !== index);
        return ({
          ...prev,
        });
      });
    };
  };

  /**
   * Add an MFF directory entry to the form
   * @param {Sting} task the task to add run to
   */
  const addMFFDirectory = (task) => {
    state.mffDirectories.set((prev) => {
      prev[task].push({path: '', name: ''});
      return ({
        ...prev,
      });
    });
  };

  /**
   *
   * @param {string} task the task to update
   * @param {boolean} exclude exclusion flag
   * @param {string} reason reason why excluded
   */
  const excludeMFFDirectory = (task, exclude, reason) => {
    state.mffDirectories.set((prev) => {
      if (prev[task][0]['exclude'] != exclude) {
        prev[task] = [{path: '', name: '', exclude: exclude, reason: reason}];
      } else if (exclude) {
        prev[task][0] = {
          ...prev[task][0],
          reason: reason,
        };
      }
      return ({
        ...prev,
      });
    });
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
      state.mffDirectories.set((prev) => {
        prev[task] = prev[task].map((dir, idx) => {
          if (idx === index) {
            return {
              path: value,
              name: value.replace(/\.[^/.]+$/, ''),
            };
          } else return dir;
        });
        return ({
          ...prev,
        });
      });
    }
  };

  const fileFormatAlt = state.fileFormatUploaded.get.toUpperCase();
  const acceptedFileFormats = '.' + state.fileFormatUploaded.get +
    ',.' + fileFormatAlt;

  if (props.appMode === 'Configuration') {
    return (
      <>
        <span className='header'>
          Participant Details
        </span>
        <div className='info'>
          <>
            <div className='small-pad'>
              <TextInput id='participantCandID'
                name='participantCandID'
                label='LORIS DCCID'
                required={true}
                value={state.participantCandID.get}
                onUserInput={onUserInput}
                error={checkError('participantCandID')}
              />
            </div>
            <div className='small-pad'>
              <TextInput id='participantPSCID'
                name='participantPSCID'
                label='LORIS PSCID'
                required={true}
                value={state.participantPSCID.get}
                onUserInput={onUserInput}
                error={checkError('participantPSCID')}
                readonly={checkError('participantCandID') !== undefined}
              />
            </div>
          </>
        </div>
        <span className='header'>
          Recording details
        </span>
        <div className='container'>
          <div className='info' style={{width: '100%'}}>
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
                    {!state.siteUseAPI.get &&
                      <TextInput id='siteID_Manual'
                        name='siteID_Manual'
                        label=''
                        placeholder='n/a'
                        value={state.siteID.get}
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
                    {!state.projectUseAPI.get &&
                      <TextInput id='projectID_Manual'
                        name='projectID_Manual'
                        label=''
                        placeholder='n/a'
                        readonly={true}
                        value={state.projectID.get}
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
                    emptyOption='Select One'
                    options={arrayToObject(state.sessionOptions.get)}
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
              value={state.mffDirectories.get.RS}
              help={'Folder name(s) must be formatted correctly: ' +
                  'e.g. [PSCID]_[DCCID]_[VisitLabel]_[taskName]_[run-1].mff'}
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
              value={state.mffDirectories.get.MMN}
              help={'Folder name(s) must be formatted correctly: ' +
                  'e.g. [PSCID]_[DCCID]_[VisitLabel]_[taskName]_[run-1].mff'}
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
              value={state.mffDirectories.get.FACE}
              help={'Folder name(s) must be formatted correctly: ' +
                  'e.g. [PSCID]_[DCCID]_[VisitLabel]_[taskName]_[run-1].mff'}
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
              value={state.mffDirectories.get.VEP}
              help={'Folder name(s) must be formatted correctly: ' +
                  'e.g. [PSCID]_[DCCID]_[VisitLabel]_[taskName]_[run-1].mff'}
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
                state.image_file.get.map((file) => file['name']).join(', ')
              }
              error={checkPhotoError()}
            />
          </div>
        </div>
        <div className='info'>
          <small>Annotation and events file names
          must match one of the EEG file names.</small>
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
          close={hideMffModal}
          width='500px'
        >
          {mffModalText.message[mffModalText.mode]}
        </Modal>
        <ReactTooltip/>
      </>
    );
  } else if (props.appMode === 'Converter') {
    return (
      <>
        <span className='header'>
          MFF to BIDS
        </span>
        <div className='info report'>
          {reviewWarnings()}
          {reviewSuccessFlags()}

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
