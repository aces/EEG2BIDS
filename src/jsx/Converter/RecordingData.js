import React, {useContext, useEffect} from 'react';
import {AppContext} from '../../context';

/**
 * Recording Data - the Recording Data component.
 * @return {JSX.Element}
 */
const RecordingData = () => {
  const {state, setState} = useContext(AppContext);

  console.log(state);

  const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const validateEdfFile = () => {
    if (state.edfData?.error) {
      return ({
        status: 'error',
        msg: state.edfData.error,
      });
    } else if (state.edfData?.files?.length > 0) {
      return ({
        status: 'pass',
        msg: 'EDF data file(s): ' +
          state.edfData.files.map(
              (edfFile) => edfFile['name'],
          ).join(', '),
      });
    } else {
      return ({
        status: 'error',
        msg: 'No EDF file selected',
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

  const validateLORISCompliant = () => {
    if (typeof state.LORIScompliant == 'boolean') {
      return ({
        status: 'pass',
        msg: `Data loaded in LORIS: ${state.LORIScompliant}`,
      });
    } else {
      return ({
        status: 'error',
        msg: 'Select if the data will be loaded into LORIS.',
      });
    }
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

  const results = [
    validateEdfFile(),
    validateOutputDir(),
    validateModality(),
    validateLORISCompliant(),
    validateMetadataFiles(
        state.eventFiles,
        state.invalidEventFiles,
        'events',
        'tsv',
    ),
    validateMetadataFiles(
        state.annotationsTSV,
        state.invalidAnnotationsTSV,
        'annotations',
        'tsv',
    ),
    validateMetadataFiles(
        state.annotationsJSON,
        state.invalidAnnotationsJSON,
        'annotations',
        'json',
    ),
  ];

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
