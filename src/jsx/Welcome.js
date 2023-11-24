import React from 'react';
import PropTypes from 'prop-types';
import '../css/Welcome.css';
import {AuthenticationCredentials} from './elements/authentication';
import {name, version} from '../../package.json';

/**
 * Welcome - the Getting started component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Welcome = (props) => {
  /**
   * openBIDS - Navigate browser to SET2BIDS Wizard.
   */
  const openBIDS = () => {
    const myAPI = window['myAPI'];
    myAPI.visitBIDS();
  };
  /**
   * openGitHub - Navigate browser to SET2BIDS Wizard.
   */
  const openGitHub = () => {
    const myAPI = window['myAPI'];
    myAPI.visitGitHub();
  };
  /**
   * openGitHub - Navigate browser to SET2BIDS Wizard.
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

  return (
    <div style={{
      display: props.visible ? 'block' : 'none',
    }}>
      <span className='title'>
        Welcome to <b>SET2BIDS Wizard</b>
      </span>
      <div className='info' style={{display: 'flex'}}>
        <div className='info' style={{
          justifyContent: 'center',
          margin: '0 auto',
        }}>
          <p>
            <b>SET2BIDS Wizard</b> is a tool for de-identification of EEG data
            and conversion to BIDS format for data sharing.
          </p>
          <p>This software is designed to run on EEGLAB files
            (EEG or stereo iEEG) for one recording from one subject at a time.
            Events and metadata such as a LORIS ProjectID and Visit Label
            can be included.
          </p>
          <p>For more information about BIDS, visit <a
            className='open-source' onClick={openBIDS}>
              bids.neuroimaging.io
          </a></p>
          <p>
            - Important - Please back up your data before beginning.
          </p>
        </div>
        <div className='footer'>
          Powered by
          <a className='open-source' onClick={openGitHub}>
            open source software
          </a> and
          <a className='open-source' onClick={openMNE}>
            MNE-BIDS
          </a>.<br/>
          <a className='open-source' onClick={openIssues}>
            Contact us
          </a> with your feedback.<br/>
          Copyright © 2021 <a className='mcin' onClick={openMCIN}>
          MCIN</a>.
        </div>
        <AuthenticationCredentials/>
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
    </div>
  );
};
Welcome.propTypes = {
  visible: PropTypes.bool,
};

export default Welcome;
