/**
 * batchManifest - the batch workbench domain model.
 *
 * A batch manifest is the explicit, validated contract that downstream slices
 * (recursive discovery, inference, preview, conversion) consume. This slice
 * populates it manually: the user selects recording entry-point files and each
 * becomes one independently editable recording row carrying explicit
 * participant/session/task/run assignments.
 *
 * Every exported function is pure and returns a new manifest rather than
 * mutating its input, so the React workbench can hold the manifest in state
 * and this logic can be unit-tested in isolation (see batchManifest.test.js).
 *
 * The link between a recording and a participant is simply a shared
 * participant label; renaming a participant rewrites that label on every
 * linked recording (see renameParticipant), which is why the link survives
 * edits.
 */

// BIDS entity labels (sub-, ses-, task-) are alphanumeric only: no dashes,
// underscores, spaces or slashes, all of which are BIDS entity delimiters.
const LABEL_RE = /^[A-Za-z0-9]+$/;

// The editable per-recording assignment fields, in table-column order. This
// is the single source of truth for the assignable fields; bulk assignment and
// token mapping both target this same set.
export const ASSIGNMENT_FIELDS = ['participant', 'session', 'task', 'run'];

// Required assignments for a recording to be convertible. Session and run are
// optional BIDS entities and are only validated when supplied.
export const REQUIRED_FIELDS = ['participant', 'task'];

// Optional BIDS label entities, validated only when a value is supplied.
const OPTIONAL_LABEL_FIELDS = ['session'];

// Participant demographic fields reviewed separately from recording metadata.
// These mirror the core BIDS participants.tsv columns and are owned by the
// participant, not the recording, so they live on a manifest-level map keyed
// by participant label rather than on any recording row.
export const DEMOGRAPHIC_FIELDS = ['age', 'sex', 'handedness'];

// Human-readable field names for validation messages.
const FIELD_LABELS = {
  participant: 'Participant',
  session: 'Session',
  task: 'Task',
  run: 'Run',
};

const LABEL_HINT =
  'must be alphanumeric (no spaces, dashes, or underscores)';

/**
 * createManifest - an empty batch manifest.
 * `demographics` maps a participant label to its reviewed demographic values;
 * it is keyed by label (not recording) because demographics belong to the
 * participant and must survive recording edits.
 * @return {{recordings: object[], demographics: Object<string, object>}} a new
 *   manifest state
 */
export function createManifest() {
  return {recordings: [], demographics: {}};
}

/**
 * emptyDemographics - a blank demographic record.
 * @return {Object<string, string>} all demographic fields empty
 */
function emptyDemographics() {
  return DEMOGRAPHIC_FIELDS.reduce((row, field) => {
    row[field] = '';
    return row;
  }, {});
}

/**
 * nextSequence - the next unused numeric suffix for a recording id.
 * Ids look like "rec-<n>"; deriving from the current maximum keeps ids stable
 * and unique across appends and removals without an external counter.
 * @param {object[]} recordings - current rows
 * @return {number} the next id suffix
 */
function nextSequence(recordings) {
  const max = recordings.reduce((highest, row) => {
    const n = Number(String(row.id).replace(/^rec-/, ''));
    return Number.isFinite(n) && n > highest ? n : highest;
  }, 0);
  return max + 1;
}

/**
 * basename - the trailing path segment, for display.
 * @param {string} filePath - a file path
 * @return {string} the file name
 */
function basename(filePath) {
  return String(filePath).split(/[\\/]/).pop();
}

/**
 * addRecordings - append one recording row per entry-point file.
 * Files already present (matched by source path) are ignored, so re-selecting
 * a file never creates a duplicate row. Recursive discovery may also supply a
 * detected `format` and linked `companions` (data/marker sibling files); both
 * are carried onto the row for traceability and downstream conversion, and
 * default to empty for manually selected files.
 * @param {object} manifest - the current manifest
 * @param {Array<object>} files - selected files, each
 *   {path, name?, format?, companions?}
 * @return {object} a new manifest with the new rows appended
 */
export function addRecordings(manifest, files) {
  const existingPaths = new Set(manifest.recordings.map((r) => r.sourceFile));
  let seq = nextSequence(manifest.recordings);

  const added = [];
  for (const file of files) {
    if (!file?.path || existingPaths.has(file.path)) continue;
    existingPaths.add(file.path);
    added.push({
      id: `rec-${seq++}`,
      sourceFile: file.path,
      filename: file.name || basename(file.path),
      format: file.format || '',
      companions: file.companions || [],
      excluded: false,
      participant: '',
      session: '',
      task: '',
      run: '',
    });
  }

  return {...manifest, recordings: [...manifest.recordings, ...added]};
}

