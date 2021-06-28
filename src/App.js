import React, {useEffect, useState} from 'react';
import {AppContext} from './context';
import './css/App.css';

// Socket.io
import {Socket} from './jsx/socket.io';
const uri = 'http://127.0.0.1:7301';
const options = {
  transports: ['websocket'],
};

// Main components
import Menu from './jsx/elements/menu';
import SplashScreen from './jsx/SplashScreen';
import Welcome from './jsx/Welcome';
import Configuration from './jsx/Configuration';
import Converter from './jsx/Converter';
import Validator from './jsx/Validator';

/**
 * App - the main window.
 * @return {JSX.Element}
 */
const App = () => {
  // React State
  const [appMode, setAppMode] = useState('SplashScreen');
  const [activeMenuTab, setActiveMenuTab] = useState(0);
  const [task, setTask] = useState({});

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
        setAppMode: (appMode) => {
          setAppMode(appMode);
        },
        setTask: (key, value) => {
          task[key] = value;
          setTask(task);
        },
        getFromTask: (key) => {
          return task[key] ?? '';
        },
      }}>
        <>
          <Menu visible={appMode !== 'SplashScreen'}
            tabs={[
              {
                title: '1) Getting started',
                onClick: (e) => {
                  e.preventDefault();
                  setActiveMenuTab(0);
                  setAppMode('Welcome');
                },
              },
              {
                title: '2) Configuration',
                onClick: (e) => {
                  e.preventDefault();
                  setActiveMenuTab(1);
                  setAppMode('Configuration');
                },
              },
              {
                title: '3) EDF to BIDS',
                onClick: (e) => {
                  e.preventDefault();
                  setActiveMenuTab(2);
                  setAppMode('Converter');
                },
              },
              {
                title: '4) Validator',
                onClick: (e) => {
                  e.preventDefault();
                  setActiveMenuTab(3);
                  setAppMode('Validator');
                },
              },
            ]}
            activeTab={activeMenuTab}
          />
          <SplashScreen visible={appMode === 'SplashScreen'}/>
          <Welcome visible={appMode === 'Welcome'}/>
          <Configuration visible={appMode === 'Configuration'}/>
          <Converter visible={appMode === 'Converter'}/>
          <Validator visible={appMode === 'Validator'}/>
        </>
      </AppContext.Provider>
    </Socket>
  );
};

export default App;
