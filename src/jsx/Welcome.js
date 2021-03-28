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
        Welcome to <b>pyCat!</b>
      </span>
      <div className={'info'}>
        <p className={'font-large'}>Hello,</p>
        <p className={'font-medium'}><b>pyCat</b>&nbsp;
          is a simple tool for de-identification of EDF datasets and conversion to a BIDS-compliant file structure.
          It's designed to runs on EDF data (EEG or iEEG) for one subject at a time, to prepare data for data sharing.<br>
     <!-- not until phase2:  This tool also allows mapping the LORIS candidate's information to its
          study identifier. -->
        <ul>
           <li>
              For more information about BIDS, visit: <a href="https://bids.neuroimaging.io/">bids.neuroimaging.io</a>
           </li>
        </ul>
        </p>
        <p>
          Follow the sequence of tabs to prepare your dataset: 
        </p>
        <p>
          <b>Configuration tab:</b>
        </p>
        <ul>
          <li>Select the dataset and output directory</li>
          <li>Set metadata values and upload task events</li>
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
          <li>Automatically validates the resulting BIDS structure</li>
          <li>Compresses the BIDS structure</li>
        </ul>
        <p className={'font-medium'}>    
          Important : Please back up your data before beginning.
        </p>
      </div>
      <div>
        {/*<input value={'Settings'} type={'button'} onClick={openSettings}/>*/}
      </div>
      <div className={'footer'}>
        Powered by <a className={'open-source'} onClick={openGitHub}>
        open source software</a> and the <a href="http://loris.ca">LORIS team</a> at the Montreal Neurological Institute-Hospital.<br/>
        Copyright © 2021 <a href="http://mcin.ca">MCIN</a>.
      </div>
    </>
  ) : null;
};
Welcome.propTypes = {
  visible: PropTypes.bool,
};

export default Welcome;
