// A user-defined mapping reads a value out of each recording's filename or
// path: {source, delimiter, index, pattern?, field}. Nothing is inferred.
// applyMapping writes plain assignments; the mapping itself is never rerun.

export {ASSIGNMENT_FIELDS as MAPPING_FIELDS} from './batchManifest';

export const MAPPING_SOURCES = ['filename', 'path'];

const sourceString = (recording, source) => source === 'path' ?
  String(recording.sourceFile || '') :
  String(recording.filename ||
    String(recording.sourceFile || '').split(/[\\/]/).pop());

// `pattern` takes capture group 1 (or the whole match) from the segment. An
// unparsable pattern reports an error instead of silently matching nothing.
export const extractValue = (str, {delimiter, index, pattern}) => {
  const segments = delimiter === '' || delimiter == null ?
    [String(str)] : String(str).split(delimiter);
  const token = segments[index] ?? '';
  if (!pattern) return {token, value: token, error: null};

  let regexp;
  try {
    regexp = new RegExp(pattern);
  } catch {
    return {token, value: '', error: 'Invalid transform pattern'};
  }
  const match = token.match(regexp);
  return {token, value: match ? match[1] ?? match[0] : '', error: null};
};

export const previewMapping = (manifest, spec, ids) => {
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
};

export const applyMapping = (manifest, spec, ids) => {
  const scope = ids ? new Set(ids) : null;
  return {
    ...manifest,
    recordings: manifest.recordings.map((row) => {
      if (scope && !scope.has(row.id)) return row;
      const {value} = extractValue(sourceString(row, spec.source), spec);
      return value ? {...row, [spec.field]: value} : row;
    }),
  };
};
