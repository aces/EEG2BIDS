/**
 * batchPreview - preview the proposed BIDS output and preflight a batch.
 *
 * This slice turns the completed manifest into the exact BIDS destinations the
 * batch would write, then classifies every recording against what already
 * exists on disk so the user sees precisely what will run and what will be
 * skipped BEFORE any conversion happens.
 *
 * Two guarantees shape the design:
 *
 *   1. It reads only the FINAL explicit manifest assignments. Whether a value
 *      arrived from canonical prefilling, a token mapping, a bulk edit, or an
 *      individual edit is irrelevant and invisible here: preflight consumes the
 *      manifest as data and never reruns any of those steps.
 *   2. It never mutates anything. Every function is pure and side-effect free
 *      (it takes the existing-output paths as an argument rather than reading
 *      the filesystem itself), so an existing dataset can never be touched, let
 *      alone silently overwritten, by previewing it.
 *
 * A recording is classified as exactly one of PREFLIGHT_STATUS. Only NEW
 * recordings are ready to convert; excluded, unresolved, already-processed and
 * conflicting recordings are all deliberately held out of the ready set, so an
 * existing output is never overwritten and an ambiguous batch never runs.
 * Preflight distinguishes the three output states the destination can be in:
 * NEW (nothing at the destination), ALREADY_PROCESSED (the exact output file is
 * already there — a matching existing output, skipped), and CONFLICT for a
 * conflicting existing output (the BIDS slot is occupied by a different file,
 * e.g. a different stored format) as well as for two batch recordings that
 * resolve to one destination.
 *
 * The proposed destination follows the same BIDS entity conventions as the
 * backend converter (see eeg2bids/converter.py to_bids): identical subject
 * sanitization and the same modality->datatype/acquisition/suffix mapping (iEEG
 * is written with acquisition "seeg" under the "ieeg" datatype). It is laid out
 * directly under the dataset root. The single-recording backend nests each run
 * under a timestamped "output-" folder, but the batch writes into the BIDS root
 * itself: that is what lets preflight see, and refuse to overwrite, outputs
 * already in the dataset — per-run timestamp folders would make every run land
 * somewhere new and defeat the check. Matching the backend's entity conventions
 * is what makes the predicted path equal the real output path, which is what
 * makes matching-vs-conflicting detection honest.
 */

import {validateManifest} from './batchManifest';

// The mutually exclusive verdicts a recording can receive. Only NEW is ready.
export const PREFLIGHT_STATUS = {
  NEW: 'new',
  ALREADY_PROCESSED: 'already-processed',
  CONFLICT: 'conflict',
  EXCLUDED: 'excluded',
  UNRESOLVED: 'unresolved',
};

// How each selectable modality maps to the BIDS datatype, acquisition entity,
// and file suffix. This mirrors converter.py: modality "eeg" writes eeg with
// acq-eeg, while "ieeg" is written as stereo-EEG (acq-seeg) under the ieeg
// datatype. The order here is the order offered in the UI (iEEG first, the
// app default).
const MODALITY_PROFILE = {
  ieeg: {datatype: 'ieeg', acquisition: 'seeg', suffix: 'ieeg'},
  eeg: {datatype: 'eeg', acquisition: 'eeg', suffix: 'eeg'},
};

// The modalities the preview offers, in display order.
export const PREVIEW_MODALITIES = Object.keys(MODALITY_PROFILE);

// The modality assumed when none is chosen; matches the app-wide default.
export const DEFAULT_MODALITY = 'ieeg';

// Source recording format (as detected by discovery) -> the extension the
// default "auto"/preserve output keeps. This drives both the display path and,
// because a matching existing output is an exact-path match, the distinction
// between a matching output (same extension already present) and a conflicting
// one (the BIDS slot is occupied by a different file).
const FORMAT_EXTENSION = {
  EDF: '.edf',
  EEGLAB: '.set',
  BrainVision: '.vhdr',
  FIF: '.fif',
};

/**
 * toPosix - normalize path separators to forward slashes for comparison.
 * @param {string} value - a path
 * @return {string} the path with backslashes converted to slashes
 */
function toPosix(value) {
  return String(value == null ? '' : value).replace(/\\/g, '/');
}

/**
 * stripExtension - remove the final extension from a path's last segment.
 * @param {string} value - a posix path
 * @return {string} the path without its trailing extension
 */
function stripExtension(value) {
  return value.replace(/\.[^./]+$/, '');
}

/**
 * resolveModality - the requested modality, or the default when unrecognized.
 * @param {object} options - preview options carrying an optional modality
 * @return {string} a modality present in MODALITY_PROFILE
 */
function resolveModality(options) {
  const requested = options?.modality;
  return MODALITY_PROFILE[requested] ? requested : DEFAULT_MODALITY;
}

