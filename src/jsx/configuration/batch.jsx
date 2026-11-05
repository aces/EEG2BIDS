import React, {useEffect, useMemo, useState} from 'react';
import {
  deserializeManifest, reconcileSources, SOURCE_STATUS,
} from '../types/batchFile';
import {getParticipants, validateManifest} from '../types/batchManifest';
import {preflightBatch, PREFLIGHT_STATUS} from '../types/batchPreview';

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
 * The active batch in Configuration: open a batch file, see what it holds,
 * and whether its sources still match disk. Nothing here writes the manifest.
 * @param {object} props
 * @param {?object} props.batch - {document, filePath?}
 * @param {function} props.setBatch
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
          </div>
        }
      </div>
    </>
  );
};

/**
 * Recording to BIDS for a batch: every recording's proposed destination and
 * whether it will convert, checked against what the output folder holds.
 * @param {object} props
 * @param {object} props.batch - {document, filePath?}
 * @param {object} props.form - the Configuration form values
 * @return {JSX.Element}
 */
export const BatchPlan = ({batch, form}) => {
  const [existing, setExisting] = useState(null);
  const root = form.bidsDirectory;
  const {manifest} = useMemo(
      () => deserializeManifest(batch.document), [batch]);

  useEffect(() => {
    setExisting(null);
    if (root) window.eeg2bids.scanDirectory(root).then(setExisting);
  }, [root]);

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

  const plan = preflightBatch(manifest, existing, {
    modality: form.modality, outputFormat: form.outputFormat, root,
  });
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
        {plan.recordings.map((row) =>
          <div key={row.id} className='bw-row' style={PLAN_COLUMNS}
            data-status={row.status}>
            <span className='bw-file'>{row.filename}</span>
            <span className={'bw-badge ' + (row.status ===
              PREFLIGHT_STATUS.NEW ? 'bw-ready' : 'bw-unready')}>
              {STATUS_LABELS[row.status]}
            </span>
            <span className='bw-file'>
              {row.destination && <span>{row.destination.path}</span>}
              {reason(row) && <small>{reason(row)}</small>}
            </span>
          </div>,
        )}
      </div>
      <div className='small-pad'>
        Converting a batch is not available yet.
      </div>
    </div>
  );
};
