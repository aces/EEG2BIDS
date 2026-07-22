import React, {useContext, useEffect, useMemo, useState} from 'react';
import PropTypes from 'prop-types';
import {AppContext} from '../context';
import '../css/BatchWorkbench.css';

import {FileInput, DirectoryInput} from './elements/inputs';
import {
  createManifest,
  addRecordings,
  updateRecording,
  bulkAssign,
  removeRecording,
  renameParticipant,
  updateDemographics,
  findParticipantConflicts,
  validateManifest,
  getParticipants,
  toManifest,
  ASSIGNMENT_FIELDS,
  DEMOGRAPHIC_FIELDS,
} from './types/batchManifest';
import {discoverRecordings, ATTENTION_REASONS} from './types/batchDiscovery';
import {inferRecordingFields, prefillFromPaths} from './types/batchInference';
import {
  previewMapping,
  applyMapping,
  MAPPING_FIELDS,
  MAPPING_SOURCES,
} from './types/batchMapping';

// Human-readable explanation for each reason a discovered file is held out of
// the ready conversion set. Keyed by the discovery module's reason codes.
const ATTENTION_LABELS = {
  [ATTENTION_REASONS.UNKNOWN]: 'Unrecognized file',
  [ATTENTION_REASONS.ORPHAN_COMPANION]: 'Companion with no recording',
  [ATTENTION_REASONS.DUPLICATE_CANDIDATE]: 'Ambiguous duplicate',
};

