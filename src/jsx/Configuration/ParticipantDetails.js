import React, {useContext, useEffect} from 'react';
import {AppContext} from '../../context';
import {SocketContext} from '../socket.io';
import ReactTooltip from 'react-tooltip';

import {
  SelectInput,
  TextInput,
} from '../elements/inputs';

const participantMetadata = [
  {
    name: 'species',
    label: 'Species',
    default: 'n/a',
    help: 'Binomial species name from the NCBI Taxonomy',
  },
  {
    name: 'age',
    label: 'Age',
    help: 'Age in years (float or integer value)',
    default: 'n/a',
  },
  {
    name: 'sex',
    label: 'Biological Sex',
    options: {
      'female': 'Female',
      'male': 'Male',
      'other': 'Other',
    },
    default: 'n/a',
    help: 'See BIDS specification for more information',
  },
  {
    name: 'handedness',
    label: 'Handedness',
    options: {
      'R': 'Right',
      'L': 'Left',
      'A': 'Ambidextrous',
    },
    default: 'n/a',
    help: 'See BIDS specification for more information',
  },
  {
    name: 'strain',
    label: 'Strain',
    default: 'n/a',
    help: 'For species different from homo sapiens, strain of the species',
  },
  {
    name: 'strain_rrid',
    label: 'Strain RRID',
    default: 'n/a',
    help: 'For species different from homo sapiens, ' +
      'RRID of the strain of the species',
  },
];

/**
 * Participant Details - the Participant Details component.
 * @param {object} props
 * @return {JSX.Element}
 */
const ParticipantDetails = () => {
  const {state, setState, errors, setError, config} = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  let participantIDs = {
    participantID: 'Participant ID',
  };

  /* -----------------------------------
   * LORIS specificities
   * ----------------------------------- */
  if (state.useLoris) {
    participantIDs = {
      participantID: 'LORIS PSCID',
      participantCandID: 'LORIS DCCID',
    };
  }
  /* ----------------------------------- */

  useEffect(() => {
    // Init state
    participantMetadata
        .filter((field) => config?.participantMetadata?.[field.name])
        .forEach((field) => setState({[field.name]: ''}));

    config?.participantMetadata?.additional
        .filter((field) => field?.display)
        .forEach((field) => setState({[field.name]: ''}));

    Object.keys(participantIDs).forEach(
        (participantID) => setState({[participantID]: ''}),
    );

    setState({participantDOB: null});
    setState({age: null});
  }, []);

  useEffect(() => {
    const filePrefix = (state.participantID ||
      (state.useLoris ? '[PSCID]' : '[ParticipantID]')) + '_' +
    (state.useLoris ?
      ((state.participantCandID || '[DCCID]') + '_' ) : '') +
    (state.session || '[VisitLabel]');

    setState({filePrefix: filePrefix});

    if (
      state.participantID &&
      (!state.useLoris || state.participantCandID) &&
      state.session
    ) {
      setState({outputFilename: `${filePrefix}_bids`});
    }
  }, [state.participantID, state.participantCandID, state.session]);

  useEffect(() => {
    if (socketContext) {
      socketContext.on('loris_visit', (visit) => {
        if (!visit?.error) {
          const age = getAge(state.participantDOB, visit?.Stages?.Visit.Date);
          setState({age: age});
        }
      });
    }
  }, [socketContext]);

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
    if (!state.participantID) {
      setError(
          'participantID',
          `${participantIDs.participantID} is not specified`,
      );
    } else {
      setError('participantID', null);
    }
  }, [state.participantID]);

  useEffect(() => {
    if (state.participantID && state.participantCandID) {
      // Collect the participant PSCID, sex, age...
      socketContext?.emit('get_participant_data', {
        candID: state.participantCandID,
      });
    }
  }, [state.participantCandID, state.participantID]);

  useEffect(() => {
    socketContext?.on('participant_data', (data) => {
      if (data?.error) {
        setError('participantCandID', data.error);
      } else {
        if (data.Meta.PSCID !== state.participantID) {
          setError(
              'participantID',
              'The PSCID/DDCID pair you provided does ' +
              'not match an existing candidate.',
          );
        } else {
          setError('participantCandID', null);
          setError('participantID', null);

          setState({participantDoB: new Date(data.Meta.DoB)});
          setState({sex: data.Meta.Sex});
          setState({projectID: data.Meta.Project});
          setState({siteID: data.Meta.Site});
          setState({sessionOptions: data.Visits});
        }
      }
    });
  }, [socketContext, state.participantID]);

  useEffect(() => {
    socketContext?.on('new_candidate_created', (data) => {
      if (data?.error) {
        setError({participantCandID: data.error});
      } else {
        setError({participantCandID: null});
      }

      if (data['CandID'] && data['PSCID']) {
        console.info('candidate created');
        setState({participantID: data['PSCID']});
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
          {Object.keys(participantIDs).map((participantID) =>
            <div className='small-pad' key={participantID}>
              <TextInput id={participantID}
                name={participantID}
                label={participantIDs[participantID]}
                required={true}
                value={state[participantID] || ''}
                onUserInput={onUserInput}
                error={errors?.[participantID]}
              />
            </div>,
          )}
          {participantMetadata
              .filter((field) => config?.participantMetadata?.[field.name])
              .map((field) =>
                <div
                  className='small-pad'
                  key={field.name}
                >
                  {field.options ?
                    <SelectInput
                      name={field.name}
                      label={field.label}
                      value={state[field.name]}
                      emptyOption='n/a'
                      options={field.options}
                      onUserInput={onUserInput}
                      help={field.help}
                    /> :
                    <TextInput
                      name={field.name}
                      label={field.label}
                      placeholder={field.default}
                      value={state[field.name] || ''}
                      onUserInput={onUserInput}
                      help={field.help}
                    />
                  }
                </div>,
              )}
          {config?.participantMetadata?.additional
              .filter((field) => field?.display)
              .map((field) =>
                <div
                  className='small-pad'
                  key={field.name}
                >
                  <TextInput
                    name={field.name}
                    label={field.label}
                    placeholder={field.default}
                    value={state[field.name] || ''}
                    onUserInput={onUserInput}
                    help={field.help}
                  />
                </div>,
              )}
        </>
      </div>
      <ReactTooltip />
    </>
  );
};

export {participantMetadata};
export default ParticipantDetails;
