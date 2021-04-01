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
        <p className={'font-large'}>Hello,</p>
        <p className={'font-medium'}><b>pyCat</b>&nbsp;
          is a simple tool for de-identification of EDF datasets and conversion to a BIDS-compliant file structure for data sharing.
        </p>
        <p>
          This software is designed to run on EDF data (EEG or iEEG) for one subject at a time, including task events.
          Study information such as a LORIS ProjectID and Visit Label can be included in the subject metadata.
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
          <li>Select the data file, events file (events.tsv), and output folder</li>
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
          <li>Automatically validates the resulting BIDS output folder</li>
          <li>Compresses the BIDS output folder</li>
        </ul>
        <p className={'font-medium'}>    
          - Important - Please back up your data before beginning.
        </p>
      </div>
      <div>
        {/*<input value={'Settings'} type={'button'} onClick={openSettings}/>*/}
      </div>
      <div className={'footer'}>
        Powered by <a className={'open-source'} onClick={openGitHub}>
        open source software</a> and the LORIS team at the Montreal Neurological Institute-Hospital.<br/>
        v0.0.1 Copyright © 2021 MCIN.
      </div>
    </>
  ) : null;
};
Welcome.propTypes = {
  visible: PropTypes.bool,
};

export default Welcome;
