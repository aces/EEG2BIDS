import React, {useContext, useEffect} from 'react';
import {AppContext} from '../context';
import PropTypes from 'prop-types';
import '../css/SplashScreen.css';

/**
 * SplashScreen - the splash screen animation.
 * @param {object} props
 * @return {JSX.Element} - Loader React component
 */
const SplashScreen = (props) => {
  const {setState} = useContext(AppContext);

  const loaderDimensions = {
    width: parseInt(props.size),
    height: parseInt(props.size),
  };

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    props.visible && setTimeout(
        () => {
          setState({appMode: 'Welcome'});
        }, 1500,
    );
  }, [props.visible]);

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <div style={{display: props.visible ? 'block' : 'none'}}>
      <p className='loader-font'>
        EEG2BIDS Wizard is loading ...
      </p>
      <span
        className='loader centered'
        style={loaderDimensions}
      />
    </div>
  );
};

SplashScreen.propTypes = {
  size: PropTypes.string,
  visible: PropTypes.bool,
};

SplashScreen.defaultProps = {
  size: '60',
};

export default SplashScreen;
