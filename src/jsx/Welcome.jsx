import React from 'react';
import '../css/Welcome.css';

const open = (url) => () => window.eeg2bids.openExternal(url);

/**
 * Welcome - the Getting started component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Welcome = (props) => {
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
          <b>EEG2BIDS Wizard</b> converts continuous EEG and iEEG recordings to
          BIDS format for data sharing, and can de-identify EDF headers.
        </p>
        <p>
          This software converts continuous EEG or stereo-iEEG recordings
          (EDF and EEGLAB SET are the verified formats) for one recording from
          one subject at a time. Events and metadata such as a LORIS ProjectID
          and Visit Label can be included.
        </p>
        <ul>
          <li>
            For more information about BIDS, visit <a
              className='open-source'
              onClick={open('https://bids.neuroimaging.io')}>
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
          <b>Recording to BIDS tab:</b>
        </p>
        <ul>
          <li>Review your configurations</li>
          <li>Review metadata values</li>
          <li>Review your recording details</li>
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
        Powered by <a className='open-source'
          onClick={open('https://github.com/aces/eeg2bids')}>
          open source software
        </a> and <a className='open-source'
          onClick={open('https://mne.tools/mne-bids/')}>
          MNE-BIDS
        </a>.<br/>
        <a className='open-source'
          onClick={open('https://github.com/aces/eeg2bids/issues')}>
          Contact us
        </a> with your feedback.<br/>
        Copyright © 2021 <a className='open-source'
          onClick={open('https://mcin.ca')}>
        MCIN</a>.
      </div>
    </>
  ) : null;
};
export default Welcome;