// Fixed option lists for the demographic selectors (BIDS participants.tsv
// conventions). Age is free text so ranges and units stay the user's choice.
const DEMOGRAPHIC_OPTIONS = {
  sex: ['n/a', 'F', 'M', 'O'],
  handedness: ['n/a', 'R', 'L', 'A'],
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
 * BulkAssignBar - assign fixed values to every selected recording in one action.
 * Any subset of participant/session/task/run can be set together; a field left
 * blank is not touched, so a bulk change never clears assignments outside what
 * the user typed and unselected rows and unentered fields stay as they were.
 * Any row can still be corrected individually afterwards. Disabled until at
 * least one recording is selected.
 * @param {object} props
 * @param {number} props.selectedCount - number of selected recordings
 * @param {function} props.onApply - (changes) bulk-assign handler
 * @return {JSX.Element}
 */
const BulkAssignBar = ({selectedCount, onApply}) => {
  const [values, setValues] = useState({});
  const active = selectedCount > 0;

  const setField = (field, value) =>
    setValues((current) => ({...current, [field]: value}));

  // Only non-blank fields are assigned, so a blank field is "leave as-is"
  // rather than "clear", preserving assignments the user did not touch.
  const changes = ASSIGNMENT_FIELDS.reduce((acc, field) => {
    const value = (values[field] || '').trim();
    if (value) acc[field] = value;
    return acc;
  }, {});
  const hasInput = Object.keys(changes).length > 0;

  const apply = () => {
    if (!active || !hasInput) return;
    onApply(changes);
    setValues({});
  };

  return (
    <div className={active ? 'bw-bulk active' : 'bw-bulk'}>
      <b>
        {active ?
          `${pluralize(selectedCount, 'recording')} selected` :
          'Select recordings to bulk-edit or map'}
      </b>
      {ASSIGNMENT_FIELDS.map((field) => (
        <label key={field}>
          {field}
          <input
            className='bw-input'
            value={values[field] || ''}
            disabled={!active}
            placeholder='—'
            aria-label={`Bulk ${field}`}
            onChange={(e) => setField(field, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') apply();
            }}
          />
        </label>
      ))}
      <button
        type='button'
        className='bw-btn'
        disabled={!active || !hasInput}
        onClick={apply}
      >
        Apply to {selectedCount} selected
      </button>
    </div>
  );
};
BulkAssignBar.propTypes = {
  selectedCount: PropTypes.number,
  onApply: PropTypes.func,
};

/**
 * TokenMappingPanel - define, preview, and confirm a filename/path token
 * mapping. The user describes exactly how to read a value from each recording's
 * path (source, delimiter, segment, optional regex transform) and which field
 * it becomes; the live preview shows the extracted value and every affected
 * recording BEFORE anything changes. Nothing is guessed and no prefix is
 * silently stripped: the mapping is entirely the user's structure. Applying it
 * writes plain assignments, so it never has to be rerun.
 * @param {object} props
 * @param {object} props.manifest - the current manifest (read for preview)
 * @param {string[]} props.selectedIds - recordings the mapping applies to
 * @param {function} props.onApply - (spec, ids) confirmed-mapping handler
 * @return {JSX.Element}
 */
const TokenMappingPanel = ({manifest, selectedIds, onApply}) => {
  const [spec, setSpec] = useState({
    source: 'filename',
    delimiter: '_',
    index: 0,
    pattern: '',
    field: 'participant',
  });

  const active = selectedIds.length > 0;
  const updateSpec = (changes) =>
    setSpec((current) => ({...current, ...changes}));

  const preview = useMemo(
      () => previewMapping(manifest, spec, selectedIds),
      [manifest, spec, selectedIds],
  );

  const canApply = active && !preview.patternError && preview.affectedCount > 0;

  return (
    <details className='bw-mapping'>
      <summary>
        Map a filename or path token to a field
        <small>
          For non-canonical names — you define the token, nothing is guessed.
        </small>
      </summary>

      <div className='bw-mapping-form'>
        <label>
          Read from
          <select
            className='bw-input'
            value={spec.source}
            aria-label='Mapping source'
            onChange={(e) => updateSpec({source: e.target.value})}
          >
            {MAPPING_SOURCES.map((name) => (
              <option key={name} value={name}>
                {name === 'filename' ? 'filename' : 'full path'}
              </option>
            ))}
          </select>
        </label>
        <label>
          Split on
          <input
            className='bw-input'
            value={spec.delimiter}
            aria-label='Mapping delimiter'
            onChange={(e) => updateSpec({delimiter: e.target.value})}
          />
        </label>
        <label>
          Segment #
          <input
            className='bw-input'
            type='number'
            min='0'
            value={spec.index}
            aria-label='Mapping segment index'
            onChange={(e) => updateSpec({index: Number(e.target.value) || 0})}
          />
        </label>
        <label>
          Into field
          <select
            className='bw-input'
            value={spec.field}
            aria-label='Mapping target field'
            onChange={(e) => updateSpec({field: e.target.value})}
          >
            {MAPPING_FIELDS.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Transform (regex, optional)
          <input
            className={preview.patternError ?
              'bw-input bw-invalid' : 'bw-input'}
            value={spec.pattern}
            placeholder='e.g. (\d+)'
            aria-label='Mapping transform pattern'
            title={preview.patternError || ''}
            onChange={(e) => updateSpec({pattern: e.target.value})}
          />
        </label>
      </div>

      {preview.patternError && (
        <p className='bw-mapping-error'>{preview.patternError}</p>
      )}

      {!active ? (
        <p className='bw-mapping-hint'>
          Select the recordings you want this mapping to apply to.
        </p>
      ) : (
        <>
          <p className='bw-mapping-hint'>
            {preview.affectedCount} of {selectedIds.length} selected match,{' '}
            {preview.changeCount} would change
          </p>
          <div className='bw-preview' role='table'>
            <div className='bw-preview-head' role='row'>
              <span>Recording</span>
              <span>Token</span>
              <span>→ {spec.field}</span>
              <span>Now</span>
            </div>
            {preview.items.map((item) => (
              <div
                className={item.matched ?
                  'bw-preview-row' : 'bw-preview-row bw-preview-skip'}
                role='row'
                key={item.id}
              >
                <span className='bw-file' title={item.sourceFile}>
                  {item.filename}
                </span>
                <span className='bw-token'>{item.token || '—'}</span>
                <span className={item.willChange ? 'bw-token-new' : ''}>
                  {item.extracted || '—'}
                </span>
                <span className='bw-token-old'>{item.current || '—'}</span>
              </div>
            ))}
          </div>
          <button
            type='button'
            className='bw-btn bw-btn-primary'
            disabled={!canApply}
            onClick={() => onApply(spec, selectedIds)}
          >
            Apply mapping to {preview.affectedCount} recording
            {preview.affectedCount === 1 ? '' : 's'}
          </button>
        </>
      )}
    </details>
  );
};
TokenMappingPanel.propTypes = {
  manifest: PropTypes.object,
  selectedIds: PropTypes.array,
  onApply: PropTypes.func,
};

/**
 * RecordingsTable - one independently editable, selectable row per recording.
 * @param {object} props
 * @param {object[]} props.rows - validated recordings
 * @param {Set<string>} props.selected - ids of selected rows
 * @param {function} props.onToggle - (id) selection toggle handler
 * @param {function} props.onToggleAll - (checked) select-all handler
 * @param {function} props.onChange - (id, changes) assignment handler
 * @param {function} props.onRemove - (id) remove handler
 * @return {JSX.Element}
 */
const RecordingsTable = ({rows, selected, onToggle, onToggleAll,
  onChange, onRemove}) => {
  if (rows.length === 0) {
    return (
      <p className='bw-empty'>
        No recordings yet. Select one or more recording files above to
        populate the batch.
      </p>
    );
  }

  const allSelected = rows.every((row) => selected.has(row.id));

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
        <span className='bw-check'>
          <input
            type='checkbox'
            checked={allSelected}
            aria-label='Select all recordings'
            onChange={(e) => onToggleAll(e.target.checked)}
          />
        </span>
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
          <div
            className={selected.has(row.id) ? 'bw-row bw-selected' : 'bw-row'}
            role='row'
            key={row.id}
          >
            <span className='bw-check'>
              <input
                type='checkbox'
                checked={selected.has(row.id)}
                aria-label={`Select ${row.filename}`}
                onChange={() => onToggle(row.id)}
              />
            </span>
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
  selected: PropTypes.object,
  onToggle: PropTypes.func,
  onToggleAll: PropTypes.func,
  onChange: PropTypes.func,
  onRemove: PropTypes.func,
};

/**
 * ParticipantsPanel - review participants separately from recording metadata:
 * rename (propagating to linked rows), edit demographics, and trace the exact
 * recordings each participant covers. Near-duplicate ids (e.g. a prefixed and
 * an unprefixed form of the same participant) are flagged so two BIDS folders
 * are not created for one person.
 * @param {object} props
 * @param {object[]} props.participants - distinct assigned participants
 * @param {Array} props.conflicts - groups of near-duplicate labels
 * @param {function} props.onRename - (fromId, toId) rename handler
 * @param {function} props.onDemographics - (id, changes) demographics handler
 * @return {JSX.Element}
 */
const ParticipantsPanel = ({participants, conflicts, onRename,
  onDemographics}) => {
  if (participants.length === 0) {
    return (
      <p className='bw-empty'>
        No participants assigned yet. Assign a participant to a recording to
        see it here. Renaming a participant updates every linked recording.
      </p>
    );
  }

  // Labels that collide with another label under near-duplicate normalization.
  const conflicting = new Set(conflicts.flat());

  return (
    <div className='bw-participants'>
      {conflicts.length > 0 && (
        <div className='bw-conflict-banner' role='alert'>
          <strong>Possible duplicate participants.</strong> These ids look like
          the same person written differently — rename them to a single form:
          <ul>
            {conflicts.map((group) => (
              <li key={group.join('|')}>{group.join(' · ')}</li>
            ))}
          </ul>
        </div>
      )}
      {participants.map((person) => (
        <div
          className={conflicting.has(person.participant) ?
            'bw-person bw-person-conflict' : 'bw-person'}
          key={person.participant}
        >
          <div className='bw-person-fields'>
            <label>
              Participant ID
              <input
                className='bw-input'
                defaultValue={person.participant}
                key={person.participant}
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
            {DEMOGRAPHIC_FIELDS.map((demoField) => {
              const options = DEMOGRAPHIC_OPTIONS[demoField];
              const value = person.demographics[demoField] || '';
              return (
                <label key={demoField} className='bw-demo'>
                  {demoField[0].toUpperCase() + demoField.slice(1)}
                  {options ? (
                    <select
                      className='bw-input'
                      value={value}
                      aria-label={`${demoField} for ${person.participant}`}
                      onChange={(e) =>
                        onDemographics(person.participant,
                            {[demoField]: e.target.value})}
                    >
                      <option value=''>n/a</option>
                      {options.filter((o) => o !== 'n/a').map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className='bw-input'
                      value={value}
                      placeholder='Optional'
                      aria-label={`${demoField} for ${person.participant}`}
                      onChange={(e) =>
                        onDemographics(person.participant,
                            {[demoField]: e.target.value})}
                    />
                  )}
                </label>
              );
            })}
          </div>
          <details className='bw-linked'>
            <summary>
              {pluralize(person.count, 'linked recording')} ·
              renaming updates all
            </summary>
            <ul>
              {person.recordings.map((rec) => (
                <li key={rec.id}>{rec.filename}</li>
              ))}
            </ul>
          </details>
        </div>
      ))}
    </div>
  );
};
ParticipantsPanel.propTypes = {
  participants: PropTypes.array,
  conflicts: PropTypes.array,
  onRename: PropTypes.func,
  onDemographics: PropTypes.func,
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
 * folder); each becomes one independently editable, selectable recording row
 * with explicit participant, session, task and run assignments. Selected rows
 * can be bulk-assigned a fixed value or driven by a user-defined filename/path
 * token mapping (previewed before it is applied); either way individual rows
 * stay correctable. Participants are reviewed on their own surface — renamed
 * (propagating to every linked recording), given demographics, traced to their
 * recordings, and checked for near-duplicate ids. The validated manifest is
 * published to the app context as `batchManifest` for later slices to consume.
 * @param {object} props
 * @param {boolean} props.visible - whether this view is active
 * @return {JSX.Element}
 */
const BatchWorkbench = (props) => {
  const appContext = useContext(AppContext);
  const [manifest, setManifest] = useState(createManifest());
  const [section, setSection] = useState('recordings');
  const [selected, setSelected] = useState(() => new Set());
  const [needsAttention, setNeedsAttention] = useState([]);
  const [scanInfo, setScanInfo] = useState(null);
  const [scanning, setScanning] = useState(false);

  const validated = useMemo(() => validateManifest(manifest), [manifest]);
  const participants = useMemo(() => getParticipants(manifest), [manifest]);
  const conflicts = useMemo(
      () => findParticipantConflicts(manifest), [manifest]);

  // Publish the explicit, validated manifest as the contract later slices
  // consume. Kept in the shared app task context alongside the rest of the
  // wizard's state.
  useEffect(() => {
    appContext.setTask('batchManifest', toManifest(manifest));
  }, [manifest]);

  // Selection only ever references live recording ids; drop ids for rows that
  // have since been removed so counts and bulk targets stay accurate.
  useEffect(() => {
    setSelected((current) => {
      const live = new Set(manifest.recordings.map((row) => row.id));
      const next = new Set([...current].filter((id) => live.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [manifest]);

  const selectedIds = useMemo(
      () => validated.recordings
          .filter((row) => selected.has(row.id))
          .map((row) => row.id),
      [validated, selected],
  );

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

  const onToggleRow = (id) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onToggleAll = (checked) =>
    setSelected(checked ?
      new Set(validated.recordings.map((row) => row.id)) : new Set());

  const onBulkAssign = (changes) =>
    setManifest((current) => bulkAssign(current, selectedIds, changes));

  const onApplyMapping = (spec, ids) =>
    setManifest((current) => applyMapping(current, spec, ids));

  const onChangeRow = (id, changes) =>
    setManifest((current) => updateRecording(current, id, changes));

  const onRemoveRow = (id) =>
    setManifest((current) => removeRecording(current, id));

  const onRenameParticipant = (fromId, toId) =>
    setManifest((current) => renameParticipant(current, fromId, toId));

  const onUpdateDemographics = (participant, changes) =>
    setManifest((current) => updateDemographics(current, participant, changes));

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
          conflicts={conflicts}
          onRename={onRenameParticipant}
          onDemographics={onUpdateDemographics}
        />
      ) : section === 'attention' ? (
        <NeedsAttentionPanel items={needsAttention}/>
      ) : (
        <>
          {totalCount > 0 && (
            <div className='bw-bulk-tools'>
              <BulkAssignBar
                selectedCount={selectedIds.length}
                onApply={onBulkAssign}
              />
              <TokenMappingPanel
                manifest={manifest}
                selectedIds={selectedIds}
                onApply={onApplyMapping}
              />
            </div>
          )}
          <RecordingsTable
            rows={validated.recordings}
            selected={selected}
            onToggle={onToggleRow}
            onToggleAll={onToggleAll}
            onChange={onChangeRow}
            onRemove={onRemoveRow}
          />
        </>
      )}
    </>
  ) : null;
};
BatchWorkbench.propTypes = {
  visible: PropTypes.bool,
};

export default BatchWorkbench;
