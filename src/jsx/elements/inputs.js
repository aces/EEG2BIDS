import React, {useState} from 'react';
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
    const files = event.target.files ? Array.from(event.target.files) : [];

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
      <label className="label">
        <b>
          {props.label} {props.required ?
            <span className="red">*</span> :
            null
          }
          {props.help &&
            <i className='fas fa-question-circle' data-tip={props.help}></i>
          }
        </b>
      </label>
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
FileInput.defaultProps = {
  multiple: false,
};
FileInput.propTypes = {
  id: PropTypes.string,
  multiple: PropTypes.bool,
  name: PropTypes.string,
  label: PropTypes.string,
  accept: PropTypes.string,
  onUserInput: PropTypes.func,
  placeholder: PropTypes.string,
  help: PropTypes.string,
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
      <label className="label" htmlFor={props.id}>
        <b>
          {props.label} {props.required ?
            <span className="red">*</span> :
            null
          }
          {props.help &&
            <i className='fas fa-question-circle' data-tip={props.help}></i>
          }
        </b>
      </label>
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
DirectoryInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string,
  onUserInput: PropTypes.func,
  placeholder: PropTypes.string,
  help: PropTypes.string,
};


/**
 * DirectoryInput - the directory select component.
 * @param {object} props
 * @return {JSX.Element}
 */
