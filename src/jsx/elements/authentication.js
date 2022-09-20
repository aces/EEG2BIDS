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
  const {setState} = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  // React state
  const [loginMessage, setLoginMessage] = useState(
      '(Optional) You are not logged into a LORIS Account',
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
    if (credentials &&
      credentials.lorisURL &&
      credentials.lorisUsername &&
      credentials.lorisPassword
    ) {
      setState({lorisURL: credentials.lorisURL});
      setState({lorisUsername: credentials.lorisUsername});
      setState({lorisPassword: credentials.lorisPassword});
      socketContext.emit('set_loris_credentials', credentials);
    }
  }, []);

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(async () => {
    if (!socketContext?.connected) return;

    socketContext.on('loris_login_response', (data) => {
      if (data.error) {
        setLoginMessage(data.error);
        setLoginLink('Log in...');
      } else {
        setLoginMessage(`LORIS Account set as ${data.lorisUsername}`);
        setLoginLink('Sign in to another account..');
      }
    });
  }, [socketContext?.connected]);

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
      <a className={styles.loginLink} onClick={handleClick}>
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
  const {state, setState} = useContext(AppContext);
  const socketContext = useContext(SocketContext);

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(async () => {
    const myAPI = window['myAPI'];
    const credentials = await myAPI.getLorisAuthenticationCredentials();
    setState({lorisURL: credentials.lorisURL});
    setState({lorisUsername: credentials.lorisUsername});
    setState({lorisPassword: credentials.lorisPassword});
  }, []);

  /**
   * handleClear - Close the Authentication Credentials
   *   but first update (?new) credentials.
   */
  const handleClear = () => {
    const myAPI = window['myAPI'];
    myAPI.removeLorisAuthenticationCredentials();
    setState({lorisURL: ''});
    setState({lorisUsername: ''});
    setState({lorisPassword: ''});
  };

  /**
   * handleClose - Close the Authentication Credentials
   *   but first update (?new) credentials.
   */
  const handleClose = () => {
    const myAPI = window['myAPI'];
    const credentials = {
      lorisURL: state.lorisURL,
      lorisUsername: state.lorisUsername,
      lorisPassword: state.lorisPassword,
    };
    if (credentials &&
      credentials.lorisURL &&
      credentials.lorisUsername &&
      credentials.lorisPassword
    ) {
      myAPI.setLorisAuthenticationCredentials(credentials);
      socketContext.emit('set_loris_credentials', credentials);
    }
    props.close(true);
  };

  /**
   * onUserInput - input change by user.
   * @param {string} name - element name
   * @param {object|string|boolean} value - element value
   */
  const onUserInput = (name, value) => {
    setState({[name]: value});
  };

  // Styling for rendering
  const styleVisible = {visibility: props.show ? 'visible' : 'hidden'};
  const styleAnimation = {width: props.width ? props.width : 'auto'};
  const styleContainer = {
    opacity: props.show ? 1 : 0,
    transform: props.show ? 'translateY(0)' : 'translateY(-25%)',
  };
  return (
    <div className={styles.authCredentialsOverlay}
      style={styleVisible}>
      <div className={styles.authCredentialsContainer}
        style={styleVisible}>
        <div className={styles.authCredentialsAnimation}
          style={styleAnimation}>
          <div className={styles.authCredentialsDialog}
            style={styleContainer}>
            <span className={styles.authCredentialsHeader}>
              {props.title}
              <span className={styles.authCredentialsHeaderClose}
                onClick={handleClose}>
                ×
              </span>
            </span>
            <div className={styles.authCredentialsContent}>
              <AuthInput id='lorisURL'
                name='lorisURL'
                label='LORIS URL: (Example: https://demo.loris.ca)'
                placeholder='Example: https://demo.loris.ca'
                value={state.lorisURL}
                onUserInput={onUserInput}
              />
              <AuthInput id='lorisUsername'
                name='lorisUsername'
                label='Username'
                placeholder='Username'
                value={state.lorisUsername}
                onUserInput={onUserInput}
              />
              <PasswordInput id='lorisPassword'
                name='lorisPassword'
                label='Password'
                placeholder=' '
                value={state.lorisPassword}
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
