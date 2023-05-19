import React, {useState, useEffect, useContext} from 'react';
import PropTypes from 'prop-types';
import styles from '../../css/Authentication.module.css';

import {AppContext} from '../../context';
// Socket.io
import {SocketContext} from '../socket.io';

/**
 * PasswordInput - the input type='text' component.
 * @param {object} props
 * @return {JSX.Element}
 */
const PasswordInput = (props) => {
  const [hidden, setHidden] = useState(true);
  /**
   * handleChange - input change by user.
   * @param {object} event - input event
   */
  const handleChange = (event) => {
    props.onUserInput(props.id, event.target.value);
  };
  /**
   * handleVisibility - handles visibility of password.
   */
  const handleVisibility = () => {
    setHidden(!hidden);
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <div style={{
      width: '400px',
      height: '20px',
      position: 'relative',
      marginBottom: '50px',
    }}>
      <input
        type={hidden ? 'password' : 'text'}
        id={props.id}
        name={props.name}
        value={props.value}
        onChange={handleChange}
        className={styles.input}
        placeholder={props.placeholder}
      />
      {props.label &&
        <label className={styles.label}
          htmlFor={props.id}>
          {props.label}
        </label>
      }
      <span
        className={styles['eye-' + (hidden ? 'close' : 'open')]}
        onClick={handleVisibility}
      />
    </div>
  );
};
PasswordInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.string,
  onUserInput: PropTypes.func,
  placeholder: PropTypes.string,
};

/**
 * AuthInput - the input type='text' component.
 * @param {object} props
 * @return {JSX.Element}
 */
const AuthInput = (props) => {
  /**
   * handleChange - input change by user.
   * @param {object} event - input event
   */
  const handleChange = (event) => {
    props.onUserInput(props.id, event.target.value);
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <div style={{
      width: '400px',
      height: '20px',
      position: 'relative',
      marginBottom: '50px',
    }}>
      <input
        type='text'
        id={props.id}
        name={props.name}
        value={props.value}
        onChange={handleChange}
        className={styles.input}
        placeholder={' '}
      />
      {props.label &&
        <label className={styles.label}
          htmlFor={props.id}>
          {props.label}
        </label>
      }
    </div>
  );
};
AuthInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  onUserInput: PropTypes.func,
  placeholder: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
};

export const AuthenticationMessage = (props) => {
  const {state, setState} = useContext(AppContext);

  /**
   * Signout and reset credentials.
   */
  const signout = () => {
    window['myAPI'].removeLorisAuthenticationCredentials();
    setState({isAuthenticated: false});
    setState({lorisUsername: ''});
    setState({lorisUrl: ''});
    setState({appMode: 'Welcome'});
  };

  return (
    <div className={styles.authMessageContainer}>
      <span className={styles.loginMessage}>
        {state.lorisURL && state.lorisUsername ?
          <>
            LORIS account:
            {state.lorisURL
                .replace(/^https?:\/\//, '')
                .replace(/\/$/, '')
            }
            | {state.lorisUsername}
          </> : <>You are not logged into a LORIS Account</>
        }
      </span>
      {state.isAuthenticated && <input
        type='button'
        value='Sign out'
        onClick={signout}
        className={styles.authSignoutButton}
      />}
    </div>
  );
};

export const AuthenticationCredentials = (props) => {
  // React Context
  const socketContext = useContext(SocketContext);
  const {setState} = useContext(AppContext);

  // React state
  const [lorisURL, setLorisURL] = useState('');
  const [lorisUsername, setLorisUsername] = useState('');
  const [lorisPassword, setLorisPassword] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCredentialsLoaded, setIsCredentialsLoaded] = useState(false);

  const getSavedCredentials = async () => {
    if (isCredentialsLoaded) return;

    const credentials =
      await window['myAPI'].getLorisAuthenticationCredentials();

    credentials?.lorisURL &&
      setLorisURL(credentials.lorisURL);
    credentials?.lorisUsername &&
      setLorisUsername(credentials.lorisUsername);

    // Check if token exists
    if (credentials?.lorisToken) {
      socketContext.emit('set_loris_credentials', {
        lorisURL: credentials.lorisURL,
        lorisUsername: credentials.lorisUsername,
        lorisToken: credentials.lorisToken,
      });
    }
    setIsCredentialsLoaded(true);
  };

  useEffect(() => {
    setState({isAuthenticated: false});
  }, []);

  useEffect(async () => {
    if (socketContext) {
      socketContext.on('loris_login_response', (data) => {
        if (data.error) {
          setError(true);
          setErrorMessage(data.error);
          setState({isAuthenticated: false});
          setState({lorisURL: ''});
          setState({lorisUsername: ''});
        } else {
          setError(false);
          setErrorMessage('');
          setState({appMode: 'Configuration'});
          setState({isAuthenticated: true});
          setState({lorisURL: data.lorisURL});
          setState({lorisUsername: data.lorisUsername});

          window['myAPI'].setLorisAuthenticationCredentials({
            lorisURL: data.lorisURL,
            lorisUsername: data.lorisUsername,
            lorisToken: data.lorisToken,
          });
        }
      });

      getSavedCredentials();
    }
  }, [socketContext]);

  /**
   * onSubmit - Update (?new) credentials and login
   */
  const onSubmit = () => {
    if (lorisURL && lorisUsername && lorisPassword) {
      socketContext.emit('set_loris_credentials', {
        lorisURL: lorisURL,
        lorisUsername: lorisUsername,
        lorisPassword: lorisPassword,
      });
    }
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
  };

  return (
    <div className={styles.authCredentialsContent}>
      {error && (<div className={styles.authError}>
        {errorMessage}
      </div>)}
      <AuthInput id='lorisURL'
        name='lorisURL'
        label='LORIS URL: (Example: https://demo.loris.ca)'
        placeholder='Example: https://demo.loris.ca'
        value={lorisURL}
        onUserInput={onUserInput}
      />
      <AuthInput id='lorisUsername'
        name='lorisUsername'
        label='Username'
        placeholder='Username'
        value={lorisUsername}
        onUserInput={onUserInput}
      />
      <PasswordInput id='lorisPassword'
        name='lorisPassword'
        label='Password'
        placeholder=' '
        value={lorisPassword}
        onUserInput={onUserInput}
      />
      <div className={styles.authSubmitContainer}>
        <input
          type='button'
          value='Submit'
          onClick={onSubmit}
          className={styles.authSubmitButton}/>
      </div>
    </div>
  );
};

export default {
  AuthenticationMessage,
  AuthenticationCredentials,
};
