import React, {useEffect, useState} from 'react';
import {AppContext} from './context';
import './css/App.css';

// Socket.io
import {Socket} from './jsx/socket.io';
const uri = 'http://127.0.0.1:5000';
const options = {
  transports: ['websocket'],
};

// Components
import Menu from './jsx/elements/menu';
import SplashScreen from './jsx/SplashScreen';
import Welcome from './jsx/Welcome';
import Converter from './jsx/Converter';
import Validator from './jsx/Validator';
// import {Authentication} from './jsx/elements/authentication';

/**
 * App - the starting point.
 * @return {JSX.Element}
 */
const App = () => {
  const [appMode, setAppMode] = useState('SplashScreen');
  const [activeMenuTab, setActiveMenuTab] = useState(0);

  /**
   * Similar to componentDidMount and componentDidUpdate.
   */
  useEffect(() => {
    setTimeout(
        () => {
          setAppMode('Welcome');
        }, 1500);
  }, []);

  return (
    <Socket uri={uri} options={options}>
      <AppContext.Provider value={{
        setAppMode: (appMode) => {
          setAppMode(appMode);
        },
      }}>
        <>
          <Menu visible={appMode !== 'SplashScreen'}
            tabs={[
              {
                title: 'Getting started',
                onClick: (e) => {
                  e.preventDefault();
                  setActiveMenuTab(0);
                  setAppMode('Welcome');
                },
              },
              {
                title: 'de-identifier',
                onClick: (e) => {
                  e.preventDefault();
                  setActiveMenuTab(1);
                  setAppMode('Converter');
                },
              },
              {
                title: 'iEEG Converter',
                onClick: (e) => {
                  e.preventDefault();
                  setActiveMenuTab(2);
                  setAppMode('Converter');
                },
              },
              {
                title: 'Validator',
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
          <Converter visible={appMode === 'Converter'}/>
          <Validator visible={appMode === 'Validator'}/>
        </>
      </AppContext.Provider>
    </Socket>
  );
};

export default App;
