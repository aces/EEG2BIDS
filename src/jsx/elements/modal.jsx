import React from 'react';
import '../../css/Modal.css';

export const MODAL_TITLES = {
  loading: '⏱ Task in Progress!',
  success: '⭐ Task Finished!',
  error: '❌ Task Error!',
};

const Modal = ({show, title, close, width = '500px', children}) => {
  const styleVisible = {visibility: show ? 'visible' : 'hidden'};
  return (
    <div className='modalOverlay' style={styleVisible}>
      <div className='modalContainer' style={styleVisible}>
        <div className='modalAnimation' style={{width}}>
          <div className='modalDialog' style={{
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(-25%)',
          }}>
            <span className='modalHeader'>
              {title}
              <span className='modalHeaderClose' onClick={close}>×</span>
            </span>
            <div className='modalContent'>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Modal;
