import React from 'react';
import {createRoot} from 'react-dom/client';
import './css/index.css';
import ViewManager from './ViewManager';

const root = createRoot(document.getElementById('root'));
root.render(<ViewManager/>);
