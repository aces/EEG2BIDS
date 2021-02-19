import React from 'react';
import PropTypes from 'prop-types';
import '../css/SplashScreen.css';

/**
 * SplashScreen - the splash screen animation.
 * @param {object} props
 * @return {JSX.Element} - Loader React component
 */
const SplashScreen = (props) => {
  return props.visible ? (
    <>
      <p className={'loader-font'}>
        PyCat is loading ...
      </p>
      <div
        className={'loader centered'}
        style={{width: parseInt(props.size), height: parseInt(props.size)}}
      />
    </>
  ) : null;
};
SplashScreen.propTypes = {
  size: PropTypes.string,
  visible: PropTypes.bool,
};
SplashScreen.defaultProps = {
  size: '60',
};

export default SplashScreen;
