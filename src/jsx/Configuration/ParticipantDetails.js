import React, {useContext} from 'react';
import {AppContext} from '../../context';
import {
  RadioInput,
  TextInput,
  SelectInput,
} from '../elements/inputs';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';


/**
 * Participant Details - the Participant Details component.
 * @param {object} props
 * @return {JSX.Element}
 */
const ParticipantDetails = (props) => {
  const {state, setState} = useContext(AppContext);

  /**
   * onUserInput - input change by user.
   * @param {string} name - element name
   * @param {object|string|boolean} value - element value
   */
  const onUserInput = (name, value) => {
    if (typeof value === 'string') {
      value = value.trim();
    }

    if (name in state) {
      setState({[name]: value});
    }
  };

  const participantHand = (
    <div className='small-pad'>
      <SelectInput id='participantHand'
        name='participantHand'
        label='Handedness'
        value={state.participantHand}
        emptyOption='n/a'
        options={{
          'R': 'Right',
          'L': 'Left',
          'A': 'Ambidextrous',
        }}
        onUserInput={onUserInput}
        help='Required; see BIDS specification for more information'
      />
    </div>
  );

  const participantSex = (
    <div className='small-pad'>
      <SelectInput id='participantSex'
        name='participantSex'
        label='Biological Sex'
        required={true}
        value={state.participantSex}
        emptyOption='n/a'
        options={{
          'female': 'Female',
          'male': 'Male',
          'other': 'Other',
        }}
        onUserInput={onUserInput}
        help='Required; see BIDS specification for more information'
      />
    </div>
  );

  return (
    <>
      <span className='header'>
        Participant Details
      </span>
      <div className='info'>
        {state.LORIScompliant &&
          state.isAuthenticated &&
          <div className='small-pad'>
            <RadioInput id='participantEntryMode'
              name='participantEntryMode'
              label='Entry mode'
              required={true}
              onUserInput={onUserInput}
              options={{
                manual: 'Manual',
                //new_loris: '(beta) Create a LORIS candidate',
                existing_loris: 'Use an existing LORIS candidate',
              }}
              checked={state.participantEntryMode}
              help='Specify participant details manually
              or by lookup in LORIS'
            />
          </div>
        }
        {state.participantEntryMode === 'new_loris' &&
          <>
            <div className='small-pad'>
              <label className="label" htmlFor={props.id}>
                <b>Date of Birth <span className="red">*</span></b>
              </label>
              <DatePicker id='participantDOB'
                name='participantDOB'
                required={true}
                selected={state.participantDOB}
                dateFormat="yyyy-MM-dd"
                onChange={(date) => onUserInput('participantDOB', date)}
              />
            </div>
            {participantSex}
            {participantHand}
          </>
        }
        {state.participantEntryMode === 'existing_loris' &&
          <>
            <div className='small-pad'>
              <TextInput id='participantPSCID'
                name='participantPSCID'
                label='LORIS PSCID'
                required={true}
                value={state.participantPSCID}
                onUserInput={onUserInput}
              />
            </div>
            <div className='small-pad'>
              <TextInput id='participantCandID'
                name='participantCandID'
                label='LORIS DCCID'
                required={true}
                value={state.participantCandID}
                onUserInput={onUserInput}
              />
            </div>
            {participantHand}
          </>
        }
        {state.participantEntryMode === 'manual' &&
          <>
            <div className='small-pad'>
              <TextInput id='participantID'
                name='participantID'
                label='Participant ID'
                required={true}
                value={state.participantID}
                onUserInput={onUserInput}
                bannedCharacters={['-', '_', ' ', '/']}
                help='Study ID (e.g. LORIS PSCID)'
              />
              {state.LORIScompliant &&
                <div><small>Use the LORIS PSCID</small></div>
              }
            </div>
            <div className='small-pad'>
              <TextInput id='participantAge'
                name='participantAge'
                label='Participant age'
                placeholder='n/a'
                value={state.participantAge}
                onUserInput={onUserInput}
                help='Required; see BIDS specification for more information'
              />
            </div>
            {participantSex}
            {participantHand}
          </>
        }
      </div>
    </>
  );
};

export default ParticipantDetails;
