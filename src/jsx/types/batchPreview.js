// Predicts each recording's BIDS destination and classifies it against the
// existing outputs it is given (no I/O, no mutation). Destinations follow the
// backend's entity conventions (eeg2bids/converter.py to_bids) but sit directly
// under the BIDS root rather than a timestamped "output-" folder: that is what
// lets preflight see, and refuse to overwrite, outputs already in the dataset.

import {validateManifest} from './batchManifest';

// Only NEW is ready to convert.
export const PREFLIGHT_STATUS = {
  NEW: 'new',
  ALREADY_PROCESSED: 'already-processed',
  CONFLICT: 'conflict',
  EXCLUDED: 'excluded',
  UNRESOLVED: 'unresolved',
};

// Mirrors converter.py: "ieeg" is written as stereo-EEG (acq-seeg).
const MODALITY_PROFILE = {
  ieeg: {datatype: 'ieeg', acquisition: 'seeg', suffix: 'ieeg'},
  eeg: {datatype: 'eeg', acquisition: 'eeg', suffix: 'eeg'},
};

const DEFAULT_MODALITY = 'ieeg';

// The default "auto" output preserves the detected source format.
const FORMAT_EXTENSION = {
  EDF: '.edf',
  EEGLAB: '.set',
  BrainVision: '.vhdr',
  FIF: '.fif',
};

// An explicit output format (converter.py _OUTPUT_FORMATS) fixes the extension.
const OUTPUT_FORMAT_EXTENSION = {
  edf: '.edf',
  brainvision: '.vhdr',
  eeglab: '.set',
};

const toPosix = (value) => String(value ?? '').replace(/\\/g, '/');

const resolveModality = (modality) =>
  MODALITY_PROFILE[modality] ? modality : DEFAULT_MODALITY;

// Null when subject or task is missing: no destination is guessed.
export const proposedDestination = (recording, options = {}) => {
  const modality = resolveModality(options?.modality);
  const {datatype, acquisition, suffix} = MODALITY_PROFILE[modality];
  // Same subject sanitization as the backend, so the predicted path cannot
  // diverge from the real one.
  const subject = String(recording.participant ?? '').replace(/[_\-\s]/g, '');
  const task = String(recording.task || '');
  if (!subject || !task) return null;

  const ses = recording.session ? [`ses-${recording.session}`] : [];
  const run = recording.run ? [`run-${recording.run}`] : [];
  const dir = [`sub-${subject}`, ...ses, datatype].join('/');
  const stem = [
    `sub-${subject}`, ...ses, `task-${task}`, `acq-${acquisition}`, ...run,
    suffix,
  ].join('_');
  const key = `${dir}/${stem}`;
  const extension =
    OUTPUT_FORMAT_EXTENSION[String(options.outputFormat).toLowerCase()] ||
    FORMAT_EXTENSION[recording.format] ||
    toPosix(recording.sourceFile || recording.filename || '')
        .match(/\.[^./]+$/)?.[0].toLowerCase() ||
    '';
  return {
    modality,
    datatype,
    dir,
    stem,
    key,
    extension,
    path: `${key}${extension}`,
  };
};

// A recording whose exact path already exists is ALREADY_PROCESSED; one whose
// slot (path minus extension) is occupied by another file is a CONFLICT. Two
// included recordings claiming one slot are also a CONFLICT.
export const preflightBatch = (manifest, existing = [], options = {}) => {
  const modality = resolveModality(options.modality);
  const base = toPosix(options.root || '').replace(/\/+$/, '');
  const existingPaths = new Set();
  const existingSlots = new Set();
  for (const entry of existing || []) {
    const posix = toPosix(typeof entry === 'string' ? entry : entry?.path);
    if (posix === base) continue;
    const rel = base && posix.startsWith(`${base}/`) ?
      posix.slice(base.length + 1) : posix;
    if (!rel) continue;
    existingPaths.add(rel);
    existingSlots.add(rel.replace(/\.[^./]+$/, ''));
  }

  const resolved = validateManifest(manifest).recordings.map((row) => ({
    row,
    destination: !row.excluded && row.ready ?
      proposedDestination(row, {modality, outputFormat: options.outputFormat}) :
      null,
  }));
  const claims = Map.groupBy(resolved.filter((r) => r.destination),
      (r) => r.destination.key);

  const statusOf = ({row, destination}) => {
    if (row.excluded) return PREFLIGHT_STATUS.EXCLUDED;
    if (!destination) return PREFLIGHT_STATUS.UNRESOLVED;
    const {key, path} = destination;
    if (claims.get(key).length > 1) return PREFLIGHT_STATUS.CONFLICT;
    if (existingPaths.has(path)) return PREFLIGHT_STATUS.ALREADY_PROCESSED;
    if (existingSlots.has(key)) return PREFLIGHT_STATUS.CONFLICT;
    return PREFLIGHT_STATUS.NEW;
  };

  const recordings = resolved.map((item) => ({
    id: item.row.id,
    filename: item.row.filename,
    sourceFile: item.row.sourceFile,
    participant: item.row.participant,
    session: item.row.session,
    task: item.row.task,
    run: item.row.run,
    excluded: !!item.row.excluded,
    errors: item.row.errors,
    status: statusOf(item),
    destination: item.destination,
  }));
  const readyIds = recordings
      .filter((r) => r.status === PREFLIGHT_STATUS.NEW)
      .map((r) => r.id);

  return {
    modality,
    datatype: MODALITY_PROFILE[modality].datatype,
    recordings,
    readyIds,
    conflicts: [...claims]
        .filter(([, items]) => items.length > 1)
        .map(([key, items]) => ({key, ids: items.map((i) => i.row.id)})),
    counts: Object.fromEntries(Object.values(PREFLIGHT_STATUS).map((status) =>
      [status, recordings.filter((r) => r.status === status).length])),
    total: recordings.length,
    readyCount: readyIds.length,
  };
};
