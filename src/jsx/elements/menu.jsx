import React from 'react';
import '../../css/Menu.css';

const Menu = ({visible, tabs, activeTab}) => visible ? (
  <div className='root'>
    <div className='menu'>
      {tabs.map((tab, index) => (
        <div key={index}
          className={'menu-title' + (index === activeTab ? ' menu-active' : '')}
          onClick={tab.onClick}>
          {tab.title}
        </div>
      ))}
    </div>
  </div>
) : null;
export default Menu;
