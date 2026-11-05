import React, {useState, useEffect, useContext} from 'react';
import styles from '../../css/Authentication.module.css';
import Modal from './modal';
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

/**
 * AuthenticationMessage - the LORIS login state and a link to log in.
 * @param {object} props
 * @param {object|null} props.login - the last loris_login_response
 * @param {function} props.onLogIn - opens the credentials modal
 * @return {JSX.Element}
 */
export const AuthenticationMessage = ({login, onLogIn}) => (
  <div className={styles.authMessageContainer}>
    <span className={styles.loginMessage}>
      {!login ? '(Optional) You are not logged into a LORIS Account' :
        login.error || `LORIS Account set as ${login.lorisUsername}`}
    </span>
    <a className={styles.loginLink} onClick={onLogIn}>
      &nbsp;&nbsp;&nbsp;&nbsp;
      {login && !login.error ? 'Sign in to another account..' : 'Log in...'}
    </a>
  </div>
);

const NO_CREDENTIALS = {lorisURL: '', lorisUsername: '', lorisPassword: ''};

export const AuthenticationCredentials = ({show, close}) => {
  const socketContext = useContext(SocketContext);
  const [creds, setCreds] = useState(NO_CREDENTIALS);

  useEffect(() => {
    window.eeg2bids.getLorisAuthenticationCredentials().then(setCreds);
  }, []);

  /**
   * handleClear - forget the stored credentials and empty the fields.
   */
  const handleClear = () => {
    window.eeg2bids.removeLorisAuthenticationCredentials();
    setCreds(NO_CREDENTIALS);
  };

  /**
   * handleClose - Close the Authentication Credentials
   *   but first update (?new) credentials.
   */
  const handleClose = () => {
    if (creds.lorisURL && creds.lorisUsername && creds.lorisPassword) {
      window.eeg2bids.setLorisAuthenticationCredentials(creds);
      socketContext.emit('set_loris_credentials', creds);
    }
    close();
  };

  const onUserInput = (id, value) =>
    setCreds((previous) => ({...previous, [id]: value}));

  return (
    <Modal
      title={<span className={styles.authTitle}>Login to LORIS</span>}
      show={show}
      close={handleClose}
    >
      <AuthInput id='lorisURL'
        label='LORIS URL: (Example: https://demo.loris.ca)'
        value={creds.lorisURL}
        onUserInput={onUserInput}
      />
      <AuthInput id='lorisUsername'
        label='Username'
        value={creds.lorisUsername}
        onUserInput={onUserInput}
      />
      <AuthInput id='lorisPassword'
        label='Password'
        value={creds.lorisPassword}
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
