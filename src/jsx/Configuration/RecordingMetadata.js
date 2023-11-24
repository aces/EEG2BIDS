import Papa from 'papaparse';
import ReactTooltip from 'react-tooltip';
import {useContext, useEffect} from 'react';
import {AppContext} from '../../context';
import {SocketContext} from '../socket.io';
import {
  SelectInput,
  TextInput,
  FileInput,
} from '../elements/inputs';

const recordingMetadata = [
  {
    name: 'reference',
    label: 'Reference',
    default: 'n/a',
  },
  {
    name: 'powerLineFreq',
    label: 'PowerLine Frequency',
    default: 'n/a',
    options: {
      '50': '50',
      '60': '60',
    },
  },
];

/**
 * Recording Metadata - the Recording Metadata component.
 * @param {object} props
 * @return {JSX.Element}
 */
const RecordingMetadata = () => {
  const {state, setState, config} = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  /**
   * openGitHub - Navigate browser to SET2BIDS Wizard.
   */
  const openTemplates = () => {
    const myAPI = window['myAPI'];
    myAPI.visitTemplates();
  };

  useEffect(() => {
    // Init state
    setState({bidsMetadataFile: []});
    setState({bidsMetadata: null});
    setState({invalidBidsMetadataFile: []});
    setState({eventFiles: []});
    setState({invalidEventFiles: []});

    recordingMetadata
        .filter((field) => config?.recordingMetadata?.[field.name])
        .forEach((field) => setState({[field.name]: ''}));
  }, []);

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

  // Validate json metadata file
  useEffect(() => {
    validateJSON(state.bidsMetadataFile)
        .then((result) => {
          setState(
              {invalidBidsMetadataFile: result.filter((el) => el != null)},
          );
        });
  }, [state.bidsMetadataFile]);

  // Validate tsv event file
  useEffect(() => {
    validateTSV(state.eventFiles)
        .then((result) => {
          setState({invalidEventFiles: result.filter((el) => el != null)});
        });
  }, [state.eventFiles]);

  /**
   * onUserInput - input change by user.
   * @param {string} name - element name
   * @param {object|string|boolean} value - element value
   */
  const onUserInput = (name, value) => {
    if (name in state) {
      setState({[name]: value});
    }
  };

  useEffect(() => {
    if (state.bidsMetadataFile?.length > 0) {
      socketContext?.emit('get_bids_metadata', {
        file_path: state.bidsMetadataFile[0]['path'],
        modality: state.modality,
      });
    }
  }, [state.bidsMetadataFile, state.modality]);


  useEffect(() => {
    if (socketContext) {
      socketContext.on('bids_metadata', (message) => {
        if (message['error']) {
          console.error(message['error']);
        }

        setState({bidsMetadata: message});
      });
    }
  }, [socketContext]);

  return (
    <>
      <span className='header'>
        Recording metadata
        <div className='header-hint'>
          ⓘ For details please see BIDS specification
        </div>
      </span>
      <div className='container'>
        <div className='info half'>
          {recordingMetadata
              .filter((field) => config?.recordingMetadata?.[field.name])
              .map((field) =>
                <div
                  className='small-pad'
                  key={field.name}
                >
                  {field.options ?
                    <SelectInput
                      name={field.name}
                      label={field.label}
                      required={true}
                      value={state[field.name]}
                      emptyOption='n/a'
                      options={field.options}
                      onUserInput={onUserInput}
                    /> :
                    <TextInput
                      name={field.name}
                      label={field.label}
                      placeholder={field.default}
                      required={true}
                      value={state[field.name] || ''}
                      onUserInput={onUserInput}
                    />
                  }
                </div>,
              )}
        </div>
        <div className='info half'>
          <div className='small-pad'>
            <FileInput
              name='bidsMetadataFile'
              accept='.json'
              placeholder={
                state.bidsMetadataFile?.map(
                    (bidsMetadataFile) => bidsMetadataFile['name'],
                ).join(', ')
              }
              label='Recording Parameters (json)'
              onUserInput={onUserInput}
              help='Used to contribute fields to *.json BIDS
              parameter file. Blank fields ignored.'
            />
            <div>
              <a
                className='open-source'
                onClick={openTemplates}
              >
                Download template
              </a>
            </div>
          </div>
          <div className='small-pad'>
            <FileInput
              name='eventFiles'
              multiple={true}
              accept='.tsv'
              placeholder={
                state.eventFiles?.map(
                    (eventFile) => eventFile['name'],
                ).join(', ')
              }
              label='events.tsv (additional)'
              onUserInput={onUserInput}
              help='Additional events only. Events embedded in
              the EDF Annotations signal are automatically extracted.'
            /><br/>
            <small>
              File name must match one of the recording file.
            </small>
          </div>
        </div>
      </div>
      <ReactTooltip />
    </>
  );
};

export {recordingMetadata};
export default RecordingMetadata;
