import React from 'react';

const styleRow = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  width: '100%',
};
const styleColumn = {
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'flex-start',
  marginRight: '10px',
};
const styleRadioLabel = {
  margin: 0,
  color: '#064785',
  cursor: 'pointer',
};
const styleRadioInput = {
  display: 'inline-block',
  margin: '0 5px 0 5px',
  cursor: 'pointer',
};
const styleSelect = {
  display: 'inline-block',
  margin: '0 10px 10px 0',
  cursor: 'pointer',
};

/**
 * FieldLabel - the label, required marker and help icon of an input.
 * @param {object} props
 * @return {JSX.Element}
 */
const FieldLabel = ({id, label, required, help}) => (
  <label className='label' htmlFor={id}>
    <b>
      {label} {required && <span className='red'>*</span>}
      {help &&
        <i className='fas fa-question-circle' data-tooltip-content={help}/>
      }
    </b>
  </label>
);

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
    const files = event.target.files ? Array.from(event.target.files) : [];

    // Chromium File objects no longer include Electron's historical `path`
    // property. Keep the File itself (callers use FileReader for metadata),
    // but add the native path obtained through the sandboxed preload bridge.
    for (const file of files) {
      Object.defineProperty(file, 'path', {
        value: window.eeg2bids.getPathForFile(file),
        enumerable: true,
      });
    }

    // Clear the input file
    event.target.value = null;

    props.onUserInput(props.id, files);
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <>
      <FieldLabel label={props.label} required={props.required}
        help={props.help}/>
      <button>
        <label htmlFor={props.id}>
          {
            'Choose file' +
            (props.multiple ? '(s)' : '')
          }
        </label>
      </button>
      <input
        type='file'
        id={props.id}
        multiple={props.multiple}
        name={props.name}
        accept={props.accept}
        style={{display: 'none'}}
        onChange={handleChange}
      /> <a style={{
        fontSize: '14px',
        cursor: 'default',
      }}>{props.placeholder ?? 'No file chosen'}</a>
    </>
  );
};
/**
 * DirectoryInput - the directory select component.
 * @param {object} props
 * @return {JSX.Element}
 */
export const DirectoryInput = (props) => {
  /**
   * handleClick - button by user.
   */
  const handleClick = async () => {
    // Send directory to parent component
    const path = await window.eeg2bids.selectDirectory();
    if (path !== null) {
      props.onUserInput(props.id, path);
    }
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <>
      <FieldLabel {...props}/>
      <input
        type='button'
        id={props.id}
        name={props.name}
        value='Choose folder'
        onClick={handleClick}
      />
      <a style={{fontSize: '14px', cursor: 'default'}}>
        &nbsp;{props.placeholder ?? 'No folder chosen'}
      </a>
    </>
  );
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
    if (props.bannedCharacters?.some((c) => value.includes(c))) return;
    props.onUserInput(props.id, value);
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <>
      {props.label &&
        <FieldLabel {...props}/>
      }
      <input
        type='text'
        id={props.id}
        name={props.name}
        value={props.value}
        onChange={handleChange}
        className={props.readonly ? 'readonly' : null}
        placeholder={props.placeholder}
        readOnly={props.readonly}
      />
    </>
  );
};
/**
 * RadioInput - the input type='radio' component.
 * @param {object} props
 * @return {JSX.Element}
 */
export const RadioInput = (props) => {
  /**
   * handleChange - input change by user.
   * @param {object} event - input event
   */
  const handleChange = (event) => {
    props.onUserInput(
        props.id,
        event.target.value,
    );
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <div style={styleRow}>
      <FieldLabel {...props}/>
      {Object.entries(props.options).map(([key, label]) => (
        <div key={key} style={styleColumn}>
          <span style={{cursor: 'pointer'}}>
            <input
              type='radio'
              id={`${props.id}_${key}`}
              name={`${props.name}_${key}`}
              value={key}
              checked={props.checked === key}
              onChange={handleChange}
              style={styleRadioInput}
            />
            <label htmlFor={`${props.id}_${key}`}
              style={styleRadioLabel}
            >
              {label}
            </label>
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * SelectInput - the select component.
 * @param {object} props
 * @return {JSX.Element}
 */
export const SelectInput = (props) => {
  /**
   * handleChange - input change by user.
   * @param {object} event - input event
   */
  const handleChange = (event) => {
    props.onUserInput(
        props.id,
        event.target.value,
    );
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <>
      {props.label &&
        <FieldLabel {...props}/>
      }
      <select
        id={props.id}
        name={props.name}
        value={props.value || ''}
        onChange={handleChange}
        style={styleSelect}
      >
        {props.emptyOption && <option>{props.emptyOption}</option>}
        {Object.keys(props.options).map((key, index) => (
          <option value={key} key={index}>
            {props.options[key]}
          </option>
        ))}
      </select>
    </>
  );
};

/**
 * TextareaInput - the textarea component
 * @param {object} props
 * @return {JSX.Element}
 */
export const TextareaInput = (props) => {
  /**
   * handleChange - input change by user.
   * @param {object} event - input event
   */
  const handleChange = (event) => {
    props.onUserInput(
        props.name,
        event.target.value,
    );
  };

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for the component
   */
  return (
    <>
      <FieldLabel {...props}/>
      <textarea
        cols={props.cols}
        rows={props.rows}
        className="form-control"
        name={props.name}
        id={props.id}
        value={props.value || ''}
        onChange={handleChange}
      >
      </textarea>
    </>
  );
};
