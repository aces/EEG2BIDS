import React from 'react';
import {BrowserRouter as Router, Route} from 'react-router-dom';

// Components
import App from './App';

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
    <Router>
      <div>
        <Route path='/' component={ViewManager.View}/>
      </div>
    </Router>
  );
};
ViewManager.views = () => {
  return {
    app: <App/>,
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
