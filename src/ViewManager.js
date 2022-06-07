import React from 'react';
import {
  HashRouter,
  Routes,
  Route,
} from 'react-router-dom';

// Components
import App from './App';
import Settings from './Settings';

/**
 * ViewManager - the multiple windows manager.
 * @param {object} props
 * @return {JSX.Element}
 */
const ViewManager = (props) => {
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <HashRouter>
      <div>
        <Routes>
          {/*<Route path='/' element={ViewManager.View}/>*/}
          <Route path='/' exact element={<App/>}/>
          <Route path='/settings' element={<Settings/>}/>
        </Routes>
      </div>
    </HashRouter>
  );
};
ViewManager.views = () => {
  return {
    app: <App/>,
    settings: <Settings/>,
  };
};
ViewManager.View = (props) => {
  const name = props.location.search.substr(1);
  const view = ViewManager.views()[name];
  if (view == null) {
    throw new Error('View \'' + name + '\' is undefined');
  }
  return view;
};

export default ViewManager;
