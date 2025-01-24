import React, {useState, useEffect, useContext} from 'react';
import {AppContext} from '../context';
import {debug} from './socket.io/utils';

// Main components
import Menu from './elements/menu';
import SplashScreen from './SplashScreen';
import Welcome from './Welcome';
import Configuration from './Configuration';
import Converter from './Converter';
import Validator from './Validator';

// Socket.io
import {SocketContext} from './socket.io';

const BIDSFileFormats = {
  edf: 'EDF',
  set: 'SET',
};

/**
 * Main - the main window.
 * @return {JSX.Element}
 */
const Main = () => {
  // React State
  const {state, setState, config} = useContext(AppContext);
  const socketContext = useContext(SocketContext);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const filteredFormats = {};
    config.BIDSFileFormats
        .filter((format) => BIDSFileFormats[format])
        .map((format) =>
          filteredFormats[format] = BIDSFileFormats[format],
        );
    setState({acceptedFormats: filteredFormats});
    setState({inputFileFormat: Object.keys(filteredFormats)?.[0] || ''});
  }, []);

  useEffect(() => {
    if (socketContext) {
      socketContext.on('connect', () => {
        setState({wsConnected: true});
        setState({appMode: 'Welcome'});
        setAlerts([]);
        debug('WS CONNECTED');
      });

      socketContext.on('connect_error', (err) => {
        console.error(`connect_error due to ${err.message}`);
        setAlerts([...alerts, 'Cannot connect to Python']);
      });

      socketContext.on('disconnect', (msg) => {
        setState({wsConnected: false});
        setAlerts([...alerts, 'Disconnected from Python - ' + msg]);
        debug('WS DISCONNECTED');
      });

      socketContext.on('server_error', (msg) => {
        setAlerts([...alerts, msg]);
      });
    }
  }, [socketContext]);

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <>
      <Menu
        visible={state.wsConnected}
        tabs={[
          {
            title: '1) Getting started',
            id: 'Welcome',
          },
          {
            title: '2) Configuration',
            id: 'Configuration',
          },
          {
            title: '3) EEG to BIDS',
            id: 'Converter',
          },
          {
            title: '4) Validate and package',
            id: 'Validator',
          },
        ]}
        alerts={alerts}
      />
      <Welcome
        visible={state.wsConnected && state.appMode === 'Welcome'}
      />
      <Configuration
        visible={state.wsConnected && state.appMode === 'Configuration'}
      />
      <Converter
        visible={state.wsConnected && state.appMode === 'Converter'}
      />
      <Validator
        visible={state.wsConnected && state.appMode === 'Validator'}
      />
      <SplashScreen visible={!state.wsConnected} />
    </>
  );
};

export {BIDSFileFormats};
export default Main;
