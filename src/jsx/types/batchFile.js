/**
 * batchFile - serialize, deserialize, and reconcile a batch manifest.
 *
 * This slice turns the workbench's in-memory manifest into its durable, primary
 * output: a single versioned document that can be saved to disk and reopened,
 * or handed straight to Configuration in memory. One schema serves both paths,
 * so an in-memory handoff and a reopened file produce the same active batch.
 *
 * Three principles shape the design:
 *
 *   1. The document is the explicit assignments, not the process that produced
 *      them. Reopening reconstructs the batch purely from stored source rows and
 *      their assignments; discovery, canonical prefilling and token mappings are
 *      never rerun. Mappings may be retained alongside for audit, but are not
 *      consulted to rebuild the final assignments.
 *   2. Every function is pure and side-effect free. The filesystem is never
 *      touched here: current source signatures are passed in (as the preflight
 *      slice passes in existing outputs), so opening or reconciling a manifest
 *      can never rewrite a source or an output.
 *   3. A broken or partial document is reported, not fatal. An unsupported
 *      version, a missing source file, or an omitted optional field yields a
 *      usable manifest plus a description of the problem, so the batch always
 *      opens and the user decides what to do.
 *
 * The internal manifest shape (see batchManifest.js) is the runtime contract;
 * the serialized shape here is the on-disk/handoff contract. deserializeManifest
 * reconstructs the former from the latter, so a reopened manifest is an ordinary
 * manifest every other module can keep editing.
 */

import {
  ASSIGNMENT_FIELDS,
  DEMOGRAPHIC_FIELDS,
  createManifest,
  validateRecording,
} from './batchManifest';

// The serialized-document schema version. Bump this when the on-disk shape
// changes; deserializeManifest reports (but tolerates) a version it does not
// recognise so an older app never silently misreads a newer file.
export const SCHEMA_VERSION = 1;

// The per-recording source reconciliation verdicts. A reopened manifest reports
// exactly one of these per recording so a moved or edited source is surfaced
// rather than silently trusted.
export const SOURCE_STATUS = {
  PRESENT: 'present',
  MISSING: 'missing',
  CHANGED: 'changed',
};

/**
 * basename - the trailing path segment, for display defaults.
 * @param {string} filePath - a file path
 * @return {string} the file name
 */
function basename(filePath) {
  return String(filePath).split(/[\\/]/).pop();
}

/**
 * pickAssignments - the explicit assignment fields of a recording row.
 * @param {object} row - a recording row
 * @return {object} the assignment fields, each defaulting to ''
 */
function pickAssignments(row) {
  return ASSIGNMENT_FIELDS.reduce((out, field) => {
    out[field] = row[field] || '';
    return out;
  }, {});
}

/**
 * serializeManifest - the versioned document a batch is saved or handed off as.
 *
 * Each recording carries its source (path, filename, format, companions and an
 * optional signature for change detection), its explicit assignments, and its
 * inclusion and derived readiness state. Demographics are stored once per
 * participant label. Supplied mappings are retained verbatim for audit but are
 * never required to rebuild the assignments.
 * @param {object} manifest - the current in-memory manifest
 * @param {object} [opts] - {mappings, signatures}
 * @param {Array} [opts.mappings] - user-defined mappings to retain for audit
 * @param {Object<string, ?object>} [opts.signatures] - source path -> signature
 * @return {object} the serialized, versioned document
 */
export function serializeManifest(manifest, opts = {}) {
  const signatures = opts.signatures || {};
  return {
    schemaVersion: SCHEMA_VERSION,
    recordings: manifest.recordings.map((row) => {
      const recording = {
        id: row.id,
        source: {
          path: row.sourceFile,
          filename: row.filename,
          format: row.format || '',
          companions: row.companions || [],
          signature: signatures[row.sourceFile] ??
            row.sourceSignature ?? null,
        },
        assignments: pickAssignments(row),
        excluded: !!row.excluded,
        ready: validateRecording(row).ready,
      };
      // Provenance is optional and only kept when a row actually carries it,
      // so the common case (assignments alone reconstruct the batch) stays
      // free of empty provenance noise.
      if (row.provenance) recording.provenance = row.provenance;
      return recording;
    }),
    demographics: {...(manifest.demographics || {})},
    mappings: opts.mappings || [],
  };
}

