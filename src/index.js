import React from 'react';
import {createRoot} from 'react-dom/client';
import './css/index.css';
import ViewManager from './ViewManager';
import * as serviceWorker from './serviceWorker';

const root = createRoot(document.getElementById('root'));
root.render(<ViewManager/>);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
