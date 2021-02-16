import React from 'react';

/**
 * Welcome - the welcome component.
 * @param {object} props
 * @return {JSX.Element}
 */
const Welcome = (props) => {
  return (
    <>
      <div style={{
        fontSize: '20px',
        textAlign: 'center',
        verticalAlign: 'middle',
        cursor: 'default',
        padding: '20px',
      }}>
        Welcome to pyCat!
      </div>
      <div style={{backgroundColor: '#039b83', padding: '14px'}}>
        <p>Hello, you may begin your task by following the menu above.
          Please remember to backup your data!</p>
      </div>
    </>
  );
};

export default Welcome;
