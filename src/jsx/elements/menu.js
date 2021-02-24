import React from 'react';
import PropTypes from 'prop-types';
import '../../css/Menu.css';

/**
 * MenuTab - the menu tab component.
 * @param {object} props
 * @return {JSX.Element}
 */
const MenuTab = (props) => {
  // css styling.
  const menuTabWidth = {width: props.width};
  const classesTitleText = props.active ?
    'menu-title menu-active' : 'menu-title';
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <div className={'menuTab'} style={menuTabWidth}>
      <div className={classesTitleText}
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
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return props.visible ? (
    <div className={'root'}>
      <div className={'menu'}>
        { props.tabs.map((tab, index) => (
          <MenuTab
            key={index}
            index={index}
            length={props.tabs.length}
            width={100 / props.tabs.length}
            title={tab.title}
            onClick={tab.onClick}
            active={index === props.activeTab}
            activeIndex={props.activeTab}
          />
        ))}
      </div>
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
