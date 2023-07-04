import React, {useContext, useState} from 'react';
import {AppContext} from '../../context';
import Switch from 'react-switch';

import {
  TextInput,
} from '../elements/inputs';

/**
 * EDF Header Data - the EDF Header Data component.
 * @param {object} props
 * @return {JSX.Element}
 */
const HeaderData = (props) => {
  const {state, setState} = useContext(AppContext);
  const [anonymize, setAnonymize] = useState(false);

  /**
   * onUserInput - input change by user.
   * @param {string} name - element name
   * @param {object|string|boolean} value - element value
   */
  const onUserInput = (name, value) => {
    if (typeof value === 'string') {
      value = value.trim();
    }

    switch (name) {
      case 'anonymize': {
        let subjectID = state.subjectID;
        if (value) {
          subjectID = 'X X X X';
        }
        setState({
          edfData: (prevState) => {
            return {...prevState, subjectID: subjectID};
          },
          subjectID: subjectID,
        });
        setAnonymize(value);
        break;
      }
      case 'recordingID':
        setState({
          edfData: (prevState) => {
            return {...prevState, [name]: value};
          },
          [name]: value,
        });
        break;

      case 'subjectID':
        setState({
          edfData: (prevState) => {
            return {...prevState, [name]: value};
          },
          subjectID: value,
          [name]: value,
        });
        break;
      default:
        if (name in state) {
          setState({[name]: value});
        }
    }
  };

  return (
    <>
      <span className='header'>
        Recordings Header Data
        <label style={{
          position: 'absolute',
          left: '20px',
          fontSize: '16px',
          verticalAlign: 'middle',
        }}>
          <Switch
            className='react-switch'
            onColor="#86d3ff"
            onHandleColor="#2693e6"
            handleDiameter={20}
            uncheckedIcon={false}
            checkedIcon={false}
            boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
            activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
            height={15}
            width={40}
            name='anonymize'
            onChange={(checked) => onUserInput('anonymize', checked)}
            checked={anonymize}
            disabled={state.edfData?.files?.length > 0 ? false : true}
          />
          <span>Anonymize</span>
        </label>
      </span>
      <div className='info-flex-container'>
        <div className='container'>
          <div className='half small-pad'>
            <TextInput id='subjectID'
              name='subjectID'
              label='Subject ID'
              value={state.edfData?.['subjectID'] || ''}
              onUserInput={onUserInput}
              readonly={state.edfData?.files?.length > 0 ? false : true}
            />
            <div>
              <small>Recommended EDF anonymization: "X X X X"<br/>
              (EDF spec: patientID patientSex patientBirthdate patientName)
              </small>
            </div>
          </div>
          <div className='half small-pad'>
            <TextInput id='recordingID'
              name='recordingID'
              label='Recording ID'
              value={state.edfData?.['recordingID'] || ''}
              onUserInput={onUserInput}
              readonly={state.edfData?.files?.length > 0 ? false : true}
            />
            <div>
              <small>(EDF spec: Startdate dd-MMM-yyyy
                administrationCode investigatorCode equipmentCode)
              </small>
            </div>
          </div>
          <div className='small-pad half'>
            <TextInput id='recording_date'
              name='recording_date'
              label='Recording Date'
              readonly={true}
              value={state.edfData?.['date'] ?
                  new Intl.DateTimeFormat(
                      'en-US',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                      },
                  ).format(state.edfData['date']) :
                  ''
              }
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default HeaderData;