/**
 * deserializeManifest - reconstruct an editable manifest from a document.
 *
 * The batch is rebuilt from stored source rows and explicit assignments only;
 * nothing is re-inferred or re-mapped. Missing optional fields are defaulted so
 * older or partial documents still open, and any structural or version problem
 * is collected into `problems` rather than thrown, so the manifest always opens.
 * @param {object} document - a serialized document (see serializeManifest)
 * @return {{manifest: object, version: ?number, problems: string[],
 *   mappings: Array}} the reconstructed manifest and any problems found
 */
export function deserializeManifest(document) {
  const problems = [];

  if (!document || typeof document !== 'object') {
    problems.push('The batch file is empty or not a batch manifest.');
    return {manifest: createManifest(), version: null, problems, mappings: []};
  }

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
    const assignments = entry.assignments || {};
    const path = source.path || '';
    const row = {
      id: entry.id || `rec-${index + 1}`,
      sourceFile: path,
      filename: source.filename || (path ? basename(path) : ''),
      format: source.format || '',
      companions: Array.isArray(source.companions) ? source.companions : [],
      sourceSignature: source.signature ?? null,
      excluded: !!entry.excluded,
    };
    for (const field of ASSIGNMENT_FIELDS) {
      row[field] = assignments[field] || '';
    }
    if (entry.provenance) row.provenance = entry.provenance;
    return row;
  });

  const demographics = normalizeDemographics(document.demographics);

  return {
    manifest: {recordings, demographics},
    version,
    problems,
    mappings: Array.isArray(document.mappings) ? document.mappings : [],
  };
}

/**
 * normalizeDemographics - a clean label->demographics map from a document.
 * Only the known demographic fields are carried, so an unexpected field in a
 * document can never leak into the reconstructed manifest.
 * @param {?object} raw - the document's demographics map
 * @return {Object<string, object>} the normalized demographics map
 */
function normalizeDemographics(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [label, values] of Object.entries(raw)) {
    if (!values || typeof values !== 'object') continue;
    out[label] = DEMOGRAPHIC_FIELDS.reduce((row, field) => {
      row[field] = values[field] || '';
      return row;
    }, {});
  }
  return out;
}

/**
 * reconcileSources - per-recording verdict on whether each source still matches.
 *
 * `currentSignatures` maps a source path to its signature now (or null/absent if
 * the file is gone), exactly as the main process would report after statting the
 * paths. A recording is MISSING when its source is absent, CHANGED when a saved
 * signature exists and differs from the current one, and PRESENT otherwise. This
 * only reports: it never mutates the manifest and never prevents it opening.
 * @param {object} manifest - a (typically reopened) manifest
 * @param {Object<string, ?object>} currentSignatures - source path -> signature
 * @return {Array<{id: string, sourceFile: string, status: string}>} one verdict
 *   per recording, in manifest order
 */
export function reconcileSources(manifest, currentSignatures = {}) {
  return manifest.recordings.map((row) => {
    const path = row.sourceFile;
    const present =
      Object.prototype.hasOwnProperty.call(currentSignatures, path) &&
      currentSignatures[path] != null;
    let status;
    if (!present) {
      status = SOURCE_STATUS.MISSING;
    } else if (row.sourceSignature &&
        !signaturesMatch(row.sourceSignature, currentSignatures[path])) {
      status = SOURCE_STATUS.CHANGED;
    } else {
      status = SOURCE_STATUS.PRESENT;
    }
    return {id: row.id, sourceFile: path, status};
  });
}

/**
 * signaturesMatch - whether two source signatures describe the same file state.
 * Size and modification time together are a cheap, filesystem-only proxy for
 * "unchanged": a differing size or mtime means the source was edited since it
 * was recorded in the manifest.
 * @param {object} a - a saved signature {size, mtimeMs}
 * @param {object} b - a current signature {size, mtimeMs}
 * @return {boolean} true when both fields match
 */
function signaturesMatch(a, b) {
  return a.size === b.size && a.mtimeMs === b.mtimeMs;
}