/**
 * sanitizeSubject - the subject label as the backend writes it.
 * The backend strips underscores, dashes and spaces from the subject id before
 * building the BIDS path; the manifest already restricts labels to alphanumeric
 * characters, but this mirrors the backend exactly so the predicted path can
 * never diverge from the real one.
 * @param {string} value - the participant label
 * @return {string} the sanitized subject label
 */
function sanitizeSubject(value) {
  return String(value == null ? '' : value).replace(/[_\-\s]/g, '');
}

/**
 * sourceExtension - the display extension for a recording's proposed output.
 * Prefers the detected recording format (preserved under the default "auto"
 * output), falling back to the source file's own extension.
 * @param {object} recording - a recording row
 * @return {string} an extension including the dot, or '' when unknown
 */
function sourceExtension(recording) {
  if (recording.format && FORMAT_EXTENSION[recording.format]) {
    return FORMAT_EXTENSION[recording.format];
  }
  const name = toPosix(recording.sourceFile || recording.filename || '');
  const match = name.match(/\.[^./]+$/);
  return match ? match[0].toLowerCase() : '';
}

/**
 * proposedDestination - the BIDS path a single recording would be written to.
 * Returns null when a required BIDS entity (subject or task) is missing, since
 * no reliable destination can be formed; such rows are reported as unresolved
 * rather than given a guessed path.
 * @param {object} recording - a recording row (participant/session/task/run)
 * @param {object} [options] - {modality}
 * @return {?object} {modality, datatype, dir, stem, key, extension, path}, or
 *   null when a required entity is missing
 */
export function proposedDestination(recording, options = {}) {
  const modality = resolveModality(options);
  const profile = MODALITY_PROFILE[modality];

  const subject = sanitizeSubject(recording.participant);
  const task = String(recording.task || '');
  if (!subject || !task) return null;

  const session = recording.session ? String(recording.session) : '';
  const run = recording.run ? String(recording.run) : '';

  const entities = [`sub-${subject}`];
  if (session) entities.push(`ses-${session}`);
  entities.push(`task-${task}`);
  entities.push(`acq-${profile.acquisition}`);
  if (run) entities.push(`run-${run}`);
  const stem = `${entities.join('_')}_${profile.suffix}`;

  const dirParts = [`sub-${subject}`];
  if (session) dirParts.push(`ses-${session}`);
  dirParts.push(profile.datatype);
  const dir = dirParts.join('/');

  const key = `${dir}/${stem}`;
  const extension = sourceExtension(recording);
  return {
    modality,
    datatype: profile.datatype,
    dir,
    stem,
    key,
    extension,
    path: `${key}${extension}`,
  };
}

/**
 * relativizeOutput - one existing output path made relative to the root.
 * @param {string|object} entry - an existing output path (or {path})
 * @param {string} base - the normalized (posix, no trailing slash) output root
 * @return {string} the root-relative posix path, or '' when it is not under
 *   the root or is the root itself
 */
function relativizeOutput(entry, base) {
  const posix = toPosix(typeof entry === 'string' ? entry : entry?.path);
  if (!posix) return '';
  if (!base) return posix;
  if (posix === base) return '';
  return posix.startsWith(`${base}/`) ? posix.slice(base.length + 1) : posix;
}

/**
 * relativeOutputStems - the set of existing BIDS slots under an output root.
 * Each existing file is made relative to the root, normalized to forward
 * slashes and stripped of its extension, so a recording's destination slot can
 * be tested for existence irrespective of stored format (a .set already there
 * occupies the same slot a batch would write .edf to) and so a data file and
 * its JSON sidecar collapse to the single recording slot they share. Slot
 * existence with no exact-path match is what marks a conflicting existing
 * output; see relativeOutputPaths for the exact-match (matching) test.
 * @param {Array<string|object>} paths - existing output paths (or {path})
 * @param {string} [root] - the output root the paths live under
 * @return {Set<string>} normalized, extension-stripped relative stems
 */
export function relativeOutputStems(paths, root = '') {
  const base = toPosix(root).replace(/\/+$/, '');
  const stems = new Set();
  for (const entry of paths || []) {
    const rel = relativizeOutput(entry, base);
    if (rel) stems.add(stripExtension(rel));
  }
  return stems;
}

/**
 * relativeOutputPaths - the set of existing output files, extension included.
 * A recording whose full destination path is in this set has a matching
 * existing output (already processed); one whose slot exists here only under a
 * different extension is a conflicting existing output.
 * @param {Array<string|object>} paths - existing output paths (or {path})
 * @param {string} [root] - the output root the paths live under
 * @return {Set<string>} normalized relative paths, extension included
 */
