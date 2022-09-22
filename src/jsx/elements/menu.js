import React, {useContext, useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import '../../css/Menu.css';
import {SocketContext} from '../socket.io';
import {AuthenticationMessage} from './authentication';

/**
 * MenuTab - the menu tab component.
 * @param {object} props
 * @return {JSX.Element}
 */
const MenuTab = (props) => {
  // css styling.
  const classesTitleText = props.active ?
    'menu-title menu-active' : 'menu-title';
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <>
      {props.disabled ?
        <div className='menuTab disabled'>
          <div className={classesTitleText}>
            {props.title}
          </div>
        </div> :
        <div className='menuTab'>
          <div
            className={classesTitleText}
            onClick={props.onClick}
          >
            {props.title}
          </div>
        </div>
      }
    </>
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
  const socketContext = useContext(SocketContext);
  const [connected, setConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [alertOpen, setAlertOpen] = useState(false);

  useEffect(() => {
    if (socketContext) {
      socketContext.on('connect', () => {
        setAlerts([]);
        setConnected(true);
      });
      socketContext.on('disconnect', (msg) => {
        setAlerts([...alerts, 'Disconnected from Python - ' + msg]);
        setConnected(false);
      });
      socketContext.on('server_error', (msg) => {
        setAlerts([...alerts, msg]);
      });
    }
  }, [socketContext, alerts]);

  useEffect(() => {
    if (socketContext) {
      socketContext.on('loris_login_response', (data) => {
        if (data.success) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      });
    }
  }, [socketContext]);

  return props.visible ? (
    <div className='root'>
      <div><AuthenticationMessage /></div>
      <div className='menu'>
        { props.tabs.map((tab, index) => (
          <MenuTab
            key={index}
            index={index}
            length={props.tabs.length}
            title={tab.title}
            onClick={tab.onClick}
            active={index === props.activeTab}
            activeIndex={props.activeTab}
            disabled={!isAuthenticated && index > 0}
          />
        ))}
      </div>
      {alerts.length > 0 && (
        <div
          className="alert alert-warning notice"
          role="alert"
          onClick={() => setAlertOpen(!alertOpen)}
        >
          {alertOpen && alerts.map((alert) => <p>{alert}</p>)}
        </div>
      )}
    </div>
  ) : null;
};
Menu.defaultProps = {
  activeTab: 0,
};
Menu.propTypes = {
  visible: PropTypes.bool,
  tabs: PropTypes.array,
  activeTab: PropTypes.number,
};

export default Menu;
