import React, {useContext, useEffect, useMemo, useState} from 'react';
import PropTypes from 'prop-types';
import {AppContext} from '../context';
import '../css/BatchWorkbench.css';

import {FileInput} from './elements/inputs';
import {
  createManifest,
  addRecordings,
  updateRecording,
  removeRecording,
  renameParticipant,
  validateManifest,
  getParticipants,
  toManifest,
} from './types/batchManifest';

/**
 * ReadinessBadge - per-row readiness indicator.
 * @param {object} props
 * @param {boolean} props.ready - whether the row is ready
 * @param {Object<string, string>} props.errors - field errors, if any
 * @return {JSX.Element}
 */
const ReadinessBadge = ({ready, errors}) => {
  if (ready) {
    return <span className='bw-badge bw-ready'>Ready</span>;
  }
  const title = Object.values(errors).join('\n');
  return (
    <span className='bw-badge bw-unready' title={title}>
      Needs attention
    </span>
  );
};
ReadinessBadge.propTypes = {
  ready: PropTypes.bool,
  errors: PropTypes.object,
};

/**
 * RecordingsTable - one independently editable row per recording.
 * @param {object} props
 * @param {object[]} props.rows - validated recordings
 * @param {function} props.onChange - (id, changes) assignment handler
 * @param {function} props.onRemove - (id) remove handler
 * @return {JSX.Element}
 */
