import React from 'react';
import PropTypes from 'prop-types';

/**
 * DeIdentifier - the de-identifier component.
 * @param {object} props
 * @return {JSX.Element}
 */
const DeIdentifier = (props) => {
  return props.visible ? (
    <>
      <div style={{
        fontSize: '20px',
        textAlign: 'center',
        verticalAlign: 'middle',
        cursor: 'default',
        padding: '20px',
      }}>
        de-identifier
      </div>
      <div style={{backgroundColor: '#039b83', padding: '14px'}}>
        ...
      </div>
    </>
  ) : null;
};
DeIdentifier.propTypes = {
  visible: PropTypes.bool,
};

export default DeIdentifier;
