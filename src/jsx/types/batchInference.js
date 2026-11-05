/**
 * batchInference - fill recording metadata from canonical BIDS entities.
 *
 * When recordings are added to the batch, any metadata that can be read
 * directly from a canonical BIDS entity token in the source path is pre-filled
 * into the editable grid, so the user does not retype what the filename already
 * states. This is deliberately narrow: it reads only what it can PROVE and
 * stays silent otherwise. The one trusted source is a canonical BIDS entity
 * token — `sub-01`, `ses-02`, `task-rest`, `run-1` — where the meaning of the
 * value is defined by the BIDS standard (the key travels with the value), not
 * guessed by us. Everything else is left blank for the user:
 *
 *   - Semantic abbreviation guessing is prohibited: a filename fragment that is
 *     not a canonical entity token (e.g. the "rest" in `eeg_rest.edf`, or a
 *     "subj018" that resembles but is not `sub-018`) is never interpreted.
 *   - Folder-structure guessing is not attempted at all — a folder name is not
 *     trusted to encode participant or session.
 *   - Ambiguity is left unresolved: if one recording carries two different
 *     values for the same entity, no value is filled for that field.
 *
 * Pre-filled values are ordinary editable assignments (the manifest owns them
 * outright), so the final metadata never depends on rerunning inference, and
 * the user can override any pre-filled field. Every function is pure so this
 * logic can be unit-tested in isolation (see batchInference.test.js).
 */

// BIDS entity key -> the manifest field it fills. These are the only keys
// trusted from a path; anything else is ignored rather than guessed at.
export const ENTITY_FIELDS = {
  sub: 'participant',
  ses: 'session',
  task: 'task',
  run: 'run',
};

// A canonical BIDS entity token: an entity key from ENTITY_FIELDS followed by
// "-" and an alphanumeric value, anchored to a path boundary (start, slash, or
// the "_" BIDS delimiter) so fragments like "clubsub-01" are not misread.
const ENTITY_RE = /(?:^|[\\/_])(sub|ses|task|run)-([A-Za-z0-9]+)/gi;

/**
 * entityValuesByField - the distinct entity values found in one path.
 * Values are de-duplicated per field, so the same token appearing in both a
 * directory and the filename counts once and is not treated as a conflict.
 * @param {string} filePath - a source file path
 * @return {Map<string, Set<string>>} field name -> distinct values found
 */
function entityValuesByField(filePath) {
  const byField = new Map();
  ENTITY_RE.lastIndex = 0;
  let match;
  while ((match = ENTITY_RE.exec(String(filePath))) !== null) {
    const field = ENTITY_FIELDS[match[1].toLowerCase()];
    const value = match[2];
    if (!byField.has(field)) byField.set(field, new Set());
    byField.get(field).add(value);
  }
  return byField;
}

/**
 * inferRecordingFields - the metadata a recording's path proves on its own.
 * A field is returned only when the path contains exactly one distinct value
 * for its canonical entity token. A field with two or more distinct values is
 * ambiguous and is omitted (left for the user), so a conflicting guess can
 * never become a pre-filled value.
 * @param {object} recording - a recording row ({sourceFile})
 * @return {Object<string, string>} proven field -> value (only proven fields)
 */
export function inferRecordingFields(recording) {
  const fields = {};
  for (const [field, values] of entityValuesByField(recording.sourceFile)) {
    if (values.size === 1) {
      const [value] = [...values];
      fields[field] = value;
    }
  }
  return fields;
}

/**
 * prefillFromPaths - pre-fill empty recording fields from proven entities.
 *
 * Only empty fields are filled, so a value the user has already typed is never
 * overwritten; unproven and ambiguous fields are left blank. Pass `ids` to
 * restrict pre-filling to specific recordings (e.g. only the rows just added),
 * so rows the user has since edited or cleared are left untouched; omit it to
 * consider every recording.
 * @param {object} manifest - the current manifest
 * @param {Iterable<string>} [ids] - recording ids to pre-fill; all if omitted
 * @return {object} a new manifest with proven values filled into empty fields
 */
export function prefillFromPaths(manifest, ids) {
  const target = ids ? new Set(ids) : null;
  return {
    ...manifest,
    recordings: manifest.recordings.map((row) => {
      if (target && !target.has(row.id)) return row;
      const inferred = inferRecordingFields(row);
      const changes = {};
      for (const [field, value] of Object.entries(inferred)) {
        if (!row[field]) changes[field] = value;
      }
      return Object.keys(changes).length ? {...row, ...changes} : row;
    }),
  };
}
