import React, {useContext, useEffect, lazy, Suspense, useState} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';
import '../css/Configuration.css';
import '../../node_modules/@fortawesome/fontawesome-free/css/all.css';

// Display Loading, Success, Error
import ParticipantDetails from './Configuration/ParticipantDetails';
import RecordingDetails from './Configuration/RecordingDetails';
import RecordingMetadata from './Configuration/RecordingMetadata';
import RecordingData from './Configuration/RecordingData';

/**
 * Configuration - the Data Configuration component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Configuration = (props) => {
  const {config} = useContext(AppContext);
  const [
    recordingConverterLoader,
    setRecordingConverterLoader,
  ] = useState(null);

  useEffect(() => {
    if (config.recordingConverter) {
      const RecordingConverter = lazy(() =>
        import('./Preprocessing/' + config.recordingConverter),
      );
      setRecordingConverterLoader(
          <Suspense fallback={<>Loading...</>}>
            <RecordingConverter />
          </Suspense>,
      );
    }
  }, []);
  return (
    <div style={{
      display: props.visible ? 'block' : 'none',
    }}>
      <ParticipantDetails/>
      <RecordingDetails/>
      {config.displayRecordingMetadata && <RecordingMetadata/>}
      <RecordingData/>
      {recordingConverterLoader}
    </div>
  );
};

Configuration.propTypes = {
  visible: PropTypes.bool,
};

export default Configuration;
