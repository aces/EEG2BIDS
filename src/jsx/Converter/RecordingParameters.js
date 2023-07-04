import React, {useContext, useEffect, useState} from 'react';
import {AppContext} from '../../context';

/**
 * Recording Data - the Recording Data component.
 * @return {JSX.Element}
 */
const RecordingParameters = () => {
  const {state, setState} = useContext(AppContext);
  const [results, setResults] = useState([]);

  useEffect(() => {
    setResults([
      ...validateRecordingParameters(),
    ]);
  }, [
    state.bidsMetadata,
    state.invalidBidsMetadataFile,
  ]);

  useEffect(() => {
    results.filter(({status}) => status === 'error').length > 0 ?
      setState({RecordingParameterValid: false}) :
      setState({RecordingParameterValid: true});
  }, [results]);

  const validateRecordingParameters = () => {
    if (!state.bidsMetadata) {
      return ([{
        status: 'warning',
        msg: 'No EEG Parameter metadata file selected',
      }]);
    }

    if (state.invalidBidsMetadataFile?.length > 0) {
      return ([{
        status: 'warning',
        msg: `EEG Parameter metadata file(s)
        ${state.invalidBidsMetadataFile.join(', ')}
        are not valid JSON file(s).`,
      }]);
    }

    if ('error' in state.bidsMetadata) {
      return ([{
        status: 'warning',
        msg: state.bidsMetadata['error'],
      }]);
    }

    const metadata = state.bidsMetadata?.metadata;
    const ignoredKeys = state.bidsMetadata?.ignored_keys;
    if (!metadata || !ignoredKeys || metadata.length < 1) {
      return ([{
        status: 'warning',
        msg: `An error occured while processing
          the recording parameters file selected.`,
      }]);
    }

    const output = [];
    let ignoredKeyFound = false;

    Object.keys(metadata).map((key) => {
      if (ignoredKeys.indexOf(key) > -1) {
        ignoredKeyFound = true;
        output.push({
          status: 'warning',
          msg: `${key}: ${metadata[key]}`,
        });
      } else {
        output.push({
          status: null,
          msg: `${key}: ${typeof metadata[key] == 'object' ?
            JSON.stringify(metadata[key]) :
            metadata[key]
          }`,
        });
      }
    });

    if (ignoredKeyFound) {
      output.push({
        status: 'warning',
        msg: `Note: invalid or extra parameters, as well as
          parameters with empty values are ignored.`,
      });
    }

    return output;
  };

  return (
    <div className='small-pad'>
      <b>Review your uploaded EEG Parameter metadata:</b>
      <div>{results.map((result, key) =>
        <div key={key}>
          <span className={result.status}>{result.msg}</span>
        </div>,
      )}</div>
    </div>
  );
};

export default RecordingParameters;