const RecordingsTable = ({rows, onChange, onRemove}) => {
  if (rows.length === 0) {
    return (
      <p className='bw-empty'>
        No recordings yet. Select one or more recording files above to
        populate the batch.
      </p>
    );
  }

  /**
   * field - an inline assignment input flagged when invalid.
   * @param {object} row - the recording row
   * @param {string} name - the assignment field name
   * @param {string} placeholder - the input placeholder
   * @return {JSX.Element}
   */
  const field = (row, name, placeholder) => (
    <input
      className={row.errors[name] ? 'bw-input bw-invalid' : 'bw-input'}
      value={row[name]}
      placeholder={placeholder}
      title={row.errors[name] || ''}
      aria-label={`${name} for ${row.filename}`}
      onChange={(e) => onChange(row.id, {[name]: e.target.value})}
    />
  );

  return (
    <div className='bw-table' role='table'>
      <div className='bw-row bw-head' role='row'>
        <span>Source file</span>
        <span>Participant <em>*</em></span>
        <span>Session</span>
        <span>Task <em>*</em></span>
        <span>Run</span>
        <span>Status</span>
        <span/>
      </div>
      {rows.map((row) => (
        <div className='bw-row' role='row' key={row.id}>
          <span className='bw-file' title={row.sourceFile}>
            <strong>{row.filename}</strong>
            <small>{row.sourceFile}</small>
          </span>
          {field(row, 'participant', 'Required')}
          {field(row, 'session', 'Optional')}
          {field(row, 'task', 'Required')}
          {field(row, 'run', 'Optional')}
          <ReadinessBadge ready={row.ready} errors={row.errors}/>
          <button
            type='button'
            className='bw-remove'
            aria-label={`Remove ${row.filename}`}
            title='Remove from batch'
            onClick={() => onRemove(row.id)}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};
RecordingsTable.propTypes = {
  rows: PropTypes.array,
  onChange: PropTypes.func,
  onRemove: PropTypes.func,
};

/**
 * ParticipantsPanel - rename participants with propagation to linked rows.
 * @param {object} props
 * @param {object[]} props.participants - distinct assigned participants
 * @param {function} props.onRename - (fromId, toId) rename handler
 * @return {JSX.Element}
 */
const ParticipantsPanel = ({participants, onRename}) => {
  if (participants.length === 0) {
    return (
      <p className='bw-empty'>
        No participants assigned yet. Assign a participant to a recording to
        see it here. Renaming a participant updates every linked recording.
      </p>
    );
  }
  return (
    <div className='bw-participants'>
      {participants.map((person) => (
        <div className='bw-person' key={person.participant}>
          <label>
            Participant ID
            <input
              className='bw-input'
              defaultValue={person.participant}
              aria-label={`Rename participant ${person.participant}`}
              onBlur={(e) => {
                const next = e.target.value.trim();
                // A blank or unchanged target is a no-op rename that returns
                // the same manifest (so no re-render restores the field);
                // snap the input back to the current label to stay in sync.
                if (!next || next === person.participant) {
                  e.target.value = person.participant;
                  return;
                }
                onRename(person.participant, next);
              }}
            />
          </label>
          <small>
            {person.count} linked recording{person.count === 1 ? '' : 's'} ·
            renaming updates all
          </small>
        </div>
      ))}
    </div>
  );
};
ParticipantsPanel.propTypes = {
  participants: PropTypes.array,
  onRename: PropTypes.func,
};

/**
 * BatchWorkbench - manually populated batch import workbench.
 *
 * Users select multiple recording entry-point files; each becomes one
 * independently editable recording row with explicit participant, session,
 * task and run assignments. Participant IDs can be renamed with the change
 * propagating to every linked recording, and each row exposes its own
 * readiness. The validated manifest is published to the app context as
 * `batchManifest` for later slices (discovery, preview, conversion) to
 * consume. Recursive discovery and conversion are out of scope here.
 * @param {object} props
 * @param {boolean} props.visible - whether this view is active
 * @return {JSX.Element}
 */
const BatchWorkbench = (props) => {
  const appContext = useContext(AppContext);
  const [manifest, setManifest] = useState(createManifest());
  const [section, setSection] = useState('recordings');

  const validated = useMemo(() => validateManifest(manifest), [manifest]);
  const participants = useMemo(() => getParticipants(manifest), [manifest]);

  // Publish the explicit, validated manifest as the contract later slices
  // consume. Kept in the shared app task context alongside the rest of the
  // wizard's state.
  useEffect(() => {
    appContext.setTask('batchManifest', toManifest(manifest));
  }, [manifest]);

  /**
   * onSelectFiles - add one recording row per selected entry-point file.
   * @param {string} _ - input id (unused)
   * @param {File[]} files - selected files with a resolved native path
   */
  const onSelectFiles = (_, files) => {
    setManifest((current) => addRecordings(current, files.map((file) => ({
      name: file.name,
      path: file.path,
    }))));
  };

  const onChangeRow = (id, changes) =>
    setManifest((current) => updateRecording(current, id, changes));

  const onRemoveRow = (id) =>
    setManifest((current) => removeRecording(current, id));

  const onRenameParticipant = (fromId, toId) =>
    setManifest((current) => renameParticipant(current, fromId, toId));

  const {totalCount, readyCount} = validated;
  const percent = totalCount ? Math.round((readyCount / totalCount) * 100) : 0;

  return props.visible ? (
    <>
      <span className='header'>
        Batch workbench
      </span>
      <div className='info'>
        <div className='small-pad'>
          <FileInput id='batchRecordings'
            name='batchRecordings'
            multiple={true}
            accept='.edf,.EDF,.set,.SET'
            placeholder='Select recording file(s)'
            label='Add recordings to the batch'
            onUserInput={onSelectFiles}
            help='Each selected recording becomes one editable row. Assign a
            participant and task per recording; session and run are optional.'
          />
          <div>
            <small>
              Select multiple recordings to review and assign them as one
              batch.
            </small>
          </div>
        </div>
      </div>

      <div
        className='bw-summary'
        data-testid='batch-summary'
        data-total={totalCount}
        data-ready={readyCount}
      >
        <span><b>{participants.length}</b> participants</span>
        <span><b>{totalCount}</b> recordings</span>
        <span><b>{readyCount}</b> ready</span>
        <div className='bw-meter' aria-hidden='true'>
          <i style={{width: `${percent}%`}}/>
        </div>
      </div>

      <div className='bw-tabs'>
        <button
          type='button'
          className={section === 'recordings' ? 'active' : ''}
          onClick={() => setSection('recordings')}
        >
          Recordings ({totalCount})
        </button>
        <button
          type='button'
          className={section === 'participants' ? 'active' : ''}
          onClick={() => setSection('participants')}
        >
          Participants ({participants.length})
        </button>
      </div>

      {section === 'participants' ? (
        <ParticipantsPanel
          participants={participants}
          onRename={onRenameParticipant}
        />
      ) : (
        <RecordingsTable
          rows={validated.recordings}
          onChange={onChangeRow}
          onRemove={onRemoveRow}
        />
      )}
    </>
  ) : null;
};
BatchWorkbench.propTypes = {
  visible: PropTypes.bool,
};

export default BatchWorkbench;
