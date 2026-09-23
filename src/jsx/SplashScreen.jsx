import React from 'react';
import '../css/SplashScreen.css';

/**
 * SplashScreen - the splash screen animation.
 * @param {object} props
 * @param {boolean} props.visible
 * @return {JSX.Element} - Loader React component
 */
const SplashScreen = ({visible}) => visible ? (
  <>
    <p className='loader-font'>
      EEG2BIDS Wizard is loading ...
    </p>
    <span className='loader centered'/>
  </>
) : null;

export default SplashScreen;
