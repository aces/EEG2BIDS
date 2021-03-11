import React from 'react';
import PropTypes from 'prop-types';

/**
 * FileInput - the input type='file' component.
 * @param {object} props
 * @return {JSX.Element}
 */
export const FileInput = (props) => {
  /**
   * handleChange - input change by user.
   * @param {object} event - input event
   */
  const handleChange = (event) => {
    // Send current file to parent component
    const file = event.target.files[0] ? event.target.files[0] : '';
    props.onUserInput(props.id, file);
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <>
      <label><b>{props.label}</b></label>
      <button>
        <label htmlFor={props.id}>Choose file</label>
      </button>
      <input
        type='file'
        id={props.id}
        name={props.name}
        accept={props.accept}
        style={{display: 'none'}}
        onChange={handleChange}
      />
      <a style={{fontSize: '14px', cursor: 'default'}}>
        &nbsp;{props.placeholder ?? 'No file chosen'}
      </a>
    </>
  );
};
FileInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string,
  accept: PropTypes.string,
  onUserInput: PropTypes.func,
  placeholder: PropTypes.string,
};

/**
 * DirectoryInput - the directory select component.
 * @param {object} props
 * @return {JSX.Element}
 */
export const DirectoryInput = (props) => {
  const myAPI = window['myAPI']; // from public/preload.js
  /**
   * handleClick - button by user.
   */
  const handleClick = async () => {
    // Send directory to parent component
    const dialog = await myAPI.dialog();
    const path = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    props.onUserInput(props.id, path.filePaths[0]);
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <>
      <label htmlFor={props.id}><b>{props.label}</b></label>
      <input
        type='button'
        id={props.id}
        name={props.name}
        value='Choose directory'
        onClick={handleClick}
      />
      <a style={{fontSize: '14px', cursor: 'default'}}>
        &nbsp;{props.placeholder ?? 'No directory chosen'}
      </a>
    </>
  );
};
DirectoryInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string,
  onUserInput: PropTypes.func,
  placeholder: PropTypes.string,
};

/**
 * TextInput - the input type='text' component.
 * @param {object} props
 * @return {JSX.Element}
 */
export const TextInput = (props) => {
  /**
   * handleChange - input change by user.
   * @param {object} event - input event
   */
  const handleChange = (event) => {
    const value = event.target.value;
    props.onUserInput(props.id, value);
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <>
      <label htmlFor={props.id}><b>{props.label}</b></label>
      <input
        type='text'
        id={props.id}
        name={props.name}
        value={props.value}
        onChange={handleChange}
        placeholder={props.placeholder}
      />
    </>
  );
};
TextInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  onUserInput: PropTypes.func,
  placeholder: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
};

/**
 * NumberInput - the input type='number' component.
 * @param {object} props
 * @return {JSX.Element}
 */
export const NumberInput = (props) => {
  /**
   * handleChange - input change by user.
   * @param {object} event - input event
   */
  const handleChange = (event) => {
    const value = event.target.value;
    props.onUserInput(props.id, value);
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <>
      <label htmlFor={props.id}><b>{props.label}</b></label>
      <input
        type='number'
        id={props.id}
        name={props.name}
        value={props.value}
        onChange={handleChange}
        placeholder={props.placeholder}
      />
    </>
  );
};
NumberInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.string,
  onUserInput: PropTypes.func,
  placeholder: PropTypes.string,
};

export default {
  FileInput,
  TextInput,
  NumberInput,
  DirectoryInput,
};
