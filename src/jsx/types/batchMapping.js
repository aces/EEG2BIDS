/**
 * batchMapping - user-defined token mapping from paths to manifest fields.
 *
 * Non-canonical datasets encode participant/session/task/run in filename or
 * folder tokens whose MEANING only the user knows (`subj018`, `SS1`). Inference
 * refuses to guess these (see batchInference); this module is the explicit
 * alternative. The user describes exactly how to read a value out of each
 * recording's path — which string to read, how to split it, which segment to
 * take, and an optional transform — and which field that value becomes. Nothing
 * here is inferred: every part of the mapping is supplied by the user.
 *
 * A mapping is applied in two deliberate steps. previewMapping shows the value
 * extracted from every affected recording BEFORE anything changes, so the user
 * confirms the mapping does what they intended. applyMapping then writes those
 * values as ordinary explicit assignments — the mapping itself is not stored
 * and never rerun, so the resulting metadata does not depend on replaying it.
 *
 * A mapping spec is:
 *   {
 *     source: 'filename' | 'path',  // read the basename, or the whole path
 *     delimiter: string,            // split the source on this (e.g. '_', '/')
 *     index: number,                // which 0-based segment to take
 *     pattern?: string,             // optional regex transform of that segment
 *     field: 'participant' | 'session' | 'task' | 'run',
 *   }
 *
 * When `pattern` is supplied it is the user's explicit transform: the segment
 * is matched against it and capture group 1 (or the whole match, if the pattern
 * has no group) becomes the value. This is how a prefix is dropped or digits
 * are pulled out WITHOUT the tool ever guessing to do so.
 *
 * Every function is pure so this logic can be unit-tested in isolation (see
 * batchMapping.test.js).
 */

// The manifest fields a mapping may target: the editable assignment columns.
// Demographics are reviewed separately and are not mapping targets. Sourced
// from the manifest model so bulk assignment and mapping stay in lockstep.
export {ASSIGNMENT_FIELDS as MAPPING_FIELDS} from './batchManifest';

// The two things a mapping can read from a recording.
export const MAPPING_SOURCES = ['filename', 'path'];

/**
 * basename - the trailing path segment.
 * @param {string} filePath - a file path
 * @return {string} the file name
 */
function basename(filePath) {
  return String(filePath).split(/[\\/]/).pop();
}

/**
 * sourceString - the string a mapping reads from a recording.
 * @param {object} recording - a recording row ({filename, sourceFile})
 * @param {string} source - 'filename' (basename) or 'path' (whole source path)
 * @return {string} the string to split and extract from
 */
function sourceString(recording, source) {
  if (source === 'path') return String(recording.sourceFile || '');
  return String(recording.filename || basename(recording.sourceFile || ''));
}

/**
 * extractValue - the value a mapping reads out of one source string.
 * Splits the string on the delimiter, takes the chosen segment, and (when a
 * pattern is supplied) applies it as the transform. An out-of-range segment or
 * a non-matching pattern yields an empty value; an unparsable pattern yields
 * an empty value and a non-null `error` so the UI can flag the specification rather than
 * silently drop every recording.
 * @param {string} str - the source string
 * @param {object} spec - the mapping spec (see module docs)
 * @return {{token: string, value: string, error: ?string}} the extraction
 */
export function extractValue(str, spec) {
  const {delimiter, index, pattern} = spec;
  const segments = delimiter === '' || delimiter == null ?
    [String(str)] : String(str).split(delimiter);
  const token = segments[index] ?? '';

  if (!pattern) return {token, value: token, error: null};

  let regexp;
  try {
    regexp = new RegExp(pattern);
  } catch (e) {
    return {token, value: '', error: 'Invalid transform pattern'};
  }
  const match = token.match(regexp);
  const value = match ? (match[1] !== undefined ? match[1] : match[0]) : '';
  return {token, value, error: null};
}

/**
 * previewMapping - what a mapping would extract from each affected recording.
 * Preview never mutates the manifest; it is the confirmation surface shown
 * before applyMapping. Pass `ids` to scope the preview to selected recordings;
 * omit it to preview every recording. A recording is "affected" only when the
 * mapping extracts a non-empty value from it (`matched`); `willChange` marks the
 * affected rows whose current value would actually differ.
 * @param {object} manifest - the current manifest
 * @param {object} spec - the mapping spec (see module docs)
 * @param {Iterable<string>} [ids] - recording ids to preview; all if omitted
 * @return {object} {field, items, affectedCount, changeCount, patternError}
 */
export function previewMapping(manifest, spec, ids) {
  const scope = ids ? new Set(ids) : null;
  let patternError = null;

  const items = manifest.recordings
      .filter((row) => !scope || scope.has(row.id))
      .map((row) => {
        const source = sourceString(row, spec.source);
        const {token, value, error} = extractValue(source, spec);
        if (error) patternError = error;
        const current = row[spec.field] || '';
        return {
          id: row.id,
          filename: row.filename,
          sourceFile: row.sourceFile,
          source,
          token,
          extracted: value,
          current,
          matched: !!value,
          willChange: !!value && value !== current,
        };
      });

  return {
    field: spec.field,
    items,
    affectedCount: items.filter((i) => i.matched).length,
    changeCount: items.filter((i) => i.willChange).length,
    patternError,
  };
}

/**
 * applyMapping - write a confirmed mapping's values as explicit assignments.
 * Each recording whose mapping extracts a non-empty value gets that value
 * written to the target field; recordings the mapping does not match are left
 * untouched, preserving any individual exceptions. The mapping is not retained,
 * so downstream metadata never depends on rerunning it. Pass `ids` to scope the
 * change to the selection the user previewed.
 * @param {object} manifest - the current manifest
 * @param {object} spec - the mapping spec (see module docs)
 * @param {Iterable<string>} [ids] - recording ids to change; all if omitted
 * @return {object} a new manifest with the mapped values assigned
 */
export function applyMapping(manifest, spec, ids) {
  const scope = ids ? new Set(ids) : null;
  return {
    ...manifest,
    recordings: manifest.recordings.map((row) => {
      if (scope && !scope.has(row.id)) return row;
      const {value, error} = extractValue(sourceString(row, spec.source), spec);
      if (error || !value) return row;
      return {...row, [spec.field]: value};
    }),
  };
}
