import React from 'react';
import PropTypes from 'prop-types';
import '../css/SplashScreen.css';

/**
 * Display the splash screen animation.
 * @param {object} props
 * @return {JSX.Element} - Loader React component
 */
const SplashScreen = (props) => {
  return (
    <>
      <p className={'loader-font'}>
        PyCat is loading ...
      </p>
      <div
        className={'loader centered'}
        style={{width: parseInt(props.size), height: parseInt(props.size)}}
      />
    </>
  );
};
SplashScreen.propTypes = {
  size: PropTypes.string,
};
SplashScreen.defaultProps = {
  size: '60',
};

export default SplashScreen;
