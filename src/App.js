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
import Help from './jsx/elements/help';
import SplashScreen from './jsx/SplashScreen';
import Welcome from './jsx/Welcome';
import Configuration from './jsx/Configuration';
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
  const nextStage = (nextStage, tabNumber) => {
    setActiveMenuTab(tabNumber);
    setAppMode(nextStage);
  };

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
          {/*<Help visible={appMode !== 'SplashScreen'} activeMode={appMode}/>*/}
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
                title: '3) EEG to BIDS',
                onClick: (e) => {
                  e.preventDefault();
                  setActiveMenuTab(2);
                  setAppMode('Converter');
                },
              },
              {
                title: '4) Validate and package',
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
          <Welcome
            visible={appMode === 'Welcome'}
            nextStage={nextStage}
          />
          <Configuration appMode={appMode} nextStage={nextStage} />
          <Validator visible={appMode === 'Validator'}/>
        </>
      </AppContext.Provider>
    </Socket>
  );
};

export default App;
