import React, {useContext, useEffect, useState} from 'react';
import {AppContext} from '../../context';
import {SocketContext} from '../socket.io';

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
    siteID: 'n/a',
    projectID: 'n/a',
    subprojectID: 'n/a',
    session: '',
    siteOptions: [],
    projectOptions: [],
    subprojectOptions: [],
    sessionOptions: [],
  };

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
      socketContext.on('loris_visit', (visit) => {
        if (!visit?.error) {
          const age = getAge(state.participantDOB, visit?.Stages?.Visit.Date);
          setState({participantAge: age});
        }
      });

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
          <div className='small-pad'>
            <label className="label" htmlFor='#siteID'>
              <b>
                Site <span className="red">*</span>
                <i
                  className='fas fa-question-circle'
                  data-tip='Study Centre'
                ></i>
              </b>
            </label>
            <div className='comboField'>
              <TextInput id='siteID'
                name='siteID'
                label=''
                placeholder='n/a'
                value={state.siteID}
                readonly={true}
                onUserInput={onUserInput}
                error={errors?.siteID}
              />
            </div>
          </div>
          <div className='small-pad'>
            <label className="label" htmlFor='#projectID'>
              <b>
                Project <span className="red">*</span>
                <i
                  className='fas fa-question-circle'
                  data-tip='Study'
                ></i>
              </b>
            </label>
            <div className='comboField'>
              <TextInput id='projectID'
                name='projectID'
                label=''
                placeholder='n/a'
                readonly={true}
                value={state.projectID}
                onUserInput={onUserInput}
                error={errors?.projectID}
              />
            </div>
          </div>
          <div className='small-pad'>
            <label className="label" htmlFor='#session'>
              <b>
                Session <span className="red">*</span>
                <i
                  className='fas fa-question-circle'
                  data-tip='Visit or TimePoint Label'
                ></i>
              </b>
              <div><small>(LORIS Visit Label)</small></div>
            </label>
            <div className='comboField'>
              <SelectInput id='session'
                name='session'
                label=''
                required={true}
                value={state.session}
                emptyOption='Select One'
                options={arrayToObject(state.sessionOptions)}
                onUserInput={onUserInput}
                error={errors?.session}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RecordingDetails;
