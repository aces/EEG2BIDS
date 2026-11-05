// Only canonical BIDS entity tokens (`sub-01`, `task-rest`) are trusted: the
// key travels with the value, so nothing is guessed from near-misses or plain
// folder names. Tokens must start at a path boundary or the "_" delimiter, so
// "clubsub-01" is not misread.
const ENTITY_RE = /(?:^|[\\/_])(sub|ses|task|run)-([A-Za-z0-9]+)/gi;

const ENTITY_FIELDS = {
  sub: 'participant',
  ses: 'session',
  task: 'task',
  run: 'run',
};

// A field is proven only when the path holds exactly one distinct value for it.
export const inferRecordingFields = (recording) => {
  const byField = new Map();
  for (const [, key, value] of
    String(recording.sourceFile).matchAll(ENTITY_RE)) {
    const field = ENTITY_FIELDS[key.toLowerCase()];
    byField.set(field, (byField.get(field) || new Set()).add(value));
  }
  return Object.fromEntries([...byField]
      .filter(([, values]) => values.size === 1)
      .map(([field, values]) => [field, [...values][0]]));
};

// Fills only empty fields so a typed value is never overwritten. `ids`
// restricts the pass to those recordings; omit it to consider all.
export const prefillFromPaths = (manifest, ids) => {
  const target = ids ? new Set(ids) : null;
  return {
    ...manifest,
    recordings: manifest.recordings.map((row) => {
      if (target && !target.has(row.id)) return row;
      const changes = Object.entries(inferRecordingFields(row))
          .filter(([field]) => !row[field]);
      return changes.length ? {...row, ...Object.fromEntries(changes)} : row;
    }),
  };
};
