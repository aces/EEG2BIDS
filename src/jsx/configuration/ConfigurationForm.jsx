import React from 'react';
import {Tooltip} from 'react-tooltip';
import Switch from 'react-switch';
import {
  DirectoryInput, FileInput, RadioInput, TextInput, SelectInput,
  TextareaInput,
} from '../elements/inputs';
import {
  AuthenticationMessage, AuthenticationCredentials,
} from '../elements/authentication';
import {recordingDateFormat} from './recordingDateFormat';

const arrayToObject = (values) =>
  Object.fromEntries(values.map((value) => [value, value]));

/**
 * Editable conversion fields; no socket or task-store ownership.
 * @param {object} props
 * @return {JSX.Element}
 */
const ConfigurationForm = ({form, onUserInput, reset, isAuthenticated,
  authCredentialsVisible, setAuthCredentialsVisible}) => (
  <>
    <div className='container'>
      <AuthenticationMessage
        setAuthCredentialsVisible={setAuthCredentialsVisible}
      />
      <div className='small-pad resetBtn'>
        <input type='button'
          className='primary-btn'
          onClick={reset}
          value='Clear all fields below'
        />
      </div>
    </div>
    <span className='header'>
      Recording data
    </span>
    <div className='info'>
      <div className='small-pad'>
        <FileInput id='recordingFiles'
          name='recordingFiles'
          multiple={true}
          accept='.edf,.EDF,.set,.SET'
          placeholder={
            form.recordingFiles
                .map((recordingFile) => recordingFile['name']).join(', ')
          }
          label='Recording to convert'
          required={true}
          onUserInput={onUserInput}
          help='Filename(s) must be formatted correctly:
          e.g. [subjectID]_[sessionLabel]_[taskName]_[run-1]_ieeg.edf'
        />
        <div>
          <small>
            Multiple files can be selected for a single recording
          </small>
        </div>
      </div>
      <div className='small-pad'>
        <DirectoryInput id='bidsDirectory'
          name='bidsDirectory'
          required={true}
          label='BIDS output folder'
          placeholder={form.bidsDirectory}
          onUserInput={onUserInput}
          help='Where the BIDS-compliant folder will be created'
        />
      </div>
      <div className='small-pad'>
        <RadioInput id='modality'
          name='modality'
          label='Data Modality'
          required={true}
          onUserInput={onUserInput}
          options={{
            ieeg: 'Stereo iEEG',
            eeg: 'EEG',
          }}
          checked={form.modality}
          help='If any intracranial (stereo) channels, select Stereo iEEG'
        />
      </div>
      <div className='small-pad'>
        <SelectInput id='outputFormat'
          name='outputFormat'
          label='Output format'
          value={form.outputFormat}
          options={{
            auto: 'Auto (keep source, EDF when converting)',
            EDF: 'EDF',
            BrainVision: 'BrainVision',
            EEGLAB: 'EEGLAB',
          }}
          onUserInput={onUserInput}
          help='Auto preserves a BIDS-compatible source format and
          recommends EDF when the recording must be converted'
        />
      </div>
      <div className='small-pad'>
        <RadioInput id='LORIScompliant'
          name='LORIScompliant'
          label='Will this data be loaded in LORIS?'
          required={true}
          onUserInput={onUserInput}
          options={{
            yes: 'Yes',
            no: 'No',
          }}
          checked={form.LORIScompliant ? 'yes' : 'no'}
          help='Select Yes if research datasets will be stored
          in a LORIS data platform'
        />
      </div>
    </div>
    <span className='header'>
      Recording metadata
      <div className='header-hint'>
        ⓘ For details please see BIDS specification
      </div>
    </span>
    <div className='info'>
      <small>Events file names must match one of the recording file names.
      </small>
    </div>
    <div className='container'>
      <div className='info half'>
        <div className='small-pad'>
          <FileInput id='bidsMetadataFile'
            name='bidsMetadataFile'
            accept='.json'
            placeholder={
              form.bidsMetadataFile.map(
                  (bidsMetadataFile) => bidsMetadataFile['name'],
              ).join(', ')
            }
            label='Recording Parameters (json)'
            onUserInput={onUserInput}
            help='Used to contribute non-required fields to *.json BIDS
            parameter file. See BIDS spec and template available with
            this release. Blank fields ignored.'
          />
        </div>
      </div>
      <div className='info half'>
        <div className='small-pad'>
          <FileInput id='eventFiles'
            name='eventFiles'
            multiple={true}
            accept='.tsv'
            placeholder={
              form.eventFiles.map(
                  (eventFile) => eventFile['name'],
              ).join(', ')
            }
            label='events.tsv (additional)'
            onUserInput={onUserInput}
            help='Optional additional BIDS events. Time-based markers
            embedded in the recording are extracted automatically and
            merged with this file.'
          />
        </div>
      </div>
    </div>
    <span className='header'>
      Recording details
    </span>
    <div className='container'>
      <div className='info half'>
        <div className='small-pad'>
          <TextInput id='taskName'
            name='taskName'
            required={true}
            label='Task Name'
            value={form.taskName}
            onUserInput={onUserInput}
            bannedCharacters={['-', '_', ' ', '/']}
            help='Task, stimulus, state or experimental context.
            See BIDS specification for more information.'
          />
        </div>
        {form.LORIScompliant && [
          ['siteID', 'Site', 'Study Centre',
            form.siteOptions, form.siteUseAPI],
          ['projectID', 'Project', 'Study',
            form.projectOptions, form.projectUseAPI],
          ['subprojectID', 'Subproject', 'Subproject or population cohort',
            form.subprojectOptions, form.subprojectUseAPI],
        ].map(([field, label, tooltip, options, useAPI]) =>
          <div className='small-pad' key={field}>
            <label className="label" htmlFor={`#${field}_API`}>
              <b>
                {label} <span className="red">*</span>
                <i className='fas fa-question-circle'
                  data-tooltip-content={tooltip}
                />
              </b>
            </label>
            <div className='comboField'>
              <SelectInput id={`${field}_API`}
                name={`${field}_API`}
                label=''
                required={true}
                value={form[field]}
                emptyOption='Enter manually'
                options={arrayToObject(options)}
                onUserInput={onUserInput}
              />
              {!useAPI &&
                <TextInput id={`${field}_Manual`}
                  name={`${field}_Manual`}
                  label=''
                  placeholder='n/a'
                  value={form[field]}
                  onUserInput={onUserInput}
                />
              }
            </div>
          </div>,
        )}
        <div className='small-pad'>
          <label className="label" htmlFor='#session_API'>
            <b>
              Session <span className="red">*</span>
              <i className='fas fa-question-circle'
                data-tooltip-content='Visit or TimePoint Label'
              />
            </b>
            {form.LORIScompliant &&
              <div><small>(LORIS Visit Label)</small></div>
            }
          </label>
          <div className='comboField'>
            {form.LORIScompliant &&
              <SelectInput id='session_API'
                name='session_API'
                label=''
                required={true}
                value={form.session}
                emptyOption='Enter manually'
                options={arrayToObject(form.sessionOptions)}
                onUserInput={onUserInput}
              />
            }
            {!form.sessionUseAPI &&
              <TextInput id='session_Manual'
                name='session_Manual'
                label=''
                required={!form.LORIScompliant}
                value={form.session}
                bannedCharacters={['-', '_', ' ', '/']}
                onUserInput={onUserInput}
              />
            }
          </div>
        </div>
      </div>
      <div className='info half'>
        <div className='small-pad'>
          <TextareaInput id='reference'
            name='reference'
            required={true}
            label='Reference'
            value={form.reference}
            onUserInput={onUserInput}
            help='See BIDS specification for more information'
          />
        </div>
        <div className='small-pad'>
          <SelectInput id='lineFreq'
            name='lineFreq'
            label='Powerline Frequency'
            value={form.lineFreq}
            emptyOption='n/a'
            options={{
              '50': '50',
              '60': '60',
            }}
            onUserInput={onUserInput}
            help='See BIDS specification for more information'
          />
        </div>
        <div className='small-pad'>
          <SelectInput id='recordingType'
            name='recordingType'
            label='Recording Type'
            value={form.recordingType}
            emptyOption='n/a'
            options={{
              'continuous': 'Continuous',
              'discontinuous': 'Discontinuous',
              'epoched': 'Epoched',
            }}
            onUserInput={onUserInput}
            help='See BIDS specification for more information'
          />
        </div>
      </div>
    </div>
    <span className='header'>
      Participant Details
    </span>
    <div className='info'>
      {form.LORIScompliant &&
        isAuthenticated &&
        <div className='small-pad'>
          <RadioInput id='participantEntryMode'
            name='participantEntryMode'
            label='Entry mode'
            required={true}
            onUserInput={onUserInput}
            options={isAuthenticated === true ?
              {
                manual: 'Manual',
                existing_loris: 'Use an existing LORIS candidate',
              } :
              {
                manual: 'Manual',
              }
            }
            checked={form.participantEntryMode}
            help='Specify participant details manually
            or by lookup in LORIS'
          />
        </div>
      }
      {form.participantEntryMode === 'existing_loris' &&
        <>
          <div className='small-pad'>
            <TextInput id='participantPSCID'
              name='participantPSCID'
              label='LORIS PSCID'
              required={true}
              value={form.participantPSCID}
              onUserInput={onUserInput}
            />
          </div>
          <div className='small-pad'>
            <TextInput id='participantCandID'
              name='participantCandID'
              label='LORIS DCCID'
              required={true}
              value={form.participantCandID}
              onUserInput={onUserInput}
            />
          </div>
        </>
      }
      {form.participantEntryMode === 'manual' &&
        <>
          <div className='small-pad'>
            <TextInput id='participantID'
              name='participantID'
              label='Participant ID'
              required={true}
              value={form.participantID}
              onUserInput={onUserInput}
              bannedCharacters={['-', '_', ' ', '/']}
              help='Study ID (e.g. LORIS PSCID)'
            />
            {form.LORIScompliant &&
              <div><small>Use the LORIS PSCID</small></div>
            }
          </div>
          <div className='small-pad'>
            <TextInput id='participantAge'
              name='participantAge'
              label='Participant age'
              placeholder='n/a'
              value={form.participantAge}
              onUserInput={onUserInput}
              help='Participant age at the time of data acquisition'
            />
          </div>
          <div className='small-pad'>
            <SelectInput id='participantSex'
              name='participantSex'
              label='Biological Sex'
              value={form.participantSex}
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
        </>
      }
      <div className='small-pad'>
        <SelectInput id='participantHand'
          name='participantHand'
          label='Handedness'
          value={form.participantHand}
          emptyOption='n/a'
          options={{R: 'Right', L: 'Left', A: 'Ambidextrous'}}
          onUserInput={onUserInput}
          help='Required; see BIDS specification for more information'
        />
      </div>
    </div>
    <span className='header'>
      Recording Details
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
          checked={form.anonymize}
          disabled={!form.recordingData?.files?.length}
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
            value={form.recordingData['subjectID'] || ''}
            onUserInput={onUserInput}
            readonly={form.recordingData?.files?.length <= 0}
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
            value={form.recordingData?.['recordingID'] || ''}
            onUserInput={onUserInput}
            readonly={form.recordingData?.files?.length <= 0}
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
            value={form.recordingData?.['date'] ?
              recordingDateFormat.format(form.recordingData['date']) :
              ''
            }
          />
        </div>
      </div>
    </div>
    <AuthenticationCredentials
      title='Login to LORIS'
      show={authCredentialsVisible}
      close={() => setAuthCredentialsVisible(false)}
      width='500px'
    />
    <Tooltip anchorSelect='[data-tooltip-content]'/>
  </>
);

export default ConfigurationForm;
