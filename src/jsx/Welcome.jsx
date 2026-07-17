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
   * openBIDS - Navigate browser to the BIDS specification.
   */
  const openBIDS = () => {
    window.eeg2bids.openExternal('https://bids.neuroimaging.io');
  };
  /**
   * openGitHub - Navigate browser to EEG2BIDS Wizard.
   */
  const openGitHub = () => {
    window.eeg2bids.openExternal('https://github.com/aces/eeg2bids');
  };
  /**
   * openIssues - Navigate browser to the EEG2BIDS issue tracker.
   */
  const openIssues = () => {
    window.eeg2bids.openExternal('https://github.com/aces/eeg2bids/issues');
  };
  /**
   * openMNE - Navigate browser to MNE.
   */
  const openMNE = () => {
    window.eeg2bids.openExternal('https://mne.tools/mne-bids/');
  };
  /**
   * openMCIN - Navigate browser to MCIN.
   */
  const openMCIN = () => {
    window.eeg2bids.openExternal('https://mcin.ca');
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
        <p>
          <b>EEG2BIDS Wizard</b> is a tool for de-identification of EDF data
          and conversion to BIDS format for data sharing.
        </p>
        <p>
          This software is designed to run on EDF files (EEG or stereo iEEG) for
          one recording from one subject at a time. Events and metadata such as
          a LORIS ProjectID and Visit Label can be included.
        </p>
        <ul>
          <li>
            For more information about BIDS, visit <a
              className='open-source' onClick={openBIDS}>
                bids.neuroimaging.io
            </a>
          </li>
        </ul>
        <p>
          Follow the sequence of tabs to prepare your dataset:
        </p>
        <p>
          <b>Configuration tab:</b>
        </p>
        <ul>
          <li>
            Select the data and metadata to be converted,
            and output folder.<br/>
            Note that only one <em>run</em> will be converted at a time
            by this tool, and this run can be split over several files.
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
          - Important - Please back up your data before beginning. <br/>
          You may wish to edit the dataset_description.json
          after generating your BIDS dataset.
        </p>
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
        Copyright © 2021 <a className='mcin' onClick={openMCIN}>
        MCIN</a>.
      </div>
    </>
  ) : null;
};
Welcome.propTypes = {
  visible: PropTypes.bool,
};

export default Welcome;
