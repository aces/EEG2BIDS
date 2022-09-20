import React, {useContext, useState, useEffect} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';
import '../css/Configuration.css';
import '../../node_modules/@fortawesome/fontawesome-free/css/all.css';

import {
  AuthenticationMessage,
  AuthenticationCredentials,
} from './elements/authentication';

import RecordingData from './Configuration/RecordingData';
import RecordingMetadata from './Configuration/RecordingMetadata';
import RecordingDetails from './Configuration/RecordingDetails';
import ParticipantDetails from './Configuration/ParticipantDetails';
import EDFHeaderData from './Configuration/EDFHeaderData';

// Socket.io
import {SocketContext} from './socket.io';

/**
 * Configuration - the Data Configuration component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Configuration = (props) => {
  // React Context
  const {state, setState, resetState} = useContext(AppContext);
  const socketContext = useContext(SocketContext);
  const [authCredentialsVisible, setAuthCredentialsVisible] = useState(false);

  useEffect(() => {
    if (!socketContext?.connected) return;

    socketContext.on('loris_login_response', (data) => {
      // todo from alizee - this code should not,
      // isAuthenticated should be passed back from authentication component
      if (data.error) {
        // todo display error message - login failure
      } else {
        setState({isAuthenticated: true});
        //_state.participantEntryMode.set('new_loris');
      }
    });
  }, [socketContext?.connected]);

  useEffect(() => {
    if (state.isAuthenticated && state.LORIScompliant) {
      setState({participantEntryMode: 'existing_loris'});
    } else {
      setState({participantEntryMode: 'manual'});
    }
  }, [state.LORIScompliant, state.isAuthenticated]);

  useEffect(() => {
    if (!state.edfData?.date || !state.participantDOB) return;

    const age = getAge(state.participantDOB, state.edfData.date);
    setState({participantAge: age});
  }, [state.participantDOB, state.edfData]);

  /**
   * Get age at visit
   *
   * @param {Date} birthDate
   * @param {Date} visitDate
   *
   * @return {Number}
   */
  const getAge = (birthDate, visitDate) => {
    if (!birthDate || !visitDate) return;

    let age = visitDate.getFullYear() - birthDate.getFullYear();
    const m = visitDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && visitDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  /**
   * hideAuthCredentials - display AuthCredentials.
   * @param {boolean} hidden
   */
  const hideAuthCredentials = (hidden) => {
    setAuthCredentialsVisible(!hidden);
  };

  return (
    <div style={{display: props.visible ? 'block' : 'none'}}>
      <div className='container'>
        <AuthenticationMessage
          setAuthCredentialsVisible={setAuthCredentialsVisible}
        />
        <div className='small-pad resetBtn'>
          <input type='button'
            className='primary-btn'
            onClick={resetState}
            value='Clear all fields below'
          />
        </div>
      </div>
      <RecordingData/>
      <RecordingMetadata/>
      <RecordingDetails/>
      <ParticipantDetails/>
      <EDFHeaderData/>
      <AuthenticationCredentials
        title='Login to LORIS'
        show={authCredentialsVisible}
        close={hideAuthCredentials}
        width='500px'
      />
    </div>
  );
};

Configuration.propTypes = {
  visible: PropTypes.bool,
};

export default Configuration;
