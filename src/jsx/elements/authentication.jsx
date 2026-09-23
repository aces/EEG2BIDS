import React, {useState, useEffect, useContext} from 'react';
import styles from '../../css/Authentication.module.css';
import Modal from './modal';

// Socket.io
import {SocketContext} from '../socket.io';

/**
 * AuthInput - the LORIS credential input, optionally a password field.
 * @param {object} props
 * @return {JSX.Element}
 */
const AuthInput = ({id, label, value, onUserInput, password}) => {
  const [hidden, setHidden] = useState(true);
  return (
    <div style={{
      width: '400px',
      height: '20px',
      position: 'relative',
      marginBottom: '50px',
    }}>
      <input
        type={password && hidden ? 'password' : 'text'}
        id={id}
        name={id}
        value={value}
        onChange={(event) => onUserInput(id, event.target.value)}
        className={styles.input}
        placeholder=' '
      />
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {password &&
        <span
          className={styles['eye-' + (hidden ? 'close' : 'open')]}
          onClick={() => setHidden(!hidden)}
        />
      }
    </div>
  );
};

export const AuthenticationMessage = (props) => {
  // React Context
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
  useEffect( () => {
    /**
     * getLorisCredentials - gets the LORIS credentials securely.
     */
    async function getLorisCredentials() {
      const credentials =
        await window.eeg2bids.getLorisAuthenticationCredentials();
      if (credentials &&
        credentials.lorisURL &&
        credentials.lorisUsername &&
        credentials.lorisPassword
      ) {
        socketContext.emit('set_loris_credentials', credentials);
      }
    }
    getLorisCredentials();
  }, []);

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect( () => {
    if (socketContext) {
      socketContext.on('loris_login_response', (data) => {
        if (data.error) {
          setLoginMessage(data.error);
          setLoginLink('Log in...');
        } else {
          setLoginMessage(`LORIS Account set as ${data.lorisUsername}`);
          setLoginLink('Sign in to another account..');
        }
      });
    }
  }, [socketContext]);

  /**
   * User clicked sign in.
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

export const AuthenticationCredentials = (props) => {
  // React Context
  const socketContext = useContext(SocketContext);

  // React state
  const [lorisURL, setLorisURL] = useState('');
  const [lorisUsername, setLorisUsername] = useState('');
  const [lorisPassword, setLorisPassword] = useState('');

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    /**
     * getLorisCredentials - gets the LORIS credentials securely.
     */
    async function getLorisCredentials() {
      const credentials =
        await window.eeg2bids.getLorisAuthenticationCredentials();
      setLorisURL(credentials.lorisURL);
      setLorisUsername(credentials.lorisUsername);
      setLorisPassword(credentials.lorisPassword);
    }
    getLorisCredentials();
  }, []);

  /**
   * handleClear - Close the Authentication Credentials
   *   but first update (?new) credentials.
   */
  const handleClear = () => {
    window.eeg2bids.removeLorisAuthenticationCredentials();
    setLorisURL('');
    setLorisUsername('');
    setLorisPassword('');
  };

  /**
   * handleClose - Close the Authentication Credentials
   *   but first update (?new) credentials.
   */
  const handleClose = () => {
    if (lorisURL && lorisUsername && lorisPassword) {
      const credentials = {lorisURL, lorisUsername, lorisPassword};
      window.eeg2bids.setLorisAuthenticationCredentials(credentials);
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
    <Modal
      title={<span className={styles.authTitle}>{props.title}</span>}
      show={props.show}
      close={handleClose}
      width={props.width}
    >
      <AuthInput id='lorisURL'
        label='LORIS URL: (Example: https://demo.loris.ca)'
        value={lorisURL}
        onUserInput={onUserInput}
      />
      <AuthInput id='lorisUsername'
        label='Username'
        value={lorisUsername}
        onUserInput={onUserInput}
      />
      <AuthInput id='lorisPassword'
        label='Password'
        value={lorisPassword}
        onUserInput={onUserInput}
        password
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
    </Modal>
  );
};