/**
 * updateRecording - change explicit assignments on a single row.
 * @param {object} manifest - the current manifest
 * @param {string} id - the recording id to update
 * @param {object} changes - partial {participant, session, task, run}
 * @return {object} a new manifest with the row updated
 */
export function updateRecording(manifest, id, changes) {
  return {
    ...manifest,
    recordings: manifest.recordings.map((row) =>
      row.id === id ? {...row, ...changes} : row),
  };
}

/**
 * bulkAssign - apply the same explicit assignments to many rows at once.
 * Only the rows named in `ids` change, and only the fields present in
 * `changes`; every other row and every other field is left exactly as it was,
 * so a bulk change never disturbs assignments outside the selection and an
 * individual row can still be corrected afterwards with updateRecording.
 * @param {object} manifest - the current manifest
 * @param {Iterable<string>} ids - recording ids to assign
 * @param {object} changes - partial {participant, session, task, run}
 * @return {object} a new manifest with the selected rows updated
 */
export function bulkAssign(manifest, ids, changes) {
  const target = new Set(ids);
  return {
    ...manifest,
    recordings: manifest.recordings.map((row) =>
      target.has(row.id) ? {...row, ...changes} : row),
  };
}

/**
 * setRecordingExcluded - include or exclude a recording from conversion.
 * An excluded recording stays in the batch (visible and still editable) but is
 * deliberately held out of the ready-to-convert set by preflight, so a file the
 * user wants to keep on record but not convert never enters conversion. This is
 * distinct from removeRecording, which drops the row entirely.
 * @param {object} manifest - the current manifest
 * @param {string} id - the recording id to include/exclude
 * @param {boolean} excluded - true to exclude, false to include
 * @return {object} a new manifest with the row's excluded flag set
 */
export function setRecordingExcluded(manifest, id, excluded) {
  return {
    ...manifest,
    recordings: manifest.recordings.map((row) =>
      row.id === id ? {...row, excluded: !!excluded} : row),
  };
}

/**
 * removeRecording - drop a single recording row.
 * @param {object} manifest - the current manifest
 * @param {string} id - the recording id to remove
 * @return {object} a new manifest without that row
 */
export function removeRecording(manifest, id) {
  return {
    ...manifest,
    recordings: manifest.recordings.filter((row) => row.id !== id),
  };
}

/**
 * renameParticipant - rewrite a participant label across all linked rows.
 * The recording-to-participant link is the shared label, so propagation is a
 * rewrite of that label on every matching row. Renaming onto an existing
 * label merges the two participants. A blank target is a no-op, so a rename
 * can never silently unlink recordings from their participant.
 * Demographics travel with the label: the renamed participant's reviewed
 * values move to the new label. Renaming onto a participant that already has
 * demographics keeps the target's values (the merge target wins) rather than
 * silently overwriting them.
 * @param {object} manifest - the current manifest
 * @param {string} fromLabel - the participant label being renamed
 * @param {string} toLabel - the new participant label
 * @return {object} a new manifest with the rename propagated
 */
export function renameParticipant(manifest, fromLabel, toLabel) {
  const target = String(toLabel).trim();
  if (!target || target === fromLabel) return manifest;

  const demographics = {...manifest.demographics};
  if (demographics[fromLabel]) {
    if (!demographics[target]) demographics[target] = demographics[fromLabel];
    delete demographics[fromLabel];
  }

  return {
    ...manifest,
    recordings: manifest.recordings.map((row) =>
      row.participant === fromLabel ? {...row, participant: target} : row),
    demographics,
  };
}

/**
 * updateDemographics - set reviewed demographic values for one participant.
 * Demographics are reviewed separately from recording metadata and are stored
 * against the participant label, so they persist across recording edits and
 * are propagated by renameParticipant.
 * @param {object} manifest - the current manifest
 * @param {string} participant - the participant label
 * @param {object} changes - partial {age, sex, handedness}
 * @return {object} a new manifest with the participant's demographics updated
 */
export function updateDemographics(manifest, participant, changes) {
  const current = manifest.demographics?.[participant] || emptyDemographics();
  return {
    ...manifest,
    demographics: {
      ...manifest.demographics,
      [participant]: {...current, ...changes},
    },
  };
}

