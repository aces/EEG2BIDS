import React from 'react';
import PropTypes from 'prop-types';
import '../css/Welcome.css';

/**
 * Welcome - the Getting started component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Welcome = (props) => {
  /**
   * openGitHub - Navigate browser to pycat.
   */
  const openGitHub = () => {
    const myAPI = window['myAPI'];
    myAPI.visitGitHub();
  };
  /**
   * openMCIN - Navigate browser to MCIN.
   */
  const openMCIN = () => {
    const myAPI = window['myAPI'];
    myAPI.visitMCIN();
  };
  /**
   * openSettings - Open pycat settings.
   */
  const openSettings = () => {
    const myAPI = window['myAPI'];
    myAPI.openSettings();
  };

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return props.visible ? (
    <>
      <span className={'title'}>
        Welcome to <b>pyCat</b>
      </span>
      <div className={'info'}>
        <p><b>pyCat</b>&nbsp;
          is a tool for de-identification of EDF data and conversion to BIDS
          &nbsp;format for data sharing.
        </p>
        <p>
          This software is designed to run on EDF files (EEG or iEEG) for
          &nbsp;one subject at a time. Events and metadata such as a
          &nbsp;LORIS ProjectID and Visit Label can be included.
        </p>
        <ul>
          <li>
            For more information about BIDS, visit bids.neuroimaging.io
          </li>
        </ul>
        <p>
          Follow the sequence of tabs to prepare your dataset:
        </p>
        <p>
          <b>Configuration tab:</b>
        </p>
        <ul>
          <li>Select the data file, events file (events.tsv), and output&nbsp;
            folder
          </li>
          <li>Set metadata values</li>
          <li>Anonymize the EDF header data</li>
        </ul>
        <p>
          <b>EDF to BIDS tab:</b>
        </p>
        <ul>
          <li>Review your configurations</li>
          <li>Review metadata values</li>
          <li>Review your EDF header data</li>
        </ul>
        <p>
          <b>Validator tab:</b>
        </p>
        <ul>
          <li>Validate the resulting BIDS output folder</li>
          <li>Compress the BIDS output folder</li>
        </ul>
        <p>
          - Important - Please back up your data before beginning.
        </p>
      </div>
      <div>
        {/*<input value={'Settings'} type={'button'} onClick={openSettings}/>*/}
      </div>
      <div className={'footer'}>
        Powered by <a className={'open-source'} onClick={openGitHub}>
        open source software</a>.<br/>
        Copyright © 2021 <a className={'mcin'} onClick={openMCIN}>
        MCIN</a>.
      </div>
    </>
  ) : null;
};
Welcome.propTypes = {
  visible: PropTypes.bool,
};

export default Welcome;
