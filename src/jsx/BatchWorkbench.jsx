import React, {useContext, useEffect, useMemo, useState} from 'react';
import PropTypes from 'prop-types';
import {AppContext} from '../context';
import '../css/BatchWorkbench.css';

import {FileInput, DirectoryInput} from './elements/inputs';
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
import {discoverRecordings, ATTENTION_REASONS} from './types/batchDiscovery';
import {inferRecordingFields, prefillFromPaths} from './types/batchInference';

// Human-readable explanation for each reason a discovered file is held out of
// the ready conversion set. Keyed by the discovery module's reason codes.
const ATTENTION_LABELS = {
  [ATTENTION_REASONS.UNKNOWN]: 'Unrecognized file',
  [ATTENTION_REASONS.ORPHAN_COMPANION]: 'Companion with no recording',
  [ATTENTION_REASONS.DUPLICATE_CANDIDATE]: 'Ambiguous duplicate',
};

/**
 * pluralize - a count with its noun, adding a plural "s" unless the count is 1.
 * @param {number} count - the quantity
 * @param {string} noun - the singular noun
 * @return {string} e.g. "1 file" or "3 files"
 */
const pluralize = (count, noun) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

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
   * A field still holding the value read from its filename entity is marked
   * "from filename"; the mark disappears once the user edits it away.
   * @param {object} row - the recording row
   * @param {string} name - the assignment field name
   * @param {string} placeholder - the input placeholder
   * @param {Object<string, string>} inferred - proven values for this row
   * @return {JSX.Element}
   */
  const field = (row, name, placeholder, inferred) => {
    const fromFilename = !!inferred[name] && inferred[name] === row[name];
    return (
      <div className='bw-cell'>
        <input
          className={row.errors[name] ? 'bw-input bw-invalid' : 'bw-input'}
          value={row[name]}
          placeholder={placeholder}
          title={row.errors[name] || ''}
          aria-label={`${name} for ${row.filename}`}
          onChange={(e) => onChange(row.id, {[name]: e.target.value})}
        />
        {fromFilename && <small className='bw-from'>from filename</small>}
      </div>
    );
  };

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
      {rows.map((row) => {
        const inferred = inferRecordingFields(row);
        return (
          <div className='bw-row' role='row' key={row.id}>
            <span className='bw-file' title={row.sourceFile}>
              <strong>{row.filename}</strong>
              <small>{row.sourceFile}</small>
              {row.companions && row.companions.length > 0 && (
                <small
                  className='bw-companions'
                  title={row.companions.join('\n')}
                >
                  + {pluralize(row.companions.length, 'companion file')}
                </small>
              )}
            </span>
            {field(row, 'participant', 'Required', inferred)}
            {field(row, 'session', 'Optional', inferred)}
            {field(row, 'task', 'Required', inferred)}
            {field(row, 'run', 'Optional', inferred)}
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
        );
      })}
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
 * NeedsAttentionPanel - files discovery could not confidently import.
 * Each entry names why it was held out of the ready set and shows its full
 * source path so the user can trace and resolve it. These files are excluded
 * from conversion by default.
 * @param {object} props
 * @param {object[]} props.items - needs-attention entries from discovery
 * @return {JSX.Element}
 */
const NeedsAttentionPanel = ({items}) => {
  if (items.length === 0) {
    return (
      <p className='bw-empty'>
        Nothing needs attention. Scan a folder to check for unrecognized,
        duplicate, or orphaned files; they will be listed here and kept out of
        the batch.
      </p>
    );
  }
  return (
    <div className='bw-attention'>
      {items.map((item) => (
        <div className='bw-attention-row' key={item.path}>
          <span className='bw-badge bw-unready'>
            {ATTENTION_LABELS[item.reason] || 'Needs attention'}
          </span>
          <span className='bw-file' title={item.path}>
            <strong>{item.filename}</strong>
            <small>{item.path}</small>
          </span>
        </div>
      ))}
    </div>
  );
};
NeedsAttentionPanel.propTypes = {
  items: PropTypes.array,
};

