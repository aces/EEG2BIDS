import React, {useContext, useEffect} from 'react';
import {AppContext} from '../../context';
import {formatError, formatWarning, formatPass} from '../Converter';

/**
 * Recording Data - the Recording Data component.
 */
const RecordingData = () => {
  const {state, setState} = useContext(AppContext);

  const edfFile = () => {
    let validationStatus;

    if (state.edfData?.error) {
      validationStatus = {
        status: 'error',
        msg: state.edfData.error,
      };
    } else if (state.edfData?.files?.length > 0) {
      validationStatus = {
        status: 'pass',
        msg: 'EDF data file(s): ' +
          state.edfData.files.map(
              (edfFile) => edfFile['name'],
          ).join(', '),
      };
    } else {
      validationStatus = {
        status: 'error',
        msg: 'No EDF file selected',
      };
    }

    return {
      edfFile: validationStatus,
    };
  };

  const modality = () => {
    let validationStatus;

    if (state.modality) {
      validationStatus = {
        status: 'pass',
        msg: `Modality: ${state.modality}`,
      };
    } else {
      validationStatus = {
        status: 'error',
        msg: 'No modality selected',
      };
    }

    return {
      modality: validationStatus,
    };
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

  const edfFileNames = state.edfData.files.map(
      (edfFile) => edfFile['name'],
  );

  const metadataFiles = (metadataFiles, suffix, extension) => {
    const result = [];
    let eventsStatus;
    if (!metadataFiles ||
      Object.keys(metadataFiles)?.length < 1
    ) {
      eventsStatus = formatWarning('No events.tsv selected ');
    } else {
      // check if any TSV file is invalid
      if (state.invalidEventFiles?.length > 0) {
        eventsStatus = formatError(
            `Event file(s) ${state.invalidEventFiles.join(', ')}
            are not valid TSV file(s).`,
        );
      } else {
        let match = true;

        // Check that the events files are appropriatly named
        state.eventFiles.map((eventFile) => {
          if (!isFileNameValid(
              edfFileNames,
              eventFile['name'],
              'events',
              'tsv',
          )) {
            match = false;
            eventsStatus = formatError(
                `Event file ${eventFile['name']}
                is not matching any edf file names.`,
            );
          }
        });

        if (match) {
          eventsStatus = formatPass('Event file(s): ' +
              state.eventFiles.map(
                  (eventFile) => eventFile['name'],
              ).join(', '),
          );
        }
      }
    }
    result.push(<div key='eventsStatus'>{eventsStatus}</div>);
    return result;
  };


  const validateData = () => {
    const result = [];

    // annotations TSV
    let annotationsTSVStatus = '';
    if (!state.annotationsTSV ||
      Object.keys(state.annotationsTSV)?.length < 1
    ) {
      annotationsTSVStatus = formatWarning('No annotations.tsv selected');
    } else {
      // check if any TSV file is invalid
      if (state.invalidAnnotationsTSV?.length > 0) {
        annotationsTSVStatus = formatError(
            `Annotation file(s) ${state.invalidAnnotationsTSV.join(', ')}
            are not valid TSV file(s).`,
        );
      } else {
        let match = true;

        // Check that the events files are appropriatly named
        state.annotationsTSV.map((annotationsTSVFile) => {
          if (!isFileNameValid(
              edfFileNames,
              annotationsTSVFile['name'],
              'annotations',
              'tsv',
          )) {
            match = false;
            annotationsTSVStatus = formatError(
                `Annotation file ${annotationsTSVFile['name']}
                is not matching any edf file names.`,
            );
          }
        });

        if (match) {
          annotationsTSVStatus = formatPass('Annotations TSV file(s): ' +
              state.annotationsTSV.map(
                  (annotationsTSVFile) => annotationsTSVFile['name'],
              ).join(', '),
          );
        }
      }
    }
    result.push(<div key='annotationsTSVStatus'>{annotationsTSVStatus}</div>);

    // annotations JSON
    let annotationsJSONStatus = '';

    //if (appContext.getFromTask('annotationsTSV') &&
    //  Object.keys(appContext.getFromTask('annotationsTSV'))?.length > 0
    //) {
    if (!state.annotationsJSON ||
      Object.keys(state.annotationsJSON)?.length < 1
    ) {
      annotationsJSONStatus = formatWarning('No annotations.json selected');
    } else {
      // check if any JSON file is invalid
      if (state.invalidAnnotationsJSON?.length > 0) {
        annotationsJSONStatus = formatError(
            `Annotation file(s) ${state.invalidAnnotationsJSON.join(', ')}
            are not valid JSON file(s).`,
        );
      } else {
        let match = true;
        // Check that the events files are appropriatly named
        state.annotationsJSON.map((annotationsJSONFile) => {
          if (!isFileNameValid(
              edfFileNames,
              annotationsJSONFile['name'],
              'annotations',
              'json',
          )) {
            match = false;
            annotationsJSONStatus = formatError(
                `Annotation file ${annotationsJSONFile['name']}
              is not matching any edf file names.`,
            );
          }
        });

        if (match) {
          annotationsJSONStatus = formatPass(
              'Annotations JSON file(s): ' +
              state.annotationsJSON.map(
                  (annotationsJSONFile) => annotationsJSONFile['name'],
              ).join(', '),
          );
        }
      }
    }
    result.push(
        <div key='annotationsJSONStatus'>
          {annotationsJSONStatus}
        </div>,
    );
    //}


    // bidsDirectory
    let bidsDirectoryStatus = '';
    if (state.bidsDirectory) {
      bidsDirectoryStatus = formatPass(
          'BIDS output directory: ' + state.bidsDirectory,
      );
    } else {
      bidsDirectoryStatus = formatError('No BIDS output folder selected');
    }
    result.push(<div key='bidsDirectoryStatus'>{bidsDirectoryStatus}</div>);

    // LORIS compliant
    let LORIScompliantStatus = '';
    if (typeof state.LORIScompliant == 'boolean') {
      LORIScompliantStatus = formatPass(
          `Data loaded in LORIS: ${state.LORIScompliant}`,
      );
    } else {
      LORIScompliantStatus = formatError(
          'Select if the data will be loaded into LORIS.',
      );
    }
    result.push(<div key='LORIScompliantStatus'>{LORIScompliantStatus}</div>);

    return result;
  };
};

export default RecordingData;
