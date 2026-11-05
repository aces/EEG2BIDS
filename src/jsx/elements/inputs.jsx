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
export const FieldLabel = ({id, label, required, help, children}) => (
  <label className='label' htmlFor={id}>
    <b>
      {label} {required && <span className='red'>*</span>}
      {help &&
        <i className='fas fa-question-circle' data-tooltip-content={help}/>
      }
    </b>
    {children}
  </label>
);

export const FileInput = (props) => {
  const handleChange = (event) => {
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

    // Clear the input so selecting the same file again fires onChange.
    event.target.value = null;

    props.onUserInput(props.id, files);
  };
  return (
    <>
      <FieldLabel label={props.label} required={props.required}
        help={props.help}/>
      <button>
        <label htmlFor={props.id}>
          {'Choose file' + (props.multiple ? '(s)' : '')}
        </label>
      </button>
      <input
        type='file'
        id={props.id}
        multiple={props.multiple}
        name={props.id}
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

export const DirectoryInput = (props) => {
  const handleClick = async () => {
    const path = await window.eeg2bids.selectDirectory();
    if (path !== null) {
      props.onUserInput(props.id, path);
    }
  };
  return (
    <>
      <FieldLabel {...props}/>
      <input
        type='button'
        id={props.id}
        name={props.id}
        value='Choose folder'
        onClick={handleClick}
      />
      <a style={{fontSize: '14px', cursor: 'default'}}>
        &nbsp;{props.placeholder ?? 'No folder chosen'}
      </a>
    </>
  );
};

export const TextInput = (props) => {
  const handleChange = (event) => {
    const value = event.target.value;
    if (props.bannedCharacters?.some((c) => value.includes(c))) return;
    props.onUserInput(props.id, value);
  };
  return (
    <>
      {props.label &&
        <FieldLabel {...props}/>
      }
      <input
        type='text'
        id={props.id}
        name={props.id}
        value={props.value}
        onChange={handleChange}
        className={props.readonly ? 'readonly' : null}
        placeholder={props.placeholder}
        readOnly={props.readonly}
      />
    </>
  );
};

export const RadioInput = (props) => (
  <div style={styleRow}>
    <FieldLabel {...props}/>
    {Object.entries(props.options).map(([key, label]) => (
      <div key={key} style={styleColumn}>
        <span style={{cursor: 'pointer'}}>
          <input
            type='radio'
            id={`${props.id}_${key}`}
            name={`${props.id}_${key}`}
            value={key}
            checked={props.checked === key}
            onChange={(event) =>
              props.onUserInput(props.id, event.target.value)}
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

export const SelectInput = (props) => (
  <>
    {props.label &&
      <FieldLabel {...props}/>
    }
    <select
      id={props.id}
      name={props.id}
      value={props.value || ''}
      onChange={(event) => props.onUserInput(props.id, event.target.value)}
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

export const TextareaInput = (props) => (
  <>
    <FieldLabel {...props}/>
    <textarea
      name={props.id}
      id={props.id}
      value={props.value || ''}
      onChange={(event) => props.onUserInput(props.id, event.target.value)}
    >
    </textarea>
  </>
);
