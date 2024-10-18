import React, {useContext, useEffect, useState} from 'react';
import {AppContext} from '../../context';
import {SocketContext} from '../socket.io';
import ReactTooltip from 'react-tooltip';
import {BIDSFileFormats} from '../Main';
import EEGRun from '../types/EEGRun';

import {
  TaskRunInput,
  RadioInput,
  DirectoryInput,
} from '../elements/inputs';

/**
 * Recording Data - the Recording Data component.
 * @param {object} props
 * @return {JSX.Element}
 */
const RecordingData = () => {
  const {state, setState, config} = useContext(AppContext);
  const [isLoaded, setIsLoaded] = useState(false);
  const [filteredModalities, setFilteredModalities] = useState([]);
  const socketContext = useContext(SocketContext);

  const modalities = {
    ieeg: 'Stereo iEEG',
    eeg: 'EEG',
  };

  useEffect(() => {
    const _filteredModalities = {};
    config.modalities.map(
        (modality) =>
          _filteredModalities[modality] = modalities[modality],
    );
    setFilteredModalities({..._filteredModalities});
  }, []);

  const emptyTaskFiles = {
    ...Object.fromEntries(config.tasks.map((task) =>
      [task.key, [{path: '', exclude: false}]],
    )),
  };

  const initState = {
    eegData: [],
    eegFileNames: [],
    eegRuns: null,
    taskFiles: emptyTaskFiles,
    tasks: config.tasks,
    filePrefix: '',
    modality: 'eeg',
    bidsDirectory: null,
  };

  if (config.allowAdditionalTask) {
    initState['taskname'] = '';
  }

  useEffect(() => {
    // Init state
    setState(initState);
  }, []);

  useEffect(() => {
    if (isLoaded) return;
    const undefStateKeys = Object.keys(initState).filter(
        (stateKey) => !(stateKey in state),
    );
    if (undefStateKeys.length === 0) setIsLoaded(true);
  }, Object.keys(initState).map((stateKey) => state[stateKey]));

  useEffect(() => {
    setState({taskFiles: emptyTaskFiles});
  }, [state.inputFileFormat]);

  useEffect(() => {
    if (socketContext) {
      if (!Object.keys(BIDSFileFormats)
          .includes(state.inputFileFormat)
      ) return;

      // /* if (state.inputFileFormat === 'edf') {
      //   console.info('edf file selected');
      //   socketContext.emit('get_edf_data', {
      //     files: state.eegFiles,
      //   });
      // } */

      const files = Object.entries(state.taskFiles)
      // only consider the non-excluded and non-empty tasks
          .filter((_, taskRuns) =>
            !taskRuns?.[0]?.exclude,
          )
          .map(([taskName, taskRuns]) =>
            taskRuns.map((taskRun, i) =>
              ({
                path: taskRun.path,
                task: taskName,
                run: i+1,
              }),
            ),
          )
          .flat()
          .filter((run) => run.path);

      if (files.length && state.inputFileFormat === 'set') {
        console.info('set file selected');
        socketContext.emit('get_set_data', {
          files: files,
        });
      }
    }
  }, [state.taskFiles]);

  useEffect(() => {
    if (socketContext) {
      socketContext.on('eeg_data', (data) => {
        if (data['error']) {
          console.error(data['error']);
        }

        if (data['date']) {
          data['date'] = new Date(data['date']);
        }

        setState({subjectID: data?.['subjectID'] || ''});
        setState({eegData: data});
        setState({fileFormat: data?.['fileFormat'] || 'set'});
      });
    }
  }, [socketContext]);

  useEffect(() => {
    if (!state.eegData?.files) return;

    const eegFileNames = state.eegData?.files
        ?.filter((file) => file.path)
        .map((file) => file.path?.split(/[\\/]/).pop());
    setState({eegFileNames: eegFileNames});

    if (eegFileNames.length > 0) {
      const eegRuns = [];
      const eventFiles = [...state.eventFiles];

      state.eegData?.files
          .filter((file) => file.path)
          .map((eegFile) => {
            const eegRun = new EEGRun();
            eegRun.eegFile = eegFile.path;
            eegRun.task = eegFile.task;
            eegRun.run = eegFile.run;

            // Check if we do have a matching event file
            const eventFileIndex = eventFiles.findIndex((eventFile) => {
              const eegRegex = new RegExp(
                  '(_i?eeg)?\\.' + state.inputFileFormat,
                  'i',
              );
              const eegFilePrefix = eegFile.path
                  ?.split(/[\\/]/).pop()
                  .replace(eegRegex, '');

              const eventRegex = new RegExp(
                  eegFilePrefix + '(_events)?\\.tsv',
                  'i',
              );
              return eventFile['name'].match(eventRegex);
            });

            if (eventFileIndex > -1) {
              eegRun.eventFile = eventFiles[eventFileIndex]['path'];
            }

            eegRuns.push(eegRun);
          });

      setState({eegRuns: eegRuns});
    }
  }, [state.eegData, state.eventFiles]);

  const getFileName = (file) => file.path?.split(/[\\/]/).pop();

  const checkFileError = (task) => {
    // Need to split file path based on `/`
    const filePrefix = `${state.filePrefix}_${task}`;
    if (state.taskFiles[task].length > 1) {
      const nameError = Array(state.taskFiles[task].length);
      state.taskFiles[task].forEach((file, idx) => {
        if (file.path === '') {
          // setError(true);
          nameError[idx] = 'Please provide file or remove run.';
        } else {
          const filename =
            `${filePrefix}_run-${idx + 1}.${state.inputFileFormat}`;
          if (getFileName(file) !== filename) {
            // setError(true);
            nameError[idx] = 'File should have naming format ' + filename;
          }
        }
      });
      return nameError;
    } else if (state.taskFiles[task][0].exclude) {
      /* if (state.taskFiles[task][0].reason === '') {
        // setError(true);
        return ['Exclusion reason is required.'];
      }*/
    } else if (state.taskFiles[task][0].path === '') {
      // setError(true);
      return ['Please provide file or reason for exclusion.'];
    } else if (
      getFileName(state.taskFiles[task][0]) !==
      `${filePrefix}.${state.inputFileFormat}`
    ) {
      // setError(true);
      return [
        `File should have naming format ${filePrefix}.${state.inputFileFormat}`,
      ];
    }
  };

  /**
   * Remove an run entry from the form
   *
   * @param {String} task - the task to update
   * @param {Number} index - index of the directory to delete
   *
   * @return {function}
   */
  const removeRun = (task, index) => {
    return () => {
      setState({taskFiles: {
        ...state.taskFiles,
        [task]: [
          ...state.taskFiles[task].slice(0, index),
          ...state.taskFiles[task].slice(index+1),
        ],
      }});
    };
  };

  /**
   * Add a task entry to the form
   *
   * @param {String} task the task to add run to
   */
  const addRun = (task) => {
    setState({taskFiles: {
      ...state.taskFiles,
      [task]: [
        ...state.taskFiles[task],
        {path: '', exclude: false},
      ],
    }});
  };

  /**
   * Exclude a task entry from the form
   *
   * @param {string} task the task to update
   * @param {boolean} exclude exclusion flag
   * @param {string} reason reason why excluded
   */
  const excludeTask = (task, exclude, reason) => {
    let taskList = [];
    if (state.taskFiles[task][0]['exclude'] != exclude) {
      taskList = [{path: '', exclude: exclude, reason: reason}];
    } else if (exclude) {
      taskList = [{
        ...state.taskFiles[task][0],
        reason: reason,
      }];
    }

    setState({taskFiles: {
      ...state.taskFiles,
      [task]: taskList,
    }});
  };

  const addTask = (taskname) => {
    setState({taskFiles: {
      ...state.taskFiles,
      [taskname]: [{path: '', exclude: false}],
    }});
    setState({tasks: [...state.tasks, {key: taskname, label: taskname}]});
  };

  /**
   * Update an task entry
   *
   * @param {string} task - the task to update
   * @param {Number} index - index of the dir to update
   * @param {string} value - the value to update
   *
   */
  const updateTask = (task, index, value) => {
    if (value) {
      setState({taskFiles: {
        ...state.taskFiles,
        [task]: [
          ...state.taskFiles[task].slice(0, index),
          {path: value, exclude: false},
          ...state.taskFiles[task].slice(index+1),
        ],
      }});
    }
  };

  const validateTaskname = (taskname) => {
    if (
      taskname?.indexOf('-') > -1 ||
      taskname?.indexOf('_') > -1 ||
      taskname?.indexOf('/') > -1
    ) {
      return 'Task name has invalid characters: (-, /, _)';
    }

    const taskKeys = state.tasks?.map((taskData) => taskData.key);
    if (taskKeys?.includes(taskname)) {
      return 'Task name already exists';
    }
  };

  const taskNameError = validateTaskname(state.taskname);

  return isLoaded && (
    <>
      <span className='header'>
        Recordings data
      </span>
      <div className='info'>
        <div className='small-pad'>
          <RadioInput
            name='fileFormat'
            label='Recordings format:'
            onUserInput={(_, value) => setState({inputFileFormat: value})}
            options={state.acceptedFormats}
            checked={state.inputFileFormat}
          />
        </div>
        <div className='small-pad'>
          <RadioInput
            name='modality'
            label='Data Modality'
            onUserInput={(_, value) => setState({modality: value})}
            options={filteredModalities}
            checked={state.modality}
            help='If any intracranial (stereo) channels, select Stereo iEEG'
          />
        </div>
        <div className='small-pad'>
          <DirectoryInput
            name='bidsDirectory'
            required={true}
            label='BIDS output folder'
            placeholder={state.bidsDirectory}
            onUserInput={(_, value) => setState({bidsDirectory: value})}
            help='Where the BIDS-compliant folder will be created'
          />
        </div>
        {state.tasks.map((task) =>
          <div key={task.key} className='small-pad'>
            <TaskRunInput
              name='taskFile'
              multiple={true}
              required={true}
              taskName={task.key}
              label={task.label}
              update={updateTask}
              remove={removeRun}
              add={addRun}
              exclude={excludeTask}
              value={state.taskFiles[task.key]}
              help={'Folder name(s) must be formatted correctly: ' +
                `e.g. ${state.filePrefix}_${task.key}[_run-X].` +
                state.inputFileFormat
              }
              error={checkFileError(task.key)}
              accept={Object.keys(state.acceptedFormats)}
              browseDir={false}
            />
          </div>,
        )}

        {config.allowAdditionalTask &&
          <div className='small-pad'>
            <input
              type='text'
              id='taskname'
              name='taskname'
              value={state.taskname}
              style={{marginRight: '10px'}}
              onChange={(event) => setState({taskname: event.target.value})}
              placeholder='Task name'
            />
            <button
              type="button"
              className='btn'
              onClick={() => {
                addTask(state.taskname);
                setState({taskname: ''});
              }}
              style={{marginRight: '10px', padding: '2px 10px'}}
              disabled={taskNameError || !state.taskname}
            >
              Add Task
            </button>
            <div className="input-error">{taskNameError}</div>
          </div>
        }
      </div>
      <ReactTooltip />
    </>
  );
};

export default RecordingData;
