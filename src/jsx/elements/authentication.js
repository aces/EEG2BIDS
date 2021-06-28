import React, {useState, useEffect, useContext} from 'react';
import {AppContext} from '../../context';
import PropTypes from 'prop-types';
import '../../css/Authentication.css';

// Socket.io
import {SocketContext} from '../socket.io';

// Components
import {
  TextInput,
} from './inputs';

export const AuthenticationMessage = (props) => {
  // React Context
  const appContext = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  // React state
  const [loginMessage, setLoginMessage] = useState(
      'You are not logged in to LORIS Account',
  );
  const [loginLink, setLoginLink] = useState(
      'Log in...',
  );

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(async () => {
    const myAPI = window['myAPI'];
    const credentials = await myAPI.getLorisAuthenticationCredentials();
    if (credentials) {
      setLoginMessage(`LORIS Account set as ${credentials.lorisUsername}`);
      setLoginLink('Sign in to another account..');
      appContext.setTask('lorisURL', credentials.lorisURL);
      appContext.setTask('lorisUsername', credentials.lorisUsername);
      appContext.setTask('lorisPassword', credentials.lorisPassword);
      console.log('Check here 1:');
      console.log(appContext.getFromTask('lorisURL'));
      console.log(appContext.getFromTask('lorisUsername'));
      console.log(appContext.getFromTask('lorisPassword'));
    }
  }, []);

  /**
   * User clicked sign in..
   */
  const handleClick = () => {
    props.setAuthCredentialsVisible(true);
  };
  return (
    <div className='authMessageContainer'>
      <span className='loginMessage'>
        {loginMessage}
      </span>
      <a className='loginLink' onClick={handleClick}>
        &nbsp;&nbsp;&nbsp;&nbsp;{loginLink}
      </a>
    </div>
  );
};
AuthenticationMessage.propTypes = {
  onUserInput: PropTypes.func,
};

export const AuthenticationCredentials = (props) => {
  // React Context
  const appContext = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  // React state
  const [lorisURL, setLorisURL] = useState('');
  const [lorisUsername, setLorisUsername] = useState('');
  const [lorisPassword, setLorisPassword] = useState('');

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(async () => {
    const myAPI = window['myAPI'];
    const credentials = await myAPI.getLorisAuthenticationCredentials();
    setLorisURL(credentials.lorisURL);
    setLorisUsername(credentials.lorisUsername);
    setLorisPassword(credentials.lorisPassword);
  }, []);

  /**
   * Close the Authentication Credentials
   *   but first update (?new) credentials.
   */
  const handleClose = () => {
    const myAPI = window['myAPI'];
    myAPI.setLorisAuthenticationCredentials({
      lorisURL: lorisURL,
      lorisUsername: lorisUsername,
      lorisPassword: lorisPassword,
    });
    props.close(true);
  };

  /**
   * onUserInput - input change by user.
   * @param {string} name - element name
   * @param {object|string|boolean} value - element value
   */
  const onUserInput = (name, value) => {
    switch (name) {
      case 'lorisURL':
        setLorisURL(value);
        break;
      case 'lorisUsername':
        setLorisUsername(value);
        break;
      case 'lorisPassword':
        setLorisPassword(value);
        break;
    }
    // Update the 'task' of app context.
    appContext.setTask(name, value);
  };

  // Styling for rendering
  const styleVisible = {visibility: props.show ? 'visible' : 'hidden'};
  const styleAnimation = {width: props.width ? props.width : 'auto'};
  const styleContainer = {
    opacity: props.show ? 1 : 0,
    transform: props.show ? 'translateY(0)' : 'translateY(-25%)',
  };
  return (
    <div className='authCredentialsOverlay'
      style={styleVisible}>
      <div className='authCredentialsContainer'
        style={styleVisible}>
        <div className='authCredentialsAnimation'
          style={styleAnimation}>
          <div className='authCredentialsDialog'
            style={styleContainer}>
            <span className='authCredentialsHeader'>
              {props.title}
              <span className='authCredentialsHeaderClose'
                onClick={handleClose}>
                ×
              </span>
            </span>
            <div className='authCredentialsContent'>
              <TextInput id='lorisURL'
                name='lorisURL'
                required={true}
                label='URL of LORIS instance'
                placeholder='Example: https://loris.ca'
                value={lorisURL}
                onUserInput={onUserInput}
              />
              <TextInput id='lorisUsername'
                name='lorisUsername'
                required={true}
                label='Username'
                placeholder='Username'
                value={lorisUsername}
                onUserInput={onUserInput}
              />
              <TextInput id='lorisPassword'
                name='lorisPassword'
                required={true}
                label='Password'
                placeholder='Password'
                value={lorisPassword}
                onUserInput={onUserInput}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
AuthenticationCredentials.propTypes = {
  show: PropTypes.bool.isRequired,
  close: PropTypes.func.isRequired,
  width: PropTypes.string,
  title: PropTypes.string,
};
AuthenticationCredentials.defaultProps = {
  width: null,
  title: null,
};

export default {
  AuthenticationMessage,
  AuthenticationCredentials,
};
