import React from 'react';
import PropTypes from 'prop-types';

export const Authentication = (props) => {
  const handleClick = () => {
    // Send current file to parent component
  };
  return (
    <>
      <button
        onClick={handleClick}
      >
        Login
      </button>
    </>
  );
};
Authentication.propTypes = {
  onUserInput: PropTypes.func,
};

export default {
  Authentication,
};