export const MultiDirectoryInput = (props) => {
  const myAPI = window['myAPI']; // from public/preload.js

  // React State
  const [exclude, setExclude] = useState(false);
  /**
   * handleClick - button by user.
   * @param {number} index
   */
  const handleClick = async (index) => {
    // Send directory to parent component
    const dialog = await myAPI.dialog();
    const path = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    props.updateDirEntry(props.task, index, path.filePaths[0]);
  };

  if (props.value[0].exclude) {
    return (
      <div>
        <TextareaInput
          name={props.name}
          label={`${props.label} exclusion reason`}
          onUserInput={(name, value) =>
            props.excludeMFFDirectory(props.taskName, true, value)}
          value={props.value[0].reason}
        />
        <button
          type="button"
          onClick={() => props.excludeMFFDirectory(props.taskName, false, '')}
        >
            Include
        </button>
      </div>
    );
  }

  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return props.value.map((dir, index) => (
    <div key={index}>
      {index === 0 ? (
          <label className="label" htmlFor={props.id}>
            <b>
              {props.label} {props.required ?
                <span className="red">*</span> :
                null
              }
              {props.help &&
                <i className='fas fa-question-circle' data-tip={props.help}></i>
              }
            </b>
          </label>
      ) : (
          <label className="label" htmlFor={props.id}>
            <b>
              &emsp;{`Run ${index+1}`}
            </b>
          </label>
      ) }
      <input
        type='button'
        id={props.id}
        name={props.name}
        value='Choose Task Run'
        onClick={() => handleClick(index)}
        style={{marginRight: '10px'}}
      />
      {(props.value.length > 1) &&
        (<button
          type="button"
          onClick={props.removeDirEntry(props.taskName, index)}
        >
          Remove Run -
        </button>)
      }
      {(index == props.value.length - 1) &&
        (<button
          type="button"
          onClick={() => props.addDirEntry(props.taskName)}
        >
          Add Run +
        </button>)
      }
      {index === 0 && (
        <button
          type="button"
          onClick={() => props.excludeMFFDirectory(props.taskName, true, '')}
        >
            Excluded
        </button>
      )}
      <a style={{fontSize: '14px', cursor: 'default'}}>
        &nbsp;{dir.path ?? 'No folder chosen'}
      </a>
    </div>
  ));
};
MultiDirectoryInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  taskName: PropTypes.string,
  label: PropTypes.string,
  updateDirEntry: PropTypes.func,
  removeDirEntry: PropTypes.func,
  addDirEntry: PropTypes.func,
  excludeMFFDirectory: PropTypes.func,
  help: PropTypes.string,
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
    if (props.bannedCharacters) {
      for (const character of props.bannedCharacters) {
        if (value.includes(character)) {
          return;
        }
      }
    }
    props.onUserInput(props.id, value);
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <>
      {props.label &&
        <label className="label" htmlFor={props.id}>
          <b>
            {props.label} {props.required ?
              <span className="red">*</span> :
              null
            }
            {props.help &&
              <i className='fas fa-question-circle' data-tip={props.help}></i>
            }
          </b>
        </label>
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
TextInput.defaultProps = {
  readonly: false,
  required: false,
};
TextInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  required: PropTypes.bool,
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
  bannedCharacters: PropTypes.array,
  readonly: PropTypes.bool,
  help: PropTypes.string,
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
   * generateRadioLayout - creates the radio input layout.
   * @return {JSX.Element}
   */
  const generateRadioLayout = () => {
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
    const styleLabel = {
      margin: 0,
      color: '#064785',
      cursor: 'pointer',
    };
    const styleInput = {
      display: 'inline-block',
      margin: '0 5px 0 5px',
      cursor: 'pointer',
    };
    const content = [];
    for (const [key] of Object.entries(props.options)) {
      content.push(
          <div key={key}
            style={styleColumn}>
            <span style={{cursor: 'pointer'}}>
              <input
                type='radio'
                id={`${props.id}_${key}`}
                name={`${props.name}_${key}`}
                value={key}
                checked={props.checked === key}
                onChange={handleChange}
                style={styleInput}
              />
              <label htmlFor={`${props.id}_${key}`}
                style={styleLabel}
              >
                {props.options[key]}
              </label>
            </span>
          </div>,
      );
    }
    return <div key={props.name + '_key'} style={styleRow}>
      <label className="label" htmlFor={props.id}>
        <b>
          {props.label} {props.required ?
            <span className="red">*</span> :
            null
          }
          {props.help &&
            <i className='fas fa-question-circle' data-tip={props.help}></i>
          }
        </b>
      </label>
      {content}
    </div>;
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <>
      {generateRadioLayout()}
    </>
  );
};
RadioInput.defaultProps = {
  required: false,
};
RadioInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  required: PropTypes.bool,
  label: PropTypes.string,
  options: PropTypes.object,
  checked: PropTypes.string,
  onUserInput: PropTypes.func,
  help: PropTypes.string,
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
   * generateRadioLayout - creates the radio input layout.
   * @return {JSX.Element}
   */
  const generateSelectLayout = () => {
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
    const styleInput = {
      display: 'inline-block',
      margin: '0 10px 10px 0',
      cursor: 'pointer',
    };

    let emptyOptionHTML = null;
    // Add empty option
    if (props.emptyOption) {
      emptyOptionHTML = <option>{props.emptyOption}</option>;
    }

    const optionList = Object.keys(props.options).map((key, index) => {
      return (
        <option value={key} key={index}>
          {props.options[key]}
        </option>
      );
    });

    return (
      <>
        {props.label &&
          <label className="label" htmlFor={props.id}>
            <b>
              {props.label} {props.required ?
                <span className="red">*</span> :
                null
              }
              {props.help &&
                <i className='fas fa-question-circle' data-tip={props.help}></i>
              }
            </b>
          </label>
        }
        <select
          id={props.id}
          name={props.name}
          value={props.value || ''}
          onChange={handleChange}
          style={styleInput}
        >
          {emptyOptionHTML}
          {optionList}
        </select>
      </>
    );
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <>
      {generateSelectLayout()}
    </>
  );
};
SelectInput.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string,
  value: PropTypes.string,
  emptyOption: PropTypes.string,
  options: PropTypes.object,
  onUserInput: PropTypes.func,
  help: PropTypes.string,
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
      <label className="label" htmlFor={props.id}>
        <b>{props.label}</b>
        {props.help &&
          <i className='fas fa-question-circle' data-tip={props.help}></i>
        }
      </label>
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
  help: PropTypes.string,
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
      <label className="label" htmlFor={props.id}>
        <b>
          {props.label} {props.required ?
            <span className="red">*</span> :
            null
          }
          {props.help &&
            <i className='fas fa-question-circle' data-tip={props.help}></i>
          }
        </b>
      </label>
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

TextareaInput.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string,
  value: PropTypes.string,
  id: PropTypes.string,
  required: PropTypes.bool,
  rows: PropTypes.number,
  cols: PropTypes.number,
  onUserInput: PropTypes.func,
  help: PropTypes.string,
};

TextareaInput.defaultProps = {
  required: false,
  rows: 4,
  cols: 23,
};
