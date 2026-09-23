import React, {useEffect, useRef, useState} from 'react';
import {AppContext} from './context';
import './css/App.css';

// Socket.io
import {Socket} from './jsx/socket.io';
// The backend port is configurable (see electron/main/backend-service.js); the
// preload bridge exposes the value the main process chose.
const backendPort = window.eeg2bids.getBackendPort();
const uri = `http://127.0.0.1:${backendPort}`;
const options = {
  // Prefer websocket, but allow long-polling as a fallback: the backend
  // serves both, and polling keeps the app usable if the websocket
  // transport is unavailable.
  transports: ['websocket', 'polling'],
  reconnectionDelayMax: 10000,
};

// Main components
import Menu from './jsx/elements/menu';
import BackendStatus from './jsx/elements/backendStatus';
import SplashScreen from './jsx/SplashScreen';
import Welcome from './jsx/Welcome';
import Configuration from './jsx/Configuration';
import Validator from './jsx/Validator';

/**
 * App - the main window.
 * @return {JSX.Element}
 */
const TABS = [
  ['1) Getting started', 'Welcome'],
  ['2) Configuration', 'Configuration'],
  ['3) Recording to BIDS', 'Converter'],
  ['4) Validate and package', 'Validator'],
];

const App = () => {
  // React State
  const [appMode, setAppMode] = useState('SplashScreen');
  const task = useRef({});

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    setTimeout(
        () => {
          setAppMode('Welcome');
        }, 1500);
  }, []);

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <Socket uri={uri} options={options}>
      <AppContext.Provider value={{
        setTask: (key, value) => {
          task.current[key] = value;
        },
        getFromTask: (key) => task.current[key] ?? '',
      }}>
        <>
          {/* Stable readiness anchor for integration tests: always present,
              carries the current app mode, and renders no box of its own. */}
          <div
            data-testid='app-root'
            data-appmode={appMode}
            style={{display: 'contents'}}
          />
          <BackendStatus/>
          <Menu visible={appMode !== 'SplashScreen'}
            tabs={TABS.map(([title, mode]) => ({
              title,
              onClick: () => setAppMode(mode),
            }))}
            activeTab={TABS.findIndex(([, mode]) => mode === appMode)}
          />
          <SplashScreen visible={appMode === 'SplashScreen'}/>
          <Welcome visible={appMode === 'Welcome'}/>
          <Configuration appMode={appMode}/>
          <Validator visible={appMode === 'Validator'}/>
        </>
      </AppContext.Provider>
    </Socket>
  );
};

export default App;
