import React, {useContext, useEffect, useMemo, useState} from 'react';
import {
  deserializeManifest, reconcileSources, SOURCE_STATUS,
} from '../types/batchFile';
import {getParticipants, validateManifest} from '../types/batchManifest';
import {preflightBatch, PREFLIGHT_STATUS} from '../types/batchPreview';
import {buildConversionRequest} from '../types/conversionRequest';
import {TextInput} from '../elements/inputs';
import {SocketContext} from '../socket.io';

// Generous: one recording converts in seconds, but large files take longer.
const CONVERSION_TIMEOUT_MS = 30 * 60 * 1000;

const STATUS_LABELS = {
  [PREFLIGHT_STATUS.NEW]: 'Will convert',
  [PREFLIGHT_STATUS.ALREADY_PROCESSED]: 'Already in dataset',
  [PREFLIGHT_STATUS.CONFLICT]: 'Conflict',
  [PREFLIGHT_STATUS.UNRESOLVED]: 'Unresolved',
  [PREFLIGHT_STATUS.EXCLUDED]: 'Excluded',
};

const PLAN_COLUMNS = {
  gridTemplateColumns: 'minmax(180px, 1fr) 150px minmax(260px, 2fr)',
};

/**
 * The active batch in Configuration and whether its sources match disk.
 * @param {object} props
 * @return {JSX.Element}
 */
