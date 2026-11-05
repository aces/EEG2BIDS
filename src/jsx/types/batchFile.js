// The on-disk batch document. Reopening rebuilds the batch from stored
// assignments only (discovery, inference and mappings are never rerun), and a
// broken or partial document is reported in `problems` rather than thrown.

import {
  ASSIGNMENT_FIELDS,
  DEMOGRAPHIC_FIELDS,
  createManifest,
  validateRecording,
} from './batchManifest';

const SCHEMA_VERSION = 1;

export const SOURCE_STATUS = {
  PRESENT: 'present',
  MISSING: 'missing',
  CHANGED: 'changed',
};

const pick = (fields, values) =>
  Object.fromEntries(fields.map((field) => [field, values[field] || '']));

// `mappings` are kept for audit only. `signatures` maps source path to a
// {size, mtimeMs} signature for later change detection.
export const serializeManifest = (manifest, opts = {}) => {
  const signatures = opts.signatures || {};
  return {
    schemaVersion: SCHEMA_VERSION,
    recordings: manifest.recordings.map((row) => ({
      id: row.id,
      source: {
        path: row.sourceFile,
        filename: row.filename,
        format: row.format || '',
        companions: row.companions || [],
        signature: signatures[row.sourceFile] ?? row.sourceSignature ?? null,
      },
      assignments: pick(ASSIGNMENT_FIELDS, row),
      excluded: !!row.excluded,
      ready: validateRecording(row).ready,
      ...(row.provenance && {provenance: row.provenance}),
    })),
    demographics: {...(manifest.demographics || {})},
    mappings: opts.mappings || [],
  };
};

export const deserializeManifest = (document) => {
  if (!document || typeof document !== 'object') {
    return {
      manifest: createManifest(),
      version: null,
      problems: ['The batch file is empty or not a batch manifest.'],
      mappings: [],
    };
  }

  const problems = [];
  const version = typeof document.schemaVersion === 'number' ?
    document.schemaVersion : null;
  if (version === null) {
    problems.push('The batch file has no schema version; ' +
      'reading it as the current format.');
  } else if (version > SCHEMA_VERSION) {
    problems.push(`The batch file uses a newer schema version (${version}) ` +
      `than this app supports (${SCHEMA_VERSION}); reading what it can.`);
  }

  if (!Array.isArray(document.recordings)) {
    problems.push('The batch file lists no recordings.');
    return {manifest: createManifest(), version, problems, mappings: []};
  }

  const recordings = document.recordings.map((entry, index) => {
    const source = entry.source || {};
    const path = source.path || '';
    return {
      id: entry.id || `rec-${index + 1}`,
      sourceFile: path,
      filename: source.filename || String(path).split(/[\\/]/).pop(),
      format: source.format || '',
      companions: Array.isArray(source.companions) ? source.companions : [],
      sourceSignature: source.signature ?? null,
      excluded: !!entry.excluded,
      ...pick(ASSIGNMENT_FIELDS, entry.assignments || {}),
      ...(entry.provenance && {provenance: entry.provenance}),
    };
  });

  // Only known demographic fields are carried over from the document.
  const demographics = Object.fromEntries(
      Object.entries(document.demographics || {})
          .filter(([, values]) => values && typeof values === 'object')
          .map(([label, values]) => [label, pick(DEMOGRAPHIC_FIELDS, values)]));

  return {
    manifest: {recordings, demographics},
    version,
    problems,
    mappings: Array.isArray(document.mappings) ? document.mappings : [],
  };
};

// `currentSignatures` maps source path to its signature now (null or absent
// when gone). Size + mtime is a cheap, filesystem-only proxy for "unchanged".
export const reconcileSources = (manifest, currentSignatures = {}) =>
  manifest.recordings.map(({id, sourceFile, sourceSignature: saved}) => {
    const current = Object.hasOwn(currentSignatures, sourceFile) ?
      currentSignatures[sourceFile] : null;
    let status = SOURCE_STATUS.PRESENT;
    if (current == null) {
      status = SOURCE_STATUS.MISSING;
    } else if (saved &&
        (saved.size !== current.size || saved.mtimeMs !== current.mtimeMs)) {
      status = SOURCE_STATUS.CHANGED;
    }
    return {id, sourceFile, status};
  });
