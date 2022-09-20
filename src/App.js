import React, {useReducer} from 'react';
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
import Converter from './jsx/Converter';
import Validator from './jsx/Validator';

/**
 * App - the main window.
 * @return {JSX.Element}
 */
const App = () => {
  // React State

  const initialState = {
    eegRuns: null,
    edfData: [],
    edfFiles: [],
    modality: 'ieeg',
    eventFiles: [],
    invalidEventFiles: [],
    annotationsTSV: [],
    invalidAnnotationsTSV: [],
    annotationsJSON: [],
    invalidAnnotationsJSON: [],
    bidsDirectory: null,
    LORIScompliant: true,
    siteID: 'n/a',
    projectID: 'n/a',
    subprojectID: 'n/a',
    session: '',
    bidsMetadataFile: [],
    invalidBidsMetadataFile: [],
    bidsMetadata: null,
    lineFreq: 'n/a',
    taskName: '',
    reference: 'n/a',
    recordingType: 'n/a',
    participantEntryMode: 'existing_loris',
    participantPSCID: '',
    participantCandID: '',
    participantID: '',
    participantDOB: null,
    participantAge: 'n/a',
    participantSex: 'n/a',
    participantHand: 'n/a',
    subjectID: '',
    preparedBy: '',
    outputTime: '',
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
        errors: false,
      },
  );

  /**
   * reset - reset the form fields (state).
   */
  const resetState = () => {
    setState(initialState);
  };

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <Socket uri={uri} options={options}>
      <AppContext.Provider value={{state, setState, resetState}}>
        <>
          {/*<Help visible={appMode !== 'SplashScreen'} activeMode={appMode}/>*/}
          <Menu visible={state.appMode !== 'SplashScreen'}
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
                title: '3) EDF to BIDS',
                id: 'Converter',
              },
              {
                title: '4) Validate and package',
                id: 'Validator',
              },
            ]}
          />
          <SplashScreen visible={state.appMode === 'SplashScreen'}/>
          <Welcome visible={state.appMode === 'Welcome'}/>
          <Configuration visible={state.appMode === 'Configuration'}/>
          <Converter visible={state.appMode === 'Converter'}/>
          <Validator visible={state.appMode === 'Validator'}/>
        </>
      </AppContext.Provider>
    </Socket>
  );
};

export default App;
