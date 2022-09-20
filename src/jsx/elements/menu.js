import React, {useState, useContext} from 'react';
import {AppContext} from '../../context';
import PropTypes from 'prop-types';
import '../../css/Menu.css';

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
    <div className='menuTab'>
      <div className={`menu-title ${props.active && 'menu-active'}`}
        onClick={props.onClick}>
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
};

/**
 * Menu - the menu component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Menu = (props) => {
  const {setState} = useContext(AppContext);
  const [activeMenuTab, setActiveMenuTab] = useState(0);

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return props.visible ? (
    <div className='root'>
      <div className='menu'>
        {props.tabs.map((tab, index) => (
          <MenuTab
            key={index}
            title={tab.title}
            onClick={
              (e) => {
                e.preventDefault();
                setActiveMenuTab(tab.index);
                setState({appMode: tab.id});
              }
            }
            active={index === activeMenuTab}
          />
        ))}
      </div>
    </div>
  ) : null;
};

Menu.propTypes = {
  visible: PropTypes.bool,
  tabs: PropTypes.array,
};

export default Menu;
