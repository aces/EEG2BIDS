import React from 'react';
import '../../css/Menu.css';

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
    <div className='menuTab'>
      <div className={classesTitleText}
        onClick={props.onClick}>
        {props.title}
      </div>
    </div>
  );
};
/**
 * Menu - the menu component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Menu = (props) => {
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return props.visible ? (
    <div className='root'>
      <div className='menu'>
        { props.tabs.map((tab, index) => (
          <MenuTab
            key={index}
            title={tab.title}
            onClick={tab.onClick}
            active={index === props.activeTab}
          />
        ))}
      </div>
    </div>
  ) : null;
};
export default Menu;