/**
 * addAndPrefill - append recordings, then pre-fill only the new rows.
 * Pre-filling is scoped to the rows just added so a field the user has already
 * edited or cleared on an existing row is never re-filled.
 * @param {object} manifest - the current manifest
 * @param {Array<object>} files - files to add (see addRecordings)
 * @return {object} a new manifest with the new rows added and pre-filled
 */
const addAndPrefill = (manifest, files) => {
  const withAdded = addRecordings(manifest, files);
  const existing = new Set(manifest.recordings.map((row) => row.id));
  const newIds = withAdded.recordings
      .filter((row) => !existing.has(row.id))
      .map((row) => row.id);
  return prefillFromPaths(withAdded, newIds);
};

/**
 * BatchWorkbench - manually populated batch import workbench.
 *
 * Users add recording entry-point files (by selection or by scanning a
 * folder); each becomes one independently editable recording row with explicit
 * participant, session, task and run assignments. Any metadata stated by a
 * canonical BIDS entity in the source path (e.g. `sub-01`, `task-rest`) is
 * pre-filled into the row on import and marked "from filename"; everything else
 * is left blank for the user. Participant IDs can be renamed with the change
 * propagating to every linked recording, and each row exposes its own
 * readiness. The validated manifest is published to the app context as
 * `batchManifest` for later slices (preview, conversion) to consume.
 * @param {object} props
 * @param {boolean} props.visible - whether this view is active
 * @return {JSX.Element}
 */
const BatchWorkbench = (props) => {
  const appContext = useContext(AppContext);
  const [manifest, setManifest] = useState(createManifest());
  const [section, setSection] = useState('recordings');
  const [needsAttention, setNeedsAttention] = useState([]);
  const [scanInfo, setScanInfo] = useState(null);
  const [scanning, setScanning] = useState(false);

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
    setManifest((current) => addAndPrefill(current, files.map((file) => ({
      name: file.name,
      path: file.path,
    }))));
  };

  /**
   * onScanFolder - recursively discover recordings under a chosen folder.
   * The main process walks the tree; the pure discovery module classifies the
   * paths into recording rows (with companions linked) and needs-attention
   * items. Discovered recordings are appended to the manifest (duplicates by
   * source path are ignored) and the attention list replaces the last scan's.
   * @param {string} _ - input id (unused)
   * @param {string} root - the selected root folder
   */
  const onScanFolder = async (_, root) => {
    if (!root || !window.eeg2bids?.scanDirectory) return;
    setScanning(true);
    try {
      const paths = await window.eeg2bids.scanDirectory(root);
      const result = discoverRecordings(paths);
      setManifest((current) => addAndPrefill(current,
          result.recordings.map((rec) => ({
            name: rec.filename,
            path: rec.sourceFile,
            format: rec.format,
            companions: rec.companions,
          }))));
      setNeedsAttention(result.needsAttention);
      setScanInfo({
        root,
        scannedCount: result.scannedCount,
        recordingCount: result.recordings.length,
      });
    } finally {
      setScanning(false);
    }
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
        <div className='small-pad'>
          <DirectoryInput id='batchScanFolder'
            name='batchScanFolder'
            label='Or discover recordings in a folder'
            placeholder={scanInfo ? scanInfo.root : 'No folder scanned'}
            onUserInput={onScanFolder}
            help='Recursively scans the selected folder for supported
            recordings. Companion files are grouped with their recording;
            unrecognized, orphaned, or ambiguous files are listed under Needs
            attention and left out of the batch.'
          />
          <div>
            <small>
              {scanning ?
                'Scanning folder…' :
                scanInfo ?
                  `Scanned ${pluralize(scanInfo.scannedCount, 'file')}: ` +
                    `${pluralize(scanInfo.recordingCount, 'recording')} ` +
                    `found, ${needsAttention.length} flagged for attention.` :
                  'Discovery finds recordings at any nesting depth.'}
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
        <button
          type='button'
          className={section === 'attention' ? 'active' : ''}
          onClick={() => setSection('attention')}
        >
          Needs attention ({needsAttention.length})
        </button>
      </div>

      {section === 'participants' ? (
        <ParticipantsPanel
          participants={participants}
          onRename={onRenameParticipant}
        />
      ) : section === 'attention' ? (
        <NeedsAttentionPanel items={needsAttention}/>
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
