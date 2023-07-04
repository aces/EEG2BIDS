import React, {useContext, useEffect, useState} from 'react';
import {AppContext} from '../../context';

/**
 * Recording Data - the Recording Data component.
 * @return {JSX.Element}
 */
const RecordingData = () => {
  const {state, setState} = useContext(AppContext);
  const [results, setResults] = useState([]);

  const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  useEffect(() => {
    setResults([
      validateEEGFile(),
      validateOutputDir(),
      validateModality(),
      validateUseLORIS(),
      validateMetadataFiles(
          state.eventFiles,
          state.invalidEventFiles,
          'events',
          'tsv',
      ),
    ]);
  }, [
    state.eventFiles,
    state.invalidEventFiles,
    state.eegData,
    state.modality,
    state.bidsDirectory,
    state.useLoris,
  ]);

  useEffect(() => {
    results.filter(({status}) => status === 'error').length > 0 ?
      setState({RecordingDataValid: false}) :
      setState({RecordingDataValid: true});
  }, [results]);

  const validateEEGFile = () => {
    if (state.eegData?.error) {
      return ({
        status: 'error',
        msg: state.eegData.error,
      });
    } else if (state.eegFileNames?.length > 0) {
      return ({
        status: 'pass',
        msg: 'EEG data file(s): ' + state.eegFileNames.join(', '),
      });
    } else {
      return ({
        status: 'error',
        msg: 'No EEG file selected',
      });
    }
  };

  const validateModality = () => {
    if (state.modality) {
      return ({
        status: 'pass',
        msg: `Modality: ${state.modality}`,
      });
    } else {
      return ({
        status: 'error',
        msg: 'No modality selected',
      });
    }
  };

  const validateOutputDir = () => {
    if (state.bidsDirectory) {
      return ({
        status: 'pass',
        msg: 'BIDS output directory: ' + state.bidsDirectory,
      });
    } else {
      return ({
        status: 'error',
        msg: 'No BIDS output folder selected',
      });
    }
  };

  const validateUseLORIS = () => {
    if (typeof state.useLoris == 'boolean') {
      return ({
        status: 'pass',
        msg: `Data loaded in LORIS: ${state.useLoris}`,
      });
    } else {
      return ({
        status: 'error',
        msg: 'Select if the data will be loaded into LORIS.',
      });
    }
  };

  const isFileNameValid = (eegFiles, file, suffix, extension) =>
    eegFiles.find((eegFile) => {
      const eegRegex = new RegExp(
          '(_i?eeg)?\\.' + state.inputFileFormat,
          'i',
      );
      const eegFilePrefix = eegFile.replace(eegRegex, '');

      const fileRegex = new RegExp(
          '(_' + suffix + ')?\\.' + extension,
          'i',
      );
      const fileName = file.replace(fileRegex, '');

      return eegFilePrefix === fileName;
    });

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

    if (state.eegFileNames?.length > 0) {
      // Check that the files are appropriatly named
      const invalidNames = metadataFiles
          .filter((file) => !isFileNameValid(
              state.eegFileNames,
              file['name'],
              suffix,
              extension,
          ))
          .map((file) => file['name']);
      if (invalidNames?.length > 0) {
        return ({
          status: 'error',
          msg: `${capitalize(suffix)} file(s) ${invalidNames.join(', ')} 
          are not matching any recording file names.`,
        });
      }
    }

    return ({
      status: 'pass',
      msg: `${capitalize(suffix)} ${extension.toUpperCase()} file(s): ` +
      metadataFiles.map((file) => file['name']).join(', '),
    });
  };

  return (
    <div className='small-pad'>
      <b>Review your data and metadata:</b>
      <div>{results.map((result, key) =>
        <div key={key}>
          <span className={result.status}>{result.msg}</span>
        </div>,
      )}</div>
    </div>
  );
};

export default RecordingData;