export function relativeOutputPaths(paths, root = '') {
  const base = toPosix(root).replace(/\/+$/, '');
  const out = new Set();
  for (const entry of paths || []) {
    const rel = relativizeOutput(entry, base);
    if (rel) out.add(rel);
  }
  return out;
}

/**
 * emptyCounts - a status-count accumulator with every status at zero.
 * @return {Object<string, number>} counts keyed by every PREFLIGHT_STATUS
 */
function emptyCounts() {
  return Object.values(PREFLIGHT_STATUS).reduce((counts, status) => {
    counts[status] = 0;
    return counts;
  }, {});
}

/**
 * preflightBatch - classify every recording and report the ready-to-run set.
 *
 * Each recording is resolved to exactly one status:
 *   - EXCLUDED: the user deliberately held this recording out of conversion.
 *   - UNRESOLVED: required assignments are missing or invalid, so no reliable
 *     destination exists.
 *   - CONFLICT: two or more included recordings resolve to the same BIDS
 *     destination, or an existing output already occupies that slot as a
 *     different file (a conflicting existing output) — either an ambiguity only
 *     the user can fix.
 *   - ALREADY_PROCESSED: the exact destination file already exists under the
 *     output root (a matching existing output); re-running would overwrite it,
 *     so it is skipped instead.
 *   - NEW: a unique destination that does not yet exist — the only ready state.
 *
 * Only NEW recordings appear in readyIds, so an existing output is never
 * overwritten and a colliding or unresolved recording never runs. Preflight
 * reads the manifest and the supplied existing-output list only; it performs no
 * I/O and mutates nothing.
 * @param {object} manifest - the current manifest
 * @param {Array<string|object>} [existingOutputs] - existing output paths
 * @param {object} [options] - {modality, root}
 * @return {object} {modality, datatype, recordings, readyIds, conflicts,
 *   counts, total, readyCount}
 */
export function preflightBatch(manifest, existingOutputs = [], options = {}) {
  const modality = resolveModality(options);
  const validated = validateManifest(manifest);
  const root = options.root || '';
  const existingStems = relativeOutputStems(existingOutputs, root);
  const existingPaths = relativeOutputPaths(existingOutputs, root);

  // First pass: resolve the excluded/unresolved verdicts and compute a
  // destination for every remaining (included, valid) recording.
  const prelim = validated.recordings.map((row) => {
    if (row.excluded) return {row, status: PREFLIGHT_STATUS.EXCLUDED};
    if (!row.ready) return {row, status: PREFLIGHT_STATUS.UNRESOLVED};
    const destination = proposedDestination(row, {modality});
    if (!destination) return {row, status: PREFLIGHT_STATUS.UNRESOLVED};
    return {row, destination};
  });

  // Count how many included recordings claim each destination key, so a key
  // claimed more than once is a within-batch collision.
  const claims = new Map();
  for (const item of prelim) {
    if (!item.destination) continue;
    const {key} = item.destination;
    if (!claims.has(key)) claims.set(key, []);
    claims.get(key).push(item.row.id);
  }

  // Second pass: classify the recordings that have a destination.
  const recordings = prelim.map((item) => {
    const {row, destination} = item;
    let status = item.status;
    if (!status) {
      const claimants = claims.get(destination.key).length;
      if (claimants > 1) {
        // Two or more included recordings want this one destination.
        status = PREFLIGHT_STATUS.CONFLICT;
      } else if (existingPaths.has(destination.path)) {
        // The exact output file is already there: a matching existing output.
        status = PREFLIGHT_STATUS.ALREADY_PROCESSED;
      } else if (existingStems.has(destination.key)) {
        // The slot is occupied by a different file (e.g. another stored
        // format): a conflicting existing output that must not be overwritten.
        status = PREFLIGHT_STATUS.CONFLICT;
      } else status = PREFLIGHT_STATUS.NEW;
    }
    return {
      id: row.id,
      filename: row.filename,
      sourceFile: row.sourceFile,
      participant: row.participant,
      session: row.session,
      task: row.task,
      run: row.run,
      excluded: !!row.excluded,
      errors: row.errors,
      status,
      destination: destination || null,
    };
  });

  const readyIds = recordings
      .filter((r) => r.status === PREFLIGHT_STATUS.NEW)
      .map((r) => r.id);

  const conflicts = [...claims.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([key, ids]) => ({key, ids}));

  const counts = recordings.reduce((acc, r) => {
    acc[r.status] += 1;
    return acc;
  }, emptyCounts());

  return {
    modality,
    datatype: MODALITY_PROFILE[modality].datatype,
    recordings,
    readyIds,
    conflicts,
    counts,
    total: recordings.length,
    readyCount: readyIds.length,
  };
}
