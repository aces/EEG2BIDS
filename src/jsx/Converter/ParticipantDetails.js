import React, {useContext, useEffect, useState} from 'react';
import {AppContext} from '../../context';

/**
 * Recording Data - the Recording Data component.
 * @return {JSX.Element}
 */
const ParticipantDetails = () => {
  const {state, setState} = useContext(AppContext);
  const [results, setResults] = useState([]);

  useEffect(() => {
    setResults([
      ...state.participantEntryMode == 'existing_loris' ?
        [
          validateParticipantPSCID(),
          validateParticipantCandID(),
        ] : [
          validateParticipantID(),
        ],
    ]);
  }, [
    state.participantEntryMode,
    state.participantPSCID,
    state.participantCandID,
    state.participantID,
  ]);

  useEffect(() => {
    results.filter(({status}) => status === 'error').length > 0 ?
      setState({ParticipantDetailsValid: false}) :
      setState({ParticipantDetailsValid: true});
  }, [results]);

  const validateParticipantPSCID = () => {
    if (!state.participantPSCID) {
      return ({
        status: 'error',
        msg: 'LORIS PSCID is not specified',
      });
    }
    return ({
      status: 'pass',
      msg: `LORIS PSCID: ${state.participantPSCID}`,
    });
  };

  const validateParticipantCandID = () => {
    if (!state.participantCandID) {
      return ({
        status: 'error',
        msg: 'LORIS DCCID is not specified',
      });
    }
    if (state.participantCandID?.error) {
      return ({
        status: 'error',
        msg: state.participantCandID.error,
      });
    }
    return ({
      status: 'pass',
      msg: `LORIS DCCID: ${state.participantCandID}`,
    });
  };

  const validateParticipantID = () => {
    if (!state.participantID) {
      return ({
        status: 'error',
        msg: 'Participant ID is not specified',
      });
    }
    return ({
      status: 'pass',
      msg: `Participant ID: ${state.participantID}`,
    });
  };

  return (
    <div className='small-pad'>
      <b>Review your participant details:</b>
      <div>{results.map((result, key) =>
        <div key={key}>
          <span className={result.status}>{result.msg}</span>
        </div>,
      )}</div>
    </div>
  );
};

export default ParticipantDetails;
