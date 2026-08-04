import React from 'react';
import PropTypes from 'prop-types';
import '../css/SplashScreen.css';

/**
 * SplashScreen - the splash screen animation.
 * @param {object} props
 * @return {JSX.Element} - Loader React component
 */
const SplashScreen = ({size = '60', visible}) => {
  // React 19 ignores defaultProps on function components, so the fallback
  // lives in the parameter default; without it parseInt(undefined) is NaN,
  // which React rejects as a width/height style value.
  const loaderDimensions = {
    width: parseInt(size),
    height: parseInt(size),
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return visible ? (
    <>
      <p className='loader-font'>
        EEG2BIDS Wizard is loading ...
      </p>
      <span
        className='loader centered'
        style={loaderDimensions}
      />
    </>
  ) : null;
};
SplashScreen.propTypes = {
  size: PropTypes.string,
  visible: PropTypes.bool,
};

export default SplashScreen;
