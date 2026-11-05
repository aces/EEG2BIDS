// Every function is pure and returns a new manifest, so the workbench can hold
// it in React state. A recording links to a participant by a shared label.

// BIDS entity labels are alphanumeric: dashes, underscores, spaces and slashes
// are all BIDS delimiters.
const LABEL_RE = /^[A-Za-z0-9]+$/;

export const ASSIGNMENT_FIELDS = ['participant', 'session', 'task', 'run'];

// Demographics belong to the participant, not the recording, so they live on
// a manifest-level map keyed by participant label.
export const DEMOGRAPHIC_FIELDS = ['age', 'sex', 'handedness'];

const emptyDemographics = () =>
  Object.fromEntries(DEMOGRAPHIC_FIELDS.map((field) => [field, '']));

export const createManifest = () => ({recordings: [], demographics: {}});

export const addRecordings = (manifest, files) => {
  const seen = new Set(manifest.recordings.map((r) => r.sourceFile));
  // Continue from the highest "rec-<n>" so ids stay unique across removals.
  let seq = manifest.recordings.reduce((max, row) => {
    const n = Number(String(row.id).replace(/^rec-/, ''));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0) + 1;

  const added = [];
  for (const file of files) {
    if (!file?.path || seen.has(file.path)) continue;
    seen.add(file.path);
    added.push({
      id: `rec-${seq++}`,
      sourceFile: file.path,
      filename: file.name || String(file.path).split(/[\\/]/).pop(),
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
};

export const bulkAssign = (manifest, ids, changes) => {
  const target = new Set(ids);
  return {
    ...manifest,
    recordings: manifest.recordings.map((row) =>
      target.has(row.id) ? {...row, ...changes} : row),
  };
};

export const updateRecording = (manifest, id, changes) =>
  bulkAssign(manifest, [id], changes);

// Excluded rows stay in the batch but preflight holds them out of conversion.
export const setRecordingExcluded = (manifest, id, excluded) =>
  bulkAssign(manifest, [id], {excluded: !!excluded});

export const removeRecording = (manifest, id) => ({
  ...manifest,
  recordings: manifest.recordings.filter((row) => row.id !== id),
});

// Renaming onto an existing label merges the participants, keeping the
// target's demographics. A blank target is a no-op returning the same object.
export const renameParticipant = (manifest, fromLabel, toLabel) => {
  const target = String(toLabel).trim();
  if (!target || target === fromLabel) return manifest;

  const demographics = {...manifest.demographics};
  if (demographics[fromLabel]) {
    demographics[target] ||= demographics[fromLabel];
    delete demographics[fromLabel];
  }
  return {
    ...manifest,
    recordings: manifest.recordings.map((row) =>
      row.participant === fromLabel ? {...row, participant: target} : row),
    demographics,
  };
};

export const updateDemographics = (manifest, participant, changes) => ({
  ...manifest,
  demographics: {
    ...manifest.demographics,
    [participant]: {
      ...(manifest.demographics?.[participant] || emptyDemographics()),
      ...changes,
    },
  },
});

// Labels differing only by a `sub-` prefix or case (`sub-01`, `Sub-01`, `01`)
// would create two BIDS folders for one person.
export const findParticipantConflicts = (manifest) => {
  const byKey = Map.groupBy(
      getParticipants(manifest).map((p) => p.participant),
      (label) => String(label).trim().replace(/^sub-/i, '').toLowerCase());
  return [...byKey]
      .filter(([key, labels]) => key && labels.length > 1)
      .map(([, labels]) => labels);
};

export const validateRecording = (recording) => {
  const errors = {};
  // Session (like run) is optional and only validated when supplied.
  for (const [field, required] of
    [['participant', true], ['task', true], ['session', false]]) {
    const value = recording[field];
    const name = field[0].toUpperCase() + field.slice(1);
    if (!value) {
      if (required) errors[field] = `${name} is required`;
    } else if (!LABEL_RE.test(value)) {
      errors[field] =
        `${name} must be alphanumeric (no spaces, dashes, or underscores)`;
    }
  }
  const {run} = recording;
  if (run && !(/^\d+$/.test(run) && Number(run) >= 1)) {
    errors.run = 'Run must be a positive integer';
  }
  return {ready: Object.keys(errors).length === 0, errors};
};

export const validateManifest = (manifest) => {
  const recordings = manifest.recordings.map((row) => ({
    ...row,
    ...validateRecording(row),
  }));
  return {
    recordings,
    totalCount: recordings.length,
    readyCount: recordings.filter((r) => r.ready).length,
  };
};

// Distinct assigned participants in first-seen order.
export const getParticipants = (manifest) => {
  const byLabel = Map.groupBy(
      manifest.recordings.filter((row) => row.participant),
      (row) => row.participant);
  return [...byLabel].map(([participant, rows]) => {
    const recordings = rows.map(({id, filename}) => ({id, filename}));
    return {
      participant,
      recordings,
      recordingIds: recordings.map((r) => r.id),
      count: recordings.length,
      demographics:
        manifest.demographics?.[participant] || emptyDemographics(),
    };
  });
};

export const toManifest = (manifest) => {
  const {recordings, totalCount, readyCount} = validateManifest(manifest);
  return {
    participants: getParticipants(manifest)
        .map(({participant, count, demographics}) =>
          ({participant, recordingCount: count, demographics})),
    recordings,
    totalCount,
    readyCount,
    ready: totalCount > 0 && readyCount === totalCount,
  };
};