export const ActiveBatch = ({batch, setBatch}) => {
  const [error, setError] = useState('');
  const [sources, setSources] = useState([]);
  const loaded = useMemo(
      () => batch && deserializeManifest(batch.document), [batch]);

  useEffect(() => {
    setSources([]);
    if (!loaded) return;
    const paths = loaded.manifest.recordings.map((row) => row.sourceFile);
    window.eeg2bids.statPaths(paths).then((signatures) =>
      setSources(reconcileSources(loaded.manifest, signatures)));
  }, [loaded]);

  const openBatchFile = async () => {
    setError('');
    try {
      const opened = await window.eeg2bids.openBatchFile();
      if (opened) setBatch({document: opened.data, filePath: opened.filePath});
    } catch (e) {
      setError(`Could not open the batch file: ${e.message}`);
    }
  };

  const validated = loaded && validateManifest(loaded.manifest);
  const stale = sources.filter(
      (source) => source.status !== SOURCE_STATUS.PRESENT);

  return (
    <>
      <span className='header'>
        Batch
        <div className='header-hint'>ⓘ Prepared in the Batch workbench</div>
      </span>
      <div className='info'>
        <div className='small-pad'>
          <input type='button' id='openBatchFile' className='primary-btn'
            value='Open batch file' onClick={openBatchFile}/>
          {batch &&
            <input type='button' id='clearBatch' value='Clear batch'
              style={{marginLeft: '10px'}} onClick={() => setBatch(null)}/>
          }
          {error && <div><span className='error'>&#x274C;</span> {error}</div>}
        </div>
        {loaded &&
          <div className='small-pad' data-testid='active-batch'
            data-total={validated.totalCount}
            data-ready={validated.readyCount}>
            <div>
              <span className='checkmark'>&#x2714;</span>
              <b> Active batch</b>
              {batch.filePath ?
                ` from ${batch.filePath}` : ' from the Batch workbench'}
            </div>
            <div>
              {getParticipants(loaded.manifest).length} participants,{' '}
              {validated.totalCount} recordings ({validated.readyCount} ready)
            </div>
            {loaded.problems.map((problem) =>
              <div key={problem}>
                <span className='warning'>&#x26A0;</span> {problem}
              </div>,
            )}
            {stale.map((source) =>
              <div key={source.id}>
                <span className='warning'>&#x26A0;</span>{' '}
                {source.sourceFile} is {source.status}
              </div>,
            )}
            <div>
              Participant, session, task and run come from the batch. The
              settings below that apply to the whole dataset (output folder,
              modality, output format, anonymization and recording details)
              apply to every recording in it.
            </div>
            <div>
              <b>Next:</b> choose the BIDS output folder below, then preview
              and convert the batch on the <b>Recording to BIDS</b> tab.
            </div>
          </div>
        }
      </div>
    </>
  );
};

/**
 * Each recording's destination and status. Recordings convert one at a time,
 * so a failure never stops the rest; converting again retries only failures.
 * @param {object} props
 * @return {JSX.Element}
 */
export const BatchPlan = ({batch, form}) => {
  const socket = useContext(SocketContext);
  const [existing, setExisting] = useState(null);
  const [preparedBy, setPreparedBy] = useState('');
  const [converting, setConverting] = useState(null);
  const [results, setResults] = useState({});
  const root = form.bidsDirectory;
  const {manifest} = useMemo(
      () => deserializeManifest(batch.document), [batch]);
  const options = {
    modality: form.modality, outputFormat: form.outputFormat, root,
  };

  useEffect(() => {
    setExisting(null);
    if (root) window.eeg2bids.scanDirectory(root).then(setExisting);
  }, [root]);

  const convert = async () => {
    // Preflight again right before writing: the folder may have changed.
    const {readyIds} = preflightBatch(
        manifest, await window.eeg2bids.scanDirectory(root), options);
    for (const id of readyIds) {
      setConverting(id);
      const row = manifest.recordings.find((recording) => recording.id === id);
      const demographics = manifest.demographics[row.participant] || {};
      let result;
      try {
        result = await socket.timeout(CONVERSION_TIMEOUT_MS).emitWithAck(
            'batch_recording_to_bids', {
              ...buildConversionRequest(form, preparedBy),
              recordingData: {files: [{path: row.sourceFile,
                name: row.filename}]},
              eegRuns: [{recordingFile: row.sourceFile, eventFile: null,
                run: row.run || null}],
              participantID: row.participant,
              session: row.session,
              taskName: row.task,
              age: demographics.age || 'n/a',
              sex: demographics.sex || 'n/a',
              hand: demographics.handedness || 'n/a',
            });
      } catch {
        result = {error: ['The backend did not respond.']};
      }
      setResults((previous) => ({...previous, [id]: result.error ?
        {ok: false, message: result.error.join(' ')} : {ok: true}}));
    }
    setExisting(await window.eeg2bids.scanDirectory(root));
    setConverting(null);
  };

  if (!root) {
    return (
      <div className='info report'>
        <span className='error'>&#x274C;</span> Choose a BIDS output folder
        in Configuration to preview where the batch will be written.
      </div>
    );
  }
  if (!existing) {
    return <div className='info report'>Checking the output folder…</div>;
  }

  const plan = preflightBatch(manifest, existing, options);
  const collidingIds = new Set(plan.conflicts.flatMap(({ids}) => ids));
  const reason = (row) => {
    switch (row.status) {
      case PREFLIGHT_STATUS.UNRESOLVED:
        return Object.values(row.errors)[0];
      case PREFLIGHT_STATUS.CONFLICT:
        return collidingIds.has(row.id) ?
          'Another recording in the batch has the same destination.' :
          'A different file already occupies this destination.';
      case PREFLIGHT_STATUS.ALREADY_PROCESSED:
        return 'Already in the dataset; it will not be overwritten.';
      default:
        return null;
    }
  };
  const skipped = Object.entries(plan.counts)
      .filter(([status, count]) => status !== PREFLIGHT_STATUS.NEW && count)
      .map(([status, count]) => `${count} ${STATUS_LABELS[status]}`);

  return (
    <div className='info report' data-testid='batch-plan'
      data-ready={plan.readyCount}>
      <div className='small-pad'>
        <b>
          {plan.readyCount} of {plan.total} recordings will convert into{' '}
          {root}.
        </b>
        {skipped.length > 0 && <div>Skipped: {skipped.join(', ')}.</div>}
      </div>
      <div className='bw-table'>
        <div className='bw-row bw-head' style={PLAN_COLUMNS}>
          <span>Source file</span><span>Status</span><span>Destination</span>
        </div>
        {plan.recordings.map((row) => {
          const result = results[row.id];
          const failed = result && !result.ok &&
            row.status === PREFLIGHT_STATUS.NEW;
          const [label, good] = converting === row.id ? ['Converting…', true] :
            result?.ok ? ['Converted', true] :
            failed ? ['Failed', false] :
            [STATUS_LABELS[row.status], row.status === PREFLIGHT_STATUS.NEW];
          const note = result?.ok ? null :
            failed ? result.message : reason(row);
          return (
            <div key={row.id} className='bw-row' style={PLAN_COLUMNS}
              data-status={row.status}
              data-result={result && (result.ok ? 'converted' : 'failed')}>
              <span className='bw-file'>{row.filename}</span>
              <span className={good ?
                'bw-badge bw-ready' : 'bw-badge bw-unready'}>{label}</span>
              <span className='bw-file'>
                {row.destination && <span>{row.destination.path}</span>}
                {note && <small style={{whiteSpace: 'normal'}}>{note}</small>}
              </span>
            </div>
          );
        })}
      </div>
      <div className='small-pad'>
        <TextInput id='batchPreparedBy'
          required={true}
          label='Prepared by'
          value={preparedBy}
          placeholder='Enter your name'
          onUserInput={(_, value) => setPreparedBy(value.trim())}
          help='Name of person performing data conversion and validation is
          required.'
        />
      </div>
      <div className='small-pad convert-bids-row'>
        <input type='button'
          id='convertBatch'
          className='start_task primary-btn'
          onClick={convert}
          value={`Convert ${plan.readyCount} recording` +
            (plan.readyCount === 1 ? '' : 's')}
          disabled={!preparedBy || !plan.readyCount || converting !== null}
        />
      </div>
    </div>
  );
};
