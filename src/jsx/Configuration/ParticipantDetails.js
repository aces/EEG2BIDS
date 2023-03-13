import React, {useContext, useEffect} from 'react';
import {AppContext} from '../../context';
import {SocketContext} from '../socket.io';

import {
  TextInput,
} from '../elements/inputs';

/**
 * Participant Details - the Participant Details component.
 * @param {object} props
 * @return {JSX.Element}
 */
const ParticipantDetails = () => {
  const {state, setState, errors, setError} = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  useEffect(() => {
    // Init state
    setState({participantPSCID: ''});
    setState({participantCandID: ''});
  }, []);

  /**
   * onUserInput - input change by user.
   * @param {string} name - element name
   * @param {object|string|boolean} value - element value
   */
  const onUserInput = (name, value) => {
    if (typeof value === 'string') {
      value = value.trim();
    }

    if (name in state) {
      setState({[name]: value});
    }
  };

  useEffect(() => {
    if (!state.participantCandID) {
      setError(
          'participantCandID',
          'LORIS DCCID is not specified',
      );
    } else {
      setError('participantCandID', null);
    }
  }, [state.participantCandID]);

  useEffect(() => {
    if (!state.participantPSCID) {
      setError(
          'participantPSCID',
          'LORIS PSCID is not specified',
      );
    } else {
      setError('participantPSCID', null);
    }
  }, [state.participantPSCID]);

  useEffect(() => {
    if (state.participantPSCID && state.participantCandID) {
      // Collect the participant PSCID, sex, age...
      socketContext?.emit('get_participant_data', {
        candID: state.participantCandID,
      });
    }
  }, [state.participantCandID, state.participantPSCID]);

  useEffect(() => {
    socketContext?.on('participant_data', (data) => {
      if (data?.error) {
        setError('participantCandID', data.error);
      } else {
        if (data.Meta.PSCID !== state.participantPSCID) {
          setError(
              'participantPSCID',
              'The PSCID/DDCID pair you provided does ' +
              'not match an existing candidate.',
          );
        } else {
          setError('participantCandID', null);
          setError('participantPSCID', null);

          setState({participantDoB: new Date(data.Meta.DoB)});
          setState({participantSex: data.Meta.Sex});
          setState({projectID: data.Meta.Project});
          setState({siteID: data.Meta.Site});
          setState({sessionOptions: data.Visits});
        }
      }
    });
  }, [socketContext, state.participantPSCID]);

  useEffect(() => {
    socketContext?.on('new_candidate_created', (data) => {
      if (data?.error) {
        setError({participantCandID: data.error});
      } else {
        setError({participantCandID: null});
      }

      if (data['CandID'] && data['PSCID']) {
        console.info('candidate created');
        setState({participantPSCID: data['PSCID']});
        setState({participantCandID: data['CandID']});
      }
    });
  }, [socketContext]);

  return (
    <>
      <span className='header'>
        Participant Details
      </span>
      <div className='info'>
        <>
          <div className='small-pad'>
            <TextInput id='participantPSCID'
              name='participantPSCID'
              label='LORIS PSCID'
              required={true}
              value={state.participantPSCID || ''}
              onUserInput={onUserInput}
              error={errors?.participantPSCID}
            />
          </div>
          <div className='small-pad'>
            <TextInput id='participantCandID'
              name='participantCandID'
              label='LORIS DCCID'
              required={true}
              value={state.participantCandID || ''}
              onUserInput={onUserInput}
              error={errors?.participantCandID}
            />
          </div>
        </>
      </div>
    </>
  );
};

export default ParticipantDetails;
