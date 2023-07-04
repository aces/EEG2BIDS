import React, {useState, useReducer, useEffect} from 'react';
import {AppContext} from './context';
import Main from './jsx/Main';
import SplashScreen from './jsx/SplashScreen';
import './css/App.css';
import config from './config.json';

// Socket.io
import {Socket} from './jsx/socket.io';
const uri = 'http://127.0.0.1:7301';
const options = {
  transports: ['websocket'],
};

Object.assign(console, window.myAPI.logger.functions);

/**
 * App - the main window.
 * @return {JSX.Element}
 */
const App = () => {
  const [serverUp, setServerUp] = useState(false);
  const [errors, setErrors] = useState({});

  const initialState = {
    subjectID: '',
    exclude: {},
    outputFilename: '',
  };

  const reducer = (state, values) => {
    return {...state, ...values};
  };

  const [state, setState] = useReducer(
      reducer,
      {
        ...initialState,
        appMode: 'SplashScreen',
        isAuthenticated: false,
        wsConnected: false,
      },
  );

  const resetState = () => {
    setState(initialState);
  };

  const setError = (errName, errValue) => {
    if (errValue === null) {
      setErrors((errors) => {
        /* eslint-disable no-unused-vars */
        const {[errName]: _, ...errs} = errors;
        return {...errs};
      });
    } else {
      setErrors((errors) => ({
        ...errors,
        [errName]: errValue,
      }));
    }
  };

  useEffect(async () => {
    const isAvailable = () => {
      const timeout = new Promise((_, reject) => {
        setTimeout(reject, 300, 'Request timed out');
      });
      const request = fetch(
          uri + '/socket.io/?EIO=4&transport=polling',
          {mode: 'no-cors'},
      );
      return Promise
          .race([timeout, request])
          .then(() => {
            setServerUp(true);
            console.info('Server up');
            clearInterval(loop);
          })
          .catch(() => console.error('Python server not reachable'));
    };
    const loop = setInterval(isAvailable, 3000);
  }, []);

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    serverUp ?
      <Socket uri={uri} options={options}>
        <AppContext.Provider value={{
          state, setState, resetState,
          errors, setError,
          config,
        }}>
          <Main />
        </AppContext.Provider>
      </Socket> :
      <SplashScreen visible={true} />
  );
};

export default App;
