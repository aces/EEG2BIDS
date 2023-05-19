import React, {useContext, useState} from 'react';
import {AppContext} from '../../context';
import PropTypes from 'prop-types';
import '../../css/Menu.css';
import {AuthenticationMessage} from './authentication';

/**
 * MenuTab - the menu tab component.
 * @param {object} props
 * @return {JSX.Element}
 */
const MenuTab = (props) => {
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <div className={`menuTab ${props.disabled && 'disabled'}`}>
      <div
        className={`menu-title ${props.active && 'menu-active'}`}
        onClick={props.disabled ? undefined : props.onClick}
      >
        {props.title}
      </div>
    </div>
  );
};

MenuTab.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  onClick: PropTypes.func,
  active: PropTypes.bool,
  disabled: PropTypes.bool,
};

/**
 * Menu - the menu component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Menu = (props) => {
  const {state, setState} = useContext(AppContext);
  const [alertOpen, setAlertOpen] = useState(false);

  return props.visible ? (
    <div className='root'>
      <AuthenticationMessage />
      <div className='menu'>
        {props.tabs.map((tab, index) => (
          <MenuTab
            key={index}
            title={tab.title}
            disabled={!state.isAuthenticated && index > 0}
            active={state.appMode === tab.id}
            onClick={() => setState({appMode: tab.id})}
          />
        ))}
      </div>
      {props.alerts.length > 0 && (
        <div
          className="alert alert-warning notice"
          role="alert"
          onClick={() => setAlertOpen(!alertOpen)}
        >
          {alertOpen && props.alerts.map(
              (alert, key) => <p key={key}>{alert}</p>,
          )}
        </div>
      )}
    </div>
  ) : null;
};

Menu.propTypes = {
  visible: PropTypes.bool,
  tabs: PropTypes.array,
  alerts: PropTypes.array,
};

export default Menu;
