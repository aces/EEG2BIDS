import React from 'react';
import PropTypes from 'prop-types';
import '../../css/Modal.css';

const Modal = (props) => {
  /**
   * handleClose - close the Modal.
   */
  const handleClose = () => {
    props.close(true);
  };
  const styleVisible = {visibility: props.show ? 'visible' : 'hidden'};
  const styleAnimation = {width: props.width ? props.width : 'auto'};
  const styleContainer = {
    opacity: props.show ? 1 : 0,
    transform: props.show ? 'translateY(0)' : 'translateY(-25%)',
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <div className='modalOverlay'
      style={styleVisible}>
      <div className='modalContainer'
        style={styleVisible}>
        <div className='modalAnimation'
          style={styleAnimation}>
          <div className='modalDialog'
            style={styleContainer}>
            <span className='modalHeader'>
              {props.title}
              <span className='modalHeaderClose'
                onClick={handleClose}>
                ×
              </span>
            </span>
            <div className='modalContent'>
              {props.children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
Modal.propTypes = {
  show: PropTypes.bool.isRequired,
  close: PropTypes.func.isRequired,
  width: PropTypes.string,
  title: PropTypes.string,
  children: PropTypes.node,
};
Modal.defaultProps = {
  width: null,
  title: null,
  children: null,
};

export default Modal;
