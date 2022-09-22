import React, {useState, useEffect, useContext} from 'react';
import {AppContext} from '../../context';
import PropTypes from 'prop-types';
import styles from '../../css/Authentication.module.css';

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
  // React Context
  const appContext = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  const defaultLoginMessage = 'You are not logged into a LORIS Account';
  // React state
  const [loginMessage, setLoginMessage] = useState(defaultLoginMessage);

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(async () => {
    const myAPI = window['myAPI'];
    const credentials = await myAPI.getLorisAuthenticationCredentials();
    if (credentials &&
      credentials.lorisURL &&
      credentials.lorisUsername
    ) {
      appContext.setTask('lorisURL', credentials.lorisURL);
      appContext.setTask('lorisUsername', credentials.lorisUsername);
    }
  }, []);

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(async () => {
    if (socketContext) {
      socketContext.on('loris_login_response', (data) => {
        if (data.error) {
          setLoginMessage(defaultLoginMessage);
        } else {
          setLoginMessage(
              `LORIS account: ${data.lorisURL.replace(/^https?:\/\//, '')} |
              ${data.lorisUsername}`,
          );
        }
      });
    }
  }, [socketContext]);

  /**
   * User clicked sign in..
   */
  const handleClick = () => {
    props.setAuthCredentialsVisible(true);
  };
  return (
    <div className={styles.authMessageContainer}>
      <span className={styles.loginMessage}>
        {loginMessage}
      </span>
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
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(async () => {
    const myAPI = window['myAPI'];
    const credentials = await myAPI.getLorisAuthenticationCredentials();
    setLorisURL(credentials.lorisURL);
    setLorisUsername(credentials.lorisUsername);
  }, []);

  useEffect(async () => {
    if (socketContext) {
      socketContext.on('loris_login_response', (data) => {
        if (data.error) {
          setError(true);
          setErrorMessage(data.error);
        } else {
          setError(false);
          setErrorMessage('');
          props.close(true);
        }
      });
    }
  }, [socketContext]);

  /**
   * handleClear - Close the Authentication Credentials
   *   but first update (?new) credentials.
   */
  const handleClear = () => {
    const myAPI = window['myAPI'];
    myAPI.removeLorisAuthenticationCredentials();
    setLorisURL('');
    setLorisUsername('');
    setLorisPassword('');
  };

  /**
   * handleClose - Close the Authentication Credentials
   *   but first update (?new) credentials.
   */
  const handleClose = () => {
    const myAPI = window['myAPI'];
    const credentials = {
      lorisURL: lorisURL,
      lorisUsername: lorisUsername,
      lorisPassword: lorisPassword,
    };
    if (credentials &&
      credentials.lorisURL &&
      credentials.lorisUsername &&
      credentials.lorisPassword
    ) {
      const storeFields = {
        lorisURL: credentials.lorisURL,
        lorisUsername: credentials.lorisUsername,
        lorisPassword: 'password',
      };
      myAPI.setLorisAuthenticationCredentials(storeFields);
      socketContext.emit('set_loris_credentials', credentials);
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
    // Update the 'task' of app context.
    appContext.setTask(name, value);
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
          value='Clear'
          onClick={handleClear}
          className={styles.authClearButton}/>
        <input
          type='button'
          value='Submit'
          onClick={handleClose}
          className={styles.authSubmitButton}/>
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
