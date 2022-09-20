import React, {useContext, useState, useEffect} from 'react';
import {AppContext} from '../../context';
import {
  TextInput,
  SelectInput,
  TextareaInput,
} from '../elements/inputs';

// Socket.io
import {SocketContext} from '../socket.io';

/**
 * Recording Details - the Recording Details component.
 * @param {object} props
 * @return {JSX.Element}
 */
const RecordingDetails = (props) => {
  const socketContext = useContext(SocketContext);
  const {state, setState} = useContext(AppContext);
  const [siteOptions, setSiteOptions] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [subprojectOptions, setSubprojectOptions] = useState([]);
  const [sessionOptions, setSessionOptions] = useState([]);
  const manualOption = 'Enter manually';

  /**
   * onUserInput - input change by user.
   * @param {string} name - element name
   * @param {object|string|boolean} value - element value
   */
  const onUserInput = (name, value) => {
    if (!socketContext?.connected) return;

    if (typeof value === 'string') {
      value = value.trim();
    }

    switch (name) {
      case 'siteID_API': {
        setState({
          siteID: value == manualOption ? '' : value,
        });
        break;
      }
      case 'siteID_Manual':
        setState({siteID: value});
        break;
      case 'projectID_API': {
        if (value == manualOption) {
          value = '';
        } else {
          socketContext.emit('get_loris_subprojects', value);
        }
        setState({projectID: value});
        break;
      }
      case 'projectID_Manual':
        setState({projectID: value});
        break;
      case 'subprojectID_API': {
        if (value == manualOption) {
          value = '';
        } else {
          socketContext.emit('get_loris_visits', value);
        }
        setState({subprojectID: value});
        break;
      }
      case 'subprojectID_Manual':
        setState({subprojectID: value});
        break;
      case 'session_API': {
        setState({session: value == manualOption ? '' : value});
        break;
      }
      case 'session_Manual':
        setState({session: value});
        break;
      default:
        if (name in state) {
          setState({[name]: value});
        }
    }
  };

  /**
   * arrayToObject - Convert an array to an object
   * { value: value }
   *
   * @param {array} array
   *
   * @return {Object}
   */
  const arrayToObject = (array) => {
    if (!Array.isArray(array)) return null;

    return array.reduce((obj, item) => {
      return {
        ...obj,
        [item]: item,
      };
    }, {});
  };

  useEffect(() => {
    if (!socketContext?.connected) return;

    socketContext.on('loris_sites', (sites) => {
      if (!sites) return;
      const siteOpts = [];
      sites.map((site) => {
        siteOpts.push(site.Name);
      });
      setSiteOptions(siteOpts);
    });

    socketContext.on('loris_projects', (projects) => {
      const projectOpts = [];
      Object.keys(projects).map((project) => {
        projectOpts.push(project);
      });
      setProjectOptions(projectOpts);
    });

    socketContext.on('loris_subprojects', (subprojects) => {
      const subprojectOpts = [];
      subprojects?.map((subproject) => {
        subprojectOpts.push(subproject);
      });
      setSubprojectOptions(subprojectOpts);
    });

    socketContext.on('loris_visits', (visits) => {
      const visitOpts = [];
      if (visits && visits?.length > 0) {
        visits.map((visit) => {
          visitOpts.push(visit);
        });
      }
      setSessionOptions(visitOpts);
    });
  }, [socketContext?.connected]);

  return (
    <>
      <span className='header'>
        Recording details
      </span>
      <div className='container'>
        <div className='info half'>
          <div className='small-pad'>
            <TextInput id='taskName'
              name='taskName'
              required={true}
              label='Task Name'
              value={state.taskName}
              onUserInput={onUserInput}
              bannedCharacters={['-', '_', ' ', '/']}
              help='Task, stimulus, _state or experimental context.
              See BIDS specification for more information.'
            />
          </div>
          {state.LORIScompliant &&
            <>
              <div className='small-pad'>
                <label className="label" htmlFor='#siteID_API'>
                  <b>
                    Site <span className="red">*</span>
                    <i
                      className='fas fa-question-circle'
                      data-tip='Study Centre'
                    ></i>
                  </b>
                </label>
                <div className='comboField'>
                  <SelectInput id='siteID_API'
                    name='siteID_API'
                    label=''
                    required={true}
                    value={state.siteID}
                    emptyOption={manualOption}
                    options={arrayToObject(siteOptions)}
                    onUserInput={onUserInput}
                  />
                  {!state.siteID_API &&
                    <TextInput id='siteID_Manual'
                      name='siteID_Manual'
                      label=''
                      placeholder='n/a'
                      value={state.siteID}
                      onUserInput={onUserInput}
                    />
                  }
                </div>
              </div>
              <div className='small-pad'>
                <label className="label" htmlFor='#projectID_API'>
                  <b>
                    Project <span className="red">*</span>
                    <i
                      className='fas fa-question-circle'
                      data-tip='Study'
                    ></i>
                  </b>
                </label>
                <div className='comboField'>
                  <SelectInput id='projectID_API'
                    name='projectID_API'
                    label=''
                    required={true}
                    value={state.projectID}
                    emptyOption={manualOption}
                    options={arrayToObject(projectOptions)}
                    onUserInput={onUserInput}
                  />
                  {!state.projectID_API &&
                    <TextInput id='projectID_Manual'
                      name='projectID_Manual'
                      label=''
                      placeholder='n/a'
                      value={state.projectID}
                      onUserInput={onUserInput}
                    />
                  }
                </div>
              </div>
              <div className='small-pad'>
                <label className="label" htmlFor='#subprojectID_API'>
                  <b>
                    Subproject <span className="red">*</span>
                    <i
                      className='fas fa-question-circle'
                      data-tip='Subproject or population cohort'
                    ></i>
                  </b>
                </label>
                <div className='comboField'>
                  <SelectInput id='subprojectID_API'
                    name='subprojectID_API'
                    label=''
                    required={true}
                    value={state.subprojectID}
                    emptyOption={manualOption}
                    options={arrayToObject(subprojectOptions)}
                    onUserInput={onUserInput}
                  />
                  {!state.subprojectID_API &&
                    <TextInput id='subprojectID_Manual'
                      name='subprojectID_Manual'
                      label=''
                      placeholder='n/a'
                      value={state.subprojectID}
                      onUserInput={onUserInput}
                    />
                  }
                </div>
              </div>
            </>
          }
          <div className='small-pad'>
            <label className="label" htmlFor='#session_API'>
              <b>
                Session <span className="red">*</span>
                <i
                  className='fas fa-question-circle'
                  data-tip='Visit or TimePoint Label'
                ></i>
              </b>
              {state.LORIScompliant &&
                <div><small>(LORIS Visit Label)</small></div>
              }
            </label>
            <div className='comboField'>
              {state.LORIScompliant &&
                <SelectInput id='session_API'
                  name='session_API'
                  label=''
                  required={true}
                  value={state.session}
                  emptyOption={manualOption}
                  options={arrayToObject(sessionOptions)}
                  onUserInput={onUserInput}
                />
              }
              {!state.session_API &&
                <TextInput id='session_Manual'
                  name='session_Manual'
                  label=''
                  required={!state.LORIScompliant}
                  value={state.session}
                  bannedCharacters={['-', '_', ' ', '/']}
                  onUserInput={onUserInput}
                />
              }
            </div>
          </div>
        </div>
        <div className='info half'>
          <div className='small-pad'>
            <TextareaInput id='reference'
              name='reference'
              required={true}
              label='Reference'
              value={state.reference}
              onUserInput={onUserInput}
              help='See BIDS specification for more information'
            />
          </div>
          <div className='small-pad'>
            <SelectInput id='lineFreq'
              name='lineFreq'
              label='Powerline Frequency'
              value={state.lineFreq}
              emptyOption='n/a'
              options={{
                '50': '50',
                '60': '60',
              }}
              onUserInput={onUserInput}
              help='See BIDS specification for more information'
            />
          </div>
          <div className='small-pad'>
            <SelectInput id='recordingType'
              name='recordingType'
              label='Recording Type'
              value={state.recordingType}
              emptyOption='n/a'
              options={{
                'continuous': 'Continuous',
                'discontinuous': 'Discontinuous',
                'epoched': 'Epoched',
              }}
              onUserInput={onUserInput}
              help='See BIDS specification for more information'
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default RecordingDetails;
