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

    props.onUserInput(props.name, files);
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
      <button className='btn'>
        <label htmlFor={props.name}>
          {
            'Choose file' +
            (props.multiple ? '(s)' : '')
          }
        </label>
      </button>
      <input
        type='file'
        id={props.name}
        multiple={props.multiple}
        name={props.name}
        accept={props.accept}
        style={{display: 'none'}}
        onChange={handleChange}
      /> <a style={{
        fontSize: '14px',
        cursor: 'default',
      }}>{props.placeholder ?? 'No file chosen'}</a>
      {props.error &&
          <div className="input-error">
            {props.error}
          </div>
      }
    </>
  );
};
FileInput.defaultProps = {
  multiple: false,
};
FileInput.propTypes = {
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
    props.onUserInput(props.name, path.filePaths[0]);
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <>
      <label className="label" htmlFor={props.name}>
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
        id={props.name}
        name={props.name}
        value='Choose folder'
        className='btn'
        onClick={handleClick}
      />
      <a style={{fontSize: '14px', cursor: 'default'}}>
        &nbsp;{props.placeholder ?? 'No folder chosen'}
      </a>
    </>
  );
};
DirectoryInput.propTypes = {
  name: PropTypes.string,
  label: PropTypes.string,
  onUserInput: PropTypes.func,
  placeholder: PropTypes.string,
  help: PropTypes.string,
};


/**
 * TaskRunInput - the directory select component.
 * @param {object} props
 * @return {JSX.Element}
 */
export const TaskRunInput = (props) => {
  const myAPI = window['myAPI']; // from public/preload.js

  /**
   * handleClick - button by user.
   * @param {number} index
   */
  const handleClick = async (index) => {
    // Send directory to parent component
    const dialog = await myAPI.dialog();
    const path = await dialog.showOpenDialog({
      properties: props.browseDir ? ['openDirectory'] : ['openFile'],
      filters: [
        {
          name: 'EEG Recordings',
          extensions: props.accept,
        },
      ],
    });
    props.update(props.taskName, index, path.filePaths[0]);
  };

  if (props.value.length && props.value[0].exclude) {
    return (
      <div>
        <label className="label" htmlFor={props.name}>
          <b>{props.label}</b>
        </label>
        {/*
        <TextareaInput
          name={props.name}
          label={`${props.label} exclusion reason`}
          onUserInput={(name, value) =>
            props.exclude(props.taskName, true, value)}
          value={props.value[0].reason}
        />
        */}
        {props.error &&
          <div className="input-error">
            {props.error}
          </div>
        }
        {/* <div> */}
        <button
          type="button"
          className='btn'
          onClick={() => props.exclude(props.taskName, false, '')}
        >
          Include
        </button>
        {/* </div> */}
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
          <label className="label" htmlFor={props.name}>
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
          <label className="label" htmlFor={props.name}>
            <b>{`Run ${index+1}`}</b>
          </label>
      ) }
      <input
        type='button'
        id={props.name}
        name={props.name}
        value='Choose Task Run'
        className='btn'
        onClick={() => handleClick(index)}
        style={{marginRight: '10px'}}
      />
      {(props.value.length > 1) &&
        (<button
          type="button"
          className='btn'
          onClick={props.remove(props.taskName, index)}
        >
          Remove Run -
        </button>)
      }
      <a style={{fontSize: '14px', cursor: 'default'}}>
        &nbsp;{dir.path ?? 'No folder chosen'}
      </a>
      {props.error?.[index] &&
        <div className="input-error">
          {props.error[index]}
        </div>
      }
      {(index == props.value.length - 1) &&
        (<div>
          <button
            type="button"
            className='btn'
            onClick={() => props.add(props.taskName)}
            style={{marginRight: '10px'}}
          >
            Add Run
          </button>
          <button
            type="button"
            className='btn'
            onClick={() =>
              props.exclude(props.taskName, true, '')
            }
          >
            Excluded
          </button>
        </div>)
      }
    </div>
  ));
};
TaskRunInput.propTypes = {
  name: PropTypes.string,
  taskName: PropTypes.string,
  label: PropTypes.string,
  update: PropTypes.func,
  remove: PropTypes.func,
  add: PropTypes.func,
  exclude: PropTypes.func,
  help: PropTypes.string,
  accept: PropTypes.array,
  browseDir: PropTypes.bool,
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
    props.onUserInput(props.name, value);
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <>
      {props.label &&
        <label className="label" htmlFor={props.name}>
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
        id={props.name}
        name={props.name}
        value={props.value}
        onChange={handleChange}
        className={props.readonly ? 'readonly' : null}
        placeholder={props.placeholder}
        readOnly={props.readonly}
      />
      {props.error &&
        <label
          className="input-error"
          style={{paddingLeft: '10px'}}
          htmlFor={props.name}
        >
          {props.error}
        </label>
      }
    </>
  );
};
TextInput.defaultProps = {
  readonly: false,
  required: false,
};
TextInput.propTypes = {
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
  help: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
  ]),
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
        props.name,
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
                id={`${props.name}_${key}`}
                name={`${props.name}_${key}`}
                value={key}
                checked={props.checked === key}
                onChange={handleChange}
                style={styleInput}
              />
              <label htmlFor={`${props.name}_${key}`}
                style={styleLabel}
              >
                {props.options[key]}
              </label>
            </span>
          </div>,
      );
    }
    return <div key={props.name + '_key'} style={styleRow}>
      <label className="label" htmlFor={props.name}>
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
        props.name,
        event.target.value,
    );
  };
  /**
   * generateRadioLayout - creates the radio input layout.
   * @return {JSX.Element}
   */
  const generateSelectLayout = () => {
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
          <label className="label" htmlFor={props.name}>
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
          id={props.name}
          name={props.name}
          value={props.value || ''}
          onChange={handleChange}
          style={styleInput}
        >
          {emptyOptionHTML}
          {optionList}
        </select>
        <div>
          {props.error &&
            <label className="input-error" htmlFor={props.name}>
              {props.error}
            </label>
          }
        </div>
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
        props.name,
        event.target.value,
    );
  };
  /**
   * Renders the React component.
   * @return {JSX.Element} - React markup for component.
   */
  return (
    <>
      <label className="label" htmlFor={props.name}>
        <b>{props.label}</b>
        {props.help &&
          <i className='fas fa-question-circle' data-tip={props.help}></i>
        }
      </label>
      <input
        type='number'
        id={props.name}
        name={props.name}
        value={props.value}
        onChange={handleChange}
        placeholder={props.placeholder}
      />
    </>
  );
};
NumberInput.propTypes = {
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
      <label
        className="label"
        htmlFor={props.name}
        style={{paddingBottom: '10px'}}
      >
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
        id={props.name}
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
