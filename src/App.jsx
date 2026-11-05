import React, {useEffect, useRef, useState} from 'react';
import {Tooltip} from 'react-tooltip';
import {AppContext} from './context';
import './css/App.css';
import {Socket} from './jsx/socket.io';
import Menu from './jsx/elements/menu';
import BackendStatus from './jsx/elements/backendStatus';
import SplashScreen from './jsx/SplashScreen';
import Welcome from './jsx/Welcome';
import Configuration from './jsx/Configuration';
import BatchWorkbench from './jsx/BatchWorkbench';
import Validator from './jsx/Validator';

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

const TABS = [
  ['1) Getting started', 'Welcome'],
  ['2) Configuration', 'Configuration'],
  ['3) Recording to BIDS', 'Converter'],
  ['4) Batch workbench', 'BatchWorkbench'],
  ['5) Validate and package', 'Validator'],
];

const App = () => {
  const [appMode, setAppMode] = useState('SplashScreen');
  // The active batch: {document, filePath?}, where document is the serialized
  // manifest (see batchFile.js). Set by the workbench or a file open.
  const [batch, setBatch] = useState(null);
  const task = useRef({});

  useEffect(() => {
    setTimeout(() => setAppMode('Welcome'), 1500);
  }, []);

  return (
    <Socket uri={uri} options={options}>
      <AppContext.Provider value={{
        setTask: (key, value) => {
          task.current[key] = value;
        },
        getFromTask: (key) => task.current[key] ?? '',
      }}>
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
        <Configuration appMode={appMode} batch={batch} setBatch={setBatch}/>
        <BatchWorkbench
          visible={appMode === 'BatchWorkbench'}
          onLoadIntoConfiguration={(document) => {
            setBatch({document});
            setAppMode('Configuration');
          }}
        />
        <Validator visible={appMode === 'Validator'}/>
        <Tooltip anchorSelect='[data-tooltip-content]'/>
      </AppContext.Provider>
    </Socket>
  );
};

export default App;
