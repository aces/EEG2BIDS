import React from 'react';
import './css/App.css';

// Socket.io
import {Socket} from './jsx/socket.io';
const uri = 'http://127.0.0.1:5000';
const options = {
  transports: ['websocket'],
};

// Components
import Welcome from './jsx/Welcome';

/**
 * App - the starting point.
 * @return {JSX.Element}
 */
const App = () => {
  return (
    <Socket uri={uri} options={options}>
      <Welcome/>
    </Socket>
  );
};

export default App;
