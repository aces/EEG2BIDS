import React, {useContext, useEffect, useState} from 'react';
import {AppContext} from '../../context';
import {SocketContext} from '../socket.io';
import ReactTooltip from 'react-tooltip';

import {
  SelectInput,
  TextInput,
} from '../elements/inputs';

/**
 * Recording Details - the Recording Details component.
 * @param {object} props
 * @return {JSX.Element}
 */
const RecordingDetails = () => {
  const {state, setState, errors, setError} = useContext(AppContext);
  const socketContext = useContext(SocketContext);
  const [isLoaded, setIsLoaded] = useState(false);

  const initState = {
    siteID: '',
    projectID: '',
    subprojectID: '',
    session: '',
    siteOptions: [],
    projectOptions: [],
    subprojectOptions: [],
    sessionOptions: [],
  };

  useEffect(() => {
    // Init state
    Object.keys(initState).map(
        (stateKey) => setState({[stateKey]: initState[stateKey]}),
    );
  }, []);

  // Wait for state to be updated
  useEffect(() => {
    if (isLoaded) return;
    const undefStateKeys = Object.keys(initState).filter(
        (stateKey) => !(stateKey in state),
    );
    if (undefStateKeys.length === 0) setIsLoaded(true);
  }, Object.keys(initState).map((stateKey) => state[stateKey]));

  /**
   * arrayToObject - Convert an array to an object
   * @param {array} array
   * @return {Object}
   */
  const arrayToObject = (array) => {
    return array.reduce((obj, item) => {
      return {
        ...obj,
        [item]: item,
      };
    }, {});
  };

  /**
   * onUserInput - input clfnge by user.
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
    if (!state.session) {
      setError('session', 'Session is not specified');
    } else {
      setError('session', null);
      socketContext.emit('get_loris_visit', {
        candID: state.participantCandID,
        visit: state.session,
      });
    }
  }, [state.session]);

  useEffect(() => {
    if (socketContext) {
      socketContext.on('loris_projects', (projects) => {
        if (projects?.error) {
          setError('projectID', projects.error);
        } else {
          setError('projectID', null);
          setState({projectOptions: Object.keys(projects)});
        }
      });

      socketContext.on('loris_subprojects', (subprojects) => {
        if (subprojects?.error) {
          setError('subprojectID', subprojects.error);
        } else {
          setError('subprojectID', null);
          setState({subprojectOptions: subprojects});
        }
      });

      socketContext.on('loris_visits', (visits) => {
        if (visits?.error) {
          setError('session', visits.error);
        } else {
          setError('session', null);
          setState({sessionOptions: visits});
        }
      });

      socketContext.on('loris_sites', (sites) => {
        if (sites?.error) {
          setError('siteID', sites.error);
        } else {
          setError('siteID', null);
          setState({siteOptions: sites?.map((site) => site.Name)});
        }
      });
    }
  }, [socketContext]);

  return isLoaded && (
    <>
      <span className='header'>
        Recording details
      </span>
      <div className='container'>
        <div className='info' style={{width: '100%'}}>
          {state.useLoris &&
            <>
              <div className='small-pad'>
                <TextInput
                  name='siteID'
                  label='Site'
                  required={true}
                  placeholder='n/a'
                  value={state.siteID}
                  readonly={state.useLoris}
                  onUserInput={onUserInput}
                  error={errors?.siteID}
                  help='Study Centre'
                />
              </div>
              <div className='small-pad'>
                <TextInput
                  name='projectID'
                  label='Project'
                  required={true}
                  placeholder='n/a'
                  readonly={state.useLoris}
                  value={state.projectID}
                  onUserInput={onUserInput}
                  error={errors?.projectID}
                  help='Study'
                />
              </div>
              <div className='small-pad'>
                <TextInput
                  name='subprojectID'
                  label='Subproject'
                  required={true}
                  placeholder='n/a'
                  readonly={state.useLoris}
                  value={state.subprojectID}
                  onUserInput={onUserInput}
                  error={errors?.subprojectID}
                  help='Subproject or population cohort'
                />
              </div>
            </>
          }
          <div className='small-pad'>
            {state.useLoris ?
              <SelectInput
                name='session'
                label={state.useLoris ? 'LORIS Visit Label' : 'Session'}
                required={true}
                value={state.session}
                emptyOption='Select One'
                options={arrayToObject(state.sessionOptions)}
                onUserInput={onUserInput}
                error={errors?.session}
                help='Visit or TimePoint Label'
              /> :
              <TextInput
                name='session'
                label={state.useLoris ? 'LORIS Visit Label' : 'Session'}
                required={true}
                placeholder='n/a'
                value={state.session}
                onUserInput={onUserInput}
                error={errors?.session}
                help='Visit or TimePoint Label'
              />
            }
          </div>
        </div>
      </div>
      <ReactTooltip />
    </>
  );
};

export default RecordingDetails;
