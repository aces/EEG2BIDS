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
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return props.visible ? (
    <>
      <span className={'title'}>
        Welcome to <b>pyCat!</b>
      </span>
      <div className={'info'}>
        <p className={'font-large'}>Hello user,</p>
        <p className={'font-medium'}><b>pyCat</b>&nbsp;
          is a simple tool for de-identification of iEEG datasets.
          In addition to de-identifying iEEG files, this tool contains a feature
          that allows mapping the LORIS candidate's information to its
          study identifier.
        </p>
        <p>
          <b>The Configuration tab allows to:</b>
        </p>
        <ul>
          <li>todo ...</li>
          <li>todo ...</li>
          <li>todo ...</li>
        </ul>
        <p>
          <b>The iEEG to BIDS tab allows to:</b>
        </p>
        <ul>
          <li>todo ...</li>
          <li>todo ...</li>
        </ul>
        <p>
          <b>The Validator tab allows to:</b>
        </p>
        <ul>
          <li>todo ...</li>
        </ul>
        <p className={'font-medium'}>
          You may begin your task by following the menu above.
          Please remember to always backup your data!
        </p>
      </div>
    </>
  ) : null;
};
Welcome.propTypes = {
  visible: PropTypes.bool,
};

export default Welcome;
