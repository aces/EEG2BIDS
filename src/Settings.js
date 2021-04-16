import React, {useState} from 'react';
import {ChromePicker} from 'react-color';
// http://casesandberg.github.io/react-color/

/**
 * Settings - the settings window.
 * @return {JSX.Element}
 */
const Settings = () => {
  // React state
  const [background, setBackground] = useState('#25c4b1');

  const handleChangeComplete = (color) => {
    console.info(color);
    console.info(background);
    setBackground(color.hex);
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <div>
      hello world!
      <ChromePicker
        color={background}
        onChange={handleChangeComplete}
      />
    </div>
  );
};

export default Settings;
