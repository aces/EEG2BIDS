import React, {useEffect, useMemo, useState} from 'react';
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
import {
  serializeManifest,
  deserializeManifest,
  reconcileSources,
  SOURCE_STATUS,
} from './types/batchFile';

const ATTENTION_LABELS = {
  [ATTENTION_REASONS.UNKNOWN]: 'Unrecognized file',
  [ATTENTION_REASONS.ORPHAN_COMPANION]: 'Companion with no recording',
  [ATTENTION_REASONS.DUPLICATE_CANDIDATE]: 'Ambiguous duplicate',
};

// BIDS participants.tsv values; age stays free text.
const DEMOGRAPHIC_OPTIONS = {
  sex: ['F', 'M', 'O'],
  handedness: ['R', 'L', 'A'],
};

const pluralize = (count, noun) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

// Assign the typed (non-blank) fields to every selected recording.
const BulkAssignBar = ({selectedCount, onApply}) => {
  const [values, setValues] = useState({});
  const active = selectedCount > 0;
  const changes = Object.fromEntries(ASSIGNMENT_FIELDS
      .map((field) => [field, (values[field] || '').trim()])
      .filter(([, value]) => value));
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
            onChange={(e) => setValues({...values, [field]: e.target.value})}
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

// Define, preview, then apply a user-defined filename/path token mapping.
const TokenMappingPanel = ({manifest, selectedIds, onApply}) => {
  const [spec, setSpec] = useState({
    source: 'filename',
    delimiter: '_',
    index: 0,
    pattern: '',
    field: 'participant',
  });
  const active = selectedIds.length > 0;
  const updateSpec = (changes) => setSpec({...spec, ...changes});
  const preview = useMemo(
      () => previewMapping(manifest, spec, selectedIds),
      [manifest, spec, selectedIds],
  );

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
            disabled={!!preview.patternError || !preview.affectedCount}
            onClick={() => onApply(spec, selectedIds)}
          >
            Apply mapping to {pluralize(preview.affectedCount, 'recording')}
          </button>
        </>
      )}
    </details>
  );
};

