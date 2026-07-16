import React from 'react';
import {
  HashRouter,
  Routes,
  Route,
} from 'react-router-dom';

// Components
import App from './App';

/**
 * ViewManager - the multiple windows manager.
 * @return {JSX.Element}
 */
const ViewManager = () => {
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <HashRouter>
      <div>
        <Routes>
          <Route path='/' exact element={<App/>}/>
        </Routes>
      </div>
    </HashRouter>
  );
};

export default ViewManager;
