import {describe, it, expect} from 'vitest';
import {
  createManifest,
  addRecordings,
  bulkAssign,
  updateDemographics,
  setRecordingExcluded,
  validateManifest,
  getParticipants,
} from './batchManifest';
import {
  SCHEMA_VERSION,
  serializeManifest,
  deserializeManifest,
  reconcileSources,
  SOURCE_STATUS,
} from './batchFile';

/**
 * Build a small, fully-assigned manifest with demographics and one excluded
 * row, so serialization exercises assignments, participant linkage, inclusion
 * state and the demographics map together.
 * @return {object} a manifest state
 */
const sampleManifest = () => {
  let manifest = addRecordings(createManifest(), [
    {name: 'rest.edf', path: '/data/p001/rest.edf', format: 'edf'},
    {
      name: 'oddball.set',
      path: '/data/p001/oddball.set',
      format: 'set',
      companions: ['/data/p001/oddball.fdt'],
    },
    {name: 'rest.edf', path: '/data/p002/rest.edf', format: 'edf'},
  ]);
  const [a, b, c] = manifest.recordings.map((r) => r.id);
  manifest = bulkAssign(manifest, [a, b], {participant: 'p001', task: 'rest'});
  manifest = bulkAssign(manifest, [c], {participant: 'p002', task: 'rest'});
  manifest = updateDemographics(manifest, 'p001', {age: '31', sex: 'F'});
  manifest = setRecordingExcluded(manifest, b, true);
  return manifest;
};

