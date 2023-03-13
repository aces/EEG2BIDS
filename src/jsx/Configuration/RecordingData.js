import React, {useContext, useEffect, useState} from 'react';
import {AppContext} from '../../context';

import {
  MultiDirectoryInput,
  FileInput,
} from '../elements/inputs';

/**
 * Recording Data - the Recording Data component.
 * @param {object} props
 * @return {JSX.Element}
 */
const RecordingData = () => {
  const {state, setState} = useContext(AppContext);
  const [isLoaded, setIsLoaded] = useState(false);

  const tasks = {
    RS: 'Resting state/baseline',
    MMN: 'MMN',
    FACE: 'Face processing',
    VEP: 'Visual Evoked Potential',
  };

  const initState = {
    image_file: [],
    mffDirectories: {
      ...Object.fromEntries(Object.keys(tasks).map((taskKey) =>
        [taskKey, [{path: '', name: '', exclude: false}]],
      )),
    },
  };

  useEffect(() => {
    // Init state
    Object.keys(initState).map(
        (stateKey) => setState({[stateKey]: initState[stateKey]}),
    );
  }, []);

  useEffect(() => {
    if (isLoaded) return;
    const undefStateKeys = Object.keys(initState).filter(
        (stateKey) => !(stateKey in state),
    );
    console.log(undefStateKeys);
    if (undefStateKeys.length === 0) setIsLoaded(true);
  }, Object.keys(initState).map((stateKey) => state[stateKey]));

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
    if (name in state) {
      setState({[name]: value});
    }
  };

  const checkPhotoError = () => {
    if (state.image_file.length === 0) {
      // setError(true);
      return 'Image files are required.';
    }
    const filename = `${state.filePrefix}_EEG.zip`;
    if (state.image_file[0].name !== filename) {
      // setError(true);
      return 'File should have naming format ' +
              '[PSCID]_[DCCID]_[VisitLabel]_EEG.zip';
    }
  };

  const getFileName = (file) => file.path?.split(/(\\|\/)/g).pop();

  const checkFileError = (task) => {
    // Need to split file path based on `/`
    const substring = `${state.filePrefix}_${task}`;
    if (state.mffDirectories[task].length > 1) {
      const nameError = Array(state.mffDirectories[task].length);
      state.mffDirectories[task].forEach((file, idx) => {
        if (file.path === '') {
          // setError(true);
          nameError[idx] = 'Please provide file or remove run.';
        } else if (getFileName(file) !== `${substring}_run-${idx + 1}.mff`) {
          // setError(true);
          nameError[idx] = 'File should have naming format ' +
            `[PSCID]_[DCCID]_[VisitLabel]_[taskName]_[run-${idx + 1}].mff`;
        }
      });
      return nameError;
    } else if (state.mffDirectories[task][0].exclude) {
      if (state.mffDirectories[task][0].reason === '') {
        // setError(true);
        return ['Exclusion reason is required.'];
      }
    } else if (state.mffDirectories[task][0].path === '') {
      // setError(true);
      return ['Please provide file or reason for exclusion.'];
    } else if (
      getFileName(state.mffDirectories[task][0]) !== `${substring}.mff`
    ) {
      // setError(true);
      return ['File should have naming format ' +
              '[PSCID]_[DCCID]_[VisitLabel]_[taskName].mff'];
    }
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

  return isLoaded && (
    <>
      <span className='header'>
        Recording data
      </span>
      <div className='info'>
        {Object.keys(tasks).map((taskKey) =>
          <div key={taskKey} className='small-pad'>
            <MultiDirectoryInput
              id='mffDirectories'
              name='mffDirectories'
              multiple={true}
              required={true}
              taskName={taskKey}
              label={tasks[taskKey]}
              updateDirEntry={updateMFFDirectory}
              removeDirEntry={removeMFFDirectory}
              addDirEntry={addMFFDirectory}
              excludeMFFDirectory={excludeMFFDirectory}
              value={state.mffDirectories[taskKey]}
              help={'Folder name(s) must be formatted correctly: ' +
                `e.g. ${state.filePrefix}_${taskKey}[_run-X].mff`}
              error={checkFileError(taskKey)}
            />
          </div>,
        )}
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
    </>
  );
};

export default RecordingData;