// One editable, selectable row per recording.
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

  const field = (row, name, placeholder, inferred) => (
    <div className='bw-cell'>
      <input
        className={row.errors[name] ? 'bw-input bw-invalid' : 'bw-input'}
        value={row[name]}
        placeholder={placeholder}
        title={row.errors[name] || ''}
        aria-label={`${name} for ${row.filename}`}
        onChange={(e) => onChange(row.id, {[name]: e.target.value})}
      />
      {inferred[name] && inferred[name] === row[name] &&
        <small className='bw-from'>from filename</small>}
    </div>
  );

  return (
    <div className='bw-table' role='table'>
      <div className='bw-row bw-head' role='row'>
        <span className='bw-check'>
          <input
            type='checkbox'
            checked={rows.every((row) => selected.has(row.id))}
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
              {row.companions?.length > 0 && (
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
            {row.ready ?
              <span className='bw-badge bw-ready'>Ready</span> :
              <span className='bw-badge bw-unready'
                title={Object.values(row.errors).join('\n')}>
                Needs attention
              </span>}
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

// Rename participants, edit demographics, and flag near-duplicate ids.
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
                  // A no-op rename doesn't re-render, so restore the field.
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
              const inputProps = {
                'className': 'bw-input',
                'value': person.demographics[demoField] || '',
                'aria-label': `${demoField} for ${person.participant}`,
                'onChange': (e) => onDemographics(person.participant,
                    {[demoField]: e.target.value}),
              };
              return (
                <label key={demoField} className='bw-demo'>
                  {demoField[0].toUpperCase() + demoField.slice(1)}
                  {options ? (
                    <select {...inputProps}>
                      <option value=''>n/a</option>
                      {options.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input {...inputProps} placeholder='Optional'/>
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

// Files discovery held out of the batch, with why.
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

// Manifest completeness, then save or hand off. Not a conversion preview.
const ReviewPanel = ({participants, recordings, conflicts, message, busy,
  onSave, onLoad}) => {
  const included = recordings.filter((row) => !row.excluded);
  const unresolved = included.filter((row) => !row.ready);
  const problems = [
    ...unresolved.map((row) => ({
      key: `unresolved-${row.id}`,
      text: `${row.filename}: ${Object.values(row.errors)[0]}`,
    })),
    ...conflicts.map((group) => ({
      key: `conflict-${group.join('|')}`,
      text: `Possible duplicate participant: ${group.join(' · ')}`,
    })),
  ];
  const empty = recordings.length === 0;

  return (
    <div className='bw-review'>
      <div className='bw-review-stats'>
        <span><b>{participants.length}</b> participants</span>
        <span><b>{recordings.length}</b> recordings</span>
        <span><b>{included.length}</b> included</span>
        <span><b>{recordings.length - included.length}</b> excluded</span>
        <span><b>{included.length - unresolved.length}</b> ready</span>
        <span><b>{unresolved.length}</b> unresolved</span>
      </div>

      {empty ? (
        <p className='bw-empty'>
          Nothing to review yet. Add recordings and assign them, then return
          here to save the batch or load it into Configuration.
        </p>
      ) : problems.length === 0 ? (
        <p className='bw-review-ok'>
          <span className='bw-badge bw-ready'>Complete</span>
          Every included recording is ready and participant ids are
          unambiguous.
        </p>
      ) : (
        <div className='bw-review-problems'>
          <b>{pluralize(problems.length, 'item')} to resolve</b>
          <ul>
            {problems.map((problem) => (
              <li key={problem.key}>{problem.text}</li>
            ))}
          </ul>
          <small>
            You can still save the batch; unresolved recordings are
            simply held out of the ready set.
          </small>
        </div>
      )}

      <div className='bw-handoff-actions'>
        <button
          type='button'
          className='bw-btn'
          disabled={empty || busy}
          onClick={onSave}
        >
          Save batch file
        </button>
        <button
          type='button'
          className='bw-btn bw-btn-primary'
          disabled={empty || busy}
          onClick={onLoad}
        >
          Load into Configuration
        </button>
      </div>
      {message}
    </div>
  );
};

// Pre-fill only the rows just added, never fields the user already edited.
const addAndPrefill = (manifest, files) => {
  const withAdded = addRecordings(manifest, files);
  const existing = new Set(manifest.recordings.map((row) => row.id));
  return prefillFromPaths(withAdded, withAdded.recordings
      .filter((row) => !existing.has(row.id))
      .map((row) => row.id));
};

/**
 * Build a batch of recordings, then save it or load it into Configuration.
 * @param {object} props
 * @return {JSX.Element}
 */
const BatchWorkbench = (props) => {
  const [manifest, setManifest] = useState(createManifest());
  const [section, setSection] = useState('recordings');
  const [selected, setSelected] = useState(() => new Set());
  const [needsAttention, setNeedsAttention] = useState([]);
  const [scanInfo, setScanInfo] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [handoff, setHandoff] = useState(null);
  const [handoffBusy, setHandoffBusy] = useState(false);

  const validated = useMemo(() => validateManifest(manifest), [manifest]);
  const participants = useMemo(() => getParticipants(manifest), [manifest]);
  const conflicts = useMemo(
      () => findParticipantConflicts(manifest), [manifest]);

  // Row ids are reused after removal, so drop selections of removed rows.
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

  const onScanFolder = async (_, root) => {
    setScanning(true);
    try {
      const result = discoverRecordings(
          await window.eeg2bids.scanDirectory(root));
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

  // Signed with each source's stat so reopening can spot changed files.
  const signedDocument = async () => serializeManifest(manifest, {
    signatures: await window.eeg2bids.statPaths(
        manifest.recordings.map((row) => row.sourceFile)),
  });

  const onSaveBatchFile = async () => {
    setHandoffBusy(true);
    try {
      const savedPath = await window.eeg2bids.saveBatchFile({
        suggestedName: 'batch-manifest.json',
        data: await signedDocument(),
      });
      setHandoff(savedPath ?
        {kind: 'ok', message: `Saved batch file to ${savedPath}`} :
        null);
    } catch (error) {
      setHandoff({kind: 'error',
        message: `Could not save the batch file: ${error.message}`});
    } finally {
      setHandoffBusy(false);
    }
  };

  const onOpenBatchFile = async () => {
    setHandoffBusy(true);
    try {
      const opened = await window.eeg2bids.openBatchFile();
      if (!opened) return;
      const {manifest: reopened, problems} = deserializeManifest(opened.data);
      const signatures = await window.eeg2bids.statPaths(
          reopened.recordings.map((row) => row.sourceFile));
      const stale = reconcileSources(reopened, signatures)
          .filter((source) => source.status !== SOURCE_STATUS.PRESENT)
          .map((source) => `${source.sourceFile} is ${source.status}.`);
      setManifest(reopened);
      setNeedsAttention([]);
      setScanInfo(null);
      setHandoff({
        kind: problems.length || stale.length ? 'error' : 'ok',
        message: [`Opened ${opened.filePath}.`, ...problems, ...stale]
            .join(' '),
      });
    } catch (error) {
      setHandoff({kind: 'error',
        message: `Could not open the batch file: ${error.message}`});
    } finally {
      setHandoffBusy(false);
    }
  };

  if (!props.visible) return null;

  const {totalCount, readyCount} = validated;
  const percent = totalCount ? Math.round((readyCount / totalCount) * 100) : 0;
  const message = handoff && (
    <p
      className={handoff.kind === 'error' ?
        'bw-handoff-msg bw-handoff-error' : 'bw-handoff-msg'}
      role='status'
    >
      {handoff.message}
    </p>
  );
  const tabs = [
    ['recordings', `Recordings (${totalCount})`],
    ['participants', `Participants (${participants.length})`],
    ['attention', `Needs attention (${needsAttention.length})`],
    ['review', 'Review & save'],
  ];

  return (
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
            onUserInput={(_, files) => setManifest((current) =>
              addAndPrefill(current, files.map((file) => ({
                name: file.name,
                path: file.path,
              }))))}
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
        <div className='small-pad'>
          <input type='button'
            id='openBatchFile'
            value='Open batch file'
            disabled={handoffBusy}
            onClick={onOpenBatchFile}
          />
          <div>
            <small>
              Reopen a saved batch to keep editing it. This replaces the
              current batch.
            </small>
          </div>
          {section !== 'review' && message}
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
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type='button'
            className={section === key ? 'active' : ''}
            onClick={() => setSection(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'review' ? (
        <ReviewPanel
          participants={participants}
          recordings={validated.recordings}
          conflicts={conflicts}
          message={message}
          busy={handoffBusy}
          onSave={onSaveBatchFile}
          onLoad={async () =>
            props.onLoadIntoConfiguration(await signedDocument())}
        />
      ) : section === 'participants' ? (
        <ParticipantsPanel
          participants={participants}
          conflicts={conflicts}
          onRename={(fromId, toId) => setManifest((current) =>
            renameParticipant(current, fromId, toId))}
          onDemographics={(participant, changes) => setManifest((current) =>
            updateDemographics(current, participant, changes))}
        />
      ) : section === 'attention' ? (
        <NeedsAttentionPanel items={needsAttention}/>
      ) : (
        <>
          {totalCount > 0 && (
            <div className='bw-bulk-tools'>
              <BulkAssignBar
                selectedCount={selectedIds.length}
                onApply={(changes) => setManifest((current) =>
                  bulkAssign(current, selectedIds, changes))}
              />
              <TokenMappingPanel
                manifest={manifest}
                selectedIds={selectedIds}
                onApply={(spec, ids) => setManifest((current) =>
                  applyMapping(current, spec, ids))}
              />
            </div>
          )}
          <RecordingsTable
            rows={validated.recordings}
            selected={selected}
            onToggle={(id) => setSelected((current) => {
              const next = new Set(current);
              if (!next.delete(id)) next.add(id);
              return next;
            })}
            onToggleAll={(checked) => setSelected(checked ?
              new Set(validated.recordings.map((row) => row.id)) : new Set())}
            onChange={(id, changes) => setManifest((current) =>
              updateRecording(current, id, changes))}
            onRemove={(id) => setManifest((current) =>
              removeRecording(current, id))}
          />
        </>
      )}
    </>
  );
};

export default BatchWorkbench;
