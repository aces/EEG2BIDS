import React, {useState, useEffect, useContext} from 'react';
import PropTypes from 'prop-types';
import styles from '../../css/Authentication.module.css';
import {AppContext} from '../../context';
import {SocketContext} from '../socket.io';
import Switch from 'react-switch';

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
    props.onUserInput(props.name, event.target.value);
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
        id={props.name}
        name={props.name}
        value={props.value}
        onChange={handleChange}
        className={styles.input}
        placeholder={props.placeholder}
        disabled={props.disabled}
      />
      {props.label &&
        <label className={styles.label}
          htmlFor={props.name}>
          {props.label}
        </label>
      }
      <span
        className={
          `${styles.eye} ${styles['eye-' + (hidden ? 'close' : 'open')]}`
        }
        onClick={handleVisibility}
      />
    </div>
  );
};
PasswordInput.propTypes = {
  name: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.string,
  onUserInput: PropTypes.func,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
};
PasswordInput.defaultProps = {
  disabled: false,
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
    props.onUserInput(props.name, event.target.value);
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
        id={props.name}
        name={props.name}
        value={props.value}
        onChange={handleChange}
        className={styles.input}
        placeholder={' '}
        disabled={props.disabled}
      />
      {props.label &&
        <label className={styles.label}
          htmlFor={props.name}>
          {props.label}
        </label>
      }
    </div>
  );
};
AuthInput.propTypes = {
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
  disabled: PropTypes.bool,
};
AuthInput.defaultProps = {
  disabled: false,
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
  const {state, setState, config} = useContext(AppContext);

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
    setState({useLoris: config.useLoris});
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
      {error && (
        <div className={styles.authError}>
          {errorMessage}
        </div>
      )}
      <label style={{
        fontSize: '16px',
        verticalAlign: 'middle',
        margin: '20px 0',
        alignSelf: 'flex-end',
      }}>
        <Switch
          className='react-switch'
          onColor="#86d3ff"
          onHandleColor="#2693e6"
          handleDiameter={20}
          uncheckedIcon={false}
          checkedIcon={false}
          boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
          activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
          height={15}
          width={40}
          name='anonymize'
          onChange={(checked) => setState({useLoris: checked})}
          checked={state.useLoris ?? true}
        />
        <span>Import data into LORIS</span>
      </label>
      <AuthInput
        name='lorisURL'
        label='LORIS URL: (Example: https://demo.loris.ca)'
        placeholder='Example: https://demo.loris.ca'
        value={lorisURL}
        onUserInput={onUserInput}
        disabled={!state.useLoris}
      />
      <AuthInput
        name='lorisUsername'
        label='Username'
        placeholder='Username'
        value={lorisUsername}
        onUserInput={onUserInput}
        disabled={!state.useLoris}
      />
      <PasswordInput
        name='lorisPassword'
        label='Password'
        placeholder=' '
        value={lorisPassword}
        onUserInput={onUserInput}
        disabled={!state.useLoris}
      />
      <div className={styles.authSubmitContainer}>
        <input
          type='button'
          value='Submit'
          onClick={onSubmit}
          className={styles.authSubmitButton}
          disabled={!state.useLoris}
        />
      </div>
    </div>
  );
};

export default {
  AuthenticationMessage,
  AuthenticationCredentials,
};
