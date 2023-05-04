import Papa from 'papaparse';
import {useContext, useEffect} from 'react';
import {AppContext} from '../../context';
import {SocketContext} from '../socket.io';
import {
  FileInput,
} from '../elements/inputs';

/**
 * Recording Metadata - the Recording Metadata component.
 * @param {object} props
 * @return {JSX.Element}
 */
const RecordingMetadata = (props) => {
  const {state, setState} = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  useEffect(() => {
    // Init state
    setState({bidsMetadataFile: []});
    setState({bidsMetadata: null});
    // setState({invalidBidsMetadataFile: []});
    setState({eventFiles: []});
    // setState({invalidEventFiles: []});
  }, []);

  const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const isFileNameValid = (edfFiles, file, suffix, extension) => {
    edfFiles.find(
        (edfFile) => {
          const edfFileName = edfFile.toLowerCase()
              .replace(/(_i?eeg)?\.edf/i, '');

          const edfFileNameAlt = edfFile.toLowerCase()
              .replace('.edf', '');

          const fileName = file.toLowerCase()
              .replace('/(_' + suffix + ')?.' + extension + '/i', '');

          return edfFileName === fileName || edfFileNameAlt === fileName;
        },
    );
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

  // Validate json metadata file
  useEffect(() => {
    validateJSON(state.bidsMetadataFile)
        .then((result) => {
          setState(
              'invalidBidsMetadataFile',
              result.filter((el) => el != null),
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

  const validateMetadataFiles = (
      metadataFiles,
      invalidFiles,
      suffix,
      extension,
  ) => {
    if (!metadataFiles || Object.keys(metadataFiles)?.length < 1) {
      return ({
        status: 'warning',
        msg: `No ${suffix}.${extension} selected`,
      });
    }

    // check if any file is invalid (syntax/format)
    if (invalidFiles?.length > 0) {
      return ({
        status: 'error',
        msg: `${capitalize(suffix)} file(s) ${invalidFiles.join(', ')}
        are not valid ${extension.toUpperCase()} file(s).`,
      });
    }

    const edfFileNames = state.edfData.files?.map(
        (edfFile) => edfFile['name'],
    );

    // Check that the files are appropriatly named
    const invalidNames = metadataFiles
        .filter((file) => {
          !isFileNameValid(edfFileNames, file['name'], suffix, extension);
        })
        .map((file) => file['name']);

    if (invalidNames?.length > 0) {
      return ({
        status: 'error',
        msg: `${capitalize(suffix)} file(s) ${invalidNames.join(', ')} 
        are not matching any edf file names.`,
      });
    }

    return ({
      status: 'pass',
      msg: `${capitalize(suffix)} ${extension.toUpperCase()} file(s): ` +
      metadataFiles.map((file) => file['name']).join(', '),
    });
  };

  useEffect(() => {
    validateMetadataFiles(
        state.eventFiles,
        state.invalidEventFiles,
        'events',
        'tsv',
    );
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
          <div className='small-pad'>
            <FileInput id='bidsMetadataFile'
              name='bidsMetadataFile'
              accept='.json'
              placeholder={
                state.bidsMetadataFile?.map(
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
    </>
  );
};

export default RecordingMetadata;
