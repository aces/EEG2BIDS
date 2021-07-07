import React, {useState} from 'react';
import PropTypes from 'prop-types';
import styles from '../../css/Help.module.css';

/**
 * HelpModel - the help model component.
 * @param {object} props
 * @return {JSX.Element}
 */
const HelpModel = (props) => {
  /**
   * handleClose - close the Modal.
   */
  const handleClose = () => {
    props.close(true);
  };
  const styleVisible = {visibility: props.visible ? 'visible' : 'hidden'};
  const styleAnimation = {width: props.width ? props.width : 'auto'};
  const styleContainer = {
    opacity: props.visible ? 1 : 0,
    transform: props.visible ? 'translateY(0)' : 'translateY(-25%)',
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <div className={styles.modalOverlay}
      style={styleVisible}>
      <div className={styles.modalContainer}
        style={styleVisible}>
        <div className={styles.modalAnimation}
          style={styleAnimation}>
          <div className={styles.modalDialog}
            style={styleContainer}>
            <span className={styles.modalHeader}>
              {props.title}
              <span className={styles.modalHeaderClose}
                onClick={handleClose}>
                ×
              </span>
            </span>
            <div className={styles.modalContent}>
              {props.children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
HelpModel.propTypes = {
  close: PropTypes.func,
  visible: PropTypes.bool,
};

/**
 * Help - the help component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Help = (props) => {
  const [visible, setVisible] = useState(false);
  /**
   * handleClick - user clicked for help!
   * @param {object} event - input event
   */
  const handleClick = (event) => {
    setVisible(true);
  };
  /**
   * hideModal - display Modal.
   * @param {boolean} hidden
   */
  const hideModal = (hidden) => {
    setVisible(!hidden);
  };
  const modes = {
    Welcome: <>
      <h3>1) Getting started</h3>
      <p>Navigate using the menu to 2) Configuration and begin!</p>
    </>,
    Configuration: <>
      <h3>2) Configuration</h3>
      The LORIS login is optional and allows the following:
      <ul>
        <li>Safely store LORIS credentials in EEG2BIDS</li>
        <li>Automatically retrieve LORIS data in Configuration</li>
        <li>
          LORIS credentials are deleted by clearing the username and password!
        </li>
      </ul>
    </>,
    Converter: <>
      <h3>3) EDF to BIDS</h3>
      <p>Create your BIDS output if your configuration is correct!</p>
    </>,
    Validator: <>
      <h3>4) Validator</h3>
      <p>Validate the BIDS output and then compress it for storage!</p>
    </>,
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return props.visible ? (
    <>
      <div className={styles.root} onClick={handleClick}>
        <span>?</span>
      </div>
      <HelpModel visible={visible} close={hideModal}>
        {modes[props.activeMode]}
      </HelpModel>
    </>
  ) : null;
};
Help.defaultProps = {
  activeMode: 'Welcome',
};
Help.propTypes = {
  visible: PropTypes.bool,
  activeMode: PropTypes.string,
};

export default Help;
