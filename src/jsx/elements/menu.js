import React from 'react';
import PropTypes from 'prop-types';
import '../../css/Menu.css';

/**
 * MenuTab - the menu tab component.
 * @param {object} props
 * @return {JSX.Element}
 */
const MenuTab = (props) => {
  const styles = {
    step: {
      width: props.width,
      padding: '0 0 2px 0',
      position: 'relative',
      display: 'table-cell',
      WebkitUserSelect: 'none',
      userSelect: 'none',
    },
    title: {
      default: {
        fontSize: 16,
        color: 'black',
        display: 'block',
        fontWeight: '300',
        cursor: 'pointer',
        margin: '8px 0 0 0',
        textAlign: 'center',
      },
      active: {
        color: 'white',
      },
    },
  };
  const styleTitleText = {
    ...styles.title.default,
    ...(props.active ?
      styles.title.active :
      {}),
  };
  return (
    <div style={styles.step}>
      <div style={styleTitleText}
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
  const styles = {
    root: {
      padding: 0,
      minHeight: 0,
      width: '100%',
    },
    menu: {
      width: '100%',
      margin: '0 auto',
      display: 'table',
    },
  };
  return props.visible ? (
    <div style={styles.root}>
      <div style={styles.menu}>
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
