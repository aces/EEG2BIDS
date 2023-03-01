import React, {useContext} from 'react';
import PropTypes from 'prop-types';
import '../css/Welcome.css';
import {AuthenticationCredentials} from './elements/authentication';
import {name, version} from '../../package.json';
import {AppContext} from '../context';

/**
 * Welcome - the Getting started component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Welcome = (props) => {
  const {setState} = useContext(AppContext);
  /**
   * openGitHub - Navigate browser to EEG2BIDS Wizard.
   */
  const openGitHub = () => {
    const myAPI = window['myAPI'];
    myAPI.visitGitHub();
  };
  /**
   * openGitHub - Navigate browser to EEG2BIDS Wizard.
   */
  const openIssues = () => {
    const myAPI = window['myAPI'];
    myAPI.visitIssues();
  };
  /**
   * openMNE - Navigate browser to MNE.
   */
  const openMNE = () => {
    const myAPI = window['myAPI'];
    myAPI.visitMNE();
  };
  /**
   * openMCIN - Navigate browser to MCIN.
   */
  const openMCIN = () => {
    const myAPI = window['myAPI'];
    myAPI.visitMCIN();
  };

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return props.visible ? (
    <>
      <span className='title'>
        Welcome to <b>EEG2BIDS Wizard</b>
      </span>
      <div className='info'>
        <AuthenticationCredentials
          title='Login to LORIS'
          show={true}
          close={() => setState({appMode: 'Configuration'})}
          width='500px'
        />
      </div>
      <div className='footer'>
        Powered by <a className='open-source' onClick={openGitHub}>
          open source software
        </a> and <a className='open-source' onClick={openMNE}>
          MNE-BIDS
        </a>.<br/>
        <a className='open-source' onClick={openIssues}>
          Contact us
        </a> with your feedback.<br/>
        {name} v{version}
         - Copyright © 2021 <a className='mcin' onClick={openMCIN}>
        MCIN</a>.
      </div>
    </>
  ) : null;
};
Welcome.propTypes = {
  visible: PropTypes.bool,
};

export default Welcome;