describe('serializeManifest', () => {
  it('stamps the current schema version', () => {
    const file = serializeManifest(sampleManifest());
    expect(file.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('captures source, companions, assignments, inclusion and demographics',
      () => {
        const file = serializeManifest(sampleManifest());
        expect(file.recordings).toHaveLength(3);

        const rest = file.recordings[0];
        expect(rest.source.path).toBe('/data/p001/rest.edf');
        expect(rest.source.format).toBe('edf');
        expect(rest.assignments).toEqual({
          participant: 'p001', session: '', task: 'rest', run: '',
        });
        expect(rest.excluded).toBe(false);

        const oddball = file.recordings[1];
        expect(oddball.source.companions).toEqual(['/data/p001/oddball.fdt']);
        expect(oddball.excluded).toBe(true);

        expect(file.demographics.p001).toMatchObject({age: '31', sex: 'F'});
      });

  it('retains supplied mappings for audit without requiring them', () => {
    const spec = {source: 'filename', delimiter: '_', index: 0,
      field: 'participant'};
    const file = serializeManifest(sampleManifest(), {mappings: [spec]});
    expect(file.mappings).toEqual([spec]);

    const bare = serializeManifest(sampleManifest());
    expect(bare.mappings).toEqual([]);
  });

  it('stores a per-recording source signature when one is supplied', () => {
    const manifest = sampleManifest();
    const signatures = {
      '/data/p001/rest.edf': {size: 100, mtimeMs: 5},
    };
    const file = serializeManifest(manifest, {signatures});
    expect(file.recordings[0].source.signature)
        .toEqual({size: 100, mtimeMs: 5});
    // Recordings with no supplied signature record null rather than omitting.
    expect(file.recordings[2].source.signature).toBeNull();
  });
});

describe('deserializeManifest', () => {
  it('reconstructs a manifest equivalent to the original', () => {
    const original = sampleManifest();
    const {manifest, version, problems} =
      deserializeManifest(serializeManifest(original));

    expect(version).toBe(SCHEMA_VERSION);
    expect(problems).toEqual([]);

    // Readiness and participant linkage are rebuilt from stored assignments,
    // not recomputed from filenames.
    expect(validateManifest(manifest).readyCount)
        .toBe(validateManifest(original).readyCount);
    expect(getParticipants(manifest).map((p) => p.participant))
        .toEqual(getParticipants(original).map((p) => p.participant));
    expect(getParticipants(manifest).find((p) => p.participant === 'p001')
        .demographics).toMatchObject({age: '31', sex: 'F'});
  });

  it('produces a manifest the model can keep editing', () => {
    const {manifest} = deserializeManifest(serializeManifest(sampleManifest()));
    const id = manifest.recordings[0].id;
    const edited = bulkAssign(manifest, [id], {run: '2'});
    expect(edited.recordings[0].run).toBe('2');
  });

  it('serialize→deserialize→serialize is idempotent', () => {
    const once = serializeManifest(sampleManifest());
    const twice = serializeManifest(deserializeManifest(once).manifest);
    expect(twice).toEqual(once);
  });

  it('flags an unsupported newer schema version but still opens', () => {
    const future = {...serializeManifest(sampleManifest()),
      schemaVersion: SCHEMA_VERSION + 1};
    const {manifest, problems} = deserializeManifest(future);
    expect(problems.some((p) => /version/i.test(p))).toBe(true);
    // The batch still reconstructs rather than refusing to open.
    expect(manifest.recordings).toHaveLength(3);
  });

  it('defaults optional fields when older/partial rows omit them', () => {
    const minimal = {
      schemaVersion: SCHEMA_VERSION,
      recordings: [
        {id: 'rec-1', source: {path: '/x/y.edf'},
          assignments: {participant: 'p1', task: 't'}},
      ],
    };
    const {manifest, problems} = deserializeManifest(minimal);
    const [row] = manifest.recordings;
    expect(row.filename).toBe('y.edf');
    expect(row.companions).toEqual([]);
    expect(row.excluded).toBe(false);
    expect(row.session).toBe('');
    expect(manifest.demographics).toEqual({});
    expect(problems).toEqual([]);
  });

  it('round-trips optional assignment provenance when present', () => {
    // Provenance is optional: nothing in the app produces it today, but a row
    // that carries it must survive a save/load cycle so it can be retained for
    // audit without ever being required to reconstruct assignments.
    const manifest = sampleManifest();
    manifest.recordings[0].provenance = {source: 'token-mapping', segment: 0};

    const file = serializeManifest(manifest);
    expect(file.recordings[0].provenance)
        .toEqual({source: 'token-mapping', segment: 0});
    // Rows without provenance stay free of the key entirely.
    expect('provenance' in file.recordings[1]).toBe(false);

    const {manifest: reopened} = deserializeManifest(file);
    expect(reopened.recordings[0].provenance)
        .toEqual({source: 'token-mapping', segment: 0});
    // Reconstruction still comes from assignments, so a provenance-free row is
    // just as ready as before.
    expect(validateManifest(reopened).readyCount)
        .toBe(validateManifest(manifest).readyCount);
  });

  it('reports a problem for a structurally invalid document', () => {
    expect(deserializeManifest(null).problems.length).toBeGreaterThan(0);
    expect(deserializeManifest({}).problems.length).toBeGreaterThan(0);
    // Even invalid input yields a usable empty manifest, never a throw.
    expect(deserializeManifest(null).manifest.recordings).toEqual([]);
  });
});

describe('equivalent in-memory and file handoff', () => {
  it('deserializing a JSON round trip equals the direct object', () => {
    const serialized = serializeManifest(sampleManifest());

    // In-memory handoff: the object is passed straight through.
    const direct = deserializeManifest(serialized).manifest;
    // File handoff: the identical object after a JSON write/read cycle.
    const viaFile =
      deserializeManifest(JSON.parse(JSON.stringify(serialized))).manifest;

    expect(viaFile).toEqual(direct);
  });
});

describe('reconcileSources', () => {
  it('reports present, missing and changed sources per recording', () => {
    const manifest = sampleManifest();
    const signatures = {
      '/data/p001/rest.edf': {size: 100, mtimeMs: 5},
      '/data/p001/oddball.set': {size: 200, mtimeMs: 6},
      '/data/p002/rest.edf': {size: 300, mtimeMs: 7},
    };
    const {manifest: reopened} =
      deserializeManifest(serializeManifest(manifest, {signatures}));

    const current = {
      // unchanged
      '/data/p001/rest.edf': {size: 100, mtimeMs: 5},
      // changed size
      '/data/p001/oddball.set': {size: 999, mtimeMs: 6},
      // missing (absent from the map)
    };
    const report = reconcileSources(reopened, current);

    expect(report.find((r) => r.sourceFile === '/data/p001/rest.edf').status)
        .toBe(SOURCE_STATUS.PRESENT);
    expect(report.find((r) => r.sourceFile === '/data/p001/oddball.set').status)
        .toBe(SOURCE_STATUS.CHANGED);
    expect(report.find((r) => r.sourceFile === '/data/p002/rest.edf').status)
        .toBe(SOURCE_STATUS.MISSING);
  });

  it('treats an explicit null signature as a missing source', () => {
    const {manifest} = deserializeManifest(serializeManifest(sampleManifest()));
    const report = reconcileSources(manifest,
        {'/data/p001/rest.edf': null});
    expect(report.find((r) => r.sourceFile === '/data/p001/rest.edf').status)
        .toBe(SOURCE_STATUS.MISSING);
  });

  it('reports present when there is no saved signature to compare against',
      () => {
        // A manifest built in-session (no signatures captured) can still be
        // reconciled: a file that exists now is present, absent is missing.
        const manifest = sampleManifest();
        const report = reconcileSources(manifest, {
          '/data/p001/rest.edf': {size: 1, mtimeMs: 1},
        });
        expect(report.find((r) => r.sourceFile === '/data/p001/rest.edf')
            .status).toBe(SOURCE_STATUS.PRESENT);
        expect(report.find((r) => r.sourceFile === '/data/p002/rest.edf')
            .status).toBe(SOURCE_STATUS.MISSING);
      });

  it('never blocks: reconciling reports status for every recording', () => {
    const {manifest} = deserializeManifest(serializeManifest(sampleManifest()));
    const report = reconcileSources(manifest, {});
    expect(report).toHaveLength(manifest.recordings.length);
    expect(report.every((r) => r.status === SOURCE_STATUS.MISSING)).toBe(true);
  });
});
