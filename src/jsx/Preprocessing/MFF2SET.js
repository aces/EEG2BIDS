import React, {useState, useContext, useEffect} from 'react';
import Modal from '../elements/modal';
import ConversionFlags from '../../ConversionFlags';
import {SocketContext} from '../socket.io';
import {AppContext} from '../../context';
import {
  FileInput,
} from '../elements/inputs';

/**
 * MFF2SET - the MFF2SET component.
 * @param {object} props
 * @return {JSX.Element}
 */
const MFF2SET = () => {
  const socketContext = useContext(SocketContext);
  const {state, setState, errors, setError} = useContext(AppContext);

  const [mffModalVisible, setMffModalVisible] = useState(false);
  const [convertionComplete, setConvertionComplete] = useState(false);

  const initState = {
    imageFile: [],
    validationFlags: {errors: [], success: []},
    flags: {},
    mffFiles: [],
    inputFileFormat: 'mff',
    acceptedFormats: {
      mff: 'EGI MFF (.mff)',
      ...state.acceptedFormats,
    },
  };

  useEffect(() => {
    // Init state
    setState(initState);
  }, []);

  const checkPhotoError = () => {
    if (state.imageFile?.length === 0) {
      // setError(true);
      return 'Image files are required.';
    }
    const filename = `${state.filePrefix}_EEG.zip`;
    if (state.imageFile?.[0].name !== filename) {
      // setError(true);
      return 'File should have naming format ' +
        `${state.filePrefix}` + '_EEG.zip';
    }
  };

  const convertMFFtoSET = async () => {
    if (socketContext && state.inputFileFormat === 'mff') {
      setMffModalVisible(true);
      setConvertionComplete(false);
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

      if (dirs.length == 0) {
        updateMessage({'error': 'No MFF file selected.'});
        return;
      }

      // Start working on file conversion-
      updateMessage({'error': 'Working on converting files...'});

      setState({exclude: exclude});
      const mffFiles = dirs.map((dir) => dir.path);
      mffFiles.push(state.imageFile[0].path);
      setState({mffFiles: mffFiles});

      const callback = (success, message, files, flags, bidsDir) => {
        if (success) {
          setState({bidsDirectory: bidsDir});
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
            setConvertionComplete(true);
            setError('mff2set', null);

            setTimeout(() => {
              setMffModalVisible(false);
              setState({appMode: 'Converter'});
            }, 5000);
          }
        } else {
          setError('mff2set', message['error']);
          updateMessage({'error': message});
        }
      };

      const myAPI = window['myAPI']; // from public/preload.js
      const result = await myAPI.convertMFFToSET(dirs);
      callback(
          result.success,
          result.message,
          result.files,
          result.flags,
          result.bidsDir
      );
    }
  };

  return (
    <>
      <div className='info'>
        <div className='small-pad'>
          <FileInput
            required={true}
            name='imageFile'
            label='Placement Photos'
            accept='.zip'
            onUserInput={(_, value) => setState({imageFile: value})}
            help='For photos taken with iPad of cap placement'
            placeholder={
              state.imageFile?.map((file) => file['name']).join(', ')
            }
            error={checkPhotoError()}
          />
        </div>
        <div className='small-pad info'>
          <input type='button'
            className='start_task primary-btn'
            onClick={convertMFFtoSET}
            value='Convert to SET'
            disabled={errors.length}
          />
        </div>
      </div>
      <Modal
        title={
          errors?.mff2set ? '❌ Task Error!' :
          convertionComplete ? '⭐ Task Finished!' :
          '⏱ Task in Progress!'
        }
        show={mffModalVisible}
        close={() => setMffModalVisible(false)}
        width='500px'
      >
        {
          convertionComplete ?
            <span style={{padding: '40px'}}>
              <span className='bids-success'>
                <span className='checkmark'>&#x2714;</span>
                Success converting to SET!
              </span>
            </span> :
          errors?.mff2set ?
            <div className='bids-errors'>
              {errors.mff2set.map((error, i) =>
                <span key={i}>{error}<br/></span>,
              )}
            </div> :
          <span style={{padding: '40px'}}>
            <span className='bids-loading'>
              MFF to SET conversion in progress
              <span>.</span>
              <span>.</span>
              <span>.</span>
              😴
            </span>
          </span>
        }
      </Modal>
    </>
  );
};

export default MFF2SET;