/**
 * normalizeParticipantId - the comparison key for near-duplicate detection.
 * Two labels are near-duplicates when they differ only by a `sub-` prefix or
 * by letter case (e.g. `sub-01`, `Sub-01` and `01` all collapse to `01`), the
 * exact confusion that would otherwise create two BIDS folders for one person.
 * Prefix stripping happens ONLY here for comparison; assignments themselves are
 * never silently rewritten.
 * @param {string} label - a participant label
 * @return {string} the normalized comparison key
 */
export function normalizeParticipantId(label) {
  return String(label).trim().replace(/^sub-/i, '').toLowerCase();
}

/**
 * findParticipantConflicts - groups of assigned labels that are near-duplicates.
 * Each returned group holds two or more distinct labels that share a normalized
 * key; an empty result means every participant id is unambiguous.
 * @param {object} manifest - the current manifest
 * @return {Array} groups of colliding labels (each an array of length >= 2)
 */
export function findParticipantConflicts(manifest) {
  const byKey = new Map();
  for (const {participant} of getParticipants(manifest)) {
    const key = normalizeParticipantId(participant);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(participant);
  }
  return [...byKey.values()].filter((labels) => labels.length > 1);
}

/**
 * validateRecording - per-row readiness and field errors.
 * A row is ready only when every required field is present and every supplied
 * field is a valid BIDS value. Validation reads only this row, so one row's
 * problem never marks another row unready.
 * @param {object} recording - a recording row
 * @return {{ready: boolean, errors: Object<string, string>}} the verdict
 */
export function validateRecording(recording) {
  const errors = {};

  for (const field of REQUIRED_FIELDS) {
    const message = labelError(field, recording[field], true);
    if (message) errors[field] = message;
  }

  for (const field of OPTIONAL_LABEL_FIELDS) {
    const message = labelError(field, recording[field], false);
    if (message) errors[field] = message;
  }

  const {run} = recording;
  if (run && !(/^\d+$/.test(run) && Number(run) >= 1)) {
    errors.run = 'Run must be a positive integer';
  }

  return {ready: Object.keys(errors).length === 0, errors};
}

/**
 * labelError - validate a single BIDS-label assignment field.
 * @param {string} field - the field name (keys FIELD_LABELS)
 * @param {string} value - the assigned value
 * @param {boolean} required - whether a blank value is an error
 * @return {?string} an error message, or null when valid
 */
function labelError(field, value, required) {
  if (!value) {
    return required ? `${FIELD_LABELS[field]} is required` : null;
  }
  if (!LABEL_RE.test(value)) {
    return `${FIELD_LABELS[field]} ${LABEL_HINT}`;
  }
  return null;
}

/**
 * validateManifest - validate every row and summarise batch readiness.
 * @param {object} manifest - the current manifest
 * @return {object} rows annotated with {ready, errors} plus readyCount
 */
export function validateManifest(manifest) {
  const recordings = manifest.recordings.map((row) => ({
    ...row,
    ...validateRecording(row),
  }));
  return {
    recordings,
    totalCount: recordings.length,
    readyCount: recordings.filter((r) => r.ready).length,
  };
}

/**
 * getParticipants - the distinct assigned participants, first-seen order.
 * Recordings with no participant assigned yet are excluded. The link count
 * is what a rename would propagate to.
 * Each participant carries its reviewed demographics and its linked recordings
 * (id and filename), so the count is traceable back to the exact recordings it
 * covers.
 * @param {object} manifest - the current manifest
 * @return {Array<object>} participants, each carrying participant, recordings,
 *   recordingIds, count and demographics
 */
export function getParticipants(manifest) {
  const demographics = manifest.demographics || {};
  const byId = new Map();
  for (const row of manifest.recordings) {
    if (!row.participant) continue;
    if (!byId.has(row.participant)) {
      byId.set(row.participant,
          {participant: row.participant, recordings: []});
    }
    byId.get(row.participant).recordings
        .push({id: row.id, filename: row.filename});
  }
  return [...byId.values()].map((p) => ({
    ...p,
    recordingIds: p.recordings.map((r) => r.id),
    count: p.recordings.length,
    demographics: demographics[p.participant] || emptyDemographics(),
  }));
}

/**
 * toManifest - the explicit, validated export contract for later slices.
 * @param {object} manifest - the current manifest
 * @return {object} {participants, recordings, totalCount, readyCount, ready}
 */
export function toManifest(manifest) {
  const validated = validateManifest(manifest);
  return {
    participants: getParticipants(manifest)
        .map(({participant, count, demographics}) =>
          ({participant, recordingCount: count, demographics})),
    recordings: validated.recordings,
    totalCount: validated.totalCount,
    readyCount: validated.readyCount,
    ready: validated.totalCount > 0 &&
      validated.readyCount === validated.totalCount,
  };
}
