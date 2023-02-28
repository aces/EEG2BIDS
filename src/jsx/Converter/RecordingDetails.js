import React, {useContext} from 'react';
import {AppContext} from '../../context';

/**
 * Recording Data - the Recording Data component.
 * @return {JSX.Element}
 */
const RecordingDetails = () => {
  const {state, setState} = useContext(AppContext);

  const validateTask = () => {
    if (!state.taskName) {
      return ({
        status: 'error',
        msg: 'Task Name is not specified',
      });
    }
    return ({
      status: 'pass',
      msg: `Task Name: ${state.taskName}`,
    });
  };

  const validateSiteID = () => {
    if (!state.siteID) {
      return ({
        status: 'error',
        msg: 'Site is not specified',
      });
    }
    return ({
      status: 'pass',
      msg: `Site: ${state.siteID}`,
    });
  };

  const validateProjectID = () => {
    if (!state.projectID) {
      return ({
        status: 'error',
        msg: 'Project is not specified',
      });
    }
    return ({
      status: 'pass',
      msg: `Project: ${state.projectID}`,
    });
  };

  const validateSubprojectID = () => {
    if (!state.subprojectID) {
      return ({
        status: 'error',
        msg: 'Subproject is not specified',
      });
    }
    return ({
      status: 'pass',
      msg: `Subproject: ${state.subprojectID}`,
    });
  };

  const validateSession = () => {
    if (!state.session) {
      return ({
        status: 'error',
        msg: 'Session is not specified',
      });
    }

    if (state.session.indexOf(' ') >= 0 || state.session.indexOf('-') >= 0) {
      return ({
        status: 'error',
        msg: 'Session is containing a dash/space.',
      });
    }

    return ({
      status: 'pass',
      msg: `Session: ${state.session}`,
    });
  };

  const validateLineFreq = () => {
    if (!state.lineFreq) {
      return ({
        status: 'warning',
        msg: 'Powerline frequency is not specified',
      });
    }
    return ({
      status: 'pass',
      msg: `Powerline Frequency: ${state.lineFreq}`,
    });
  };

  const validateReference = () => {
    if (!state.reference) {
      return ({
        status: 'error',
        msg: 'Reference is not specified',
      });
    }
    return ({
      status: 'pass',
      msg: `Reference: ${state.reference}`,
    });
  };

  const results = [
    validateTask(),
    ...state.LORIScompliant ?
      [
        validateSiteID(),
        validateProjectID(),
        validateSubprojectID(),
      ] : [],
    validateSession(),
    validateLineFreq(),
    validateReference(),
  ];

  return (
    <div className='small-pad'>
      <b>Review your recording details:</b>
      <div>{results.map((result, key) =>
        <div key={key}>
          <span className={result.status}>{result.msg}</span>
        </div>,
      )}</div>
    </div>
  );
};

export default RecordingDetails;
