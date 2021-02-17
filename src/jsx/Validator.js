import React from 'react';
import PropTypes from 'prop-types';

/**
 * Validator - the validator component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Validator = (props) => {
  return props.visible ? (
    <>
      <div style={{
        fontSize: '20px',
        textAlign: 'center',
        verticalAlign: 'middle',
        cursor: 'default',
        padding: '20px',
      }}>
        Validation confirmation
      </div>
      <div style={{backgroundColor: '#039b83', padding: '14px'}}>
        ...
      </div>
    </>
  ) : null;
};
Validator.propTypes = {
  visible: PropTypes.bool,
};

export default Validator;
